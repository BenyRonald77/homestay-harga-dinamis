import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const n = await prisma.unit.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }

  await prisma.unit.createMany({
    data: [
      {
        nama: "Villa Sawah View",
        tipe: "Villa",
        kapasitas: 6,
        hargaDasarPerMalam: 750000,
        deskripsi: "Villa dengan pemandangan sawah, 3 kamar tidur, kolam kecil.",
      },
      {
        nama: "Villa Kolam Renang",
        tipe: "Villa",
        kapasitas: 10,
        hargaDasarPerMalam: 1250000,
        deskripsi: "Villa besar dengan kolam renang pribadi, 5 kamar tidur.",
      },
    ],
  });

  await prisma.priceRule.createMany({
    data: [
      {
        tipe: "WEEKEND",
        nama: "Surcharge Akhir Pekan",
        config: JSON.stringify({ surcharge: 0.25, hari: [0, 6] }),
        aktif: true,
      },
      {
        tipe: "DURATION",
        nama: "Diskon Durasi Menginap",
        config: JSON.stringify({
          tiers: [
            { minMalam: 30, diskon: 0.2 },
            { minMalam: 7, diskon: 0.1 },
            { minMalam: 3, diskon: 0.05 },
          ],
        }),
        aktif: true,
      },
    ],
  });

  await prisma.holiday.createMany({
    data: [
      {
        nama: "Libur Tahun Baru",
        tanggalMulai: "2026-12-24",
        tanggalSelesai: "2027-01-02",
        multiplier: 1.5,
      },
      {
        nama: "Libur Lebaran",
        tanggalMulai: "2027-03-28",
        tanggalSelesai: "2027-04-05",
        multiplier: 1.4,
      },
    ],
  });

  console.log("seed selesai: 2 unit, 2 price rules, 2 holiday");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
