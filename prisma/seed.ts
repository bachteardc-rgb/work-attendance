// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 관리자 사용자 (ADMIN)
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

  // 일반 사용자 (USER)
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

  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
