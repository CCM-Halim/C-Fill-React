/**
 * alarmLokasi.js — logika murni: alarm/gangguan yang MASIH OPEN di sebuah lokasi,
 * dicocokkan dengan lokasi pekerjaan di Jadwal Kunjungan MR (supaya teknisi tahu apa
 * yang perlu sekalian ditangani saat datang ke lokasi itu).
 *
 * Penulisan lokasi di dua sheet berbeda ("K48 + 680 Base Station" di jadwal,
 * "K48+680" atau "K41 + 607 (202)" di log), jadi dicocokkan lewat kunci kilometer
 * "k48+680". Lokasi tanpa kilometer (mis. "OCE St Halim") dicocokkan lewat nama
 * yang dinormalkan.
 */
import { STATUS } from './gangguanLog.js';

const POLA_KM = /\bK\s*(\d+)\s*\+\s*(\d+)/i;

export function normNamaLokasi(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** "K48 + 680 Base Station" -> "k48+680"; tanpa kilometer -> nama dinormalkan; kosong -> ''. */
export function kunciLokasi(teks) {
  const m = String(teks || '').match(POLA_KM);
  if (m) return `k${Number(m[1])}+${m[2]}`;
  return normNamaLokasi(teks);
}

function cocok(kunciJadwal, teksLog) {
  const k = kunciLokasi(teksLog);
  if (!k || !kunciJadwal) return false;
  if (k === kunciJadwal) return true;
  // lokasi tanpa kilometer: boleh salah satu memuat yang lain (min. 6 huruf supaya tidak asal cocok)
  const adaKm = POLA_KM.test(teksLog) || kunciJadwal.includes('+');
  if (adaKm) {
    // log bisa menulis lokasi panjang: "CCTV K77+350 tunnel 4 ..." -> ambil kilometer di dalamnya
    return false;
  }
  return Math.min(k.length, kunciJadwal.length) >= 6 && (k.includes(kunciJadwal) || kunciJadwal.includes(k));
}

/**
 * Alarm OPEN di lokasi tertentu, yang terlama dulu.
 * Hasil: [{ tab, baris, alat, fenomena, tanggalRaw, umurHari }]
 */
export function alarmOpenDiLokasi(items, lokasi) {
  const kunci = kunciLokasi(lokasi);
  if (!kunci) return [];
  return (items || [])
    .filter((it) => it.status === STATUS.OPEN && cocok(kunci, it.lokasi))
    .map((it) => ({
      tab: String(it.tab || '').replace(/^Gangguan\s+/i, ''),
      baris: it.baris,
      alat: it.alat || '',
      fenomena: it.fenomena || '',
      tanggalRaw: it.tanggalRaw || '',
      umurHari: it.umurHari,
    }))
    .sort((a, b) => (b.umurHari ?? -1) - (a.umurHari ?? -1));
}
