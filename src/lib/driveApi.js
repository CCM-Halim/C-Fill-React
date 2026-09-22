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
  const MAX_ATTEMPTS = 6;
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const headers = { ...(options.headers || {}), ...(await authHeaders()) };
    const res = await fetch(DRIVE_BASE + withDriveParams(path), { ...options, headers });
    if (res.ok) return res.json();

    const body = await res.text();
    lastError = new Error('Drive API error ' + res.status + ': ' + body);

    // Retry utk error server (5xx) ATAU rate-limit (429/403) - keduanya biasanya
    // gangguan sementara, bukan error dari kode kita. Error 4xx lain (permission,
    // not found, dsb) langsung dilempar tanpa retry karena percobaan ulang tidak
    // akan beda.
    const isRetryable = res.status >= 500 || res.status === 429 || res.status === 403;
    if (!isRetryable || attempt === MAX_ATTEMPTS) throw lastError;

    const delay = Math.min(2000 * Math.pow(2, attempt - 1), 32000) + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw lastError;
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

  // Retry otomatis untuk error 5xx. Backoff EXPONENSIAL (2s, 4s, 8s, 16s, 32s)
  // bukan cuma linear - soalnya error "Internal Error" pada operasi copy sering
  // sebenarnya rate-limit dari Google (terutama kalau banyak file DIBEDA-beda
  // dikonversi cepat berturut-turut, mis. waktu testing banyak site sekaligus).
  // Rate-limit butuh jeda lebih lama utk reda, bukan cuma retry cepat berkali-kali.
  const MAX_ATTEMPTS = 6;
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
    if (res.ok) return res.json();

    const body = await res.text();
    lastError = new Error('Gagal konversi xlsx ke Sheets (' + res.status + '): ' + body);

    const isRetryable = res.status >= 500 || res.status === 429 || res.status === 403;
    if (!isRetryable || attempt === MAX_ATTEMPTS) throw lastError;

    const delay = Math.min(2000 * Math.pow(2, attempt - 1), 32000) + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw lastError;
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

export async function getOrConvertSiteSpreadsheet(folderId, originalFileName) {
  const cacheKey = folderId + '|' + originalFileName;
  const cache = loadCache();
  if (cache[cacheKey]) {
    return { spreadsheetId: cache[cacheKey], duplicateWarning: null };
  }

  const sheetsMime = 'application/vnd.google-apps.spreadsheet';

  // 1. Sudah pernah dikonversi sebelumnya (termasuk dari sesi/browser/PWA lain)?
  // Cache localStorage TIDAK selalu nyambung antara app terinstall (PWA) dan
  // browser tab biasa (keduanya bisa punya storage terpisah) - jadi pencarian
  // di sini nggak boleh cuma andalkan cache. Kalau percobaan pertama nggak
  // ketemu, coba lagi 2x dengan jeda (jaga-jaga index Drive Search belum
  // update kalau file baru aja dibuat di sesi/perangkat lain sesaat sebelumnya)
  // - baru dianggap beneran belum ada kalau ketiga percobaan tetap kosong.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const allSheets = await findAllFilesByName(folderId, originalFileName, sheetsMime);
    if (allSheets.length > 0) {
      const chosen = allSheets[0]; // paling lama dibuat (lihat findAllFilesByName) - konsisten dipakai terus
      saveCacheEntry(cacheKey, chosen.id);
      // PENTING: kalau ketemu LEBIH DARI 1 file Sheets dengan nama sama, ini
      // tanda ada duplikat (mis. teknisi manual "Save as Google Sheets" dari
      // file .xlsx asli, bukan edit ke Sheets yang udah ada). App SELALU
      // pakai yang PALING LAMA dibuat secara konsisten - tapi kalau ada yang
      // manual edit ke duplikat yang lebih baru, editan itu nggak akan pernah
      // kepakai/kelihatan di app. Kasih tau biar bisa di-cleanup manual.
      const duplicateWarning = allSheets.length > 1
        ? `Ditemukan ${allSheets.length} file Google Sheets dengan nama sama di folder ini. Aplikasi selalu memakai yang paling lama dibuat - kalau ada yang mengedit salinan lain secara manual, editan itu tidak akan terbaca. Sebaiknya hapus salinan duplikat dan gabungkan datanya secara manual.`
        : null;
      return { spreadsheetId: chosen.id, duplicateWarning };
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
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
  return { spreadsheetId: converted.id, duplicateWarning: null };
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
 * Upload gambar tanda tangan (Blob/File) ke folder tertentu, lalu set izin
 * "siapapun yang punya link bisa lihat" - supaya bisa dirender lewat formula
 * =IMAGE(...) di Google Sheets (butuh URL yang bisa diakses tanpa login).
 * Return URL langsung yang kompatibel dipakai di =IMAGE().
 */
export async function uploadPublicImage(folderId, blob, fileName) {
  const token = await getValidAccessToken();
  const metadata = { name: fileName, parents: [folderId] };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch(
    `${UPLOAD_BASE}/files?uploadType=multipart&fields=id&${DRIVE_SUPPORT_PARAMS}`,
    { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Upload tanda tangan gagal (' + res.status + '): ' + body);
  }
  const file = await res.json();

  // Set permission publik (link-only, cuma viewer) supaya =IMAGE() bisa mengambilnya
  await fetch(`${DRIVE_BASE}/files/${file.id}/permissions?${DRIVE_SUPPORT_PARAMS}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  });

  return { fileId: file.id, imageUrl: `https://lh3.googleusercontent.com/d/${file.id}` };
}

/**
 * Cari folder di dalam parent yang NAMANYA MENGANDUNG teks tertentu (bukan
 * harus persis sama) - dipakai buat cocokkan folder site di "Dokumentasi
 * Kegiatan" yang formatnya nggak seragam (kadang "K21+020 (6 Agustus 2026)",
 * kadang "K 21 + 020 ( 6 agustus 2026 )" dst). Perbandingan dilakukan setelah
 * SEMUA SPASI dihapus dari kedua sisi, biar variasi spasi nggak masalah.
 */
export async function findFolderContaining(parentId, searchTerm) {
  const list = await driveFetch(`/files?q=${encodeURIComponent(`'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)}&fields=files(id,name)&corpora=allDrives`);
  const normalizedSearch = searchTerm.replace(/\s+/g, '').toLowerCase();
  const found = (list.files || []).find((f) => f.name.replace(/\s+/g, '').toLowerCase().includes(normalizedSearch));
  return found ? found.id : null;
}

/**
 * Upload 1 file (blob/File dari <input type="file">) ke folder tertentu.
 */
export async function uploadFileToFolder(folderId, file, description) {
  const token = await getValidAccessToken();
  const metadata = { name: file.name, parents: [folderId] };
  if (description) metadata.description = description;

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

/**
 * Timpa ISI file yang SUDAH ADA (media re-upload) - ID & link publik file itu
 * TIDAK BERUBAH walau isinya diganti. Dipakai buat fitur "Ganti Foto Header
 * Login" (admin) - foto baru langsung tampil ke semua orang tanpa perlu
 * update konfigurasi/link apapun, karena ID file-nya tetap sama.
 */
export async function replaceFileContent(fileId, file) {
  const token = await getValidAccessToken();
  const res = await fetch(
    `${UPLOAD_BASE}/files/${fileId}?uploadType=media&${DRIVE_SUPPORT_PARAMS}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': file.type },
      body: file
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Gagal mengganti isi file (' + res.status + '): ' + body);
  }
  return res.json();
}

/**
 * Pastikan sebuah file bisa diakses PUBLIK (anyone with link, view only) -
 * dipakai supaya foto header login bisa ditampilkan di halaman login TANPA
 * perlu login dulu (halaman login itu sendiri belum ada akses token Google).
 */
export async function makeFilePublic(fileId) {
  const token = await getValidAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?${DRIVE_SUPPORT_PARAMS}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  });
}

/**
 * Baca ISI MENTAH (teks) 1 file Drive biasa (bukan Google Sheets) - dipakai
 * buat baca file config kecil (mis. JSON penyimpan link override jadwal
 * bulanan yang diatur admin).
 */
export async function readFileContentAsText(fileId) {
  const token = await getValidAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&${DRIVE_SUPPORT_PARAMS}`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) {
    throw new Error('Gagal membaca file (' + res.status + ')');
  }
  return res.text();
}

/**
 * Timpa isi file teks/JSON biasa dengan konten baru (string).
 */
export async function writeFileContentAsText(fileId, content, mimeType = 'application/json') {
  const token = await getValidAccessToken();
  const res = await fetch(`${UPLOAD_BASE}/files/${fileId}?uploadType=media&${DRIVE_SUPPORT_PARAMS}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': mimeType },
    body: content
  });
  if (!res.ok) {
    throw new Error('Gagal menulis file (' + res.status + ')');
  }
  return res.json();
}

/**
 * Ekstrak file ID dari berbagai bentuk URL Google Sheets/Drive, atau kalau
 * inputnya udah berupa ID polos (bukan URL), pakai apa adanya.
 */
export function extractDriveFileId(urlOrId) {
  const trimmed = (urlOrId || '').trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]{15,})/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) return trimmed; // sudah berupa ID polos
  return null;
}

