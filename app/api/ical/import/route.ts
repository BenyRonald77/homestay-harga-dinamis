import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowIso } from "@/lib/format";
import { parseIcal } from "@/lib/ical";

/** POST /api/ical/import { unit_id, ical_text }
 *  Parse VEVENT -> buat BlockedDate (sumber ical), dedupe rentang identik. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "body JSON tidak valid" }, { status: 400 });
  const unitId = Number(body.unit_id);
  const icalText = (body.ical_text as string)?.toString() ?? "";
  if (!Number.isInteger(unitId) || unitId <= 0)
    return NextResponse.json({ error: "unit_id wajib angka positif" }, { status: 400 });
  if (!icalText.trim())
    return NextResponse.json({ error: "ical_text wajib diisi" }, { status: 400 });

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) return NextResponse.json({ error: "unit tidak ditemukan" }, { status: 404 });

  const { events, errors } = parseIcal(icalText);
  if (events.length === 0) {
    await prisma.icalSyncLog.create({
      data: {
        unitId,
        arah: "in",
        jumlahEvent: 0,
        waktu: nowIso(),
        status: "gagal",
        catatan: "Tidak ada VEVENT valid. " + errors.join("; "),
      },
    });
    return NextResponse.json(
      { error: "tidak ada event valid dalam iCal", detail: errors },
      { status: 400 }
    );
  }

  let dibuat = 0;
  let dilewati = 0;
  for (const ev of events) {
    // DTEND iCal eksklusif -> tanggalSelesai inklusif = dtend - 1 hari
    const tanggalSelesai = minusOneDay(ev.dtend);
    const ada = await prisma.blockedDate.findFirst({
      where: { unitId, tanggalMulai: ev.dtstart, tanggalSelesai, sumber: "ical" },
    });
    if (ada) {
      dilewati++;
      continue;
    }
    await prisma.blockedDate.create({
      data: {
        unitId,
        tanggalMulai: ev.dtstart,
        tanggalSelesai,
        sumber: "ical",
        catatan: ev.summary,
      },
    });
    dibuat++;
  }

  const catatan = `Import ${dibuat} rentang baru, ${dilewati} dilewati (duplikat).` +
    (errors.length ? " Peringatan: " + errors.join("; ") : "");
  await prisma.icalSyncLog.create({
    data: { unitId, arah: "in", jumlahEvent: dibuat, waktu: nowIso(), status: "sukses", catatan },
  });
  return NextResponse.json({ dibuat, dilewati, total_event: events.length, catatan });
}

function minusOneDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) - 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
