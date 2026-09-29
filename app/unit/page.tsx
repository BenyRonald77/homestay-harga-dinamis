"use client";
import { useEffect, useState } from "react";
import { rupiah } from "@/lib/format";

interface Unit {
  id: number;
  nama: string;
  tipe: string;
  kapasitas: number;
  hargaDasarPerMalam: number;
  deskripsi: string;
}

const kosong = { nama: "", tipe: "Villa", kapasitas: "2", harga_dasar_per_malam: "", deskripsi: "" };

export default function UnitPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [form, setForm] = useState(kosong);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const muat = () => fetch("/api/units").then((r) => r.json()).then(setUnits);
  useEffect(() => { muat(); }, []);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setOk("");
    const payload = {
      nama: form.nama,
      tipe: form.tipe,
      kapasitas: Number(form.kapasitas),
      harga_dasar_per_malam: Number(form.harga_dasar_per_malam),
      deskripsi: form.deskripsi,
    };
    const res = await fetch(editId ? `/api/units/${editId}` : "/api/units", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Gagal menyimpan"); return; }
    setOk(editId ? "Unit diperbarui." : "Unit ditambahkan.");
    setForm(kosong); setEditId(null); muat();
  };

  const edit = (u: Unit) => {
    setEditId(u.id);
    setForm({
      nama: u.nama, tipe: u.tipe, kapasitas: String(u.kapasitas),
      harga_dasar_per_malam: String(u.hargaDasarPerMalam), deskripsi: u.deskripsi,
    });
  };

  const hapus = async (id: number) => {
    if (!confirm("Hapus unit ini?")) return;
    setErr(""); setOk("");
    const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Gagal menghapus"); return; }
    setOk("Unit dihapus."); muat();
  };

  return (
    <div className="space-y-6">
      <h2 className="page-title">Unit Homestay</h2>
      {err && <div className="err">{err}</div>}
      {ok && <div className="ok">{ok}</div>}

      <form onSubmit={simpan} className="card space-y-3">
        <h3 className="font-semibold">{editId ? "Ubah Unit" : "Tambah Unit"}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">Nama unit
            <input className="mt-1 w-full" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama villa" required />
          </label>
          <label className="text-sm">Tipe
            <select className="mt-1 w-full" value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })}>
              <option>Villa</option><option>Apartemen</option><option>Kamar</option><option>Rumah</option>
            </select>
          </label>
          <label className="text-sm">Kapasitas (orang)
            <input className="mt-1 w-full" type="number" min={1} value={form.kapasitas} onChange={(e) => setForm({ ...form, kapasitas: e.target.value })} required />
          </label>
          <label className="text-sm">Harga dasar per malam (Rp)
            <input className="mt-1 w-full" type="number" min={1} value={form.harga_dasar_per_malam} onChange={(e) => setForm({ ...form, harga_dasar_per_malam: e.target.value })} placeholder="750000" required />
          </label>
        </div>
        <label className="block text-sm">Deskripsi
          <textarea className="mt-1 w-full" rows={2} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Fasilitas, lokasi, dsb." />
        </label>
        <div className="flex gap-2">
          <button className="btn" type="submit">{editId ? "Simpan Perubahan" : "Tambah Unit"}</button>
          {editId && <button className="btn-ghost" type="button" onClick={() => { setEditId(null); setForm(kosong); }}>Batal</button>}
        </div>
      </form>

      <div className="card">
        <h3 className="mb-2 font-semibold">Daftar Unit</h3>
        {units.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada unit. Tambahkan unit pertama lewat form di atas.</p>
        ) : (
          <table className="data">
            <thead><tr><th>Nama</th><th>Tipe</th><th>Kapasitas</th><th>Harga/malam</th><th>Aksi</th></tr></thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.nama}</td>
                  <td>{u.tipe}</td>
                  <td>{u.kapasitas} orang</td>
                  <td>{rupiah(u.hargaDasarPerMalam)}</td>
                  <td className="space-x-2">
                    <button className="btn-ghost !px-3 !py-1.5" onClick={() => edit(u)}>Ubah</button>
                    <button className="btn-danger" onClick={() => hapus(u.id)}>Hapus</button>
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
