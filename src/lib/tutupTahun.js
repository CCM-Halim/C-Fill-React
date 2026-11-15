/**
 * tutupTahun.js — logika MURNI (tanpa jaringan) untuk fitur "Tutup Tahun".
 *
 * Menentukan sel mana saja yang dikosongkan di tiap file ketika tahun ditutup.
 * Prinsipnya: HANYA sel yang memang ditulis C-Fill (kolom tanggal, petugas, dan
 * kolom item pada baris-baris slot bulanan). Judul, label, kolom lain, rumus,
 * dan format tidak disentuh - clear hanya menghapus NILAI.
 */

export function colLetter(n) {
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** [2,3,4,7,8] -> [[2,4],[7,8]] */
export function gabungKolom(cols) {
  const u = [...new Set(cols)].sort((a, b) => a - b);
  const out = [];
  for (const c of u) {
    const last = out[out.length - 1];
    if (last && c === last[1] + 1) last[1] = c; else out.push([c, c]);
  }
  return out;
}

function baseGridMonths(slotCount) {
  if (slotCount >= 9) return 1;
  if (slotCount >= 3) return 3;
  if (slotCount >= 2) return 6;
  return 12;
}

/** Rentang A1 (tanpa nama tab) yang ditulis C-Fill untuk kategori bertipe monthly_slot. */
export function rentangSlotBulanan(slotMap) {
  const slotCount = slotMap.slotCount || 12;
  const step = slotMap.slotStep || 1;
  const r1 = slotMap.slotStartRow;
  let r2 = r1 + step * slotCount - 1;

  const cols = [];
  if (slotMap.dateCol) cols.push(slotMap.dateCol);
  if (slotMap.petugasCol) cols.push(slotMap.petugasCol);
  const base = baseGridMonths(slotCount);
  for (const ic of slotMap.itemColumns || []) {
    const w = ic.colWidth || 1;
    for (let c = ic.colStart; c < ic.colStart + w; c++) cols.push(c);
    if (ic.explicitAnchors && ic.explicitAnchors.length) {
      const blok = step * Math.max(1, Math.round((ic.periodMonths || base) / base));
      r2 = Math.max(r2, Math.max(...ic.explicitAnchors) + blok - 1);
    }
  }
  return gabungKolom(cols).map(([a, b]) => `${colLetter(a)}${r1}:${colLetter(b)}${r2}`);
}

/** Rentang untuk kategori bertipe matrix (kolom per unit, baris per item). */
export function rentangMatrix(slotMap, jumlahItem) {
  const out = [];
  const n = Math.max(1, jumlahItem || 1);
  const c1 = slotMap.unitColStart;
  const c2 = c1 + (slotMap.defaultUnitCount || 1) - 1;
  out.push(`${colLetter(c1)}${slotMap.itemRowStart}:${colLetter(c2)}${slotMap.itemRowStart + n - 1}`);
  if (slotMap.dateRow) out.push(`${colLetter(c1)}${slotMap.dateRow}`);
  return out;
}

export const TAB_ENTRY_EXIT = 'Entry and exit registration';
export const RENTANG_ENTRY_EXIT = ['B7:I206'];          // sama dengan area baca/tulis C-Fill
export const TAB_VERIFIKASI = 'Lembar Verifikasi Pekerjaan';
export const RENTANG_VERIFIKASI = ['C6:D17', 'F6:F17'];  // Jan-Des: tanggal, nama, paraf (termasuk =IMAGE)

/**
 * Potong rentang ke ukuran grid sheet (rowCount x colCount). Rentang yang di luar
 * grid bikin Sheets API menolak seluruh permintaan, jadi harus dipotong.
 * Return null kalau seluruhnya di luar grid.
 */
export function klemRentang(a1, rowCount, colCount) {
  const m = String(a1).match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  if (!m) return null;
  const num = (L) => L.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  let c1 = num(m[1]), r1 = Number(m[2]);
  let c2 = m[3] ? num(m[3]) : c1, r2 = m[4] ? Number(m[4]) : r1;
  if (r1 > rowCount || c1 > colCount) return null;
  r2 = Math.min(r2, rowCount); c2 = Math.min(c2, colCount);
  return c1 === c2 && r1 === r2 ? `${colLetter(c1)}${r1}` : `${colLetter(c1)}${r1}:${colLetter(c2)}${r2}`;
}

/** Nama folder & file penanda untuk satu tahun. */
export const namaFolderArsip = (tahun) => `Arsip ${tahun}`;
export const namaFileProgres = (tahun) => `tutup-tahun-${tahun}.json`;

/** Kata konfirmasi yang harus diketik admin. */
export const kataKonfirmasi = (tahun) => `TUTUP ${tahun}`;
