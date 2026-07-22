import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { date, startTime, endTime, description } = body;

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 간단한 시간 차이 계산 (시간 단위, 소수점 처리)
    // "HH:MM" 형식 파싱
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let totalHours = (endH + endM / 60) - (startH + startM / 60);
    
    // 야간 근무 등으로 종료 시간이 다음 날인 경우
    if (totalHours < 0) totalHours += 24;

    const newRequest = await prisma.overtimeRequest.create({
      data: {
        userId,
        date: new Date(date),
        startTime,
        endTime,
        totalHours: parseFloat(totalHours.toFixed(2)),
        description,
        status: "PENDING",
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Overtime request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
