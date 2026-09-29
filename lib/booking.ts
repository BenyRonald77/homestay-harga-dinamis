import { prisma } from "./prisma";

/** Hasil cek konflik: booking confirmed yang overlap, atau rentang BlockedDate yang overlap */
export async function cekKonflik(unitId: number, checkin: string, checkout: string) {
  const bentrokBooking = await prisma.booking.findFirst({
    where: {
      unitId,
      status: "confirmed",
      checkin: { lt: checkout },
      checkout: { gt: checkin },
    },
    orderBy: { id: "asc" },
  });
  if (bentrokBooking) return { bentrokBooking, bentrokBlokir: null };

  // BlockedDate memakai rentang inklusif [tanggalMulai, tanggalSelesai];
  // overlap dengan malam-malam [checkin, checkout) jika tanggalMulai < checkout && tanggalSelesai >= checkin
  const bentrokBlokir = await prisma.blockedDate.findFirst({
    where: { unitId, tanggalMulai: { lt: checkout }, tanggalSelesai: { gte: checkin } },
    orderBy: { id: "asc" },
  });
  return { bentrokBooking: null, bentrokBlokir };
}
