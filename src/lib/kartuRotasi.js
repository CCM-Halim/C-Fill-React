/**
 * kartuRotasi.js — logika murni: orientasi gambar smartcard.
 *
 * Smartcard asli berupa landscape, tapi file PDF/foto sering berhalaman potret dengan
 * kartu terputar 90° searah jarum jam (teks terbaca dari atas ke bawah). Aturan:
 *   - gambar potret  -> otomatis diputar 270° (= 90° berlawanan arah jarum jam) -> landscape tegak
 *   - gambar landscape -> tidak diputar
 * Kalau ada kartu yang arahnya lain, admin bisa memutarnya per orang (disimpan di
 * config Drive dengan key "rot:<nama>").
 */
export const KUNCI_ROTASI = 'rot:';

export function rotasiOtomatis(lebar, tinggi) {
  return tinggi > lebar * 1.05 ? 270 : 0;
}

/** Sudut efektif: pilihan admin (kalau ada & sah) mengalahkan otomatis. */
export function rotasiEfektif(tersimpan, lebar, tinggi) {
  const t = Number(tersimpan);
  if (tersimpan != null && [0, 90, 180, 270].includes(t)) return t;
  return rotasiOtomatis(lebar, tinggi);
}

export function putarBerikutnya(sudut) {
  return (sudut + 90) % 360;
}

/** Ukuran kanvas hasil putar, sisi terpanjang dibatasi `maks` px. */
export function ukuranKanvas(lebar, tinggi, sudut, maks = 1000) {
  const tukar = sudut % 180 !== 0;
  const w = tukar ? tinggi : lebar;
  const h = tukar ? lebar : tinggi;
  const s = Math.min(1, maks / Math.max(w, h));
  return { w: Math.round(w * s), h: Math.round(h * s), skala: s };
}
