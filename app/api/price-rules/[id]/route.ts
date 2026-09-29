import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function idOf(params: { id?: string }) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params);
  if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const exists = await prisma.priceRule.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "rule tidak ditemukan" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (body?.nama !== undefined) {
    const nama = body.nama.toString().trim();
    if (!nama) return NextResponse.json({ error: "nama tidak boleh kosong" }, { status: 400 });
    data.nama = nama;
  }
  if (body?.config !== undefined) {
    let obj: unknown = body.config;
    if (typeof body.config === "string") {
      try {
        obj = JSON.parse(body.config);
      } catch {
        return NextResponse.json({ error: "config harus JSON valid" }, { status: 400 });
      }
    }
    if (typeof obj !== "object" || obj === null)
      return NextResponse.json({ error: "config harus objek JSON" }, { status: 400 });
    data.config = typeof body.config === "string" ? body.config : JSON.stringify(body.config);
  }
  if (body?.aktif !== undefined) data.aktif = Boolean(body.aktif);
  const updated = await prisma.priceRule.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = idOf(params);
  if (!id) return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  const exists = await prisma.priceRule.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "rule tidak ditemukan" }, { status: 404 });
  await prisma.priceRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
