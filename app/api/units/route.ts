import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.unit.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const nama = body?.nama?.toString().trim();
  const harga = Number(body?.harga_dasar_per_malam);
  if (!nama) return NextResponse.json({ error: "nama wajib diisi" }, { status: 400 });
  if (!Number.isFinite(harga) || harga <= 0)
    return NextResponse.json({ error: "harga_dasar_per_malam harus angka positif" }, { status: 400 });
  const kapasitas = Number(body?.kapasitas ?? 2);
  if (!Number.isInteger(kapasitas) || kapasitas < 1)
    return NextResponse.json({ error: "kapasitas harus bilangan bulat >= 1" }, { status: 400 });
  const created = await prisma.unit.create({
    data: {
      nama,
      tipe: body?.tipe?.toString() ?? "Villa",
      kapasitas,
      hargaDasarPerMalam: harga,
      deskripsi: body?.deskripsi?.toString() ?? "",
    },
  });
  return NextResponse.json(created, { status: 201 });
}
