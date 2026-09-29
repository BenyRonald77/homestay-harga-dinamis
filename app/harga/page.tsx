"use client";
import { useEffect, useState } from "react";

interface Rule { id: number; tipe: string; nama: string; config: string; aktif: boolean; }
interface Holiday { id: number; nama: string; tanggalMulai: string; tanggalSelesai: string; multiplier: number; }

const RULE_CONTOH: Record<string, string> = {
  WEEKEND: JSON.stringify({ surcharge: 0.25, hari: [0, 6] }, null, 2),
  DURATION: JSON.stringify({ tiers: [{ minMalam: 30, diskon: 0.2 }, { minMalam: 7, diskon: 0.1 }, { minMalam: 3, diskon: 0.05 }] }, null, 2),
};

export default function HargaPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [rTipe, setRTipe] = useState("WEEKEND");
  const [rNama, setRNama] = useState("");
  const [rConfig, setRConfig] = useState(RULE_CONTOH.WEEKEND);
  const [hNama, setHNama] = useState("");
  const [hMulai, setHMulai] = useState("");
  const [hSelesai, setHSelesai] = useState("");
  const [hMult, setHMult] = useState("1.5");

  const muat = () => {
    fetch("/api/price-rules").then((r) => r.json()).then(setRules);
    fetch("/api/holidays").then((r) => r.json()).then(setHolidays);
  };
  useEffect(muat, []);

  const tambahRule = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setOk("");
    const res = await fetch("/api/price-rules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipe: rTipe, nama: rNama, config: rConfig }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Gagal menambah rule"); return; }
    setOk("Aturan harga ditambahkan."); setRNama(""); muat();
  };

  const toggleRule = async (r: Rule) => {
    const res = await fetch(`/api/price-rules/${r.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !r.aktif }),
    });
    if (res.ok) muat();
  };

  const hapusRule = async (id: number) => {
    if (!confirm("Hapus aturan ini?")) return;
    const res = await fetch(`/api/price-rules/${id}`, { method: "DELETE" });
    if (res.ok) muat();
  };

  const tambahHoliday = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setOk("");
    const res = await fetch("/api/holidays", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: hNama, tanggal_mulai: hMulai, tanggal_selesai: hSelesai, multiplier: Number(hMult) }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Gagal menambah liburan"); return; }
    setOk("Periode liburan ditambahkan."); setHNama(""); muat();
  };

  const hapusHoliday = async (id: number) => {
    if (!confirm("Hapus periode liburan ini?")) return;
    const res = await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    if (res.ok) muat();
  };

  const ringkasConfig = (tipe: string, config: string) => {
    try {
      const c = JSON.parse(config);
      if (tipe === "WEEKEND") return `surcharge +${Math.round((c.surcharge ?? 0) * 100)}%, hari [${(c.hari ?? []).join(",")}]`;
      if (tipe === "DURATION") return (c.tiers ?? []).map((t: { minMalam: number; diskon: number }) => `≥${t.minMalam} malam: ${Math.round(t.diskon * 100)}%`).join(" · ");
      return config;
    } catch { return config; }
  };

  return (
    <div className="space-y-6">
      <h2 className="page-title">Harga &amp; Kalender Liburan</h2>
      {err && <div className="err">{err}</div>}
      {ok && <div className="ok">{ok}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <form onSubmit={tambahRule} className="card space-y-3">
            <h3 className="font-semibold">Tambah Aturan Harga</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">Tipe
                <select className="mt-1 w-full" value={rTipe} onChange={(e) => { setRTipe(e.target.value); setRConfig(RULE_CONTOH[e.target.value]); }}>
                  <option value="WEEKEND">WEEKEND</option>
                  <option value="DURATION">DURATION</option>
                </select>
              </label>
              <label className="text-sm">Nama
                <input className="mt-1 w-full" value={rNama} onChange={(e) => setRNama(e.target.value)} placeholder="Surcharge Akhir Pekan" required />
              </label>
            </div>
            <label className="block text-sm">Config (JSON)
              <textarea className="mt-1 w-full font-mono text-xs" rows={6} value={rConfig} onChange={(e) => setRConfig(e.target.value)} />
            </label>
            <p className="text-xs text-slate-500">
              WEEKEND: hari 0=Minggu..6=Sabtu. DURATION: tier diskon dari jumlah malam tertinggi yang terpenuhi.
            </p>
            <button className="btn" type="submit">Tambah Aturan</button>
          </form>

          <div className="card">
            <h3 className="mb-2 font-semibold">Daftar Aturan</h3>
            {rules.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada aturan harga.</p>
            ) : (
              <ul className="divide-y text-sm">
                {rules.map((r) => (
                  <li key={r.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{r.nama}</span>
                      <span className="flex items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs ${r.aktif ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>
                          {r.tipe} · {r.aktif ? "aktif" : "nonaktif"}
                        </span>
                        <button className="btn-ghost !px-2 !py-1" onClick={() => toggleRule(r)}>
                          {r.aktif ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button className="btn-danger" onClick={() => hapusRule(r.id)}>Hapus</button>
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500">{ringkasConfig(r.tipe, r.config)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={tambahHoliday} className="card space-y-3">
            <h3 className="font-semibold">Tambah Periode Liburan</h3>
            <label className="block text-sm">Nama
              <input className="mt-1 w-full" value={hNama} onChange={(e) => setHNama(e.target.value)} placeholder="Libur Tahun Baru" required />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm">Mulai
                <input className="mt-1 w-full" type="date" value={hMulai} onChange={(e) => setHMulai(e.target.value)} required />
              </label>
              <label className="text-sm">Selesai
                <input className="mt-1 w-full" type="date" value={hSelesai} onChange={(e) => setHSelesai(e.target.value)} required />
              </label>
              <label className="text-sm">Multiplier
                <input className="mt-1 w-full" type="number" step="0.1" min={1} max={10} value={hMult} onChange={(e) => setHMult(e.target.value)} required />
              </label>
            </div>
            <button className="btn" type="submit">Tambah Liburan</button>
          </form>

          <div className="card">
            <h3 className="mb-2 font-semibold">Kalender Liburan</h3>
            {holidays.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada periode liburan.</p>
            ) : (
              <table className="data">
                <thead><tr><th>Nama</th><th>Periode</th><th>×</th><th>Aksi</th></tr></thead>
                <tbody>
                  {holidays.map((h) => (
                    <tr key={h.id}>
                      <td className="font-medium">{h.nama}</td>
                      <td>{h.tanggalMulai} – {h.tanggalSelesai}</td>
                      <td>{h.multiplier}</td>
                      <td><button className="btn-danger" onClick={() => hapusHoliday(h.id)}>Hapus</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
