import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPE_VALID = ["WEEKEND", "DURATION"];

function isValidTier(t: unknown): boolean {
  if (typeof t !== "object" || t === null) return false;
  const r = t as Record<string, unknown>;
  return (
    Number.isInteger(r.minMalam) &&
    typeof r.diskon === "number" &&
    (r.diskon as number) >= 0 &&
    (r.diskon as number) < 1
  );
}
function validateConfig(tipe: string, config: unknown): string | null {
  let obj: unknown = config;
  if (typeof config === "string") {
    try {
      obj = JSON.parse(config);
    } catch {
      return "config harus JSON valid";
    }
  }
  if (typeof obj !== "object" || obj === null) return "config harus objek JSON";
  const c = obj as Record<string, unknown>;
  if (tipe === "WEEKEND") {
    if (typeof c.surcharge !== "number" || c.surcharge < 0 || c.surcharge > 5)
      return "config WEEKEND butuh {surcharge: number 0..5, hari: [0..6]}";
    if (!Array.isArray(c.hari) || !c.hari.every((h) => Number.isInteger(h) && h >= 0 && h <= 6))
      return "config WEEKEND butuh {surcharge: number 0..5, hari: [0..6]}";
  }
  if (tipe === "DURATION") {
    if (!Array.isArray(c.tiers) || !c.tiers.every(isValidTier))
      return "config DURATION butuh {tiers: [{minMalam: int, diskon: 0..1}]}";
  }
  return null;
}

export async function GET() {
  const rows = await prisma.priceRule.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const tipe = body?.tipe?.toString().toUpperCase();
  if (!TIPE_VALID.includes(tipe))
    return NextResponse.json({ error: "tipe harus salah satu: WEEKEND, DURATION" }, { status: 400 });
  const nama = body?.nama?.toString().trim();
  if (!nama) return NextResponse.json({ error: "nama wajib diisi" }, { status: 400 });
  if (body?.config === undefined)
    return NextResponse.json({ error: "config wajib diisi" }, { status: 400 });
  const err = validateConfig(tipe, body.config);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const created = await prisma.priceRule.create({
    data: {
      tipe,
      nama,
      config: typeof body.config === "string" ? body.config : JSON.stringify(body.config),
      aktif: body?.aktif !== undefined ? Boolean(body.aktif) : true,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
