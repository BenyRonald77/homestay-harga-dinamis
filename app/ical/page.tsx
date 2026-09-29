"use client";
import { useEffect, useState } from "react";

interface Unit { id: number; nama: string; }
interface Log {
  id: number; arah: string; jumlahEvent: number; waktu: string; status: string;
  catatan: string; unit: Unit | null;
}

export default function IcalPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [icalText, setIcalText] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const muatLogs = (uid: string) => {
    const qs = uid ? `?unit_id=${uid}` : "";
    fetch(`/api/ical/logs${qs}`).then((r) => r.json()).then(setLogs);
  };

  useEffect(() => {
    fetch("/api/units").then((r) => r.json()).then((u: Unit[]) => {
      setUnits(u);
      if (u.length > 0) { setUnitId(String(u[0].id)); muatLogs(String(u[0].id)); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gantiUnit = (uid: string) => { setUnitId(uid); muatLogs(uid); };

  const importIcal = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setOk("");
    if (!unitId) { setErr("Pilih unit dulu."); return; }
    const res = await fetch("/api/ical/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit_id: Number(unitId), ical_text: icalText }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Gagal import"); return; }
    setOk(`Import selesai: ${data.dibuat} rentang baru dibuat, ${data.dilewati} duplikat dilewati.`);
    setIcalText(""); muatLogs(unitId);
  };

  return (
    <div className="space-y-6">
      <h2 className="page-title">Sinkronisasi iCal</h2>
      {err && <div className="err">{err}</div>}
      {ok && <div className="ok">{ok}</div>}

      <div className="card">
        <label className="text-sm">Unit
          <select className="ml-2" value={unitId} onChange={(e) => gantiUnit(e.target.value)}>
            {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
          </select>
        </label>
        <div className="mt-3 flex gap-2">
          <a
            className={`btn ${!unitId ? "pointer-events-none opacity-50" : ""}`}
            href={unitId ? `/api/ical?unit_id=${unitId}` : "#"}
            download={`unit-${unitId}.ics`}
          >
            Export &amp; Download .ics
          </a>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          File berisi semua booking confirmed + tanggal terblokir unit ini sebagai VEVENT.
        </p>
      </div>

      <form onSubmit={importIcal} className="card space-y-3">
        <h3 className="font-semibold">Import iCal</h3>
        <p className="text-sm text-slate-600">
          Tempel isi file .ics (mis. dari Google Calendar / Airbnb). Setiap VEVENT menjadi rentang
          tanggal terblokir dan ikut dicek saat validasi booking.
        </p>
        <textarea
          className="w-full font-mono text-xs"
          rows={10}
          value={icalText}
          onChange={(e) => setIcalText(e.target.value)}
          placeholder={"BEGIN:VCALENDAR\n...\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261224\nDTEND;VALUE=DATE:20261227\nSUMMARY:Tamu Airbnb\nEND:VEVENT\n..."}
        />
        <button className="btn" type="submit">Import</button>
      </form>

      <div className="card">
        <h3 className="mb-2 font-semibold">Log Sinkronisasi</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada aktivitas sinkronisasi.</p>
        ) : (
          <table className="data">
            <thead><tr><th>Waktu</th><th>Arah</th><th>Unit</th><th>Event</th><th>Status</th><th>Catatan</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap">{l.waktu}</td>
                  <td>{l.arah === "in" ? "Import" : "Export"}</td>
                  <td>{l.unit ? l.unit.nama : "-"}</td>
                  <td>{l.jumlahEvent}</td>
                  <td>
                    <span className={l.status === "sukses" ? "rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800" : "rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"}>
                      {l.status}
                    </span>
                  </td>
                  <td className="max-w-xs break-words">{l.catatan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
