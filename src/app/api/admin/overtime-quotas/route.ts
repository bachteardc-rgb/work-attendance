import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") return null;
  return session;
}

// 연도별 직원 시간외근무 '월' 부여시간 조회 (+ 참고용 이번 달 승인 사용시간)
export async function GET(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year");
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        overtimeQuotas: { where: { year } },
      },
      orderBy: { name: "asc" },
    });

    // 부여시간이 월 단위이므로, 참고용 사용량도 "현재 월" 기준으로 집계합니다.
    // (선택한 연도가 올해가 아니면 비교 대상이 없으므로 0으로 표시됩니다.)
    const now = new Date();
    const refMonth = now.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, refMonth, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, refMonth + 1, 0, 23, 59, 59, 999));
    const grouped = await prisma.overtimeRequest.groupBy({
      by: ["userId"],
      where: { status: "APPROVED", date: { gte: monthStart, lte: monthEnd } },
      _sum: { totalHours: true },
    });
    const usedMap = new Map(grouped.map((g) => [g.userId, g._sum.totalHours || 0]));

    return NextResponse.json({
      year,
      refMonth: refMonth + 1,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department,
        monthlyHours: u.overtimeQuotas[0]?.monthlyHours ?? 0,
        usedThisMonth: usedMap.get(u.id) || 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/overtime-quotas error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 시간외근무 '월' 부여시간 일괄 등록
// body: { year, items: [{ userId, monthlyHours }] }
export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { year, items } = body;

    if (!year || !Array.isArray(items)) {
      return NextResponse.json({ error: "year와 items는 필수입니다." }, { status: 400 });
    }

    const parsedYear = parseInt(year, 10);
    const normalized: { userId: string; monthlyHours: number }[] = [];

    for (const it of items) {
      if (!it?.userId) continue;
      const hours = parseFloat(it.monthlyHours);
      if (Number.isNaN(hours)) {
        return NextResponse.json({ error: "월 부여시간은 숫자여야 합니다." }, { status: 400 });
      }
      if (hours < 0) {
        return NextResponse.json({ error: "월 부여시간은 0 이상이어야 합니다." }, { status: 400 });
      }
      normalized.push({ userId: it.userId, monthlyHours: hours });
    }

    if (normalized.length === 0) {
      return NextResponse.json({ error: "등록할 대상이 없습니다." }, { status: 400 });
    }

    await prisma.$transaction(
      normalized.map((n) =>
        prisma.overtimeQuota.upsert({
          where: { userId_year: { userId: n.userId, year: parsedYear } },
          update: { monthlyHours: n.monthlyHours },
          create: { userId: n.userId, year: parsedYear, monthlyHours: n.monthlyHours },
        })
      )
    );

    return NextResponse.json({ ok: true, year: parsedYear, saved: normalized.length });
  } catch (error: any) {
    console.error("POST /api/admin/overtime-quotas error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
