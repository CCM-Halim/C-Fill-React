/**
 * cfillService.js
 * Logic bisnis C-Fill: mapping Lokasi/Site/Instrumen -> folder, konversi file
 * .xlsx asli jadi Google Sheets (sekali saja), lalu tulis ke SLOT baris/kolom
 * yang sudah ada di dalamnya - BUKAN menambah baris baru di bawah.
 */
import { writeMonthlySlot, writeMatrixSlot, getSpreadsheetUrl, getSheetGid, computeSlotRow, readSlotRow, writeVerificationRow, findNextEmptyRow, writeEntryExitRow, readEntryExitDates, getRowCellValues, resolveTabName, readRawRange, listSheetTabs } from './sheetsApi';
import { getOrCreateSubfolder, uploadFileToFolder, listFilesInFolder, getOrConvertSiteSpreadsheet, uploadPublicImage, findFolderContaining, replaceFileContent, makeFilePublic, readFileContentAsText, writeFileContentAsText, extractDriveFileId } from './driveApi';
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
const JADWAL_KUNJUNGAN_FOLDER_ID = import.meta.env.VITE_JADWAL_KUNJUNGAN_FOLDER_ID;
const LOG_GANGGUAN_FILE_ID = import.meta.env.VITE_LOG_GANGGUAN_FILE_ID;
const ROOT_INSTRUMEN_FOLDER_ID = import.meta.env.VITE_ROOT_INSTRUMEN_FOLDER_ID;
const ROOT_DOKUMENTASI_FOLDER_ID = import.meta.env.VITE_ROOT_DOKUMENTASI_FOLDER_ID;
const FOTO_MASUK_JALUR_FOLDER_ID = import.meta.env.VITE_FOTO_MASUK_JALUR_FOLDER_ID;
const FOTO_KELUAR_JALUR_FOLDER_ID = import.meta.env.VITE_FOTO_KELUAR_JALUR_FOLDER_ID;
const REKAMAN_MASUK_JALUR_FOLDER_ID = import.meta.env.VITE_REKAMAN_MASUK_JALUR_FOLDER_ID;
const REKAMAN_KELUAR_JALUR_FOLDER_ID = import.meta.env.VITE_REKAMAN_KELUAR_JALUR_FOLDER_ID;

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
 * Cek apakah slot bulan yang sama untuk kategori ini SUDAH ADA isinya - dipanggil
 * SEBELUM submit sungguhan (lihat ChecksheetForm.jsx). Kalau ada isi lama,
 * teknisi ditanya dulu: "Perbaikan" (timpa) atau "Perawatan Baru" (isi baru
 * ditambahkan sebagai riwayat, isi lama tidak hilang) - berlaku utk perawatan
 * dalam bulan yang sama, karena kadang kerjaan bulan berikutnya sudah dikerjakan
 * lebih awal (mis. yg harusnya September dikerjakan akhir Agustus).
 *
 * Return { hasExisting: boolean, existingValues: {itemId: string} }.
 */
export async function checkMonthAlreadyFilled({ buildingCategory, siteName, categoryId, tanggal }) {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category || !category.slotMap || category.slotMap.type === 'matrix') {
    return { hasExisting: false, existingValues: {} };
  }
  const site = SITES.find((s) => s.buildingCategory === buildingCategory && s.siteName === siteName);
  if (!site) return { hasExisting: false, existingValues: {} };

  const bcFolderId = await getBuildingCategoryFolder(buildingCategory);
  const { spreadsheetId, duplicateWarning } = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);
  const tabName = await resolveTabName(spreadsheetId, category.sheetName);
  const override = SLOT_MAP_OVERRIDES[site.originalFileName]?.[categoryId];
  const slotMap = override || category.slotMap;

  const row = computeSlotRow(slotMap, tanggal);
  const existingValues = await getRowCellValues(spreadsheetId, tabName, row, slotMap.itemColumns);
  const hasExisting = Object.values(existingValues).some((v) => v && v.trim());
  return { hasExisting, existingValues };
}

/**
 * Simpan 1 submission checksheet peralatan, ditulis ke slot bulan yang sesuai
 * di dalam file asli site tsb (dikonversi otomatis jadi Google Sheets kalau
 * belum pernah sebelumnya). File .xlsx asli & hasil konversinya ada LANGSUNG
 * di folder kategori bangunan (mis. "1. BTS Communication Room"), TIDAK di
 * subfolder per-site - mengikuti struktur folder asli kamu.
 */
export async function submitChecksheet({ buildingCategory, siteName, categoryId, tanggal, petugas, answers, writeMode = 'overwrite', existingValues = {} }) {
  requireFolderConfig(ROOT_CHECKSHEET_FOLDER_ID, 'VITE_ROOT_CHECKSHEET_FOLDER_ID');
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) throw new Error('Kategori tidak ditemukan: ' + categoryId);
  const site = SITES.find((s) => s.buildingCategory === buildingCategory && s.siteName === siteName);
  if (!site) throw new Error('Site tidak ditemukan: ' + siteName);
  if (!category.slotMap) throw new Error(`Kategori "${category.short_name}" belum punya peta slot.`);

  const bcFolderId = await getBuildingCategoryFolder(buildingCategory);
  const { spreadsheetId, duplicateWarning } = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);
  const tabName = await resolveTabName(spreadsheetId, category.sheetName);
  const override = SLOT_MAP_OVERRIDES[site.originalFileName]?.[categoryId];
  const slotMap = override || category.slotMap;

  if (slotMap.type === 'matrix') {
    await writeMatrixSlot(spreadsheetId, tabName, slotMap, { tanggal, matrixAnswers: answers, unitCount: slotMap.defaultUnitCount });
    const gid = await getSheetGid(spreadsheetId, tabName);
    return { success: true, fileName: site.originalFileName, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid), duplicateWarning };
  }

  const { row } = await writeMonthlySlot(spreadsheetId, tabName, slotMap, { tanggal, petugas, answers, writeMode, existingValues });
  const gid = await getSheetGid(spreadsheetId, tabName);
  const sheetUrl = getSpreadsheetUrl(spreadsheetId, gid);

  logActivity(ROOT_CHECKSHEET_FOLDER_ID, {
    buildingCategory, siteName, categoryName: category.short_name, tanggal, petugas,
    email: getCurrentUser()?.email, sheetUrl
  });

  return { success: true, fileName: site.originalFileName, row, sheetUrl, duplicateWarning };
}

/**
 * Simpan 1 submission checksheet instrumen - sistemnya SAMA dengan checksheet
 * peralatan (tulis ke slot bulan di file .xlsx asli instrumen tsb, dikonversi
 * otomatis jadi Google Sheets kalau belum pernah).
 */
export async function submitInstrumentChecksheet({ namaInstrumen, tanggal, petugas, answers }) {
  requireFolderConfig(ROOT_INSTRUMEN_FOLDER_ID, 'VITE_ROOT_INSTRUMEN_FOLDER_ID');
  const originalFileName = namaInstrumen + '.xlsx';
  const { spreadsheetId, duplicateWarning } = await getOrConvertSiteSpreadsheet(ROOT_INSTRUMEN_FOLDER_ID, originalFileName);
  const tabName = await resolveTabName(spreadsheetId, 'Instrumen Telekomunikasi');

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

/**
 * ==== Masuk/Keluar Jalur ====
 * Upload foto + rekaman suara konfirmasi personil & peralatan pas masuk/keluar
 * restricted area (jalur rel). 4 folder ROOT terpisah (foto masuk, foto keluar,
 * suara masuk, suara keluar) - dulu diisi lewat Google Form, sekarang langsung
 * dari C-Fill. Di dalam tiap folder root, file diorganisir per BULAN lalu per
 * LOKASI (mengikuti struktur folder lama dari Google Form: "1. Januari",
 * "8. Agustus", dst - TANPA nol di depan, beda dari folder Dokumentasi Kegiatan
 * yang pakai nol di depan "09. September" - supaya konsisten sama isi lama).
 */
function buildJalurFileName(waktu, nama, ext) {
  const safeName = (nama || 'Petugas').replace(/[\\/:*?"<>|]/g, '');
  return `${waktu || 'waktu'} - ${safeName}.${ext}`.replace(/\s+/g, ' ').trim();
}

async function getOrCreateJalurFolder(rootFolderId, siteName, tanggal) {
  // tanggal format "DD/MM/YYYY" (lihat formatDateID di MasukKeluarJalurPage.jsx)
  const [, monthStr] = tanggal.split('/');
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthFolderName = `${monthIndex + 1}. ${BULAN_ID[monthIndex]}`; // "9. September" - TANPA nol di depan
  const monthFolderId = await getOrCreateSubfolder(rootFolderId, monthFolderName);

  const siteCode = getSiteShortCode(siteName);
  const existingFolderId = await findFolderContaining(monthFolderId, siteCode);
  if (existingFolderId) return existingFolderId;

  return getOrCreateSubfolder(monthFolderId, siteCode);
}

export async function submitMasukJalur({ siteName, tanggal, waktu, nama, catatan, fotoFile, suaraFile }) {
  if (!FOTO_MASUK_JALUR_FOLDER_ID) throw new Error('VITE_FOTO_MASUK_JALUR_FOLDER_ID belum diatur di .env');
  if (!REKAMAN_MASUK_JALUR_FOLDER_ID) throw new Error('VITE_REKAMAN_MASUK_JALUR_FOLDER_ID belum diatur di .env');
  return submitJalur({
    siteName, tanggal, waktu, nama, catatan, fotoFile, suaraFile,
    fotoRootFolderId: FOTO_MASUK_JALUR_FOLDER_ID, suaraRootFolderId: REKAMAN_MASUK_JALUR_FOLDER_ID, label: 'Masuk Jalur'
  });
}

export async function submitKeluarJalur({ siteName, tanggal, waktu, nama, catatan, fotoFile, suaraFile }) {
  if (!FOTO_KELUAR_JALUR_FOLDER_ID) throw new Error('VITE_FOTO_KELUAR_JALUR_FOLDER_ID belum diatur di .env');
  if (!REKAMAN_KELUAR_JALUR_FOLDER_ID) throw new Error('VITE_REKAMAN_KELUAR_JALUR_FOLDER_ID belum diatur di .env');
  return submitJalur({
    siteName, tanggal, waktu, nama, catatan, fotoFile, suaraFile,
    fotoRootFolderId: FOTO_KELUAR_JALUR_FOLDER_ID, suaraRootFolderId: REKAMAN_KELUAR_JALUR_FOLDER_ID, label: 'Keluar Jalur'
  });
}

async function submitJalur({ siteName, tanggal, waktu, nama, catatan, fotoFile, suaraFile, fotoRootFolderId, suaraRootFolderId, label }) {
  if (!fotoFile) throw new Error('Foto wajib diisi.');

  const description = `Site: ${siteName}\nTanggal: ${tanggal} ${waktu || ''}\nNama: ${nama || '-'}\nCatatan: ${catatan || '-'}`;

  const fotoFolderId = await getOrCreateJalurFolder(fotoRootFolderId, siteName, tanggal);
  const fotoExt = (fotoFile.name.split('.').pop() || 'jpg').toLowerCase();
  const fotoName = buildJalurFileName(waktu, nama, fotoExt);
  const fotoResult = await uploadFileToFolder(fotoFolderId, new File([fotoFile], fotoName, { type: fotoFile.type }), description);

  let suaraResult = null;
  if (suaraFile) {
    const suaraFolderId = await getOrCreateJalurFolder(suaraRootFolderId, siteName, tanggal);
    const suaraExt = (suaraFile.name.split('.').pop() || 'webm').toLowerCase();
    const suaraName = buildJalurFileName(waktu, nama, suaraExt);
    suaraResult = await uploadFileToFolder(suaraFolderId, new File([suaraFile], suaraName, { type: suaraFile.type }), description);
  }

  logActivity(ROOT_CHECKSHEET_FOLDER_ID, {
    buildingCategory: 'Jalur', siteName, categoryName: label, tanggal, petugas: nama,
    email: getCurrentUser()?.email, sheetUrl: fotoResult.webViewLink
  });

  return { success: true, fotoUrl: fotoResult.webViewLink, suaraUrl: suaraResult?.webViewLink || null };
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
 * Cek apakah Entry/Exit Registration sudah pernah diisi di BULAN BERJALAN
 * untuk site ini. Kalau sudah pernah, kunjungan berikutnya di bulan yang sama
 * TIDAK perlu isi lagi (teknisi biasanya cuma merevisi checksheet).
 *
 * Ceknya per BULAN, bukan per tanggal: Google Sheets kadang menormalkan
 * tanggal jadi "MM/DD/YYYY" walau kita mengirim "DD/MM/YYYY", jadi pencocokan
 * dilakukan dengan mengambil semua angka di string tanggal lalu memastikan
 * bulan berjalan + tahun berjalan sama-sama ada - tidak bergantung posisi.
 */
export async function checkEntryExitFilledThisMonth(buildingCategory, siteName, date = new Date()) {
  const empty = { filled: false, sheetUrl: null };
  const site = SITES.find((s) => s.buildingCategory === buildingCategory && s.siteName === siteName);
  if (!site) return empty;

  const now = date;
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  try {
    const bcFolderId = await getBuildingCategoryFolder(buildingCategory);
    const { spreadsheetId } = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);
    const tabName = await resolveTabName(spreadsheetId, ENTRY_EXIT_TAB_NAME);

    const nextEmptyRow = await findNextEmptyRow(spreadsheetId, tabName, ENTRY_EXIT_START_ROW, ENTRY_EXIT_DATE_COL);
    const gid = await getSheetGid(spreadsheetId, tabName);
    const sheetUrl = getSpreadsheetUrl(spreadsheetId, gid);

    if (nextEmptyRow <= ENTRY_EXIT_START_ROW) return { filled: false, sheetUrl };

    const rows = await readEntryExitDates(spreadsheetId, tabName, ENTRY_EXIT_START_ROW, nextEmptyRow - 1);
    const filled = rows.some((dateStr) => {
      const numbers = (dateStr || '').match(/\d+/g);
      if (!numbers || numbers.length < 3) return false;
      const hasYear = numbers.includes(String(currentYear));
      const hasMonth = numbers.some((n) => parseInt(n, 10) === currentMonth && parseInt(n, 10) <= 12);
      return hasYear && hasMonth;
    });

    return { filled, sheetUrl };
  } catch {
    // Gagal cek (mis. site ini belum punya tab Entry/Exit) - fail-safe ke
    // false, biar form Entry/Exit tetap dimunculkan, bukan malah mengunci
    // akses teknisi ke checksheet.
    return empty;
  }
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
  const { spreadsheetId, duplicateWarning } = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);
  const tabName = await resolveTabName(spreadsheetId, ENTRY_EXIT_TAB_NAME);

  let signatureImageUrl = null;
  if (signatureBlob) {
    const signFolderId = await getOrCreateSubfolder(ROOT_CHECKSHEET_FOLDER_ID, 'Tanda Tangan Entry Exit');
    const fileName = `TTD - ${siteName} - ${nama} - ${tanggal}.png`;
    const uploaded = await uploadPublicImage(signFolderId, signatureBlob, fileName);
    signatureImageUrl = uploaded.imageUrl;
  }

  const row = await findNextEmptyRow(spreadsheetId, tabName, ENTRY_EXIT_START_ROW, ENTRY_EXIT_DATE_COL);
  await writeEntryExitRow(spreadsheetId, tabName, row, {
    tanggal: formatDateID(tanggal), waktuMasuk, nama, namaUnit, nomorKontak, kegiatan, waktuKeluar, signatureImageUrl
  });

  const gid = await getSheetGid(spreadsheetId, tabName);
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
  const { spreadsheetId, duplicateWarning } = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);
  const tabName = await resolveTabName(spreadsheetId, VERIFICATION_TAB_NAME);

  const result = [];
  for (let i = 0; i < 12; i++) {
    const row = VERIFICATION_SLOT_MAP.slotStartRow + i;
    const cells = await readSlotRow(spreadsheetId, tabName, row, 6);
    result.push({
      bulan: BULAN_LIST[i],
      tanggal: cells[2] || '',
      namaVerifikator: cells[3] || ''
    });
  }
  const gid = await getSheetGid(spreadsheetId, tabName);
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
  const { spreadsheetId, duplicateWarning } = await getOrConvertSiteSpreadsheet(bcFolderId, site.originalFileName);
  const tabName = await resolveTabName(spreadsheetId, VERIFICATION_TAB_NAME);
  const today = new Date().toISOString().slice(0, 10);
  const namaVerifikator = getCurrentUser()?.name || getCurrentUser()?.email || 'Verifikator';

  let signatureImageUrl = null;
  if (signatureBlob) {
    const signFolderId = await getOrCreateSubfolder(ROOT_CHECKSHEET_FOLDER_ID, 'Tanda Tangan Verifikasi');
    const fileName = `TTD - ${siteName} - ${namaVerifikator} - ${today}.png`;
    const uploaded = await uploadPublicImage(signFolderId, signatureBlob, fileName);
    signatureImageUrl = uploaded.imageUrl;
  }

  const { row } = await writeVerificationRow(spreadsheetId, tabName, VERIFICATION_SLOT_MAP, monthIndex, {
    tanggalVerifikasi: today,
    namaVerifikator,
    signatureImageUrl
  });

  const gid = await getSheetGid(spreadsheetId, tabName);
  return { success: true, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid), row };
}

/**
 * ==== Dashboard: Jadwal Kunjungan MR ====
 * Baca file bulanan "Jadwal Kunjungan MR <Bulan> <Tahun>" dari folder yang
 * dikonfigurasi, cari file yang namanya cocok BULAN BERJALAN (dicari via
 * substring match, toleran kalau ada variasi kecil di penulisan), lalu parse
 * tab "Jadwal Kunjungan MR" jadi ringkasan progress + daftar kerjaan yang
 * belum selesai. Kolom di sheet (dari B, kolom A "No" dilewati):
 * B=Hari&Tanggal, C=Jam, D=Lokasi, E=(kosong), F=Kegiatan, G=Detail,
 * H=PIC, I=Temuan, J=Realisasi, K=Status Kegiatan, L=Keterangan.
 */

const JADWAL_CONFIG_FILE_ID = import.meta.env.VITE_JADWAL_CONFIG_FILE_ID;

/**
 * Baca config override link jadwal bulanan (diatur admin lewat Dashboard) -
 * format isinya JSON `{ "2026-9": "<driveFileId>" }`. Return {} kalau file
 * config belum diatur atau isinya masih kosong.
 */
async function getJadwalConfig() {
  if (!JADWAL_CONFIG_FILE_ID) return {};
  try {
    const raw = await readFileContentAsText(JADWAL_CONFIG_FILE_ID);
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

/**
 * Admin tempel link Google Sheets jadwal kunjungan buat bulan tertentu -
 * disimpan sebagai OVERRIDE, jadi nggak perlu lagi taruh file ke folder
 * dengan struktur nama yang pas persis. Sekali di-set, getJadwalKunjunganBulanIni
 * pakai file ini LANGSUNG (skip pencarian folder bulanan sama sekali).
 */
export async function setJadwalKunjunganOverride(bulanIndex, tahun, driveLinkOrId) {
  if (!JADWAL_CONFIG_FILE_ID) {
    throw new Error(
      'VITE_JADWAL_CONFIG_FILE_ID belum diatur. Buat 1 file teks kosong (isi awal: {}) di Google Drive, ' +
      'catat ID-nya (dari URL), lalu tambahkan sebagai Environment Variable ini.'
    );
  }
  const fileId = extractDriveFileId(driveLinkOrId);
  if (!fileId) throw new Error('Link/ID Google Sheets tidak valid.');

  const config = await getJadwalConfig();
  const key = `${tahun}-${bulanIndex + 1}`;
  config[key] = fileId;
  await writeFileContentAsText(JADWAL_CONFIG_FILE_ID, JSON.stringify(config, null, 1));
  return { success: true };
}

export async function getJadwalKunjunganBulanIni() {
  const now = new Date();
  const namaBulan = BULAN_ID[now.getMonth()];
  const tahun = now.getFullYear();

  // 1. Cek dulu apakah admin sudah nempel link override buat bulan ini - kalau
  // ada, pakai LANGSUNG, skip pencarian folder sama sekali (lebih cepat & pasti).
  const config = await getJadwalConfig();
  const overrideFileId = config[`${tahun}-${now.getMonth() + 1}`];

  let target;
  if (overrideFileId) {
    target = { id: overrideFileId, name: `(link manual admin) — ${namaBulan} ${tahun}` };
  } else {
    if (!JADWAL_KUNJUNGAN_FOLDER_ID) {
      return { available: false, reason: 'VITE_JADWAL_KUNJUNGAN_FOLDER_ID belum diatur di .env, dan admin belum tempel link manual buat bulan ini.' };
    }

    // Struktur folder: [Root] / [Bulan, mis. "9. September"] / [file jadwal] -
    // ada 1 lapis folder bulan dulu SEBELUM file-nya, jadi cari folder bulan ini
    // dulu, baru cari file di dalamnya (bukan cari file langsung di folder root).
    const entries = await listFilesInFolder(JADWAL_KUNJUNGAN_FOLDER_ID);
    const monthFolder = entries.find((f) => f.name.includes(namaBulan));
    if (!monthFolder) {
      return { available: false, reason: `Folder bulan "${namaBulan}" belum ditemukan di folder Jadwal Kunjungan, dan admin belum tempel link manual. Pastikan ada folder yang namanya mengandung "${namaBulan}", atau minta admin tempel link lewat Dashboard.` };
    }

    const filesInMonth = await listFilesInFolder(monthFolder.id);
    // Cocokkan file yang namanya mengandung tahun berjalan (toleran variasi kecil
    // penulisan) - kalau nggak ketemu tapi cuma ada 1 file di folder itu, pakai itu saja.
    target = filesInMonth.find((f) => f.name.includes(String(tahun)));
    if (!target && filesInMonth.length === 1) target = filesInMonth[0];
    if (!target) {
      return { available: false, reason: `File jadwal untuk ${namaBulan} ${tahun} belum ditemukan di folder, dan admin belum tempel link manual lewat Dashboard.` };
    }
  }

  const tabName = await resolveTabName(target.id, 'Jadwal Kunjungan MR');
  const rows = await readRawRange(target.id, tabName, 'B3:L120');

  const items = [];
  for (const r of rows) {
    const lokasi = (r[2] || '').trim();
    if (!lokasi) continue; // baris kosong / bukan entri kerjaan beneran
    items.push({
      tanggal: (r[0] || '').trim(),
      jam: (r[1] || '').trim(),
      lokasi,
      kegiatan: (r[4] || '').trim(),
      pic: (r[6] || '').trim(),
      temuan: (r[7] || '').trim(),
      status: (r[9] || '').trim(),
      keterangan: (r[10] || '').trim()
    });
  }

  if (items.length === 0) {
    // Diagnostik: file & tab ketemu tapi nggak ada baris kerjaan yang kebaca -
    // tampilkan info teknis biar gampang dilacak, daripada nampilin 0/0 yang
    // menyesatkan (seolah-olah beneran nggak ada kerjaan bulan ini).
    return {
      available: false,
      reason: `File "${target.name}" ditemukan, tab "${tabName}" terbaca, tapi 0 baris data kerjaan ketemu ` +
        `(dari ${rows.length} baris mentah yang dibaca). Kemungkinan struktur kolom di file ini beda dari yang diharapkan, ` +
        `atau akun ini nggak punya akses baca isi selnya (walau bisa lihat file-nya ada).`
    };
  }

  // Progress per PERIODE (1M/3M/6M/1Y) - 1 baris bisa mencakup beberapa periode
  // sekaligus (kolom "Kegiatan" isinya mis. "1M, 3M, 6M" dipisah koma), jadi
  // tiap periode yang disebut di baris itu dihitung masing-masing (total +
  // selesai kalau statusnya "Finish"). Ini DIHITUNG SENDIRI dari kolom
  // Kegiatan+Status, bukan dari kolom M:P (1M/3M/6M/1Y) di sheet - kolom itu
  // cuma angka kumulatif total per periode, nggak ada breakdown selesai/belum.
  // Selain angka, disimpan juga DAFTAR lokasinya (finishedItems/notYetItems) -
  // dipakai buat pop-up daftar site pas donut chart di Dashboard diklik.
  const PERIODS = ['1M', '3M', '6M', '1Y'];
  const periodBreakdown = {};
  PERIODS.forEach((p) => { periodBreakdown[p] = { total: 0, finished: 0, finishedItems: [], notYetItems: [] }; });

  for (const it of items) {
    if (!it.kegiatan) continue;
    const tags = it.kegiatan.split(',').map((t) => t.trim().toUpperCase());
    for (const tag of tags) {
      if (periodBreakdown[tag]) {
        periodBreakdown[tag].total += 1;
        if (it.status.toLowerCase() === 'finish') {
          periodBreakdown[tag].finished += 1;
          periodBreakdown[tag].finishedItems.push(it);
        } else {
          periodBreakdown[tag].notYetItems.push(it);
        }
      }
    }
  }

  const finished = items.filter((it) => it.status.toLowerCase() === 'finish');
  const notYet = items.filter((it) => it.status.toLowerCase() !== 'finish');

  return {
    available: true,
    bulan: namaBulan,
    tahun,
    fileName: target.name,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${target.id}/edit`,
    total: items.length,
    finishedCount: finished.length,
    notYetCount: notYet.length,
    periodBreakdown,
    notYetItems: notYet,
    allItems: items,
    // Diagnostik sementara: sample 5 item pertama apa adanya (kegiatan +
    // status persis seperti yang kebaca) - dipakai buat lacak kalau donut
    // masih 0/0 padahal items nggak kosong (berarti masalahnya di pencocokan
    // tag Kegiatan, bukan di pembacaan baris).
    debugSample: items.slice(0, 5).map((it) => ({ lokasi: it.lokasi, kegiatan: it.kegiatan, status: it.status }))
  };
}

/**
 * ==== Dashboard: Log Gangguan ====
 * Baca daftar tab yang ada di file Log Gangguan (buat filter "dari sheet
 * apa"), lalu baca & filter datanya per tab/bulan. Kolom yang diambil (sesuai
 * struktur "Log Book Gangguan Dept Telco Halim"): E=Lokasi Gangguan,
 * G=Waktu Gangguan (tanggal alarm), H=Waktu Pemulihan (tanggal dipulihkan),
 * P=Sistem Terkait (kategori), B=Status (Open/Close).
 */
export async function getLogGangguanTabs() {
  if (!LOG_GANGGUAN_FILE_ID) return { available: false, reason: 'VITE_LOG_GANGGUAN_FILE_ID belum diatur di .env' };
  const tabs = await listSheetTabs(LOG_GANGGUAN_FILE_ID);
  return { available: true, tabs };
}

export async function getLogGangguanData(tabName) {
  if (!LOG_GANGGUAN_FILE_ID) return { available: false, reason: 'VITE_LOG_GANGGUAN_FILE_ID belum diatur di .env' };
  const resolvedTab = await resolveTabName(LOG_GANGGUAN_FILE_ID, tabName);
  const rows = await readRawRange(LOG_GANGGUAN_FILE_ID, resolvedTab, 'B3:P500');

  const items = [];
  for (const r of rows) {
    const lokasi = (r[3] || '').trim(); // E (index 3 dari kolom B)
    if (!lokasi) continue;
    items.push({
      status: (r[0] || '').trim(),           // B
      tanggalAlarm: (r[5] || '').trim(),      // G
      lokasi,                                 // E
      tanggalPulih: (r[6] || '').trim(),      // H
      kategori: (r[14] || '').trim()          // P
    });
  }
  return { available: true, items };
}

/* Fitur "Ganti Foto Header Login" DIHAPUS (22 Sep 2026 - permintaan Jo).
   Foto header login sekarang statis dari /public/backgrounds/station-halim.jpg
   (foto menara telekomunikasi + teknisi memanjat). Tidak perlu env var
   VITE_LOGIN_HEADER_FILE_ID lagi. Lihat config/loginHeader.js. */

