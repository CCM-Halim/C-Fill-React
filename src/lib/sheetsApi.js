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

/**
 * Jumlah bulan per slot DASAR grid (1/3/6/12), diturunkan dari slotCount -
 * dipakai buat komputasi baris per-item di bawah.
 */
function baseGridMonths(slotMap) {
  const slotCount = slotMap.slotCount || 12;
  if (slotCount >= 9) return 1;
  if (slotCount >= 3) return 3;
  if (slotCount >= 2) return 6;
  return 12;
}

/**
 * Hitung baris target KHUSUS untuk 1 item, berdasarkan periode item itu SENDIRI
 * (itemCol.periodMonths) - BEDA dari computeSlotRow (yang pakai periode dasar
 * grid keseluruhan).
 *
 * PENTING: kolom item yang periodenya lebih JARANG dari grid dasarnya (mis.
 * item 3-bulanan di dalam grid bulanan) ternyata pakai SEL GABUNGAN (merged
 * cell) di template asli, mencakup beberapa baris bulan sekaligus (mis. baris
 * Jul-Agu-Sep digabung jadi 1 sel, tampil di baris Jul saja). Kalau ditulis ke
 * baris "tengah" gabungan itu (mis. baris Agustus), Google Sheets menganggap
 * itu sel "hantu" yang tersembunyi di balik merge, jadi TIDAK PERNAH terlihat
 * berubah walau API-nya sukses. Makanya baris tulis utk item begini harus
 * di-"snap" ke baris AWAL blok periode-nya (anchor sel gabungan), bukan baris
 * bulan yang persis.
 *
 * Sudah divalidasi ke SEMUA 69 file (cek langsung merged_cells.ranges, bukan
 * cuma tebak dari pola tanggal) - 66/69 file cocok sama rumus kalender standar
 * (blok kuartal Jan-Mar/Apr-Jun/dst). 3 file yang strukturnya beneran beda
 * (baris gabungan tidak rata 6 baris) dapat itemCol.explicitAnchors - daftar
 * baris anchor asli hasil baca langsung dari file, dipakai duluan sebelum rumus.
 */
function computeItemRow(slotMap, itemCol, dateStr, isBatteryTable) {
  if (isBatteryTable) {
    // Item tabel baterai (banyak kolom per unit) TIDAK pakai merge kuartal -
    // selalu baris per-bulan seperti biasa, walau labelnya bilang "(3 bulan)".
    return computeSlotRow(slotMap, dateStr);
  }

  const month = new Date(dateStr).getMonth();
  const baseMonths = baseGridMonths(slotMap);
  const itemMonths = itemCol.periodMonths || baseMonths;

  if (itemCol.explicitAnchors && itemCol.explicitAnchors.length > 0) {
    const idx = Math.min(Math.floor(month / itemMonths), itemCol.explicitAnchors.length - 1);
    return itemCol.explicitAnchors[idx];
  }

  if (itemMonths <= baseMonths) {
    return computeSlotRow(slotMap, dateStr);
  }
  const blockSizeInSlots = Math.round(itemMonths / baseMonths);
  const blockIndex = Math.floor(month / itemMonths);
  return slotMap.slotStartRow + slotMap.slotStep * blockSizeInSlots * blockIndex;
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

    const isBatteryTable = Array.isArray(answer);
    // Item yang periodenya lebih jarang dari grid dasar (mis. 3-bulanan di grid
    // bulanan) ditulis ke baris ANCHOR blok periodenya sendiri, bukan baris row
    // di atas (lihat computeItemRow). Item tabel baterai selalu baris normal.
    const itemRow = computeItemRow(slotMap, itemCol, tanggal, isBatteryTable);

    if (isBatteryTable) {
      // Jawaban berbentuk array (mis. tabel baterai V/R per unit) -> 1 nilai per kolom
      const values = answer.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
      data.push({
        range: `'${tabName}'!${colLetter(itemCol.colStart)}${itemRow}:${colLetter(itemCol.colStart + values.length - 1)}${itemRow}`,
        values: [values]
      });
    } else if (typeof answer === 'object' && answer.__rawText !== undefined) {
      // Item dengan format sendiri (mis. "Lokasi Uji Fungsi: ... Catatan: ...")
      // - ditulis apa adanya, TIDAK dibungkus prefix "Tgl: ..." otomatis.
      data.push({
        range: `'${tabName}'!${colLetter(itemCol.colStart)}${itemRow}`,
        values: [[answer.__rawText]]
      });
    } else {
      // Item teks biasa -> otomatis dibungkus format "Tgl: <tanggal> Catatan: <isian>"
      // sesuai pola template asli, tanpa user perlu ketik tanggalnya manual.
      data.push({
        range: `'${tabName}'!${colLetter(itemCol.colStart)}${itemRow}`,
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
