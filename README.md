# Homestay Harga Dinamis

Aplikasi manajemen homestay/villa dengan **harga dinamis per malam**, kalender ketersediaan, dan sinkronisasi iCal (import/export).

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

## Halaman

- `/` — Dashboard: statistik unit, booking, estimasi pendapatan, aturan harga aktif, log iCal terakhir.
- `/unit` — CRUD unit homestay (nama, tipe, kapasitas, harga dasar per malam).
- `/booking` — Form booking dengan preview rincian harga per malam, daftar booking, pembatalan.
- `/kalender` — Kalender ketersediaan bulanan per unit (tersedia/dipesan/terblokir).
- `/harga` — Aturan harga (WEEKEND surcharge, DURATION diskon) + kalender liburan (multiplier).
- `/ical` — Export .ics (download), import iCal (paste), dan log sinkronisasi.

## API

- `GET/POST /api/units`, `GET/PUT/DELETE /api/units/[id]`
- `GET /api/units/[id]/calendar?month=YYYY-MM`
- `GET/POST /api/price-rules`, `PUT/DELETE /api/price-rules/[id]`
- `GET/POST /api/holidays`, `PUT/DELETE /api/holidays/[id]`
- `GET /api/pricing/quote?unit_id&checkin&checkout`
- `GET/POST /api/bookings`, `POST /api/bookings/[id]/cancel`
- `GET /api/blocked-dates`, `POST /api/blocked-dates`, `DELETE /api/blocked-dates/[id]`
- `GET /api/ical?unit_id=<id>` (text/calendar), `POST /api/ical/import`, `GET /api/ical/logs`

## Aturan Bisnis

- Harga per malam = harga dasar × surcharge weekend (jika malam di hari weekend) × multiplier liburan (jika dalam periode liburan).
- Diskon durasi diterapkan ke total: ≥3 malam 5%, ≥7 malam 10%, ≥30 malam 20% (bisa diubah di halaman Harga).
- Booking yang tanggalnya overlap dengan booking `confirmed` lain atau dengan tanggal terblokir ditolak (409).
- Tanggal disimpan sebagai TEXT `YYYY-MM-DD`, timestamp sebagai TEXT ISO.

Lihat `PRD.md` untuk spesifikasi lengkap.
