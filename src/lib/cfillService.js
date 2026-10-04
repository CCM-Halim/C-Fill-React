/**
 * cfillService.js
 * Logic bisnis C-Fill: mapping Lokasi/Site/Instrumen -> folder, konversi file
 * .xlsx asli jadi Google Sheets (sekali saja), lalu tulis ke SLOT baris/kolom
 * yang sudah ada di dalamnya - BUKAN menambah baris baru di bawah.
 */
import { writeMonthlySlot, writeMatrixSlot, getSpreadsheetUrl, getSheetGid, computeSlotRow, readSlotRow, writeVerificationRow, findNextEmptyRow, writeEntryExitRow, readEntryExitDates, getRowCellValues, resolveTabName, readRawRange, listSheetTabs } from './sheetsApi';
import { getOrCreateSubfolder, uploadFileToFolder, listFilesInFolder, getOrConvertSiteSpreadsheet, findAllSheetsForName, uploadPublicImage, findFolderContaining, replaceFileContent, makeFilePublic, readFileContentAsText, writeFileContentAsText, extractDriveFileId } from './driveApi';
import { CATEGORIES } from '../config/categories';
import { SITES } from '../config/sites';
import { INSTRUMENT_SLOT_MAP, resolveInstrumentName } from '../config/instruments';
import { SLOT_MAP_OVERRIDES } from '../config/slotMapOverrides';
import { logActivity } from './activityLog';
import { getCurrentUser } from './googleAuth';
import { summarizeJadwal } from './jadwalProgress';
import { parseGangguanRows, summarizeGangguan } from './gangguanLog';

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

/**
 * Ambil id spreadsheet Google Sheets milik sebuah site TANPA mengonversi.
 * Dipakai jalur baca-saja (mis. cek nilai existing di form) - kalau file
 * Sheets-nya memang belum pernah dibuat, hasilnya null dan pemanggil harus
 * memperlakukannya sebagai "belum ada isian", bukan sebagai error.
 */
async function getSiteSpreadsheetId(bcFolderId, originalFileName) {
  const found = await findAllSheetsForName(bcFolderId, originalFileName);
  return found.length > 0 ? found[0].id : null;
}

/**
 * Kandidat nama tab untuk sebuah kategori: nama utama dulu, baru alias.
 * Sebagian file memakai nama tab yang berbeda penulisan dari config - mis.
 * kategori "Telephone dan Softswitch AG" yang di 4 site (Halim CC, dst)
 * tab-nya bernama pendek "Telephone AG (3,6M)". Keduanya nama yang sah,
 * jadi dicoba berurutan (lihat lib/tabNames.js).
 */
function tabKandidat(category) {
  return [category.sheetName, ...(category.sheetAliases || [])];
}

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
  // CATATAN: fungsi ini HANYA MEMBACA nilai yang sudah ada, tidak menulis apa
  // pun. Karena itu konversi .xlsx -> Google Sheets TIDAK dijalankan di sini -
  // konversi makan waktu 10-20 detik dan sebelumnya ikut terpicu cuma karena
  // teknisi MEMBUKA form (bukan menyimpan), sehingga terasa menggantung.
  // Konversi dijalankan saat submit - lihat submitChecksheet.
  const spreadsheetId = await getSiteSpreadsheetId(bcFolderId, site.originalFileName);
  const override = SLOT_MAP_OVERRIDES[site.originalFileName]?.[categoryId];
  const slotMap = override || category.slotMap;
  const row = computeSlotRow(slotMap, tanggal);

  // File Sheets belum pernah dibuat (= belum pernah diisi) -> tidak ada nilai
  // existing, dan TIDAK perlu dikonversi cuma untuk memeriksa.
  if (!spreadsheetId) return { hasExisting: false, existingValues: {} };

  let existingValues = {};
  try {
    const tabName = await resolveTabName(spreadsheetId, tabKandidat(category));
    existingValues = await getRowCellValues(spreadsheetId, tabName, row, slotMap.itemColumns);
  } catch {
    // Tab belum ada di file yang sudah dikonversi -> anggap belum ada isian.
    // Cek ini bersifat informasi untuk dialog "sudah pernah diisi?" - gagal di
    // sini TIDAK boleh menghalangi teknisi membuka & submit form.
    return { hasExisting: false, existingValues: {} };
  }
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
  const tabName = await resolveTabName(spreadsheetId, tabKandidat(category));
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
  // Nama file di Drive tidak boleh memuat '/' - empat alat di daftar aslinya
  // ditulis pakai '/' dan tersimpan sebagai '_'. Diterjemahkan di sini supaya
  // penulisan aslinya tetap boleh diketik di formulir.
  const originalFileName = resolveInstrumentName(namaInstrumen) + '.xlsx';
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
 * belum selesai.
 *
 * PETA KOLOM (baris 2 = header, data mulai baris 3) DIAMBIL DARI HEADER sheet,
 * bukan dari perkiraan - lihat lib/jadwalProgress.js:
 *   B=Hari&Tanggal  C=Jam  D=lokasi MR - ECS3  E=Kegiatan  F=Detail Pekerjaan
 *   G=PIC Checksheet  H=Temuan  I=Realisasi  J=Status Kegiatan  K=Keterangan
 *   L:O=1M/3M/6M/1Y (kolom bantu rencana, dipakai sebagai pembanding)
 *
 * Riwayat bug: pemetaan lama mengambil lokasi dari D, tetapi Kegiatan dari F
 * (harusnya E) dan Status dari K (harusnya J). Akibatnya kolom Kegiatan selalu
 * kosong & tidak ada baris yang terbaca "Finish", sehingga keempat donut
 * menampilkan 0/0 meski jadwalnya terisi. Pemetaan sekarang mengikuti header
 * dan sudah diuji terhadap data September & Oktober 2026 asli.
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
    // Folder bulan di Drive TIDAK seragam: root memakai "9. September" (tanpa
    // nol di depan) sedangkan folder Dokumentasi Kegiatan memakai
    // "09. September". Pencocokan karena itu mengabaikan AWALAN NOMOR-nya dan
    // mencari nama bulan sebagai kata utuh, supaya kedua bentuk itu ketemu.
    const entries = await listFilesInFolder(JADWAL_KUNJUNGAN_FOLDER_ID);
    const bulanLower = namaBulan.toLowerCase();
    const cocokBulan = (nama) => {
      const n = String(nama || '').toLowerCase();
      const tanpaNomor = n.replace(/^\s*\d+\s*[.\-)]?\s*/, '');
      return tanpaNomor.startsWith(bulanLower) || n.includes(bulanLower);
    };
    const monthFolder = entries.find((f) => cocokBulan(f.name));
    if (!monthFolder) {
      const ada = entries.map((f) => `"${f.name}"`).join(', ') || '(folder kosong)';
      return { available: false, reason: `Folder bulan "${namaBulan}" belum ditemukan di folder Jadwal Kunjungan, dan admin belum tempel link manual. Folder yang ada di sana: ${ada}. Pastikan salah satunya memuat nama bulan "${namaBulan}", atau minta admin tempel link lewat Dashboard.` };
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

  // Nama tab jadwal di sebagian bulan berbeda: "jadwal kunjungan MR New"
  // (Januari & Februari) sementara yang lain "Jadwal Kunjungan MR". Kandidat
  // dicoba berurutan; kalau tidak ada satu pun yang cocok, error yang dilempar
  // menyebutkan daftar tab yang benar-benar ada di file itu.
  const tabName = await resolveTabName(target.id, ['Jadwal Kunjungan MR', 'Jadwal Kunjungan MR New', 'jadwal kunjungan MR New']);
  // Range sampai kolom O: L:O = kolom bantu rencana (1M/3M/6M/1Y) yang dipakai
  // sebagai pembanding angka rencana. Parsing-nya ada di lib/jadwalProgress.js
  // (modul murni, ada test-nya di test/jadwalProgress.test.mjs).
  const rows = await readRawRange(target.id, tabName, 'B3:O120');

  const summary = summarizeJadwal(rows);

  if (summary.items.length === 0) {
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

  return {
    available: true,
    bulan: namaBulan,
    tahun,
    fileName: target.name,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${target.id}/edit`,
    ...summary,
  };
}

/**
 * ==== Dashboard: Temuan & Gangguan (Log Book Gangguan) ====
 *
 * Baca semua tab (Gangguan Peralatan / AC / K3 / Kontruksi / Instrumen /
 * Lain-Lain), parse pakai lib/gangguanLog.js.
 *
 * CATATAN PERBAIKAN: versi lama membaca kolom di POSISI TETAP
 * ("lokasi = r[3]" = kolom E, "kategori = r[14]" = kolom P) padahal susunan
 * kolomnya beda-beda antar tab (di "Gangguan K3" lokasi ada di kolom D, di
 * "Gangguan Instrumen" Sistem Terkait ada di kolom Q). Akibatnya item dari tab
 * itu hilang / salah kolom. Sekarang kolom dicari lewat NAMA HEADER.
 *
 * Bulan/tahun diambil dari kolom "Tanggal" yang di-parse jadi angka - bukan
 * lagi mencocokkan "angka apa pun" di string tanggal. Lihat penjelasan lengkap
 * di bagian atas src/lib/gangguanLog.js.
 */
const LOG_GANGGUAN_RANGE = 'A2:R500';

export async function getLogGangguanTabs() {
  if (!LOG_GANGGUAN_FILE_ID) return { available: false, reason: 'VITE_LOG_GANGGUAN_FILE_ID belum diatur di .env' };
  const tabs = await listSheetTabs(LOG_GANGGUAN_FILE_ID);
  return { available: true, tabs };
}

/** Ambil + parse SEMUA tab sekaligus. Hasilnya dipakai untuk semua filter di UI. */
export async function getAllLogGangguan() {
  if (!LOG_GANGGUAN_FILE_ID) {
    return { available: false, reason: 'VITE_LOG_GANGGUAN_FILE_ID belum diatur di .env' };
  }
  const tabs = await listSheetTabs(LOG_GANGGUAN_FILE_ID);
  // Dibaca paralel: 6 tab, masing-masing 1 request. Kalau salah satu tab gagal
  // (mis. nama tabnya aneh), tab itu dilewati dan dicatat - bukan bikin seluruh
  // Dashboard kosong.
  const hasil = await Promise.all(tabs.map(async (tab) => {
    try {
      const resolved = await resolveTabName(LOG_GANGGUAN_FILE_ID, tab);
      const rows = await readRawRange(LOG_GANGGUAN_FILE_ID, resolved, LOG_GANGGUAN_RANGE);
      return { tab, rows, error: null };
    } catch (e) {
      return { tab, rows: [], error: e.message };
    }
  }));

  const items = [];
  const gagal = [];
  const kosong = [];
  for (const h of hasil) {
    if (h.error) { gagal.push(`${h.tab}: ${h.error}`); continue; }
    const parsed = parseGangguanRows(h.rows, { tab: h.tab });
    // Tab yang isinya CUMA baris template (belum pernah ada gangguan nyata)
    // dibedakan dari tab yang benar-benar tidak terbaca - supaya tidak
    // dilaporkan sebagai masalah.
    if (parsed.length === 0) kosong.push(h.tab);
    items.push(...parsed);
  }

  if (items.length === 0) {
    return {
      available: false,
      reason: `File Log Gangguan terbaca (${tabs.length} tab), tapi 0 kejadian ketemu. ` +
        `Kemungkinan semua tab masih berisi baris template saja, atau struktur kolomnya berubah.` +
        (gagal.length ? ` Tab yang gagal dibaca: ${gagal.join('; ')}` : ''),
    };
  }

  return {
    available: true,
    tabs,
    items,
    ringkasan: summarizeGangguan(items),
    sheetUrl: `https://docs.google.com/spreadsheets/d/${LOG_GANGGUAN_FILE_ID}/edit`,
    gagalDibaca: gagal,
    // Tab yang ada tapi belum punya satu pun kejadian nyata (isinya masih
    // baris template). Normal kalau memang belum pernah ada gangguan di
    // kategori itu - ditampilkan supaya jelas, bukan dianggap error.
    tabKosong: kosong,
  };
}

/**
 * Dipakai kalau hanya butuh satu tab (dipertahankan supaya pemanggil lama tetap
 * jalan). Disarankan pakai getAllLogGangguan() supaya filter status/tahun/bulan
 * bekerja lintas tab.
 */
export async function getLogGangguanData(tabName) {
  if (!LOG_GANGGUAN_FILE_ID) return { available: false, reason: 'VITE_LOG_GANGGUAN_FILE_ID belum diatur di .env' };
  const resolvedTab = await resolveTabName(LOG_GANGGUAN_FILE_ID, tabName);
  const rows = await readRawRange(LOG_GANGGUAN_FILE_ID, resolvedTab, LOG_GANGGUAN_RANGE);
  const items = parseGangguanRows(rows, { tab: tabName });
  return { available: true, items, ringkasan: summarizeGangguan(items) };
}

/* Fitur "Ganti Foto Header Login" DIHAPUS (22 Sep 2026 - permintaan Jo).
   Foto header login sekarang statis dari /public/backgrounds/station-halim.jpg
   (foto menara telekomunikasi + teknisi memanjat). Tidak perlu env var
   VITE_LOGIN_HEADER_FILE_ID lagi. Lihat config/loginHeader.js. */

