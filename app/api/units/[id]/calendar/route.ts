import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/units/[id]/calendar?month=YYYY-MM
 *  status per tanggal: "tersedia" | "dipesan" | "blokir" | "lalu" */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0)
    return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const unit = await prisma.unit.findUnique({ where: { id } });
  if (!unit) return NextResponse.json({ error: "unit tidak ditemukan" }, { status: 404 });

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month))
    return NextResponse.json({ error: "parameter month wajib format YYYY-MM" }, { status: 400 });
  const [y, m] = month.split("-").map(Number);
  if (m < 1 || m > 12) return NextResponse.json({ error: "bulan tidak valid" }, { status: 400 });

  const daysInMonth = new Date(y, m, 0).getDate();
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { unitId: id, status: "confirmed", checkin: { lte: last }, checkout: { gt: first } },
      include: { nights: true },
    }),
    prisma.blockedDate.findMany({
      where: { unitId: id, tanggalMulai: { lte: last }, tanggalSelesai: { gte: first } },
    }),
  ]);

  const bookedDates = new Map<string, number>();
  for (const b of bookings) for (const n of b.nights) bookedDates.set(n.tanggal, b.id);
  const blockedDates = new Set<string>();
  for (const bd of blocks) {
    let cur = bd.tanggalMulai;
    while (cur <= bd.tanggalSelesai) {
      blockedDates.add(cur);
      cur = addOne(cur);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const days: { tanggal: string; status: string; bookingId: number | null }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const tgl = `${month}-${String(d).padStart(2, "0")}`;
    let status = "tersedia";
    let bookingId: number | null = null;
    if (blockedDates.has(tgl)) status = "blokir";
    else if (bookedDates.has(tgl)) {
      status = "dipesan";
      bookingId = bookedDates.get(tgl)!;
    } else if (tgl < todayStr) status = "lalu";
    days.push({ tanggal: tgl, status, bookingId });
  }
  return NextResponse.json({ unitId: id, month, days });
}

function addOne(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
