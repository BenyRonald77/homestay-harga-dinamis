import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function idOf(params: { id?: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params);
  if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const row = await prisma.unit.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "unit tidak ditemukan" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params);
  if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const exists = await prisma.unit.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "unit tidak ditemukan" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (body?.nama !== undefined) {
    const nama = body.nama.toString().trim();
    if (!nama) return NextResponse.json({ error: "nama tidak boleh kosong" }, { status: 400 });
    data.nama = nama;
  }
  if (body?.tipe !== undefined) data.tipe = body.tipe.toString();
  if (body?.kapasitas !== undefined) {
    const k = Number(body.kapasitas);
    if (!Number.isInteger(k) || k < 1)
      return NextResponse.json({ error: "kapasitas harus bilangan bulat >= 1" }, { status: 400 });
    data.kapasitas = k;
  }
  if (body?.harga_dasar_per_malam !== undefined) {
    const h = Number(body.harga_dasar_per_malam);
    if (!Number.isFinite(h) || h <= 0)
      return NextResponse.json({ error: "harga_dasar_per_malam harus angka positif" }, { status: 400 });
    data.hargaDasarPerMalam = h;
  }
  if (body?.deskripsi !== undefined) data.deskripsi = body.deskripsi.toString();
  const updated = await prisma.unit.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params);
  if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const exists = await prisma.unit.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "unit tidak ditemukan" }, { status: 404 });
  const bookingCount = await prisma.booking.count({ where: { unitId: id } });
  if (bookingCount > 0)
    return NextResponse.json(
      { error: `unit tidak bisa dihapus: masih punya ${bookingCount} booking` },
      { status: 409 }
    );
  await prisma.blockedDate.deleteMany({ where: { unitId: id } });
  await prisma.icalSyncLog.deleteMany({ where: { unitId: id } });
  await prisma.unit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
