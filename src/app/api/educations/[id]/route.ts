import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 두 가지 용도를 겸하는 엔드포인트입니다.
//  1) { status } 전달 -> 관리자의 승인/반려
//  2) { resultContent } 전달 -> 신청자 본인의 교육결과 제출
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, resultContent } = body;

    const existing = await prisma.educationRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "신청 내역을 찾을 수 없습니다." }, { status: 404 });
    }

    // 1) 관리자 승인 / 반려
    if (status !== undefined) {
      if (role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (status !== "APPROVED" && status !== "REJECTED") {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      if (existing.status !== "PENDING") {
        return NextResponse.json({ error: "이미 처리된 신청입니다." }, { status: 400 });
      }

      const updated = await prisma.educationRequest.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json(updated);
    }

    // 2) 신청자 본인의 교육결과 제출
    if (resultContent !== undefined) {
      if (existing.userId !== userId) {
        return NextResponse.json({ error: "본인의 신청 건만 결과를 제출할 수 있습니다." }, { status: 403 });
      }
      if (existing.status !== "APPROVED") {
        return NextResponse.json({ error: "승인된 교육신청에만 결과를 제출할 수 있습니다." }, { status: 400 });
      }
      const trimmed = String(resultContent).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "교육결과 내용을 입력해 주세요." }, { status: 400 });
      }

      const updated = await prisma.educationRequest.update({
        where: { id },
        data: { resultContent: trimmed, resultSubmittedAt: new Date() },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/educations/[id] error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
