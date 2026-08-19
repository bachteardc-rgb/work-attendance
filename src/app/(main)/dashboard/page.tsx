import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  // (main)/layout.tsx already redirects when there's no session, but
  // session.user can still lack `id` if the DB user behind the JWT was
  // deleted (see src/lib/auth.ts session() callback) — guard here too so
  // that case fails safe instead of crashing on `user.id` below.
  if (!user?.id) {
    redirect("/auth/signin");
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  // 현재 월의 시작일과 종료일 계산
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // 1. 본인의 이번 달 승인된 시간외근무 합산
  const overtimes = await prisma.overtimeRequest.aggregate({
    _sum: { totalHours: true },
    where: {
      userId: user.id,
      status: "APPROVED",
      date: { gte: startOfMonth, lte: endOfMonth }
    }
  });
  const currentMonthOvertime = overtimes._sum.totalHours || 0;

  // 관리자가 부여한 시간외근무 '월 한도'. 휴가와 동일하게 이번 달 기준으로 표시합니다.
  const overtimeQuota = await prisma.overtimeQuota.findUnique({
    where: { userId_year: { userId: user.id, year: currentYear } },
  });
  const overtimeMonthlyLimit = overtimeQuota?.monthlyHours ?? 0;

  // 2. 본인의 올해 휴가 쿼터 (LeaveQuota) 조회
  const userQuotas = await prisma.leaveQuota.findMany({ where: { userId: user.id, year: currentYear } });

  // 3. 전체 휴가 종류 조회
  const leaveTypes = await prisma.leaveType.findMany({ orderBy: { createdAt: "asc" } });

  // 4. 최근 휴가 신청 내역 (본인) 5건 조회
  const recentLeaves = await prisma.leaveRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  // 5. 최근 근무시간 조정 내역 (본인) 5건 조회
  const recentAdjustments = await prisma.scheduleAdjustment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  // 관리자 전용 데이터 (전체 직원 목록, 전체 쿼터, 전체 시간외근무, 전체 승인된 근무시간조정)
  let allUsersData: any[] = [];
  let allAdjustments: any[] = [];
  
  if (user.role === "ADMIN") {
    const allUsers = await prisma.user.findMany({
      orderBy: { name: "asc" }
    });

    const allQuotas = (prisma as any).leaveQuota 
      ? await (prisma as any).leaveQuota.findMany({ where: { year: currentYear } })
      : [];

    const allOvertimes = await prisma.overtimeRequest.findMany({
      where: {
        status: "APPROVED",
        date: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // 승인된 전체 근무시간조정 데이터 (가장 최근 신청 기준을 뽑기 위함)
    allAdjustments = await prisma.scheduleAdjustment.findMany({
      where: {
        status: "APPROVED"
      },
      orderBy: { applyDate: "desc" },
      include: {
        user: {
          select: { name: true, department: true }
        }
      }
    });

    // 각 유저별로 데이터를 맵핑
    allUsersData = allUsers.map((u: any) => {
      const userQs = allQuotas.filter((q: any) => q.userId === u.id);
      
      const userOvertimes = allOvertimes.filter((ot: any) => ot.userId === u.id);
      const otHours = userOvertimes.reduce((acc: number, cur: any) => acc + (cur.totalHours || 0), 0);

      return {
        id: u.id,
        name: u.name,
        department: u.department,
        annualLeaveTotal: u.annualLeaveTotal,
        annualLeaveUsed: u.annualLeaveUsed,
        quotas: userQs,
        overtimeHours: otHours
      };
    });
  }

  return (
    <DashboardClient 
      user={user}
      currentYear={currentYear}
      currentMonthOvertime={currentMonthOvertime}
      overtimeMonthlyLimit={overtimeMonthlyLimit}
      userQuotas={userQuotas}
      leaveTypes={leaveTypes}
      recentLeaves={recentLeaves}
      recentAdjustments={recentAdjustments}
      allUsersData={allUsersData}
      allAdjustments={allAdjustments}
    />
  );
}
