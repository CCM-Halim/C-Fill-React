/**
 * skalaLayar.js — faktor perbesaran Dashboard untuk monitor lebar (tampil dari jauh).
 * Desain dasar Dashboard dibuat untuk area ±1180px; di area yang lebih lebar seluruh isi
 * diperbesar proporsional sehingga mengisi lebar penuh tanpa ruang kosong di sisi.
 */
export const LEBAR_DASAR = 1180;
export const SKALA_MAKS = 2.2;
export const BATAS_LAYAR_LEBAR = 861;   // sama dengan batas sidebar tampil (di bawahnya tata letak ponsel)

export function hitungSkala(lebarArea, lebarViewport) {
  if (!Number.isFinite(lebarArea) || lebarViewport < BATAS_LAYAR_LEBAR) return 1;
  const s = lebarArea / LEBAR_DASAR;
  return Math.round(Math.min(SKALA_MAKS, Math.max(1, s)) * 100) / 100;
}
