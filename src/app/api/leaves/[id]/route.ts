import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    
    if (!session || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized or Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body; // "APPROVED" or "REJECTED"

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // 트랜잭션으로 연차 차감 로직 구현
    const result = await prisma.$transaction(async (tx) => {
      const leaveReq = await tx.leaveRequest.findUnique({ where: { id } });
      if (!leaveReq) throw new Error("Request not found");
      if (leaveReq.status !== "PENDING") throw new Error("Already processed");

      // 상태 업데이트
      const updatedReq = await tx.leaveRequest.update({
        where: { id },
        data: { status },
      });

      // 승인된 경우 해당 휴가 쿼터 사용량 증가
      if (status === "APPROVED") {
        let baseType = leaveReq.type;
        if (baseType === "HALF_AM" || baseType === "HALF_PM") {
          baseType = "ANNUAL";
        }

        const year = new Date(leaveReq.startDate).getFullYear();

        // 1. LeaveQuota 차감 업데이트
        await tx.leaveQuota.updateMany({
          where: {
            userId: leaveReq.userId,
            year,
            leaveType: baseType,
          },
          data: {
            usedDays: {
              increment: leaveReq.daysUsed,
            },
          },
        });

        // 2. 연차 항목인 경우 User의 annualLeaveUsed 필드 동기화
        if (baseType === "ANNUAL") {
          await tx.user.update({
            where: { id: leaveReq.userId },
            data: {
              annualLeaveUsed: {
                increment: leaveReq.daysUsed,
              },
            },
          });
        }
      }

      return updatedReq;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Approval error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
