import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 달력 탭에서 사용하는 월별 근태 이벤트 조회
//   GET /api/calendar?year=2026&month=8&scope=me|all
// scope=all 은 관리자만 사용할 수 있으며 전체 직원의 일정을 반환합니다.
// 반려(REJECTED)된 건은 실제로 발생하지 않은 일정이므로 제외합니다.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

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

    const requestedScope = searchParams.get("scope") === "all" ? "all" : "me";
    // 관리자가 아니면 scope 파라미터와 무관하게 항상 본인 일정만 조회합니다.
    const scope = role === "ADMIN" ? requestedScope : "me";

    // 신청 데이터는 new Date("YYYY-MM-DD") 즉 UTC 자정 기준으로 저장되므로
    // 월 경계도 UTC 기준으로 맞춥니다.
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const userFilter = scope === "all" ? {} : { userId };
    const notRejected = { status: { not: "REJECTED" } };
    const userSelect = { user: { select: { name: true, department: true } } };

    // 기간(startDate~endDate)을 갖는 항목은 해당 월과 겹치기만 하면 포함합니다.
    const overlapsMonth = { startDate: { lte: monthEnd }, endDate: { gte: monthStart } };
    // 단일 날짜 항목은 해당 월 안에 있어야 합니다.
    const withinMonth = { gte: monthStart, lte: monthEnd };

    const [leaves, trips, educations, adjustments, overtimes] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { ...userFilter, ...notRejected, ...overlapsMonth },
        include: userSelect,
        orderBy: { startDate: "asc" },
      }),
      prisma.businessTripRequest.findMany({
        where: { ...userFilter, ...notRejected, ...overlapsMonth },
        include: userSelect,
        orderBy: { startDate: "asc" },
      }),
      prisma.educationRequest.findMany({
        where: { ...userFilter, ...notRejected, ...overlapsMonth },
        include: userSelect,
        orderBy: { startDate: "asc" },
      }),
      prisma.scheduleAdjustment.findMany({
        where: { ...userFilter, ...notRejected, applyDate: withinMonth },
        include: userSelect,
        orderBy: { applyDate: "asc" },
      }),
      prisma.overtimeRequest.findMany({
        where: { ...userFilter, ...notRejected, date: withinMonth },
        include: userSelect,
        orderBy: { date: "asc" },
      }),
    ]);

    // 기본 근무시간(근태상황의 기준값)도 함께 내려줍니다.
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { baseSchedule: true },
    });

    return NextResponse.json({
      year,
      month,
      scope,
      baseSchedule: me?.baseSchedule || "09:00-18:00",
      leaves,
      trips,
      educations,
      adjustments,
      overtimes,
    });
  } catch (error) {
    console.error("GET /api/calendar error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
