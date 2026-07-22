import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    
    if (!session || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updatedReq = await prisma.overtimeRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedReq, { status: 200 });
  } catch (error) {
    console.error("Overtime approval error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
