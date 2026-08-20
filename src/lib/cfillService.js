/**
 * cfillService.js
 * Logic bisnis C-Fill: mapping Lokasi/Site/Instrumen -> folder, konversi file
 * .xlsx asli jadi Google Sheets (sekali saja), lalu tulis ke SLOT baris/kolom
 * yang sudah ada di dalamnya - BUKAN menambah baris baru di bawah.
 */
import { writeMonthlySlot, writeMatrixSlot, getSpreadsheetUrl, getSheetGid, computeSlotRow } from './sheetsApi';
import { getOrCreateSubfolder, uploadFileToFolder, listFilesInFolder, getOrConvertSiteSpreadsheet } from './driveApi';
import { CATEGORIES } from '../config/categories';
import { SITES } from '../config/sites';
import { INSTRUMENT_SLOT_MAP } from '../config/instruments';

const ROOT_CHECKSHEET_FOLDER_ID = import.meta.env.VITE_ROOT_CHECKSHEET_FOLDER_ID;
const ROOT_INSTRUMEN_FOLDER_ID = import.meta.env.VITE_ROOT_INSTRUMEN_FOLDER_ID;

function requireFolderConfig(id, name) {
  if (!id) throw new Error(`${name} belum diatur di .env (lihat .env.example).`);
}

async function getBuildingCategoryFolder(buildingCategory) {
  return getOrCreateSubfolder(ROOT_CHECKSHEET_FOLDER_ID, buildingCategory);
}

async function getSiteDocumentationFolder(buildingCategory, siteName) {
  // Folder khusus dokumentasi (foto/dokumen) - ini folder BARU yang dibuat
  // aplikasi, terpisah dari lokasi file .xlsx checksheet asli (yang taruh
  // langsung di folder kategori bangunan, bukan di subfolder per-site).
  const bcFolderId = await getBuildingCategoryFolder(buildingCategory);
  const siteFolderId = await getOrCreateSubfolder(bcFolderId, siteName);
  return getOrCreateSubfolder(siteFolderId, 'Dokumentasi');
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
  const slotMap = category.slotMap;

  if (slotMap.type === 'matrix') {
    await writeMatrixSlot(spreadsheetId, tabName, slotMap, { tanggal, matrixAnswers: answers, unitCount: slotMap.defaultUnitCount });
    const gid = await getSheetGid(spreadsheetId, tabName);
    return { success: true, fileName: site.originalFileName, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid) };
  }

  const { row } = await writeMonthlySlot(spreadsheetId, tabName, slotMap, { tanggal, petugas, answers });
  const gid = await getSheetGid(spreadsheetId, tabName);
  return { success: true, fileName: site.originalFileName, row, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid) };
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
  return { success: true, fileName: originalFileName, row, sheetUrl: getSpreadsheetUrl(spreadsheetId, gid) };
}

/**
 * Preview baris/slot mana yang bakal ditulis untuk tanggal tertentu - dipakai
 * UI supaya user tahu sebelum submit (mis. "akan mengisi/menimpa baris bulan Maret").
 */
export function previewSlot(categoryOrSlotMap, tanggal) {
  const slotMap = categoryOrSlotMap.slotMap || categoryOrSlotMap;
  if (!slotMap || slotMap.type !== 'monthly_slot') return null;
  return computeSlotRow(slotMap, tanggal);
}

export async function uploadDocumentation({ buildingCategory, siteName, file }) {
  requireFolderConfig(ROOT_CHECKSHEET_FOLDER_ID, 'VITE_ROOT_CHECKSHEET_FOLDER_ID');
  const docFolderId = await getSiteDocumentationFolder(buildingCategory, siteName);
  return uploadFileToFolder(docFolderId, file);
}

export async function listDocumentationFiles({ buildingCategory, siteName }) {
  requireFolderConfig(ROOT_CHECKSHEET_FOLDER_ID, 'VITE_ROOT_CHECKSHEET_FOLDER_ID');
  const docFolderId = await getSiteDocumentationFolder(buildingCategory, siteName);
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
