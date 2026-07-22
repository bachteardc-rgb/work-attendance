import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    
    if (!session || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const adjustmentReq = await tx.scheduleAdjustment.findUnique({ where: { id } });
      if (!adjustmentReq) throw new Error("Request not found");
      
      const updatedReq = await tx.scheduleAdjustment.update({
        where: { id },
        data: { status },
      });

      // 승인된 경우 사용자의 기본 근무시간(baseSchedule)을 영구적으로 변경할 수도 있고, 
      // 해당 날짜만 적용하는 복잡한 로직이 있을 수 있으나 현재 명세에서는 승인 이력만 관리.
      // (기본값인 baseSchedule 자체를 바꾸려면 추가 로직 필요)
      
      return updatedReq;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Adjustment approval error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
