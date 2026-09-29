import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const booking = await prisma.booking.findUnique({ where: { id }, include: { unit: true } });
  if (!booking) return NextResponse.json({ error: "booking tidak ditemukan" }, { status: 404 });
  if (booking.status === "cancelled")
    return NextResponse.json({ error: "booking sudah dibatalkan" }, { status: 409 });
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "cancelled" },
    include: { unit: true, nights: { orderBy: { tanggal: "asc" } } },
  });
  return NextResponse.json(updated);
}
