import { dayOfWeek, eachDate } from "./format";

export interface WeekendConfig {
  surcharge: number; // 0.25 = +25%
  hari: number[]; // 0=Minggu..6=Sabtu
}
export interface DurationTier {
  minMalam: number;
  diskon: number; // 0.05 = 5%
}
export interface NightQuote {
  tanggal: string;
  hargaDasar: number;
  harga: number;
  faktor: string[]; // label faktor yang berlaku, mis. "Weekend +25%", "Libur Tahun Baru x1.5"
}
export interface QuoteResult {
  jumlahMalam: number;
  malam: NightQuote[];
  subtotal: number;
  diskonPersen: number;
  diskonNominal: number;
  total: number;
  aturanDiterapkan: string[];
}

interface RuleLike {
  tipe: string;
  nama: string;
  config: string;
  aktif: boolean;
}
interface HolidayLike {
  nama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  multiplier: number;
}

function parseConfig<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return v as T;
  } catch {
    return fallback;
  }
}

export function quoteHarga(
  hargaDasar: number,
  checkin: string,
  checkout: string,
  rules: RuleLike[],
  holidays: HolidayLike[]
): QuoteResult {
  const tanggalList = eachDate(checkin, checkout);
  const weekendRule = rules.find((r) => r.aktif && r.tipe === "WEEKEND");
  const weekendCfg = weekendRule
    ? parseConfig<WeekendConfig>(weekendRule.config, { surcharge: 0, hari: [] })
    : { surcharge: 0, hari: [] as number[] };
  const durationRule = rules.find((r) => r.aktif && r.tipe === "DURATION");
  const tiers = durationRule
    ? parseConfig<{ tiers: DurationTier[] }>(durationRule.config, { tiers: [] }).tiers ?? []
    : [];

  const aturanDiterapkan: string[] = [];
  const malam: NightQuote[] = tanggalList.map((tgl) => {
    const faktor: string[] = [];
    let harga = hargaDasar;
    const dow = dayOfWeek(tgl);
    if (weekendCfg.hari.includes(dow) && weekendCfg.surcharge > 0) {
      harga = harga * (1 + weekendCfg.surcharge);
      faktor.push(`Weekend +${Math.round(weekendCfg.surcharge * 100)}%`);
    }
    let mult = 1;
    let namaLibur = "";
    for (const h of holidays) {
      if (h.tanggalMulai <= tgl && tgl <= h.tanggalSelesai && h.multiplier > mult) {
        mult = h.multiplier;
        namaLibur = h.nama;
      }
    }
    if (mult > 1) {
      harga = harga * mult;
      faktor.push(`${namaLibur} x${mult}`);
    }
    return { tanggal: tgl, hargaDasar, harga: Math.round(harga), faktor };
  });

  const subtotal = malam.reduce((s, m) => s + m.harga, 0);
  const jumlahMalam = tanggalList.length;
  let diskonPersen = 0;
  for (const t of tiers) {
    if (jumlahMalam >= t.minMalam && t.diskon > diskonPersen) diskonPersen = t.diskon;
  }
  const diskonNominal = Math.round(subtotal * diskonPersen);
  const total = subtotal - diskonNominal;

  if (weekendRule && weekendCfg.surcharge > 0)
    aturanDiterapkan.push(`Surcharge weekend +${Math.round(weekendCfg.surcharge * 100)}%`);
  if (diskonPersen > 0)
    aturanDiterapkan.push(`Diskon durasi ${Math.round(diskonPersen * 100)}% (${jumlahMalam} malam)`);
  const seen = new Set<string>();
  const liburTerpakai: string[] = [];
  for (const m of malam)
    for (const f of m.faktor)
      if (f.includes(" x") && !seen.has(f)) {
        seen.add(f);
        liburTerpakai.push(f);
      }
  aturanDiterapkan.push(...liburTerpakai);

  return { jumlahMalam, malam, subtotal, diskonPersen, diskonNominal, total, aturanDiterapkan };
}

/** Cek apakah rentang [checkin, checkout) overlap dengan booking lain / rentang blokir */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEndExclusive: string): boolean {
  return aStart < bEndExclusive && bStart < aEnd;
}
