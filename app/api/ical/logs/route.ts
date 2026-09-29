import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const unitIdParam = req.nextUrl.searchParams.get("unit_id");
  const where: Record<string, unknown> = {};
  if (unitIdParam) {
    const id = Number(unitIdParam);
    if (!Number.isInteger(id) || id <= 0)
      return NextResponse.json({ error: "unit_id tidak valid" }, { status: 400 });
    where.unitId = id;
  }
  const rows = await prisma.icalSyncLog.findMany({
    where,
    orderBy: { id: "desc" },
    take: 100,
    include: { unit: true },
  });
  return NextResponse.json(rows);
}
