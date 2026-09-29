"use client";
import { useEffect, useState } from "react";
import { rupiah, today, formatTanggal } from "@/lib/format";

interface Unit { id: number; nama: string; }
interface Night { tanggal: string; harga: number; faktor: string[]; }
interface Quote {
  jumlahMalam: number; malam: Night[]; subtotal: number;
  diskonPersen: number; diskonNominal: number; total: number; aturanDiterapkan: string[];
}
interface Booking {
  id: number; tamuNama: string; tamuTelp: string; checkin: string; checkout: string;
  totalHarga: number; status: string; unit: Unit;
}

export default function BookingPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [unitId, setUnitId] = useState("");
  const [tamuNama, setTamuNama] = useState("");
  const [tamuTelp, setTamuTelp] = useState("");
  const [checkin, setCheckin] = useState(today());
  const [checkout, setCheckout] = useState(today());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);

  const muat = () => {
    fetch("/api/units").then((r) => r.json()).then(setUnits);
    fetch("/api/bookings").then((r) => r.json()).then(setBookings);
  };
  useEffect(muat, []);

  const ambilQuote = async () => {
    if (!unitId || !checkin || !checkout) return;
    setLoadingQuote(true); setQuote(null);
    const res = await fetch(`/api/pricing/quote?unit_id=${unitId}&checkin=${checkin}&checkout=${checkout}`);
    const data = await res.json();
    setLoadingQuote(false);
    if (!res.ok) { setErr(data.error ?? "Gagal menghitung harga"); return; }
    setErr("");
    setQuote(data);
  };

  const buatBooking = async () => {
    setErr(""); setOk("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit_id: Number(unitId), tamu_nama: tamuNama, tamu_telp: tamuTelp, checkin, checkout }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Gagal membuat booking"); return; }
    setOk(`Booking #${data.id} berhasil dibuat. Total ${rupiah(data.totalHarga)}.`);
    setTamuNama(""); setTamuTelp(""); setQuote(null); muat();
  };

  const batalkan = async (id: number) => {
    if (!confirm(`Batalkan booking #${id}?`)) return;
    setErr(""); setOk("");
    const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Gagal membatalkan"); return; }
    setOk(`Booking #${id} dibatalkan.`); muat();
  };

  return (
    <div className="space-y-6">
      <h2 className="page-title">Booking</h2>
      {err && <div className="err">{err}</div>}
      {ok && <div className="ok">{ok}</div>}

      <div className="card space-y-3">
        <h3 className="font-semibold">Booking Baru</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">Unit
            <select className="mt-1 w-full" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">-- pilih unit --</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
            </select>
          </label>
          <label className="text-sm">Nama tamu
            <input className="mt-1 w-full" value={tamuNama} onChange={(e) => setTamuNama(e.target.value)} placeholder="Nama lengkap tamu" />
          </label>
          <label className="text-sm">No. telepon
            <input className="mt-1 w-full" value={tamuTelp} onChange={(e) => setTamuTelp(e.target.value)} placeholder="08xxxxxxxxxx" />
          </label>
          <label className="text-sm">Check-in
            <input className="mt-1 w-full" type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
          </label>
          <label className="text-sm">Check-out
            <input className="mt-1 w-full" type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
          </label>
          <div className="flex items-end">
            <button className="btn-ghost" type="button" onClick={ambilQuote}>Hitung Harga</button>
          </div>
        </div>

        {loadingQuote && <p className="text-sm text-slate-500">Menghitung harga...</p>}
        {quote && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <h4 className="mb-2 font-semibold">Rincian Harga ({quote.jumlahMalam} malam)</h4>
            <table className="data mb-3">
              <thead><tr><th>Tanggal</th><th>Faktor</th><th className="text-right">Harga</th></tr></thead>
              <tbody>
                {quote.malam.map((m) => (
                  <tr key={m.tanggal}>
                    <td>{formatTanggal(m.tanggal)}</td>
                    <td className="text-slate-600">{m.faktor.length ? m.faktor.join(", ") : "Harga dasar"}</td>
                    <td className="text-right">{rupiah(m.harga)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{rupiah(quote.subtotal)}</span></div>
              {quote.diskonPersen > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Diskon durasi {Math.round(quote.diskonPersen * 100)}%</span>
                  <span>-{rupiah(quote.diskonNominal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 text-base font-bold">
                <span>Total</span><span>{rupiah(quote.total)}</span>
              </div>
              {quote.aturanDiterapkan.length > 0 && (
                <p className="pt-1 text-xs text-slate-500">Aturan: {quote.aturanDiterapkan.join(" · ")}</p>
              )}
            </div>
            <button className="btn mt-3" type="button" onClick={buatBooking} disabled={!tamuNama.trim()}>
              Buat Booking
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="mb-2 font-semibold">Daftar Booking</h3>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada booking.</p>
        ) : (
          <table className="data">
            <thead><tr><th>ID</th><th>Unit</th><th>Tamu</th><th>Check-in</th><th>Check-out</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>{b.unit.nama}</td>
                  <td>{b.tamuNama}{b.tamuTelp ? ` (${b.tamuTelp})` : ""}</td>
                  <td>{b.checkin}</td>
                  <td>{b.checkout}</td>
                  <td>{rupiah(b.totalHarga)}</td>
                  <td>
                    <span className={b.status === "confirmed" ? "rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800" : "rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600"}>
                      {b.status === "confirmed" ? "Confirmed" : "Dibatalkan"}
                    </span>
                  </td>
                  <td>
                    {b.status === "confirmed" && (
                      <button className="btn-danger" onClick={() => batalkan(b.id)}>Batalkan</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
