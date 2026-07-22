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
    const { applyDate, originalTime, requestedTime, reason } = body;

    if (!applyDate || !originalTime || !requestedTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newRequest = await prisma.scheduleAdjustment.create({
      data: {
        userId,
        applyDate: new Date(applyDate),
        originalTime,
        requestedTime,
        reason,
        status: "PENDING",
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Schedule adjustment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
