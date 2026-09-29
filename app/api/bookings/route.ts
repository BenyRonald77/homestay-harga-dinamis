import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidDate, nowIso } from "@/lib/format";
import { quoteHarga } from "@/lib/pricing";
import { cekKonflik } from "@/lib/booking";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const where: Record<string, unknown> = {};
  const unitId = q.get("unit_id");
  if (unitId) {
    const id = Number(unitId);
    if (!Number.isInteger(id) || id <= 0)
      return NextResponse.json({ error: "unit_id tidak valid" }, { status: 400 });
    where.unitId = id;
  }
  const from = q.get("from");
  const to = q.get("to");
  if (from) {
    if (!isValidDate(from)) return NextResponse.json({ error: "from harus YYYY-MM-DD" }, { status: 400 });
    (where as Record<string, unknown>).checkin = { gte: from };
  }
  if (to) {
    if (!isValidDate(to)) return NextResponse.json({ error: "to harus YYYY-MM-DD" }, { status: 400 });
    (where as Record<string, unknown>).checkout = { lte: to };
  }
  const rows = await prisma.booking.findMany({
    where,
    orderBy: { checkin: "asc" },
    include: { unit: true, nights: { orderBy: { tanggal: "asc" } } },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "body JSON tidak valid" }, { status: 400 });

  const unitId = Number(body.unit_id);
  const tamuNama = (body.tamu_nama as string)?.toString().trim() ?? "";
  const tamuTelp = (body.tamu_telp as string)?.toString().trim() ?? "";
  const checkin = (body.checkin as string)?.toString() ?? "";
  const checkout = (body.checkout as string)?.toString() ?? "";

  if (!Number.isInteger(unitId) || unitId <= 0)
    return NextResponse.json({ error: "unit_id wajib angka positif" }, { status: 400 });
  if (!tamuNama) return NextResponse.json({ error: "tamu_nama wajib diisi" }, { status: 400 });
  if (!isValidDate(checkin) || !isValidDate(checkout))
    return NextResponse.json({ error: "checkin & checkout wajib format YYYY-MM-DD" }, { status: 400 });
  if (!(checkin < checkout))
    return NextResponse.json({ error: "checkin harus sebelum checkout" }, { status: 400 });

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) return NextResponse.json({ error: "unit tidak ditemukan" }, { status: 404 });

  const { bentrokBooking, bentrokBlokir } = await cekKonflik(unitId, checkin, checkout);
  if (bentrokBooking)
    return NextResponse.json(
      {
        error: `tanggal bentrok dengan booking #${bentrokBooking.id} (${bentrokBooking.tamuNama}, ${bentrokBooking.checkin} s/d ${bentrokBooking.checkout})`,
      },
      { status: 409 }
    );
  if (bentrokBlokir)
    return NextResponse.json(
      {
        error: `tanggal bentrok dengan periode terblokir (${bentrokBlokir.tanggalMulai} s/d ${bentrokBlokir.tanggalSelesai}, sumber: ${bentrokBlokir.sumber})`,
      },
      { status: 409 }
    );

  const [rules, holidays] = await Promise.all([
    prisma.priceRule.findMany(),
    prisma.holiday.findMany(),
  ]);
  const quote = quoteHarga(unit.hargaDasarPerMalam, checkin, checkout, rules, holidays);

  const booking = await prisma.booking.create({
    data: {
      unitId,
      tamuNama,
      tamuTelp,
      checkin,
      checkout,
      totalHarga: quote.total,
      status: "confirmed",
      dibuatPada: nowIso(),
      nights: {
        create: quote.malam.map((m) => ({ tanggal: m.tanggal, harga: m.harga })),
      },
    },
    include: { unit: true, nights: { orderBy: { tanggal: "asc" } } },
  });
  return NextResponse.json({ ...booking, rincian_harga: quote }, { status: 201 });
}
