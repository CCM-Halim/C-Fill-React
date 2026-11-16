/**
 * tahunFile.js — struktur folder PER TAHUN untuk file checksheet.
 *
 * Struktur di Drive (folder tahun ada DI ATAS Checksheet & Instrumen):
 *
 *   <induk>/2026/Checksheet/<kategori bangunan>/<file site>
 *   <induk>/2026/Instrumen/<file instrumen>
 *   <induk>/2027/Checksheet/...   <- dibuat otomatis saat tahun berganti
 *   <induk>/2027/Instrumen/...
 *
 * VITE_ROOT_CHECKSHEET_FOLDER_ID / VITE_ROOT_INSTRUMEN_FOLDER_ID tetap menunjuk
 * folder 2026 (yang induknya bernama "2026"); folder tahun lain dicari/dibuat di
 * sebelahnya dengan nama yang sama. Tahun diambil dari TANGGAL checksheet. Saat file
 * tahun itu belum ada, C-Fill membuatnya: menyalin file tahun sebelumnya,
 * mengosongkan isian bulanannya, lalu memakainya. Data tahun lalu tidak disentuh.
 *
 * Kalau induk folder root BUKAN bernama tahun, dipakai tata letak lama:
 * <root>/<tahun>/<kategori>.
 */
import {
  getOrCreateSubfolder, listFilesInFolder, findAllSheetsForName, findFileByExactName,
  getOrConvertSiteSpreadsheet, copyFileToFolder, renameFile, trashFile, getFileMeta
} from './driveApi';
import { bacaUkuranTab, kosongkanRentang } from './sheetsApi';
import { matchTabNameFromCandidates, nameVariants } from './tabNames';
import { SITES, BUILDING_CATEGORIES } from '../config/sites';
import { CATEGORIES } from '../config/categories';
import { SLOT_MAP_OVERRIDES } from '../config/slotMapOverrides';
import { INSTRUMENTS, INSTRUMENT_SLOT_MAP, resolveInstrumentName } from '../config/instruments';
import {
  rentangSlotBulanan, rentangMatrix, klemRentang,
  TAB_ENTRY_EXIT, RENTANG_ENTRY_EXIT, TAB_VERIFIKASI, RENTANG_VERIFIKASI
} from './tutupTahun';

export const TAHUN_AWAL = 2026; // tahun terakhir yang boleh memakai tata letak lama (tanpa folder tahun)
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const ROOT_CHECKSHEET = import.meta.env.VITE_ROOT_CHECKSHEET_FOLDER_ID;
const ROOT_INSTRUMEN = import.meta.env.VITE_ROOT_INSTRUMEN_FOLDER_ID;
const TAB_INSTRUMEN = 'Instrumen Telekomunikasi';

/** Tahun dari tanggal ('YYYY-MM-DD', Date, dll). Kosong/tidak valid -> tahun berjalan. */
export function tahunDariTanggal(tanggal) {
  const d = tanggal ? new Date(tanggal) : new Date();
  return Number.isFinite(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
}

/** Tahun file verifikasi: bulan yang lebih besar dari bulan sekarang = bulan tahun lalu (verifikasi susulan). */
export function tahunVerifikasi(monthIndex, sekarang = new Date()) {
  return monthIndex > sekarang.getMonth() ? sekarang.getFullYear() - 1 : sekarang.getFullYear();
}

const folderCache = new Map();
const indukCache = new Map();

/**
 * Pelajari posisi folder root: kalau induknya bernama tahun ("2026") -> tata letak
 * "<eyang>/<tahun>/<namaRoot>". Hasil di-cache.
 */
async function bacaInduk(rootId) {
  if (indukCache.has(rootId)) return indukCache.get(rootId);
  const meta = await getFileMeta(rootId);
  let info;
  if (!meta.parents || !meta.parents.length) {
    info = { mode: 'tak-terbaca', namaRoot: meta.name };       // induk tidak bisa dilihat akun ini
  } else {
    const induk = await getFileMeta(meta.parents[0]);
    if (/^\d{4}$/.test(String(induk.name).trim()) && induk.parents && induk.parents.length) {
      info = { mode: 'induk-tahun', tahunRoot: Number(induk.name), eyangId: induk.parents[0], namaRoot: meta.name };
    } else if (/^\d{4}$/.test(String(induk.name).trim())) {
      info = { mode: 'tak-terbaca', tahunRoot: Number(induk.name), namaRoot: meta.name };
    } else {
      info = { mode: 'lama', namaRoot: meta.name };
    }
  }
  indukCache.set(rootId, info);
  return info;
}

const PESAN_INDUK = (th) =>
  `Folder tahun ${th} belum bisa dibuat: akun ini belum punya akses ke folder induk (folder "2026"). ` +
  'Minta admin membagikan folder "2026" (bukan hanya Checksheet/Instrumen) sebagai Editor.';

/**
 * Folder "Checksheet" / "Instrumen" untuk satu tahun. buat=false -> null kalau belum ada
 * (jalur baca, tanpa efek samping).
 */
const folderInFlight = new Map();

export async function folderUntukTahun(rootId, tahun, { buat = true } = {}) {
  const key = rootId + '|' + tahun;
  if (folderCache.has(key)) return folderCache.get(key);
  // Beberapa file bisa meminta folder tahun yang sama bersamaan -> satu pembuatan saja.
  const kunciJalan = key + '|' + (buat ? 'b' : 'r');
  if (!folderInFlight.has(kunciJalan)) {
    folderInFlight.set(kunciJalan, cariFolderTahun(rootId, tahun, buat, key).finally(() => folderInFlight.delete(kunciJalan)));
  }
  return folderInFlight.get(kunciJalan);
}

async function cariFolderTahun(rootId, tahun, buat, key) {
  const info = await bacaInduk(rootId);
  let id = null;

  if (info.mode === 'induk-tahun') {
    if (tahun === info.tahunRoot) id = rootId;
    else {
      let yr = await findFileByExactName(info.eyangId, String(tahun), FOLDER_MIME);
      if (!yr && buat) yr = { id: await getOrCreateSubfolder(info.eyangId, String(tahun)) };
      if (!yr) return null;
      let sub = await findFileByExactName(yr.id, info.namaRoot, FOLDER_MIME);
      if (!sub && buat) sub = { id: await getOrCreateSubfolder(yr.id, info.namaRoot) };
      if (!sub) return null;
      id = sub.id;
    }
  } else if (info.mode === 'tak-terbaca') {
    if (tahun <= (info.tahunRoot ?? TAHUN_AWAL)) id = rootId;
    else throw new Error(PESAN_INDUK(tahun));
  } else {                                                      // tata letak lama
    const f = await findFileByExactName(rootId, String(tahun), FOLDER_MIME);
    id = f ? f.id : null;
    if (!id) {
      if (tahun <= TAHUN_AWAL) id = rootId;
      else if (buat) id = await getOrCreateSubfolder(rootId, String(tahun));
      else return null;
    }
  }
  folderCache.set(key, id);
  return id;
}

export function targetSite(site) {
  return { jenis: 'site', bc: site.buildingCategory, namaFile: site.originalFileName, site };
}
export function targetInstrumen(namaInstrumen) {
  return { jenis: 'instrumen', bc: null, namaFile: resolveInstrumentName(namaInstrumen) + '.xlsx', site: null };
}

async function folderTarget(target, tahun, opsi) {
  const root = target.jenis === 'instrumen' ? ROOT_INSTRUMEN : ROOT_CHECKSHEET;
  const yr = await folderUntukTahun(root, tahun, opsi);
  if (!yr) return null;
  return target.jenis === 'instrumen' ? yr : getOrCreateSubfolder(yr, target.bc);
}

/** Rentang yang dikosongkan di satu file saat membuat file tahun baru. */
export function susunRencanaKosongkan(target, ukuranTab) {
  const judul = Object.keys(ukuranTab);
  const perTab = new Map();
  const dilewati = [];
  const tambah = (tab, rentang) => {
    const { rowCount, columnCount } = ukuranTab[tab];
    for (const r of rentang) {
      const k = klemRentang(r, rowCount, columnCount);
      if (!k) continue;
      if (!perTab.has(tab)) perTab.set(tab, new Set());
      perTab.get(tab).add(k);
    }
  };
  const cocok = (kandidat) => matchTabNameFromCandidates(judul, kandidat).tab;

  if (target.jenis === 'instrumen') {
    const tab = cocok([TAB_INSTRUMEN]);
    if (tab) tambah(tab, rentangSlotBulanan(INSTRUMENT_SLOT_MAP)); else dilewati.push(TAB_INSTRUMEN);
  } else {
    for (const catId of target.site.categoryIds) {
      const cat = CATEGORIES.find((c) => c.id === catId);
      if (!cat) continue;
      const sm = SLOT_MAP_OVERRIDES[target.namaFile]?.[catId] || cat.slotMap;
      const tab = cocok([cat.sheetName, ...(cat.sheetAliases || [])]);
      if (!tab) { dilewati.push(cat.sheetName); continue; }
      tambah(tab, sm.type === 'matrix' ? rentangMatrix(sm, (cat.items || []).length) : rentangSlotBulanan(sm));
    }
    const ee = cocok([TAB_ENTRY_EXIT]);
    if (ee) tambah(ee, RENTANG_ENTRY_EXIT); else dilewati.push(TAB_ENTRY_EXIT);
    const vf = cocok([TAB_VERIFIKASI]);
    if (vf) tambah(vf, RENTANG_VERIFIKASI); else dilewati.push(TAB_VERIFIKASI);
  }
  return { rencana: [...perTab.entries()].map(([tab, set]) => ({ tab, ranges: [...set] })), dilewati };
}

const IN_FLIGHT = new Map();

async function buatDariTahunSebelumnya(target, tahun, folder) {
  const key = folder + '|' + target.namaFile;
  if (IN_FLIGHT.has(key)) return IN_FLIGHT.get(key);
  const task = (async () => {
    // Sumber: file tahun sebelumnya (kalau itu juga belum ada, dibuat berantai).
    const sumber = await ambilSpreadsheet(target, tahun - 1);
    const varian = nameVariants(target.namaFile);
    const namaFinal = varian[varian.length - 1];           // tanpa ".xlsx", aman untuk Drive
    const namaSementara = namaFinal + ' (sedang disiapkan)';

    // 1. salin dengan nama SEMENTARA - belum bisa ditemukan perangkat lain
    const salinan = await copyFileToFolder(sumber.spreadsheetId, folder, namaSementara);
    if (!salinan?.id) throw new Error('Gagal membuat file tahun ' + tahun + ' dari file tahun sebelumnya.');
    // 2. kosongkan isian bulanan di SALINAN
    const ukuran = await bacaUkuranTab(salinan.id);
    const { rencana } = susunRencanaKosongkan(target, ukuran);
    await kosongkanRentang(salinan.id, rencana.flatMap((p) => p.ranges.map((r) => `'${p.tab}'!${r}`)));
    // 3. baru diberi nama asli (mulai terlihat oleh perangkat lain)
    await renameFile(salinan.id, namaFinal);
    // 4. kalau ada perangkat lain yang menyiapkan di saat bersamaan, pakai yang PALING LAMA
    const semua = await findAllSheetsForName(folder, target.namaFile);
    if (semua.length > 1 && semua[0].id !== salinan.id) {
      try { await trashFile(salinan.id); } catch { /* biarkan - duplikat akan terdeteksi peringatan duplikat */ }
    }
    return getOrConvertSiteSpreadsheet(folder, target.namaFile);
  })().finally(() => IN_FLIGHT.delete(key));
  IN_FLIGHT.set(key, task);
  return task;
}

/**
 * Spreadsheet untuk (target, tahun). Tahun <= TAHUN_AWAL: perilaku lama (cari / konversi).
 * Tahun lebih baru yang filenya belum ada: dibuat otomatis dari tahun sebelumnya.
 * Return { spreadsheetId, duplicateWarning, ... } sama seperti getOrConvertSiteSpreadsheet.
 */
export async function ambilSpreadsheet(target, tahun) {
  const folder = await folderTarget(target, tahun, { buat: true });
  if (tahun <= TAHUN_AWAL) return getOrConvertSiteSpreadsheet(folder, target.namaFile);
  const ada = await findAllSheetsForName(folder, target.namaFile);
  if (ada.length) return getOrConvertSiteSpreadsheet(folder, target.namaFile);
  return buatDariTahunSebelumnya(target, tahun, folder);
}

/** Jalur BACA-SAJA: id spreadsheet kalau sudah ada, null kalau belum (tidak membuat apa pun). */
export async function cariSpreadsheetBaca(target, tahun) {
  const folder = await folderTarget(target, tahun, { buat: false });
  if (!folder) return null;
  const found = await findAllSheetsForName(folder, target.namaFile);
  return found.length ? found[0].id : null;
}
