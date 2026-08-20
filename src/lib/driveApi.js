/**
 * driveApi.js
 * Wrapper tipis di atas Google Drive API v3, dipanggil langsung dari browser
 * pakai access token OAuth (lihat googleAuth.js).
 *
 * PENTING: semua request menyertakan supportsAllDrives=true &
 * includeItemsFromAllDrives=true. Tanpa ini, folder/file yang ada di dalam
 * SHARED DRIVE (Drive Bersama) tidak akan pernah muncul di hasil pencarian
 * sama sekali (bukan error - hasilnya cuma selalu kosong), meskipun copy/create
 * filenya sendiri tetap berhasil. Ini penyebab paling umum kenapa aplikasi
 * "selalu bikin file baru" - pencarian file yang sudah ada selalu gagal
 * (dianggap tidak ada) padahal filenya betul-betul ada.
 */
import { getValidAccessToken } from './googleAuth';

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_SUPPORT_PARAMS = 'supportsAllDrives=true&includeItemsFromAllDrives=true';

async function authHeaders() {
  const token = await getValidAccessToken();
  return { Authorization: 'Bearer ' + token };
}

function withDriveParams(path) {
  const sep = path.includes('?') ? '&' : '?';
  return path + sep + DRIVE_SUPPORT_PARAMS;
}

async function driveFetch(path, options = {}) {
  const headers = { ...(options.headers || {}), ...(await authHeaders()) };
  const res = await fetch(DRIVE_BASE + withDriveParams(path), { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Drive API error ' + res.status + ': ' + body);
  }
  return res.json();
}

/**
 * Cari folder dengan nama tertentu di dalam parentId. Buat baru kalau belum ada.
 */
export async function getOrCreateSubfolder(parentId, name) {
  const q = encodeURIComponent(
    `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const list = await driveFetch(`/files?q=${q}&fields=files(id,name)&corpora=allDrives`);
  if (list.files && list.files.length > 0) {
    return list.files[0].id;
  }
  const created = await driveFetch('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  });
  return created.id;
}

/**
 * Cari semua file dengan nama tertentu di dalam folder (tipe apapun kalau
 * mimeType tidak diisi). Return array (bisa lebih dari 1 kalau ada duplikat
 * lama) - dipakai untuk deteksi & pembersihan duplikat.
 */
export async function findAllFilesByName(folderId, name, mimeType) {
  const mimeFilter = mimeType ? ` and mimeType = '${mimeType}'` : '';
  const q = encodeURIComponent(
    `'${folderId}' in parents and name = '${name.replace(/'/g, "\\'")}'${mimeFilter} and trashed = false`
  );
  const list = await driveFetch(`/files?q=${q}&fields=files(id,name,mimeType,createdTime)&corpora=allDrives&orderBy=createdTime`);
  return list.files || [];
}

/**
 * Cari file dengan nama tertentu (tipe apapun) di dalam folder. Kalau ada
 * lebih dari 1 (duplikat lama), ambil yang PALING LAMA dibuat (dianggap
 * yang "asli"/pertama) supaya konsisten dipakai terus.
 */
export async function findFileByExactName(folderId, name, mimeType) {
  const files = await findAllFilesByName(folderId, name, mimeType);
  return files.length > 0 ? files[0] : null;
}

/**
 * Konversi file .xlsx yang sudah ada jadi Google Sheets (copy dengan mimeType baru),
 * supaya bisa ditulisi lewat Sheets API sambil TETAP mempertahankan layout/format
 * aslinya (baris "Tgl", kolom per item, dst - tidak dibuat dari nol).
 *
 * File asal (.xlsx) TIDAK dihapus/diubah - tetap ada sebagai arsip. Hasil konversi
 * disimpan sebagai file baru bertipe Google Sheets, di folder yang sama, dengan nama
 * yang sama persis (supaya gampang dicari lagi lain kali tanpa perlu convert ulang).
 */
export async function convertXlsxToSheets(xlsxFileId, folderId, targetName) {
  const token = await getValidAccessToken();
  const res = await fetch(
    `${DRIVE_BASE}/files/${xlsxFileId}/copy?fields=id,name,mimeType&${DRIVE_SUPPORT_PARAMS}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: targetName,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [folderId]
      })
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Gagal konversi xlsx ke Sheets (' + res.status + '): ' + body);
  }
  return res.json();
}

/**
 * Cari/siapkan versi Google Sheets dari sebuah site: kalau sudah pernah dikonversi
 * sebelumnya (ada file Sheets dengan nama tsb di folder), pakai itu. Kalau belum,
 * cari file .xlsx aslinya (originalFileName), konversi sekali, lalu pakai hasilnya.
 *
 * Di-cache di localStorage (BUKAN cuma memori JS) supaya bertahan walaupun
 * halaman di-refresh / navigasi antar halaman - jadi submit berikutnya untuk
 * site yang sama TIDAK cari ulang lewat Drive Search API (yang punya jeda
 * index setelah file baru dibuat, sumber utama bug "selalu bikin file baru").
 */
const CACHE_KEY = 'cfill_spreadsheet_cache_v1';

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCacheEntry(key, spreadsheetId) {
  try {
    const cache = loadCache();
    cache[key] = spreadsheetId;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage penuh/diblokir - abaikan, tidak kritikal (cuma optimisasi)
  }
}

export async function getOrConvertSiteSpreadsheet(folderId, originalFileName) {  const cacheKey = folderId + '|' + originalFileName;
  const cache = loadCache();
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  const sheetsMime = 'application/vnd.google-apps.spreadsheet';

  // 1. Sudah pernah dikonversi sebelumnya (termasuk dari sesi/browser lain)?
  const existingSheets = await findFileByExactName(folderId, originalFileName, sheetsMime);
  if (existingSheets) {
    saveCacheEntry(cacheKey, existingSheets.id);
    return existingSheets.id;
  }

  // 2. Cari file .xlsx aslinya di folder ini
  const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const originalXlsx = await findFileByExactName(folderId, originalFileName, xlsxMime);
  if (!originalXlsx) {
    throw new Error(
      `File asli "${originalFileName}" tidak ditemukan di folder site ini. ` +
      `Pastikan file .xlsx checksheet asli sudah ada di folder Drive site tersebut.`
    );
  }

  // 3. Konversi (sekali saja - hasilnya langsung di-cache, tidak perlu search lagi)
  const converted = await convertXlsxToSheets(originalXlsx.id, folderId, originalFileName);
  saveCacheEntry(cacheKey, converted.id);
  return converted.id;
}

/**
 * Hapus cache lokal (dipakai kalau perlu paksa aplikasi cari ulang dari Drive -
 * misalnya setelah kamu menghapus manual file duplikat lewat Drive). Bisa
 * dipanggil dari browser console: import('./lib/driveApi').then(m => m.clearSpreadsheetCache())
 * - atau lebih gampang, cukup buka DevTools Console dan jalankan:
 *   localStorage.removeItem('cfill_spreadsheet_cache_v1')
 */
export function clearSpreadsheetCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // abaikan
  }
}

/**
 * Upload 1 file (blob/File dari <input type="file">) ke folder tertentu.
 */
export async function uploadFileToFolder(folderId, file) {
  const token = await getValidAccessToken();
  const metadata = { name: file.name, parents: [folderId] };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch(
    `${UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,webViewLink&${DRIVE_SUPPORT_PARAMS}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: form
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Upload gagal (' + res.status + '): ' + body);
  }
  return res.json();
}

/**
 * List file di dalam sebuah folder (dipakai untuk riwayat dokumentasi).
 */
export async function listFilesInFolder(folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const list = await driveFetch(
    `/files?q=${q}&fields=files(id,name,webViewLink,modifiedTime,size)&orderBy=modifiedTime desc&corpora=allDrives`
  );
  return list.files || [];
}
