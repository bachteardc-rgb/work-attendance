import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 본인의 해당 월 시간외근무 부여/사용/잔여 조회
//   GET /api/overtime/summary?year=2026&month=8
// 부여시간은 연도 단위로 등록하되 매월 동일하게 적용되는 '월 한도'입니다.
// 사용시간은 승인(APPROVED) 건과 대기(PENDING) 건을 나눠서 돌려줍니다.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || "", 10) || now.getFullYear();
    const month = parseInt(searchParams.get("month") || "", 10) || now.getMonth() + 1;

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "month는 1~12 사이여야 합니다." }, { status: 400 });
    }

    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const [quota, approved, pending] = await Promise.all([
      prisma.overtimeQuota.findUnique({ where: { userId_year: { userId, year } } }),
      prisma.overtimeRequest.aggregate({
        _sum: { totalHours: true },
        where: { userId, status: "APPROVED", date: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.overtimeRequest.aggregate({
        _sum: { totalHours: true },
        where: { userId, status: "PENDING", date: { gte: monthStart, lte: monthEnd } },
      }),
    ]);

    const monthlyHours = quota?.monthlyHours ?? 0;
    const usedHours = approved._sum.totalHours || 0;
    const pendingHours = pending._sum.totalHours || 0;

    return NextResponse.json({
      year,
      month,
      monthlyHours,
      usedHours,
      pendingHours,
      remainingHours: monthlyHours - usedHours,
      hasQuota: !!quota,
    });
  } catch (error) {
    console.error("GET /api/overtime/summary error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
