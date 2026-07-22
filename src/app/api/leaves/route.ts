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
    const { type, startDate, endDate, daysUsed, reason } = body;

    if (!type || !startDate || !endDate || daysUsed === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newRequest = await prisma.leaveRequest.create({
      data: {
        userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        daysUsed,
        reason,
        status: "PENDING",
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Leave request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
