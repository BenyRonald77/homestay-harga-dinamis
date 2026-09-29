import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowIso } from "@/lib/format";
import { buildIcal, ExportItem } from "@/lib/ical";

/** GET /api/ical?unit_id=<id> -> text/calendar, dicatat di IcalSyncLog */
export async function GET(req: NextRequest) {
  const unitId = Number(req.nextUrl.searchParams.get("unit_id"));
  if (!Number.isInteger(unitId) || unitId <= 0)
    return NextResponse.json({ error: "unit_id wajib angka positif" }, { status: 400 });
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) return NextResponse.json({ error: "unit tidak ditemukan" }, { status: 404 });

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({ where: { unitId, status: "confirmed" }, orderBy: { checkin: "asc" } }),
    prisma.blockedDate.findMany({ where: { unitId }, orderBy: { tanggalMulai: "asc" } }),
  ]);

  const items: ExportItem[] = [
    ...bookings.map((b) => ({
      uid: `booking-${b.id}@homestay-harga-dinamis`,
      summary: `Booking: ${b.tamuNama} (${b.checkin} s/d ${b.checkout})`,
      dtstart: b.checkin,
      dtend: b.checkout,
    })),
    ...blocks.map((bd) => ({
      uid: `blocked-${bd.id}@homestay-harga-dinamis`,
      summary: `Terblokir${bd.catatan ? ": " + bd.catatan : ""} [${bd.sumber}]`,
      dtstart: bd.tanggalMulai,
      // DTEND iCal eksklusif -> tambah 1 hari dari tanggalSelesai inklusif
      dtend: plusOneDay(bd.tanggalSelesai),
    })),
  ];

  const ics = buildIcal("homestay-harga-dinamis", items);
  await prisma.icalSyncLog.create({
    data: {
      unitId,
      arah: "out",
      jumlahEvent: items.length,
      waktu: nowIso(),
      status: "sukses",
      catatan: `Export ${items.length} event untuk ${unit.nama}`,
    },
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="unit-${unitId}.ics"`,
    },
  });
}

function plusOneDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
