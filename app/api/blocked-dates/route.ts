import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidDate } from "@/lib/format";

export async function GET(req: NextRequest) {
  const unitIdParam = req.nextUrl.searchParams.get("unit_id");
  const where: Record<string, unknown> = {};
  if (unitIdParam) {
    const id = Number(unitIdParam);
    if (!Number.isInteger(id) || id <= 0)
      return NextResponse.json({ error: "unit_id tidak valid" }, { status: 400 });
    where.unitId = id;
  }
  const rows = await prisma.blockedDate.findMany({
    where,
    orderBy: { tanggalMulai: "asc" },
    include: { unit: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "body JSON tidak valid" }, { status: 400 });
  const unitId = Number(body.unit_id);
  const mulai = (body.tanggal_mulai as string)?.toString() ?? "";
  const selesai = (body.tanggal_selesai as string)?.toString() ?? "";
  if (!Number.isInteger(unitId) || unitId <= 0)
    return NextResponse.json({ error: "unit_id wajib angka positif" }, { status: 400 });
  if (!isValidDate(mulai) || !isValidDate(selesai))
    return NextResponse.json({ error: "tanggal_mulai & tanggal_selesai wajib YYYY-MM-DD" }, { status: 400 });
  if (mulai > selesai)
    return NextResponse.json({ error: "tanggal_mulai tidak boleh setelah tanggal_selesai" }, { status: 400 });
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) return NextResponse.json({ error: "unit tidak ditemukan" }, { status: 404 });
  const created = await prisma.blockedDate.create({
    data: {
      unitId,
      tanggalMulai: mulai,
      tanggalSelesai: selesai,
      sumber: (body.sumber as string)?.toString() ?? "manual",
      catatan: (body.catatan as string)?.toString() ?? "",
    },
  });
  return NextResponse.json(created, { status: 201 });
}
