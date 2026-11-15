/**
 * tahunFile.js — struktur folder PER TAHUN untuk file checksheet.
 *
 *   Checksheet/2026/<kategori bangunan>/<file site>
 *   Checksheet/2027/<kategori bangunan>/<file site>      <- dibuat otomatis
 *   Instrumen/2026/<file instrumen>,  Instrumen/2027/...
 *
 * Tahun diambil dari TANGGAL checksheet. Saat file tahun itu belum ada (mis.
 * pengisian pertama di Januari 2027), C-Fill otomatis membuatnya: menyalin file
 * tahun sebelumnya, mengosongkan isian bulanannya, lalu memakainya. Data tahun
 * lalu tidak disentuh dan tetap di folder tahunnya.
 *
 * Kompatibilitas: selama folder "2026" belum ada, tahun <= 2026 memakai tata
 * letak lama (file langsung di bawah folder root). Admin bisa merapikannya lewat
 * "Rapikan Folder 2026" (memindahkan, ID file tidak berubah).
 */
import {
  getOrCreateSubfolder, listFilesInFolder, findAllSheetsForName, findFileByExactName,
  getOrConvertSiteSpreadsheet, copyFileToFolder, renameFile, moveFile, trashFile
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

/** Folder untuk satu tahun di bawah root. buat=false -> null kalau belum ada (jalur baca, tanpa efek samping). */
export async function folderUntukTahun(rootId, tahun, { buat = true } = {}) {
  const key = rootId + '|' + tahun;
  if (folderCache.has(key)) return folderCache.get(key);
  const f = await findFileByExactName(rootId, String(tahun), FOLDER_MIME);
  let id = f ? f.id : null;
  if (!id) {
    if (tahun <= TAHUN_AWAL) id = rootId;                 // tata letak lama
    else if (buat) id = await getOrCreateSubfolder(rootId, String(tahun));
    else return null;
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

/** Admin: pindahkan struktur lama (file langsung di root) ke folder "2026". ID file tidak berubah. */
export async function rapikanFolder2026(onLog) {
  const log = (m) => onLog && onLog(m);
  folderCache.clear();
  let dipindah = 0;

  const f2026 = await getOrCreateSubfolder(ROOT_CHECKSHEET, '2026');
  for (const bc of BUILDING_CATEGORIES) {
    const ada = await findFileByExactName(ROOT_CHECKSHEET, bc, FOLDER_MIME);
    if (ada) { await moveFile(ada.id, ROOT_CHECKSHEET, f2026); dipindah++; log(`Dipindah: ${bc}`); }
  }
  if (ROOT_INSTRUMEN) {
    const i2026 = await getOrCreateSubfolder(ROOT_INSTRUMEN, '2026');
    const nama = new Set(INSTRUMENTS.flatMap((n) => nameVariants(resolveInstrumentName(n) + '.xlsx')));
    const files = await listFilesInFolder(ROOT_INSTRUMEN);
    for (const f of files) {
      if (f.mimeType !== FOLDER_MIME && nama.has(f.name)) { await moveFile(f.id, ROOT_INSTRUMEN, i2026); dipindah++; }
    }
    log('Instrumen dipindah ke folder 2026');
  }
  folderCache.clear();
  return { dipindah };
}
