import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, email, department, role, annualLeaveTotal } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "이메일은 필수 항목입니다." }, { status: 400 });
    }

    // 이미 존재하는 이메일인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 400 });
    }

    // 신규 유저 생성
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        department,
        role: role || "USER",
        annualLeaveTotal: annualLeaveTotal || 15.0,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/admin/users] 에러:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
