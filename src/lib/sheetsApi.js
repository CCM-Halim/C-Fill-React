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
 * Hitung baris target untuk kategori bertipe "monthly_slot", berdasarkan tanggal
 * pemeriksaan DAN jumlah slot yang benar-benar tersedia di template (slotCount).
 *
 * PENTING: tidak semua kategori punya 12 slot (1 per bulan) - kategori yang cuma
 * berisi item 3-bulanan/6-bulanan/tahunan (tanpa item bulanan sama sekali) cuma
 * punya 4/2/1 slot per tahun. Kalau tetap dihitung pakai index bulan mentah
 * (0-11) dikali slotStep, hasilnya jauh melampaui baris yang benar-benar sudah
 * diformat di template (baris "meluber" ke area kosong di bawahnya).
 *
 * slotCount dipakai untuk menentukan resolusi index yang benar:
 *   slotCount >= 12 -> 1 slot per bulan   (index = bulan, 0-11)
 *   slotCount ~ 4   -> 1 slot per kuartal (index = bulan div 3, 0-3)
 *   slotCount ~ 2   -> 1 slot per semester (index = bulan div 6, 0-1)
 *   slotCount 1     -> cuma 1 slot/tahun  (index = 0, selalu sama)
 */
export function computeSlotRow(slotMap, dateStr) {
  const d = new Date(dateStr);
  const month = d.getMonth(); // 0 = Januari
  const slotCount = slotMap.slotCount || 12;

  let slotIndex;
  if (slotCount >= 9) slotIndex = month;                    // ~12 slot: per bulan
  else if (slotCount >= 3) slotIndex = Math.floor(month / 3); // ~4 slot: per kuartal
  else if (slotCount >= 2) slotIndex = Math.floor(month / 6); // ~2 slot: per semester
  else slotIndex = 0;                                         // 1 slot: sekali/tahun

  return slotMap.slotStartRow + slotMap.slotStep * slotIndex;
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
 *
 * Format isi tiap item mengikuti pola asli template ("Tgl: <tanggal> Catatan: <isian>"),
 * dengan bagian "Tgl:" otomatis diisi dari tanggal pemeriksaan - user cuma perlu isi
 * bagian catatannya saja (lihat ChecksheetForm.jsx / InstrumenPage.jsx). Item berbentuk
 * array (tabel baterai V/R) dikecualikan dari format ini, ditulis apa adanya per kolom.
 */
export async function writeMonthlySlot(spreadsheetId, tabName, slotMap, { tanggal, petugas, answers }) {
  const row = computeSlotRow(slotMap, tanggal);
  const data = [];
  const formattedDate = formatDateForSheet(tanggal);

  data.push({
    range: `'${tabName}'!${colLetter(slotMap.dateCol)}${row}`,
    values: [[formattedDate]]
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
    } else if (typeof answer === 'object' && answer.__rawText !== undefined) {
      // Item dengan format sendiri (mis. "Lokasi Uji Fungsi: ... Catatan: ...")
      // - ditulis apa adanya, TIDAK dibungkus prefix "Tgl: ..." otomatis.
      data.push({
        range: `'${tabName}'!${colLetter(itemCol.colStart)}${row}`,
        values: [[answer.__rawText]]
      });
    } else {
      // Item teks biasa -> otomatis dibungkus format "Tgl: <tanggal> Catatan: <isian>"
      // sesuai pola template asli, tanpa user perlu ketik tanggalnya manual.
      data.push({
        range: `'${tabName}'!${colLetter(itemCol.colStart)}${row}`,
        values: [[`Tgl: ${formattedDate} Catatan: ${answer}`]]
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

/**
 * Tulis 1 baris verifikasi ke sheet "Lembar Verifikasi Pekerjaan", langsung
 * berdasarkan index bulan (0=Januari) - BEDA dari writeMonthlySlot yang
 * menghitung baris dari tanggal, karena verifikasi bisa saja untuk bulan
 * yang berbeda dari tanggal verifikasi itu sendiri dilakukan (misal
 * verifikasi telat/susulan untuk bulan lalu).
 *
 * Kalau signatureImageUrl diisi, kolom paraf ditulis pakai formula
 * =IMAGE("url") supaya tanda tangan tampil sebagai gambar di sel - bukan teks.
 */
export async function writeVerificationRow(spreadsheetId, tabName, slotMap, monthIndex, { tanggalVerifikasi, namaVerifikator, signatureImageUrl }) {
  const row = slotMap.slotStartRow + slotMap.slotStep * monthIndex;
  const formattedDate = formatDateForSheet(tanggalVerifikasi);

  const parafValue = signatureImageUrl ? `=IMAGE("${signatureImageUrl}")` : namaVerifikator;

  const data = [
    { range: `'${tabName}'!${colLetter(slotMap.dateCol)}${row}`, values: [[formattedDate]] },
    { range: `'${tabName}'!${colLetter(slotMap.namaCol)}${row}`, values: [[namaVerifikator]] },
    { range: `'${tabName}'!${colLetter(slotMap.parafCol)}${row}`, values: [[parafValue]] }
  ];

  await sheetsFetch(`/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data })
  });

  return { row };
}
