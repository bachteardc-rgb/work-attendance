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
    const { userId, year, leaveType, totalDays } = body;

    if (!userId || !year || !leaveType || totalDays === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const numericTotalDays = parseFloat(totalDays);

    const quota = await prisma.leaveQuota.upsert({
      where: {
        userId_year_leaveType: {
          userId,
          year: parseInt(year, 10),
          leaveType,
        },
      },
      update: {
        totalDays: numericTotalDays,
      },
      create: {
        userId,
        year: parseInt(year, 10),
        leaveType,
        totalDays: numericTotalDays,
        usedDays: 0.0,
      },
    });

    // 만약 ANNUAL (연차) 일수라면 User의 annualLeaveTotal 필드도 함께 동기화
    if (leaveType === "ANNUAL") {
      await prisma.user.update({
        where: { id: userId },
        data: { annualLeaveTotal: numericTotalDays },
      });
    }

    return NextResponse.json(quota, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/admin/quotas error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
