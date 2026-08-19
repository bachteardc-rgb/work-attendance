import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 본인의 교육신청 목록 조회 (교육결과 제출 화면에서 사용)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const educations = await prisma.educationRequest.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(educations);
  } catch (error) {
    console.error("GET /api/educations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 교육신청 등록
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, institution, startDate, endDate, cost, purpose } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: "교육명과 교육 기간은 필수입니다." }, { status: 400 });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: "종료일은 시작일보다 빠를 수 없습니다." }, { status: 400 });
    }

    const newRequest = await prisma.educationRequest.create({
      data: {
        userId,
        title,
        institution: institution || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        cost: cost ? parseFloat(cost) : 0,
        purpose: purpose || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("POST /api/educations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
