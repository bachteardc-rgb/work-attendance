const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database with extended models...");

  // 1. 휴가 종류 생성
  const defaultLeaveTypes = [
    { code: "ANNUAL", name: "연차", isPaid: true, description: "기본 유급 연차 휴가" },
    { code: "SICK", name: "병가", isPaid: true, description: "질병 및 부상 치료를 위한 휴가" },
    { code: "OFFICIAL", name: "공가", isPaid: true, description: "공적 의무 수행을 위한 휴가" },
    { code: "FAMILY_CARE", name: "가족돌봄휴가", isPaid: false, description: "가족의 질병, 사고, 노령 지원 휴가" },
    { code: "COMPENSATORY", name: "대체휴가", isPaid: true, description: "휴일근무 등에 따른 대체 휴가" },
  ];

  for (const lt of defaultLeaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: { name: lt.name, isPaid: lt.isPaid, description: lt.description },
      create: lt,
    });
  }

  // 2. 관리자 사용자 (ADMIN)
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      role: "ADMIN",
      department: "인사팀",
      name: "관리자 (김인사)",
      annualLeaveTotal: 15.0,
      annualLeaveUsed: 3.0,
    },
    create: {
      email: "admin@example.com",
      name: "관리자 (김인사)",
      department: "인사팀",
      role: "ADMIN",
      baseSchedule: "09:00-18:00",
      annualLeaveTotal: 15.0,
      annualLeaveUsed: 3.0,
    },
  });

  // 3. 일반 사용자 (USER)
  const regularUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {
      role: "USER",
      department: "개발팀",
      name: "홍길동 (개발자)",
      annualLeaveTotal: 15.0,
      annualLeaveUsed: 2.5,
    },
    create: {
      email: "user@example.com",
      name: "홍길동 (개발자)",
      department: "개발팀",
      role: "USER",
      baseSchedule: "09:00-18:00",
      annualLeaveTotal: 15.0,
      annualLeaveUsed: 2.5,
    },
  });

  // 4. 연도별 직원 휴가 쿼터 (LeaveQuota) 2026년
  const currentYear = 2026;
  const userQuotas = [
    { userId: regularUser.id, year: currentYear, leaveType: "ANNUAL", totalDays: 15.0, usedDays: 2.0 },
    { userId: regularUser.id, year: currentYear, leaveType: "SICK", totalDays: 6.0, usedDays: 0.0 },
    { userId: regularUser.id, year: currentYear, leaveType: "OFFICIAL", totalDays: 3.0, usedDays: 0.0 },
    { userId: regularUser.id, year: currentYear, leaveType: "FAMILY_CARE", totalDays: 10.0, usedDays: 0.0 },
    { userId: regularUser.id, year: currentYear, leaveType: "COMPENSATORY", totalDays: 2.0, usedDays: 0.0 },
    
    { userId: adminUser.id, year: currentYear, leaveType: "ANNUAL", totalDays: 15.0, usedDays: 3.0 },
    { userId: adminUser.id, year: currentYear, leaveType: "SICK", totalDays: 6.0, usedDays: 0.0 },
    { userId: adminUser.id, year: currentYear, leaveType: "OFFICIAL", totalDays: 5.0, usedDays: 0.0 },
    { userId: adminUser.id, year: currentYear, leaveType: "FAMILY_CARE", totalDays: 10.0, usedDays: 0.0 },
    { userId: adminUser.id, year: currentYear, leaveType: "COMPENSATORY", totalDays: 3.0, usedDays: 0.0 },
  ];

  for (const q of userQuotas) {
    await prisma.leaveQuota.upsert({
      where: {
        userId_year_leaveType: {
          userId: q.userId,
          year: q.year,
          leaveType: q.leaveType,
        },
      },
      update: { totalDays: q.totalDays, usedDays: q.usedDays },
      create: q,
    });
  }

  // 5. 샘플 근태 신청 내역
  await prisma.leaveRequest.deleteMany({ where: { userId: regularUser.id } });
  await prisma.overtimeRequest.deleteMany({ where: { userId: regularUser.id } });
  await prisma.scheduleAdjustment.deleteMany({ where: { userId: regularUser.id } });

  await prisma.leaveRequest.createMany({
    data: [
      {
        userId: regularUser.id,
        type: "ANNUAL",
        startDate: new Date("2026-07-10"),
        endDate: new Date("2026-07-11"),
        daysUsed: 2.0,
        reason: "여름 휴가",
        status: "APPROVED",
      },
      {
        userId: regularUser.id,
        type: "SICK",
        startDate: new Date("2026-07-25"),
        endDate: new Date("2026-07-25"),
        daysUsed: 1.0,
        reason: "정기 건강검진 및 병원 진료",
        status: "PENDING",
      },
    ],
  });

  await prisma.scheduleAdjustment.create({
    data: {
      userId: regularUser.id,
      applyDate: new Date("2026-07-28"),
      originalTime: "09:00 - 18:00",
      requestedTime: "08:30 - 17:30",
      reason: "개인 사정으로 조기 출퇴근 희망",
      status: "PENDING",
    },
  });

  console.log("Seeding finished successfully with new leave types & quotas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
