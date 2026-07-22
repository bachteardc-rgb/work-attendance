import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(leaveTypes);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { code, name, description, isPaid } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "코드와 휴가명은 필수입니다." }, { status: 400 });
    }

    const upperCode = code.trim().toUpperCase().replace(/\s+/g, "_");

    const leaveType = await prisma.leaveType.upsert({
      where: { code: upperCode },
      update: {
        name,
        description,
        isPaid: isPaid ?? true,
      },
      create: {
        code: upperCode,
        name,
        description,
        isPaid: isPaid ?? true,
      },
    });

    return NextResponse.json(leaveType, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/leavetypes error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
