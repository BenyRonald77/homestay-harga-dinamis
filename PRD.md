# PRD — Homestay Harga Dinamis

Aplikasi manajemen homestay/villa dengan harga dinamis per malam, kalender ketersediaan, dan sinkronisasi iCal (import/export).

## Stack
Next.js 14 + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS. UI berbahasa Indonesia.

## Model Data

| Model | Field |
|---|---|
| Unit | id, nama, tipe (Villa/Apartemen/Kamar), kapasitas, harga_dasar_per_malam, deskripsi |
| PriceRule | id, tipe (WEEKEND / DURATION), nama, config (JSON), aktif |
| Holiday | id, nama, tanggal_mulai, tanggal_selesai (YYYY-MM-DD), multiplier |
| Booking | id, unit_id, tamu_nama, tamu_telp, checkin, checkout (YYYY-MM-DD), total_harga, status (confirmed/cancelled), dibuat_pada (ISO) |
| BookingNight | id, booking_id, tanggal (YYYY-MM-DD), harga — rincian per malam |
| BlockedDate | id, unit_id, tanggal_mulai, tanggal_selesai (YYYY-MM-DD inklusif), sumber (ical/manual), catatan |
| IcalSyncLog | id, unit_id (nullable), arah (in/out), jumlah_event, waktu (ISO), status (sukses/gagal), catatan |

Tanggal disimpan sebagai TEXT `YYYY-MM-DD`, timestamp sebagai TEXT ISO (hindari drama timezone).

## Fungsionalitas

### F0 — Setup: schema, seed, layout, dashboard
- Schema Prisma di atas, seed 2 villa:
  - "Villa Sawah View" (Villa, kapasitas 6, Rp 750.000/malam)
  - "Villa Kolam Renang" (Villa, kapasitas 10, Rp 1.250.000/malam)
- Rules default:
  - WEEKEND: surcharge 25% untuk hari Sabtu & Minggu (hari [0,6])
  - DURATION tiers: ≥3 malam diskon 5%, ≥7 malam diskon 10%, ≥30 malam diskon 20%
- 2 entri musim liburan: "Libur Tahun Baru" (2026-12-24 s/d 2027-01-02, ×1.5), "Libur Lebaran" (2027-03-28 s/d 2027-04-05, ×1.4)
- Layout + navigasi, halaman dashboard (statistik nyata dari DB: jumlah unit, booking aktif, total pendapatan booking confirmed).

### F1 — Unit CRUD
- Halaman + API: tambah, ubah, hapus unit. Hapus unit yang punya booking ditolak (409) atau diblokir FK.

### F2 — Price rules engine
- `lib/pricing.ts`: `quote(unit, checkin, checkout, rules, holidays)` menghitung:
  - harga per malam = harga_dasar × (1 + weekend_surcharge jika malam jatuh di hari weekend) × holiday_multiplier (jika dalam rentang holiday; ambil yang terbesar jika overlap)
  - diskon durasi diterapkan ke total: tier tertinggi yang memenuhi (≥30: 20%, ≥7: 10%, ≥3: 5%)
  - mengembalikan: daftar malam (tanggal, harga, faktor yang berlaku), subtotal, diskon, total, jumlah malam
- Endpoint `GET /api/pricing/quote?unit_id&checkin&checkout` → rincian per malam + total + aturan yang diterapkan.
- API CRUD rules (`/api/price-rules`) dan holiday calendar (`/api/holidays`).

### F3 — Booking dengan kalkulasi harga dinamis
- `POST /api/bookings`: validasi (400: field wajib, format tanggal, checkin < checkout, unit ada), hitung harga via pricing engine, simpan Booking + BookingNight per malam.
- Validasi overlap KERAS: booking `confirmed` yang overlap tanggal → 409. Overlap dengan BlockedDate → 409.
- `GET /api/bookings?unit_id&from&to` untuk kalender.
- Halaman form booking menampilkan rincian harga per malam (preview quote sebelum submit).
- Pembatalan booking: `POST /api/bookings/[id]/cancel` → status `cancelled` (tidak menghapus data). Malam dari booking yang dibatalkan kembali tersedia.

### F4 — Kalender ketersediaan
- Halaman kalender bulanan per unit (pilih unit + navigasi bulan). Warna: hijau = tersedia, merah = dipesan (booking confirmed), abu = tanggal terblokir (BlockedDate), hari lalu = redup.
- Endpoint `GET /api/units/[id]/calendar?month=YYYY-MM` mengembalikan daftar tanggal dengan status.

### F5 — iCal
- `GET /api/ical?unit_id=<id>` → `text/calendar`: VEVENT per booking confirmed + per BlockedDate (DTSTART/DTEND;VALUE=DATE).
- `POST /api/ical/import` body `{ unit_id, ical_text }`: parse VEVENT sederhana (DTSTART/DTEND/SUMMARY, handle parameter `;VALUE=DATE`/`;TZID=`, line folding) → buat BlockedDate (sumber `ical`), dedupe rentang identik. Setiap export & import dicatat di IcalSyncLog (arah in/out, jumlah_event, status, catatan).
- Halaman UI: daftar sync log, tombol export (download .ics), form import (paste iCal).

## API Ringkas
- `GET/POST /api/units`, `GET/PUT/DELETE /api/units/[id]`
- `GET /api/units/[id]/calendar?month=YYYY-MM`
- `GET/POST /api/price-rules`, `PUT/DELETE /api/price-rules/[id]`
- `GET/POST /api/holidays`, `PUT/DELETE /api/holidays/[id]`
- `GET /api/pricing/quote?unit_id&checkin&checkout`
- `GET/POST /api/bookings`, `POST /api/bookings/[id]/cancel`
- `GET /api/ical?unit_id=<id>` (text/calendar), `POST /api/ical/import`
- `GET /api/ical/logs?unit_id=<id>`

## Aturan Uji
- Sukses + error untuk setiap endpoint: 400 (validasi), 404 (tidak ketemu), 409 (overlap booking / blokir / hapus unit ber-booking).
- Kasus double-booking: dua POST booking dengan tanggal overlap untuk unit yang sama → yang kedua 409.
