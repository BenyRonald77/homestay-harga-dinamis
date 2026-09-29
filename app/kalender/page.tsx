"use client";
import { useEffect, useState } from "react";
import { NAMA_BULAN, NAMA_HARI } from "@/lib/format";

interface Unit { id: number; nama: string; }
interface Day { tanggal: string; status: string; bookingId: number | null; }

const WARNA: Record<string, string> = {
  tersedia: "bg-green-100 text-green-900 hover:bg-green-200",
  dipesan: "bg-red-200 text-red-900",
  blokir: "bg-slate-300 text-slate-700",
  lalu: "bg-slate-50 text-slate-400",
};

const LABEL: Record<string, string> = {
  tersedia: "Tersedia", dipesan: "Dipesan", blokir: "Terblokir", lalu: "Sudah lewat",
};

function bulanIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function KalenderPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [month, setMonth] = useState(bulanIni());
  const [days, setDays] = useState<Day[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/units").then((r) => r.json()).then((u: Unit[]) => {
      setUnits(u);
      if (u.length > 0 && !unitId) setUnitId(String(u[0].id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!unitId) return;
    fetch(`/api/units/${unitId}/calendar?month=${month}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setErr(d.error ?? "Gagal memuat kalender"); setDays([]); return; }
        setErr("");
        setDays(d.days);
      });
  }, [unitId, month]);

  const geserBulan = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const t = new Date(y, m - 1 + delta, 1);
    setMonth(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  };

  const [ty, tm] = month.split("-").map(Number);
  const offset = new Date(ty, tm - 1, 1).getDay();
  const [yNum, mNum] = [ty, tm];

  return (
    <div className="space-y-6">
      <h2 className="page-title">Kalender Ketersediaan</h2>
      {err && <div className="err">{err}</div>}

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm">Unit
            <select className="ml-2" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button className="btn-ghost !px-3" onClick={() => geserBulan(-1)}>‹</button>
            <span className="min-w-40 text-center font-semibold">
              {NAMA_BULAN[mNum - 1]} {yNum}
            </span>
            <button className="btn-ghost !px-3" onClick={() => geserBulan(1)}>›</button>
          </div>
          <div className="ml-auto flex flex-wrap gap-3 text-xs">
            {Object.entries(LABEL).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className={`inline-block h-3 w-3 rounded ${WARNA[k].split(" ")[0]}`}></span> {v}
              </span>
            ))}
          </div>
        </div>

        {units.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada unit. Tambahkan unit di halaman Unit dulu.</p>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {NAMA_HARI.map((h) => (
              <div key={h} className="py-1 text-center text-xs font-semibold text-slate-500">{h}</div>
            ))}
            {Array.from({ length: offset }).map((_, i) => <div key={`o${i}`} />)}
            {days.map((d) => (
              <div
                key={d.tanggal}
                title={`${d.tanggal} — ${LABEL[d.status]}${d.bookingId ? ` (booking #${d.bookingId})` : ""}`}
                className={`rounded-md p-2 text-center text-sm font-medium ${WARNA[d.status]}`}
              >
                {Number(d.tanggal.slice(8, 10))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
