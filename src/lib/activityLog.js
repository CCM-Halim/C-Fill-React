/**
 * activityLog.js
 * Log aktivitas terpusat: 1 Google Sheet ("C-Fill - Log Aktivitas"), setiap kali
 * teknisi submit checksheet apapun (peralatan/instrumen), 1 baris otomatis
 * ditambahkan di sini. Dipakai oleh menu Verifikasi (Foreman/Deputy Foreman)
 * supaya bisa lihat aktivitas terbaru tanpa harus scan semua 69+32 file satu-satu.
 *
 * Sengaja TERPISAH dari file checksheet per-site (bukan bagian dari slot
 * "Tgl/Catatan" yang ditulis ke tab kategori) - log ini murni untuk kebutuhan
 * pemantauan, tidak menggantikan data resmi di checksheet asli.
 */
import { getValidAccessToken } from './googleAuth';
import { getOrCreateSubfolder, findFileByExactName } from './driveApi';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const LOG_FILE_NAME = 'C-Fill - Log Aktivitas';
const LOG_TAB_NAME = 'Aktivitas';
const LOG_HEADERS = ['Timestamp', 'Kategori Bangunan', 'Site / Instrumen', 'Kategori Peralatan', 'Tanggal Pemeriksaan', 'Petugas', 'Email', 'Link Sheet'];

async function authHeaders() {
  const token = await getValidAccessToken();
  return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
}

async function sheetsFetch(path, options = {}) {
  const headers = { ...(options.headers || {}), ...(await authHeaders()) };
  const res = await fetch(SHEETS_BASE + path, { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Sheets API error ' + res.status + ': ' + body);
  }
  return res.json();
}

let cachedLogSpreadsheetId = null;

async function getOrCreateLogSpreadsheet(rootFolderId) {
  if (cachedLogSpreadsheetId) return cachedLogSpreadsheetId;

  const existing = await findFileByExactName(rootFolderId, LOG_FILE_NAME, 'application/vnd.google-apps.spreadsheet');
  if (existing) {
    cachedLogSpreadsheetId = existing.id;
    return existing.id;
  }

  const created = await sheetsFetch('', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: LOG_FILE_NAME },
      sheets: [{ properties: { title: LOG_TAB_NAME } }]
    })
  });
  await sheetsFetch(`/${created.spreadsheetId}/values/${encodeURIComponent(LOG_TAB_NAME)}!A1:append?valueInputOption=RAW`, {
    method: 'POST',
    body: JSON.stringify({ values: [LOG_HEADERS] })
  });
  // Pindahkan ke folder Checksheet supaya rapi & gampang ditemukan
  try {
    const token = await getValidAccessToken();
    await fetch(`https://www.googleapis.com/drive/v3/files/${created.spreadsheetId}?addParents=${rootFolderId}&supportsAllDrives=true`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token }
    });
  } catch {
    // tidak kritikal kalau gagal pindah folder
  }

  cachedLogSpreadsheetId = created.spreadsheetId;
  return created.spreadsheetId;
}

/**
 * Catat 1 aktivitas submission ke log. Dipanggil otomatis setelah submitChecksheet
 * / submitInstrumentChecksheet berhasil. Gagal-diam (tidak melempar error) supaya
 * kalau logging bermasalah, submission utama tetap dianggap berhasil.
 */
export async function logActivity(rootFolderId, entry) {
  try {
    const spreadsheetId = await getOrCreateLogSpreadsheet(rootFolderId);
    const row = [
      new Date().toISOString(),
      entry.buildingCategory || '',
      entry.siteName || '',
      entry.categoryName || '',
      entry.tanggal || '',
      entry.petugas || '',
      entry.email || '',
      entry.sheetUrl || ''
    ];
    await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(LOG_TAB_NAME)}!A1:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      body: JSON.stringify({ values: [row] })
    });
  } catch (e) {
    console.warn('Gagal mencatat activity log (tidak kritikal):', e.message);
  }
}

/**
 * Ambil N aktivitas terbaru dari log (dipakai halaman Verifikasi).
 */
export async function getRecentActivity(rootFolderId, limit = 50) {
  const spreadsheetId = await getOrCreateLogSpreadsheet(rootFolderId);
  const data = await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(LOG_TAB_NAME)}!A2:H5000`);
  const rows = data.values || [];
  return rows
    .map((r) => ({
      timestamp: r[0], buildingCategory: r[1], siteName: r[2], categoryName: r[3],
      tanggal: r[4], petugas: r[5], email: r[6], sheetUrl: r[7]
    }))
    .reverse()
    .slice(0, limit);
}

/**
 * Ambil aktivitas untuk 1 site tertentu saja (dipakai halaman detail Verifikasi per-site).
 */
export async function getActivityForSite(rootFolderId, buildingCategory, siteName, limit = 30) {
  const all = await getRecentActivity(rootFolderId, 5000);
  return all
    .filter((a) => a.buildingCategory === buildingCategory && a.siteName === siteName)
    .slice(0, limit);
}
