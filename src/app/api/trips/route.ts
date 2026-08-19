import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 본인의 출장신청 목록 조회 (출장결과 제출 화면에서 사용)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trips = await prisma.businessTripRequest.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(trips);
  } catch (error) {
    console.error("GET /api/trips error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 출장신청 등록
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { destination, purpose, startDate, endDate, companions, cost } = body;

    if (!destination || !startDate || !endDate) {
      return NextResponse.json({ error: "출장지와 출장 기간은 필수입니다." }, { status: 400 });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: "종료일은 시작일보다 빠를 수 없습니다." }, { status: 400 });
    }

    const newRequest = await prisma.businessTripRequest.create({
      data: {
        userId,
        destination,
        purpose: purpose || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        companions: companions || null,
        cost: cost ? parseFloat(cost) : 0,
        status: "PENDING",
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("POST /api/trips error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
