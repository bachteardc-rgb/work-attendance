import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || role !== "ADMIN") {
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
        role: true,
        leaveQuotas: {
          where: { year },
        },
      },
      orderBy: { name: "asc" },
    });

    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users, leaveTypes, year });
  } catch (error: any) {
    console.error("GET /api/admin/quotas error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, year, leaveType, totalDays, items } = body;

    if (!year || !leaveType) {
      return NextResponse.json({ error: "적용 연도와 휴가 종류는 필수입니다." }, { status: 400 });
    }
    const parsedYear = parseInt(year, 10);

    // items 배열이 오면 일괄 등록, 없으면 기존 단건 등록으로 동작합니다.
    const rawList = Array.isArray(items)
      ? items
      : userId !== undefined && totalDays !== undefined
        ? [{ userId, totalDays }]
        : null;

    if (!rawList) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalized: { userId: string; totalDays: number }[] = [];
    for (const it of rawList) {
      if (!it?.userId) continue;
      const days = parseFloat(it.totalDays);
      if (Number.isNaN(days)) {
        return NextResponse.json({ error: "부여 일수는 숫자여야 합니다." }, { status: 400 });
      }
      if (days < 0) {
        return NextResponse.json({ error: "부여 일수는 0 이상이어야 합니다." }, { status: 400 });
      }
      normalized.push({ userId: it.userId, totalDays: days });
    }

    if (normalized.length === 0) {
      return NextResponse.json({ error: "등록할 대상이 없습니다." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const n of normalized) {
        await tx.leaveQuota.upsert({
          where: {
            userId_year_leaveType: { userId: n.userId, year: parsedYear, leaveType },
          },
          update: { totalDays: n.totalDays },
          create: {
            userId: n.userId,
            year: parsedYear,
            leaveType,
            totalDays: n.totalDays,
            usedDays: 0.0,
          },
        });

        // 연차인 경우 User.annualLeaveTotal 도 함께 동기화합니다.
        if (leaveType === "ANNUAL") {
          await tx.user.update({
            where: { id: n.userId },
            data: { annualLeaveTotal: n.totalDays },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, year: parsedYear, leaveType, saved: normalized.length }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/admin/quotas error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
