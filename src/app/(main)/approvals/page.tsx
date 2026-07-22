import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ApprovalsClient from "./ApprovalsClient";

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  // 대기 중인 모든 신청 내역 조회
  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true, department: true } } },
    orderBy: { createdAt: "asc" }
  });

  const pendingOvertimes = await prisma.overtimeRequest.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true, department: true } } },
    orderBy: { createdAt: "asc" }
  });

  const pendingAdjustments = await prisma.scheduleAdjustment.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true, department: true } } },
    orderBy: { createdAt: "asc" }
  });

  // 전체 직원 목록 및 휴가 종류 조회
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, department: true, role: true }
  });

  const leaveTypes = await prisma.leaveType.findMany({
    orderBy: { createdAt: "asc" }
  });

  return (
    <div>
      <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "20px" }}>
        관리자 센터 (결재 및 휴가 부여 관리)
      </h1>
      <ApprovalsClient 
        leaves={pendingLeaves} 
        overtimes={pendingOvertimes} 
        adjustments={pendingAdjustments}
        users={users}
        leaveTypes={leaveTypes}
      />
    </div>
  );
}
