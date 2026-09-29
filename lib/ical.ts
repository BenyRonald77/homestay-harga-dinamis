/** Parser & generator iCal sederhana (RFC 5545 subset: VEVENT, DTSTART, DTEND, SUMMARY, UID) */

export interface IcalEvent {
  uid: string;
  summary: string;
  dtstart: string; // YYYY-MM-DD
  dtend: string; // YYYY-MM-DD (eksklusif, sesuai iCal untuk VALUE=DATE)
  raw: string;
}

/** Gabungkan line folding iCal (baris lanjutan diawali spasi/tab) */
function unfoldLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Ambil nilai tanggal dari properti iCal, kembalikan YYYY-MM-DD atau null */
function parseIcalDate(value: string): string | null {
  const v = value.trim();
  // 20261224 atau 20261224T090000(Z / +0700)
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(T.*)?$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // 2026-12-24 atau 2026-12-24T09:00:00
  const m2 = v.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m2) return m2[1];
  return null;
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

export function parseIcal(text: string): { events: IcalEvent[]; errors: string[] } {
  const events: IcalEvent[] = [];
  const errors: string[] = [];
  const lines = unfoldLines(text);
  let current: Record<string, string> | null = null;
  let veventCount = 0;

  for (const line of lines) {
    const t = line.trim();
    if (t === "BEGIN:VEVENT") {
      current = {};
      veventCount++;
    } else if (t === "END:VEVENT") {
      if (current) {
        const uid = current["UID"] ?? `event-${veventCount}`;
        const summary = current["SUMMARY"] ? unescapeText(current["SUMMARY"]) : "(tanpa judul)";
        const dtstart = current["DTSTART"] ? parseIcalDate(current["DTSTART"]) : null;
        const dtend = current["DTEND"] ? parseIcalDate(current["DTEND"]) : null;
        if (!dtstart) {
          errors.push(`VEVENT ke-${veventCount} dilewati: DTSTART tidak valid/hilang`);
        } else {
          events.push({
            uid,
            summary,
            dtstart,
            // DTEND iCal bersifat eksklusif; jika hilang, anggap 1 hari
            dtend: dtend && dtend > dtstart ? dtend : addOneDay(dtstart),
            raw: t,
          });
        }
      }
      current = null;
    } else if (current) {
      const idx = t.indexOf(":");
      if (idx > 0) {
        const key = t.slice(0, idx).split(";")[0].toUpperCase();
        const val = t.slice(idx + 1);
        if (["UID", "SUMMARY", "DTSTART", "DTEND"].includes(key)) current[key] = val;
      }
    }
  }
  return { events, errors };
}

function addOneDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

function toIcalDate(ymd: string): string {
  return ymd.replace(/-/g, "");
}

function escapeText(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface ExportItem {
  uid: string;
  summary: string;
  dtstart: string; // YYYY-MM-DD
  dtend: string; // YYYY-MM-DD eksklusif
}

export function buildIcal(prodId: string, items: ExportItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
  ];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "") + "Z";
  for (const it of items) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${it.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcalDate(it.dtstart)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcalDate(it.dtend)}`);
    lines.push(`SUMMARY:${escapeText(it.summary)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
