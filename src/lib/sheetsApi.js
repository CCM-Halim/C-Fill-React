/**
 * sheetsApi.js
 * Wrapper Google Sheets API v4 - versi "tulis ke slot yang sudah ada" (bukan
 * append baris baru). Posisi baris/kolom diambil dari slotMap tiap kategori
 * (lihat config/categories.js), hasil pemetaan struktur template Excel asli.
 */
import { getValidAccessToken } from './googleAuth';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

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

function colLetter(colIndex) {
  // 1-based column index -> huruf kolom (1=A, 27=AA, dst)
  let letter = '';
  let n = colIndex;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/**
 * Hitung baris target untuk kategori bertipe "monthly_slot", berdasarkan bulan
 * dari tanggal pemeriksaan yang diisi user (Januari = slot ke-1, dst).
 */
export function computeSlotRow(slotMap, dateStr) {
  const d = new Date(dateStr);
  const monthIndex = d.getMonth(); // 0 = Januari
  return slotMap.slotStartRow + slotMap.slotStep * monthIndex;
}

function formatDateForSheet(dateStr) {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Tulis 1 submission checksheet peralatan ke slot yang sesuai (kategori "monthly_slot"):
 * - kolom tanggal (dateCol) diisi tanggal pemeriksaan
 * - tiap item diisi ke kolom (atau rentang kolom, utk item tabel baterai) miliknya
 * - kolom petugas (kalau ada di template) diisi juga
 */
export async function writeMonthlySlot(spreadsheetId, tabName, slotMap, { tanggal, petugas, answers }) {
  const row = computeSlotRow(slotMap, tanggal);
  const data = [];

  data.push({
    range: `'${tabName}'!${colLetter(slotMap.dateCol)}${row}`,
    values: [[formatDateForSheet(tanggal)]]
  });

  if (slotMap.petugasCol) {
    data.push({
      range: `'${tabName}'!${colLetter(slotMap.petugasCol)}${row}`,
      values: [[petugas || '']]
    });
  }

  slotMap.itemColumns.forEach((itemCol) => {
    const answer = answers[itemCol.id];
    if (answer === undefined || answer === null) return;

    if (Array.isArray(answer)) {
      // Jawaban berbentuk array (mis. tabel baterai V/R per unit) -> 1 nilai per kolom
      const values = answer.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
      data.push({
        range: `'${tabName}'!${colLetter(itemCol.colStart)}${row}:${colLetter(itemCol.colStart + values.length - 1)}${row}`,
        values: [values]
      });
    } else {
      data.push({
        range: `'${tabName}'!${colLetter(itemCol.colStart)}${row}`,
        values: [[answer]]
      });
    }
  });

  await sheetsFetch(`/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data })
  });

  return { row };
}

/**
 * Tulis submission untuk kategori bertipe "matrix" (APAR, Lightning Protection):
 * baris = item pemeriksaan, kolom = nomor unit. answers berbentuk
 * { itemRowOffset: { unitIndex: value } } - lihat pemakaian di ChecksheetForm.
 */
export async function writeMatrixSlot(spreadsheetId, tabName, slotMap, { tanggal, matrixAnswers, unitCount }) {
  const data = [];
  Object.entries(matrixAnswers).forEach(([itemRowOffset, unitValues]) => {
    const row = slotMap.itemRowStart + parseInt(itemRowOffset, 10);
    const values = [];
    for (let i = 0; i < unitCount; i++) {
      values.push(unitValues[i] || '');
    }
    data.push({
      range: `'${tabName}'!${colLetter(slotMap.unitColStart)}${row}:${colLetter(slotMap.unitColStart + unitCount - 1)}${row}`,
      values: [values]
    });
  });

  if (slotMap.dateRow) {
    data.push({
      range: `'${tabName}'!${colLetter(slotMap.unitColStart)}${slotMap.dateRow}`,
      values: [[formatDateForSheet(tanggal)]]
    });
  }

  await sheetsFetch(`/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data })
  });
}

/**
 * Baca 1 baris slot (dipakai untuk menampilkan data yang sudah pernah diisi,
 * misalnya waktu user buka ulang bulan yang sama).
 */
export async function readSlotRow(spreadsheetId, tabName, row, lastCol = 30) {
  const range = `'${tabName}'!A${row}:${colLetter(lastCol)}${row}`;
  const data = await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  return (data.values && data.values[0]) || [];
}

export function getSpreadsheetUrl(spreadsheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit${gid ? '#gid=' + gid : ''}`;
}

/**
 * Ambil sheetId (gid) numerik dari nama tab, dipakai untuk bikin link langsung ke tab yang benar.
 */
export async function getSheetGid(spreadsheetId, tabName) {
  const meta = await sheetsFetch(`/${spreadsheetId}?fields=sheets.properties`);
  const found = meta.sheets.find((s) => s.properties.title === tabName);
  return found ? found.properties.sheetId : 0;
}
