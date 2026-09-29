import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const exists = await prisma.blockedDate.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "data tidak ditemukan" }, { status: 404 });
  await prisma.blockedDate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
