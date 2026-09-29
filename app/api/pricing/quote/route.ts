import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quoteHarga } from "@/lib/pricing";
import { isValidDate } from "@/lib/format";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const unitId = Number(q.get("unit_id"));
  const checkin = q.get("checkin") ?? "";
  const checkout = q.get("checkout") ?? "";
  if (!Number.isInteger(unitId) || unitId <= 0)
    return NextResponse.json({ error: "unit_id wajib angka positif" }, { status: 400 });
  if (!isValidDate(checkin) || !isValidDate(checkout))
    return NextResponse.json({ error: "checkin & checkout wajib format YYYY-MM-DD" }, { status: 400 });
  if (!(checkin < checkout))
    return NextResponse.json({ error: "checkin harus sebelum checkout" }, { status: 400 });

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) return NextResponse.json({ error: "unit tidak ditemukan" }, { status: 404 });

  const [rules, holidays] = await Promise.all([
    prisma.priceRule.findMany(),
    prisma.holiday.findMany(),
  ]);
  const quote = quoteHarga(unit.hargaDasarPerMalam, checkin, checkout, rules, holidays);
  return NextResponse.json({
    unit: { id: unit.id, nama: unit.nama, harga_dasar_per_malam: unit.hargaDasarPerMalam },
    checkin,
    checkout,
    ...quote,
  });
}
