/**
 * rencanaKerja.js — logika murni: rencana kerja (sheet "Jadwal Kunjungan MR") untuk
 * satu tanggal. Kolom B berisi teks seperti "Senin,05 Oktober 2026".
 */
const BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];

/** "Senin,05 Oktober 2026" -> Date (tengah malam lokal) atau null. */
export function parseTanggalJadwal(teks) {
  const m = String(teks || '').toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (!m) return null;
  const bulan = BULAN.indexOf(m[2]);
  if (bulan < 0) return null;
  return new Date(Number(m[3]), bulan, Number(m[1]));
}

/** "9:00 AM" / "10:00 PM" / "13:30" -> menit sejak 00:00 (untuk mengurutkan); tak terbaca -> 9999. */
export function menitDariJam(jam) {
  const m = String(jam || '').trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!m) return 9999;
  let h = Number(m[1]);
  const ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + Number(m[2]);
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Pekerjaan pada tanggal itu (baris yang punya lokasi), urut jam. items = hasil parseJadwalItems. */
export function rencanaPadaTanggal(items, tanggal) {
  return items
    .filter((it) => { const d = parseTanggalJadwal(it.tanggal); return d && sameDay(d, tanggal); })
    .sort((a, b) => menitDariJam(a.jam) - menitDariJam(b.jam));
}
