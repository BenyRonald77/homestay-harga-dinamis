import { prisma } from "@/lib/prisma";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [units, bookings, rules, holidays, logs] = await Promise.all([
    prisma.unit.findMany({ orderBy: { id: "asc" } }),
    prisma.booking.findMany({ orderBy: { checkin: "asc" }, include: { unit: true } }),
    prisma.priceRule.findMany({ where: { aktif: true } }),
    prisma.holiday.findMany({ orderBy: { tanggalMulai: "asc" } }),
    prisma.icalSyncLog.findMany({ orderBy: { id: "desc" }, take: 5, include: { unit: true } }),
  ]);
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const pendapatan = confirmed.reduce((s, b) => s + b.totalHarga, 0);

  return (
    <div className="space-y-6">
      <h2 className="page-title">Dashboard</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card">
          <div className="text-xs font-medium text-slate-500">Unit Homestay</div>
          <div className="mt-1 text-3xl font-bold text-amber-900">{units.length}</div>
        </div>
        <div className="card">
          <div className="text-xs font-medium text-slate-500">Booking Confirmed</div>
          <div className="mt-1 text-3xl font-bold text-amber-900">{confirmed.length}</div>
        </div>
        <div className="card">
          <div className="text-xs font-medium text-slate-500">Booking Dibatalkan</div>
          <div className="mt-1 text-3xl font-bold text-amber-900">
            {bookings.filter((b) => b.status === "cancelled").length}
          </div>
        </div>
        <div className="card">
          <div className="text-xs font-medium text-slate-500">Estimasi Pendapatan</div>
          <div className="mt-1 text-2xl font-bold text-amber-900">{rupiah(pendapatan)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 font-semibold">Unit</h3>
          {units.length === 0 ? (
            <p className="text-sm text-slate-500">
              Belum ada unit. Tambahkan unit pertama di halaman Unit.
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {units.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2">
                  <span className="font-medium">{u.nama}</span>
                  <span className="text-slate-600">
                    {rupiah(u.hargaDasarPerMalam)}/malam · kapasitas {u.kapasitas}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="mb-2 font-semibold">Aturan Harga Aktif</h3>
          {rules.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada aturan harga.</p>
          ) : (
            <ul className="divide-y text-sm">
              {rules.map((r) => (
                <li key={r.id} className="py-2">
                  <span className="font-medium">{r.nama}</span>
                  <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                    {r.tipe}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mb-2 mt-4 font-semibold">Kalender Liburan</h3>
          {holidays.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada periode liburan.</p>
          ) : (
            <ul className="divide-y text-sm">
              {holidays.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2">
                  <span className="font-medium">{h.nama}</span>
                  <span className="text-slate-600">
                    {h.tanggalMulai} – {h.tanggalSelesai} · ×{h.multiplier}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-2 font-semibold">Booking Terakhir</h3>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada booking. Buat booking baru di halaman Booking.
          </p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Tamu</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(-10).map((b) => (
                <tr key={b.id}>
                  <td>{b.unit.nama}</td>
                  <td>{b.tamuNama}</td>
                  <td>{b.checkin}</td>
                  <td>{b.checkout}</td>
                  <td>{rupiah(b.totalHarga)}</td>
                  <td>
                    <span
                      className={
                        b.status === "confirmed"
                          ? "rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                          : "rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600"
                      }
                    >
                      {b.status === "confirmed" ? "Confirmed" : "Dibatalkan"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="mb-2 font-semibold">Log Sinkronisasi iCal Terakhir</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada aktivitas sinkronisasi iCal.</p>
        ) : (
          <ul className="divide-y text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                    {l.arah === "in" ? "Import" : "Export"}
                  </span>{" "}
                  {l.unit ? l.unit.nama : "Semua unit"} · {l.jumlahEvent} event
                </span>
                <span className="text-slate-500">{l.waktu}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
