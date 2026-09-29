import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidDate } from "@/lib/format";

function checkPayload(body: Record<string, unknown>): string | null {
  const nama = (body?.nama as string)?.toString().trim();
  if (!nama) return "nama wajib diisi";
  const mulai = body?.tanggal_mulai?.toString() ?? "";
  const selesai = body?.tanggal_selesai?.toString() ?? "";
  if (!isValidDate(mulai) || !isValidDate(selesai))
    return "tanggal_mulai dan tanggal_selesai wajib format YYYY-MM-DD";
  if (mulai > selesai) return "tanggal_mulai tidak boleh setelah tanggal_selesai";
  const mult = Number(body?.multiplier);
  if (!Number.isFinite(mult) || mult < 1 || mult > 10)
    return "multiplier harus angka antara 1 dan 10";
  return null;
}

export async function GET() {
  const rows = await prisma.holiday.findMany({ orderBy: { tanggalMulai: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "body JSON tidak valid" }, { status: 400 });
  const err = checkPayload(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const created = await prisma.holiday.create({
    data: {
      nama: (body.nama as string).toString().trim(),
      tanggalMulai: (body.tanggal_mulai as string).toString(),
      tanggalSelesai: (body.tanggal_selesai as string).toString(),
      multiplier: Number(body.multiplier ?? 1),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
