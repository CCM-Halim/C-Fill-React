/**
 * cfillService.js
 * Logic bisnis C-Fill: mapping Lokasi/Site/Instrumen -> folder, konversi file
 * .xlsx asli jadi Google Sheets (sekali saja), lalu tulis ke SLOT baris/kolom
 * yang sudah ada di dalamnya - BUKAN menambah baris baru di bawah.
 */
import { writeMonthlySlot, writeMatrixSlot, getSpreadsheetUrl, getSheetGid, computeSlotRow, readSlotRow, writeVerificationRow, findNextEmptyRow, writeEntryExitRow, readEntryExitDates } from './sheetsApi';
import { getOrCreateSubfolder, uploadFileToFolder, listFilesInFolder, getOrConvertSiteSpreadsheet, uploadPublicImage, findFolderContaining } from './driveApi';
import { CATEGORIES } from '../config/categories';
import { SITES } from '../config/sites';
import { INSTRUMENT_SLOT_MAP } from '../config/instruments';
import { SLOT_MAP_OVERRIDES } from '../config/slotMapOverrides';
import { logActivity } from './activityLog';
import { getCurrentUser } from './googleAuth';

// Struktur sheet "Lembar Verifikasi Pekerjaan" (boilerplate, sama di semua 69
// file site): baris 6 = Januari, step 1/bulan, kolom C = Tanggal, D = Nama
// Verifikator, F = Tanda tangan/paraf (diisi nama juga, sbg tanda digital).
const VERIFICATION_SLOT_MAP = { slotStartRow: 6, slotStep: 1, dateCol: 3, namaCol: 4, parafCol: 6 };
const VERIFICATION_TAB_NAME = 'Lembar Verifikasi Pekerjaan';

const ROOT_CHECKSHEET_FOLDER_ID = import.meta.env.VITE_ROOT_CHECKSHEET_FOLDER_ID;
const ROOT_INSTRUMEN_FOLDER_ID = import.meta.env.VITE_ROOT_INSTRUMEN_FOLDER_ID;
const ROOT_DOKUMENTASI_FOLDER_ID = import.meta.env.VITE_ROOT_DOKUMENTASI_FOLDER_ID;

const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function requireFolderConfig(id, name) {
  if (!id) throw new Error(`${name} belum diatur di .env (lihat .env.example).`);
}

async function getBuildingCategoryFolder(buildingCategory) {
  return getOrCreateSubfolder(ROOT_CHECKSHEET_FOLDER_ID, buildingCategory);
}

/**
 * Ambil kode singkat site (mis. "K10+200") dari nama site lengkap - dipakai
 * buat cocokkan/beri nama folder di "Dokumentasi Kegiatan", yang formatnya
 * pakai kode singkat + tanggal (bukan nama lengkap kayak di Checksheet).
 */
function getSiteShortCode(siteName) {
  const m = siteName.match(/K\s*\d+\s*\+\s*\d+/);
  return m ? m[0].replace(/\s+/g, '') : siteName;
}

/**
 * Cari/siapkan folder dokumentasi utk 1 site pada bulan berjalan, mengikuti
 * struktur asli "Dokumentasi Kegiatan": [Bulan] / [KodeSite (tanggal)] / file.
 *
 * Kalau folder site utk bulan ini SUDAH ADA (baik dibuat manual sebelumnya
 * dengan format apapun, atau oleh aplikasi ini sebelumnya) - dipakai lagi,
 * TIDAK bikin folder baru. Kalau belum ada, baru dibuat folder baru dengan
 * format konsisten "KodeSite (D Bulan YYYY)".
 */
async function getOrCreateDocumentationFolder(siteName, date = new Date()) {
  requireFolderConfig(ROOT_DOKUMENTASI_FOLDER_ID, 'VITE_ROOT_DOKUMENTASI_FOLDER_ID');

  const monthIndex = date.getMonth();
  const monthFolderName = `${String(monthIndex + 1).padStart(2, '0')}. ${BULAN_ID[monthIndex]}`;
  const monthFolderId = await getOrCreateSubfolder(ROOT_DOKUMENTASI_FOLDER_ID, monthFolderName);

  const siteCode = getSiteShortCode(siteName);
  const existingFolderId = await findFolderContaining(monthFolderId, siteCode);
  if (existingFolderId) return existingFolderId;

  const newFolderName = `${siteCode} (${date.getDate()} ${BULAN_ID[monthIndex]} ${date.getFullYear()})`;
  return getOrCreateSubfolder(monthFolderId, newFolderName);
}

/**
 * Simpan 1 submission checksheet peralatan, ditulis ke slot bulan yang sesuai
 * di dalam file asli site tsb (dikonversi otomatis jadi Google Sheets kalau
 * belum pernah sebelumnya). File .xlsx asli & hasil konversinya ada LANGSUNG
 * di folder kategori bangunan (mis. "1. BTS Communication Room"), TIDAK di
 * subfolder per-site - mengikuti struktur folder asli kamu.
 */
export async function submitChecksheet({ buildingCategory, siteName, categoryId, tanggal, petugas, answers }) {
  requireFolderConfig(ROOT_CHECKSHEET_FOLDER_ID, 'VITE_ROOT_CHECKSHEET_FOLDER_ID');
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) throw new Error('Kategori tidak ditemukan: ' + categoryId);
  const site = SITES.find((s) => s.buildingCategory === buildingCategory && s.siteName === siteName);
  if (!site) throw new Error('Site tidak ditemukan: ' + siteName);
  if (!category.slotMap) throw new Error(`Kategori "${category.short_name}" belum punya peta slot.`);

  const bcFolderId = await getBuildingCategoryFolder(buildingCategory);
  const spreadsheetId = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);
  const tabName = category.sheetName;

  // Pakai override kalau file spesifik ini polanya beda dari mayoritas site lain
  // di kategori yang sama (hasil cross-check ke semua 69 file).
  const override = SLOT_MAP_OVERRIDES[site.originalFileName]?.[categoryId];
  const slotMap = override || category.slotMap;

  if (slotMap.type === 'matrix') {
    await writeMatrixSlot(spreadsheetId, tabName, slotMap, { tanggal, matrixAnswers: answers, unitCount: slotMap.defaultUnitCount });
    const gid = await getSheetGid(spreadsheetId, tabName);
    return { success: true, fileName: site.originalFileName, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid) };
  }

  const { row } = await writeMonthlySlot(spreadsheetId, tabName, slotMap, { tanggal, petugas, answers });
  const gid = await getSheetGid(spreadsheetId, tabName);
  const sheetUrl = getSpreadsheetUrl(spreadsheetId, gid);

  logActivity(ROOT_CHECKSHEET_FOLDER_ID, {
    buildingCategory, siteName, categoryName: category.short_name, tanggal, petugas,
    email: getCurrentUser()?.email, sheetUrl
  });

  return { success: true, fileName: site.originalFileName, row, sheetUrl };
}

/**
 * Simpan 1 submission checksheet instrumen - sistemnya SAMA dengan checksheet
 * peralatan (tulis ke slot bulan di file .xlsx asli instrumen tsb, dikonversi
 * otomatis jadi Google Sheets kalau belum pernah).
 */
export async function submitInstrumentChecksheet({ namaInstrumen, tanggal, petugas, answers }) {
  requireFolderConfig(ROOT_INSTRUMEN_FOLDER_ID, 'VITE_ROOT_INSTRUMEN_FOLDER_ID');
  const originalFileName = namaInstrumen + '.xlsx';
  const spreadsheetId = await getOrConvertSiteSpreadsheet(ROOT_INSTRUMEN_FOLDER_ID, originalFileName);
  const tabName = 'Instrumen Telekomunikasi';

  const { row } = await writeMonthlySlot(spreadsheetId, tabName, INSTRUMENT_SLOT_MAP, { tanggal, petugas, answers });
  const gid = await getSheetGid(spreadsheetId, tabName);
  const sheetUrl = getSpreadsheetUrl(spreadsheetId, gid);

  logActivity(ROOT_CHECKSHEET_FOLDER_ID, {
    buildingCategory: 'Instrumen', siteName: namaInstrumen, categoryName: 'Checksheet Instrumen', tanggal, petugas,
    email: getCurrentUser()?.email, sheetUrl
  });

  return { success: true, fileName: originalFileName, row, sheetUrl };
}

/**
 * Preview baris/slot mana yang bakal ditulis untuk tanggal tertentu - dipakai
 * UI supaya user tahu sebelum submit. Ikut menghormati override per-file kalau ada.
 * Terima 2 bentuk: kategori peralatan { id, slotMap } + originalFileName (utk cek
 * override), ATAU langsung slotMap mentah (dipakai instrumen, tidak ada override).
 */
export function previewSlot(categoryOrSlotMap, tanggal, originalFileName) {
  let slotMap;
  if (categoryOrSlotMap && categoryOrSlotMap.id) {
    const override = originalFileName ? SLOT_MAP_OVERRIDES[originalFileName]?.[categoryOrSlotMap.id] : null;
    slotMap = override || categoryOrSlotMap.slotMap;
  } else {
    slotMap = categoryOrSlotMap;
  }
  if (!slotMap || slotMap.type !== 'monthly_slot') return null;
  return computeSlotRow(slotMap, tanggal);
}

export async function uploadDocumentation({ buildingCategory, siteName, file }) {
  const docFolderId = await getOrCreateDocumentationFolder(siteName);
  return uploadFileToFolder(docFolderId, file);
}

export async function listDocumentationFiles({ buildingCategory, siteName }) {
  const docFolderId = await getOrCreateDocumentationFolder(siteName);
  return listFilesInFolder(docFolderId);
}

export function getSitesForBuildingCategory(buildingCategory) {
  return SITES.filter((s) => s.buildingCategory === buildingCategory);
}

export function getCategoriesForSite(siteName) {
  const site = SITES.find((s) => s.siteName === siteName);
  if (!site) return [];
  return site.categoryIds.map((id) => CATEGORIES.find((c) => c.id === id)).filter(Boolean);
}

const ENTRY_EXIT_TAB_NAME = 'Entry and exit registration';
const ENTRY_EXIT_START_ROW = 7; // baris pertama data (baris 1-6 header/judul)
const ENTRY_EXIT_DATE_COL = 2; // kolom B = Tanggal, dipakai buat deteksi baris kosong

/**
 * Cek apakah "Entry and exit registration" sudah pernah diisi untuk BULAN
 * BERJALAN di site ini - dipakai buat wajibkan pengisian sebelum bisa akses
 * checksheet peralatan (kalau belum, tampilkan form ini duluan).
 */
export async function checkEntryExitFilledThisMonth(buildingCategory, siteName) {
  requireFolderConfig(ROOT_CHECKSHEET_FOLDER_ID, 'VITE_ROOT_CHECKSHEET_FOLDER_ID');
  const site = SITES.find((s) => s.buildingCategory === buildingCategory && s.siteName === siteName);
  if (!site) return { filled: false, sheetUrl: null };

  const bcFolderId = await getBuildingCategoryFolder(buildingCategory);
  const spreadsheetId = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);

  const nextEmptyRow = await findNextEmptyRow(spreadsheetId, ENTRY_EXIT_TAB_NAME, ENTRY_EXIT_START_ROW, ENTRY_EXIT_DATE_COL);
  const now = new Date();
  const currentMonthYear = `${now.getMonth() + 1}/${now.getFullYear()}`;

  // Baca semua baris tanggal yang sudah terisi (dari start row sampai baris kosong
  // berikutnya), cek apakah ADA yang bulan+tahunnya cocok bulan berjalan.
  let filled = false;
  if (nextEmptyRow > ENTRY_EXIT_START_ROW) {
    const rows = await readEntryExitDates(spreadsheetId, ENTRY_EXIT_TAB_NAME, ENTRY_EXIT_START_ROW, nextEmptyRow - 1);
    filled = rows.some((dateStr) => {
      // format tanggal di sheet: "DD/MM/YYYY"
      const parts = (dateStr || '').split('/');
      if (parts.length !== 3) return false;
      return `${parseInt(parts[1], 10)}/${parts[2]}` === currentMonthYear;
    });
  }

  const gid = await getSheetGid(spreadsheetId, ENTRY_EXIT_TAB_NAME);
  return { filled, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid) };
}

/**
 * Submit 1 baris log "Entry and exit registration" - form keluar-masuk
 * machinery room. BEDA dari checksheet biasa: nambah ke baris kosong
 * berikutnya (log berurutan), bukan slot bulanan tetap.
 */
export async function submitEntryExit({ buildingCategory, siteName, tanggal, waktuMasuk, nama, namaUnit, nomorKontak, kegiatan, waktuKeluar, signatureBlob }) {
  requireFolderConfig(ROOT_CHECKSHEET_FOLDER_ID, 'VITE_ROOT_CHECKSHEET_FOLDER_ID');
  const site = SITES.find((s) => s.buildingCategory === buildingCategory && s.siteName === siteName);
  if (!site) throw new Error('Site tidak ditemukan: ' + siteName);

  const bcFolderId = await getBuildingCategoryFolder(buildingCategory);
  const spreadsheetId = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);

  let signatureImageUrl = null;
  if (signatureBlob) {
    const signFolderId = await getOrCreateSubfolder(ROOT_CHECKSHEET_FOLDER_ID, 'Tanda Tangan Entry Exit');
    const fileName = `TTD - ${siteName} - ${nama} - ${tanggal}.png`;
    const uploaded = await uploadPublicImage(signFolderId, signatureBlob, fileName);
    signatureImageUrl = uploaded.imageUrl;
  }

  const row = await findNextEmptyRow(spreadsheetId, ENTRY_EXIT_TAB_NAME, ENTRY_EXIT_START_ROW, ENTRY_EXIT_DATE_COL);
  await writeEntryExitRow(spreadsheetId, ENTRY_EXIT_TAB_NAME, row, {
    tanggal: formatDateID(tanggal), waktuMasuk, nama, namaUnit, nomorKontak, kegiatan, waktuKeluar, signatureImageUrl
  });

  const gid = await getSheetGid(spreadsheetId, ENTRY_EXIT_TAB_NAME);
  logActivity(ROOT_CHECKSHEET_FOLDER_ID, {
    buildingCategory, siteName, categoryName: 'Entry/Exit Registration', tanggal, petugas: nama,
    email: getCurrentUser()?.email, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid)
  });

  return { success: true, row, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid) };
}

/**
 * ==== Verifikasi (Foreman / Deputy Foreman) ====
 * Menulis & membaca sheet "Lembar Verifikasi Pekerjaan" - sign-off bulanan
 * per site (bukan per kategori/submission), sesuai proses asli KCIC.
 */

const BULAN_LIST = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatDateID(dateStr) {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Baca status verifikasi 12 bulan untuk 1 site (dipakai halaman detail Verifikasi).
 * Return array 12 objek { bulan, tanggal, namaVerifikator } - kosong kalau belum diverifikasi.
 */
export async function getVerificationStatus(buildingCategory, siteName) {
  requireFolderConfig(ROOT_CHECKSHEET_FOLDER_ID, 'VITE_ROOT_CHECKSHEET_FOLDER_ID');
  const site = SITES.find((s) => s.buildingCategory === buildingCategory && s.siteName === siteName);
  if (!site) throw new Error('Site tidak ditemukan: ' + siteName);

  const bcFolderId = await getBuildingCategoryFolder(buildingCategory);
  const spreadsheetId = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);

  const result = [];
  for (let i = 0; i < 12; i++) {
    const row = VERIFICATION_SLOT_MAP.slotStartRow + i;
    const cells = await readSlotRow(spreadsheetId, VERIFICATION_TAB_NAME, row, 6);
    result.push({
      bulan: BULAN_LIST[i],
      tanggal: cells[2] || '',
      namaVerifikator: cells[3] || ''
    });
  }
  const gid = await getSheetGid(spreadsheetId, VERIFICATION_TAB_NAME);
  return { months: result, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid) };
}

/**
 * Tulis verifikasi untuk 1 bulan tertentu di 1 site - dipanggil dari halaman
 * Verifikasi setelah Foreman/Deputy Foreman cek manual checksheet teknisi
 * dan menyatakan OK. Nama verifikator diambil dari akun Google yang login.
 * Kalau signatureBlob diisi (hasil gambar/upload di SignaturePad), tanda
 * tangan diupload ke Drive dulu lalu ditampilkan sebagai gambar di kolom paraf.
 */
export async function submitVerification({ buildingCategory, siteName, monthIndex, signatureBlob }) {
  requireFolderConfig(ROOT_CHECKSHEET_FOLDER_ID, 'VITE_ROOT_CHECKSHEET_FOLDER_ID');
  const site = SITES.find((s) => s.buildingCategory === buildingCategory && s.siteName === siteName);
  if (!site) throw new Error('Site tidak ditemukan: ' + siteName);

  const bcFolderId = await getBuildingCategoryFolder(buildingCategory);
  const spreadsheetId = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);
  const today = new Date().toISOString().slice(0, 10);
  const namaVerifikator = getCurrentUser()?.name || getCurrentUser()?.email || 'Verifikator';

  let signatureImageUrl = null;
  if (signatureBlob) {
    const signFolderId = await getOrCreateSubfolder(ROOT_CHECKSHEET_FOLDER_ID, 'Tanda Tangan Verifikasi');
    const fileName = `TTD - ${siteName} - ${namaVerifikator} - ${today}.png`;
    const uploaded = await uploadPublicImage(signFolderId, signatureBlob, fileName);
    signatureImageUrl = uploaded.imageUrl;
  }

  const { row } = await writeVerificationRow(spreadsheetId, VERIFICATION_TAB_NAME, VERIFICATION_SLOT_MAP, monthIndex, {
    tanggalVerifikasi: today,
    namaVerifikator,
    signatureImageUrl
  });

  const gid = await getSheetGid(spreadsheetId, VERIFICATION_TAB_NAME);
  return { success: true, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid), row };
}
