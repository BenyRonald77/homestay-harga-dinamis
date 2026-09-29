import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidDate } from "@/lib/format";

function idOf(params: { id?: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params);
  if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const exists = await prisma.holiday.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "holiday tidak ditemukan" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "body JSON tidak valid" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (body.nama !== undefined) {
    const nama = (body.nama as string).toString().trim();
    if (!nama) return NextResponse.json({ error: "nama tidak boleh kosong" }, { status: 400 });
    data.nama = nama;
  }
  const mulai = body.tanggal_mulai !== undefined ? (body.tanggal_mulai as string)?.toString() ?? "" : exists.tanggalMulai;
  const selesai =
    body.tanggal_selesai !== undefined ? (body.tanggal_selesai as string)?.toString() ?? "" : exists.tanggalSelesai;
  if (!isValidDate(mulai) || !isValidDate(selesai))
    return NextResponse.json({ error: "tanggal harus format YYYY-MM-DD" }, { status: 400 });
  if (mulai > selesai)
    return NextResponse.json({ error: "tanggal_mulai tidak boleh setelah tanggal_selesai" }, { status: 400 });
  data.tanggalMulai = mulai;
  data.tanggalSelesai = selesai;
  if (body.multiplier !== undefined) {
    const mult = Number(body.multiplier);
    if (!Number.isFinite(mult) || mult < 1 || mult > 10)
      return NextResponse.json({ error: "multiplier harus angka antara 1 dan 10" }, { status: 400 });
    data.multiplier = mult;
  }
  const updated = await prisma.holiday.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params);
  if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const exists = await prisma.holiday.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "holiday tidak ditemukan" }, { status: 404 });
  await prisma.holiday.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
