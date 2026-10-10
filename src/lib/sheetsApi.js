/**
 * sheetsApi.js
 * Wrapper Google Sheets API v4 - versi "tulis ke slot yang sudah ada" (bukan
 * append baris baru). Posisi baris/kolom diambil dari slotMap tiap kategori
 * (lihat config/categories.js), hasil pemetaan struktur template Excel asli.
 */
import { getValidAccessToken } from './googleAuth';
import { matchTabNameFromCandidates } from './tabNames';

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

/**
 * Letak data tabel baterai di dalam 1 blok periode (mis. blok 3-bulanan = 6 baris):
 *
 *   baris anchor      -> ringkasan  "Tgl: .. / Catatan: Normal|Ada temuan"
 *   anchor + 2        -> baterai ke-1  s/d ke-12   (1 baris = colWidth kolom)
 *   anchor + 4        -> baterai ke-13 s/d ke-24
 *   anchor + 6 ...    -> dst, selama masih di dalam blok
 *
 * Pola ini sama dengan file lapangan (mis. K31+367: ringkasan baris 29, data
 * baterai baris 31 dan 33). Dulu data baterai ditulis di baris anchor (menimpa
 * tempat ringkasan) dan, kalau lebih dari 12 baterai, MELUBER ke kolom di kanan
 * kolom data (termasuk kolom Petugas) karena tidak pernah pindah baris.
 *
 * Kalau item tidak lebih jarang dari grid dasar (tidak ada blok), data ditulis
 * di baris slot biasa seperti sebelumnya.
 */
export function batteryLayout(slotMap, itemCol, dateStr) {
  const baseMonths = baseGridMonths(slotMap);
  const itemMonths = itemCol.periodMonths || baseMonths;
  const colWidth = itemCol.colWidth || 1;

  if (itemMonths <= baseMonths) {
    return { summaryRow: null, dataRows: [computeSlotRow(slotMap, dateStr)], colWidth, capacity: colWidth };
  }

  const anchor = computeItemRow(slotMap, itemCol, dateStr, false);
  const month = new Date(dateStr).getMonth();
  let blockEnd; // baris terakhir blok ini
  if (itemCol.explicitAnchors && itemCol.explicitAnchors.length > 0) {
    const idx = Math.min(Math.floor(month / itemMonths), itemCol.explicitAnchors.length - 1);
    const next = itemCol.explicitAnchors[idx + 1];
    blockEnd = next !== undefined ? next - 1 : anchor + slotMap.slotStep * Math.round(itemMonths / baseMonths) - 1;
  } else {
    blockEnd = anchor + slotMap.slotStep * Math.round(itemMonths / baseMonths) - 1;
  }

  const dataRows = [];
  for (let r = anchor + 2; r + 1 <= blockEnd; r += 2) dataRows.push(r);
  if (dataRows.length === 0) dataRows.push(anchor + 2);

  // Kapasitas per baris data TIDAK selalu selebar kolom. Di template UPS MR /
  // UPS RPT (1M,3M) baris data kedua (r33) cuma punya 4 kolom - sisanya
  // (K33:R34) satu sel lebar untuk area lain. Jadi r31 = 12, r33 = 4 -> 16,
  // bukan 2 x 12 = 24. Angka nyata ini ditulis di config (slotCapacity) supaya
  // batas UI dan penulis tidak berbeda pendapat.
  const kapasitas = itemCol.slotCapacity || dataRows.length * colWidth;
  return { summaryRow: anchor, dataRows, colWidth, capacity: kapasitas };
}

function formatDateForSheet(dateStr) {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Kapasitas baterai NYATA - dibaca dari merge tiap file
// ---------------------------------------------------------------------------

/**
 * Kolom mana saja yang benar-benar punya SEL SENDIRI di sebuah baris.
 *
 * Sel yang tertelan merge lebar BUKAN sel baterai - nilainya HILANG tanpa error
 * apa pun, dan kalau ditulis ke sel pertama merge, angkanya tampil melebar
 * menutupi area lain (salah tempat, bukan cuma salah kolom). Contoh nyata
 * (Repeater Tunnel): di r33 hanya G,H,I,J yang per-kolom sementara K33:R34 satu
 * sel lebar 8 kolom. Menulis 12 nilai ke G33:R33 menyisakan 5 - Sheets API tetap
 * membalas sukses "updatedCells=12". Karena itu kapasitas dihitung dari merge.
 *
 * Aturan: merge selebar >1 kolom = BUKAN slot baterai, termasuk sel pertamanya.
 * Merge tegak 1 kolom (G31:G32) tetap slot yang sah.
 *
 * @param merges  daftar merge dari Sheets API (indeks 0-based)
 * @param baris   nomor baris 1-based
 * @param colStart kolom awal 1-based (mis. 7 = G)
 * @param colWidth lebar area data (mis. 12 = G..R)
 * @returns array kolom 1-based yang masih bisa ditulis
 */
export function kolomTerbukaDiBaris(merges, baris, colStart, colWidth = 1) {
  const baris0 = baris - 1;
  const c0 = colStart - 1;        // 0-based
  const c1 = c0 + colWidth;       // eksklusif (0-based)
  const tertutup = new Set();

  for (const m of merges || []) {
    const { startRowIndex, endRowIndex, startColumnIndex, endColumnIndex } = m;
    if (!(startRowIndex <= baris0 && baris0 < endRowIndex)) continue;
    if (startColumnIndex < c0 || endColumnIndex > c1) continue;  // di luar area baterai
    if (endColumnIndex - startColumnIndex <= 1) continue;        // merge tegak 1 kolom = sah
    // Merge lebar: seluruh rentangnya bukan area baterai.
    for (let c = startColumnIndex; c < endColumnIndex; c++) tertutup.add(c);
  }

  const cols = [];
  for (let c = c0; c < c1; c++) if (!tertutup.has(c)) cols.push(c + 1);
  return cols;
}

/**
 * Slot baterai NYATA dari merge: baris mana yang bisa ditulis, kolom apa saja.
 * Mengembalikan { rows: [{row, cols}], capacity }.
 */
export function batterySlots(merges, layout, itemCol) {
  const rows = [];
  for (const r of layout.dataRows || []) {
    const cols = kolomTerbukaDiBaris(merges, r, itemCol.colStart, layout.colWidth);
    if (cols.length > 0) rows.push({ row: r, cols });
  }
  return { rows, capacity: rows.reduce((n, x) => n + x.cols.length, 0) };
}

/**
 * Petakan nilai baterai ke slot nyata -> daftar rentang KONTIGU siap tulis.
 * Kolom yang bolong (ketelan merge lebar) dilewati, jadi tidak ada nilai
 * yang dibuang ke sel tak terlihat.
 */
export function rencanaTulisBaterai(values, slots) {
  const keluar = [];
  let i = 0;

  for (const { row, cols } of slots.rows || []) {
    let j = 0;
    while (j < cols.length && i < values.length) {
      const mulai = j;
      while (j + 1 < cols.length && cols[j + 1] === cols[j] + 1) j++;
      const lebar = j - mulai + 1;
      const ambil = Math.min(lebar, values.length - i);
      keluar.push({ row, colStart: cols[mulai], values: values.slice(i, i + ambil) });
      i += ambil;
      j++;
    }
    if (i >= values.length) break;
  }

  return { rencana: keluar, terpakai: i, sisa: values.length - i };
}

/** Baca daftar merge satu tab. Nama tab dicocokkan persis/normal. */
export async function bacaMergesTab(spreadsheetId, tabName) {
  const meta = await sheetsFetch(
    `/${spreadsheetId}?fields=sheets(properties(title),merges)&includeGridData=false`
  );
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const target = norm(tabName);
  const sh = (meta.sheets || []).find((s) => norm(s.properties?.title) === target);
  // Tab tidak ketemu di respons = jawaban tidak lengkap, bukan "0 slot".
  // Dibedakan supaya pemanggil bisa jatuh ke kapasitas config, bukan menolak tulis.
  if (!sh) throw new Error(`Tab "${tabName}" tidak ada di respons Sheets API.`);
  return sh.merges || [];
}

// Cache per-spreadsheet supaya satu submission tidak memanggil API berkali-kali
// (satu file bisa punya beberapa tab baterai).
const cacheMerges = new Map();
const umurCacheMerges = new Map();
const UMUR_CACHE_MS = 5 * 60 * 1000;

/**
 * Slot baterai untuk KEPERLUAN TULIS.
 *   null            -> merge TIDAK TERBACA (API gagal) -> pemanggil pakai jalur lama
 *   { capacity: 0 } -> merge TERBACA, tapi r31/r33 memang bukan baris data baterai
 *                      (layout lama) -> ini jawaban nyata, BUKAN alasan untuk
 *                      menulis buta.
 */
async function slotBateraiUntukTulis(spreadsheetId, tabName, slotMap, itemCol, tanggal, layout) {
  const kunci = `${spreadsheetId}|${tabName}`;
  let merges = cacheMerges.get(kunci);
  const umur = umurCacheMerges.get(kunci) || 0;

  if (!merges || Date.now() - umur > UMUR_CACHE_MS) {
    try {
      merges = await bacaMergesTab(spreadsheetId, tabName);
      cacheMerges.set(kunci, merges);
      umurCacheMerges.set(kunci, Date.now());
    } catch {
      return null;
    }
  }

  return batterySlots(merges, layout, itemCol);
}

/** Bersihkan cache merge - dipakai setelah submit supaya struktur terbaru dibaca. */
export function bersihkanCacheMerges() {
  cacheMerges.clear();
  umurCacheMerges.clear();
}

/**
 * Baris ringkasan ("Tgl: ... / Catatan: ...") hanya boleh ditulis kalau baris
 * itu memang sel gabungan lebar. Kalau baris anchor justru punya slot per-kolom
 * (G, H, I, ... masing-masing sel sendiri), berarti di file itu baris tersebut
 * adalah BARIS DATA - dan menulis ringkasan ke situ akan MENIMPA nilai baterai
 * yang sudah diisi teknisi.
 *
 * Kejadian nyata: K41+607 Karawang Signal (202) dan K0+316 Halim Signal (101).
 * Blok baterainya bergeser turun satu blok, jadi r29 jadi baris data.
 *
 * TAPI "self."-nya tidak cukup jadi alasan untuk memblokir: di K27+985 SRS 2
 * blok baterainya juga bergeser, tapi r29 (self.) justru KOSONG - tidak ada
 * yang bisa hilang, dan teknisi tetap perlu bisa mengisi. Karena itu blokir
 * hanya kalau baris itu benar-benar berisi data.
 *
 * @returns {number|null} baris ringkasan yang aman, atau null kalau tak boleh ditulis.
 */
export function barisRingkasanAman(merges, layout, itemCol, nilaiBaris = null) {
  if (!layout.summaryRow) return null;
  const kolomAnchor = kolomTerbukaDiBaris(merges, layout.summaryRow, itemCol.colStart, layout.colWidth);
  if (kolomAnchor.length === 0) return layout.summaryRow;   // memang sel gabungan lebar

  // Baris itu berslot per-kolom -> baris DATA. Aman HANYA kalau benar-benar kosong.
  if (!nilaiBaris) return null;                              // tak tahu isinya: jangan tebak
  if (!Array.isArray(nilaiBaris)) return null;
  // nilaiBaris dibaca mulai dari colStart, jadi indeks 0 = kolom pertama.
  const adaIsi = nilaiBaris.slice(0, layout.colWidth)
    .some((v) => String(v ?? '').trim() !== '');
  return adaIsi ? null : layout.summaryRow;
}

/**
 * Baca baris tertentu satu kali (dipakai untuk memutuskan boleh-tidaknya
 * menulis ringkasan). Balikin null kalau gagal baca - pemanggil harus
 * memperlakukannya sebagai "tidak boleh menulis", bukan "kosong".
 */
async function bacaBaris(spreadsheetId, tabName, row, colStart, colWidth) {
  try {
    const range = `'${tabName}'!${colLetter(colStart)}${row}:${colLetter(colStart + colWidth - 1)}${row}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/` +
      `${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await getValidAccessToken()}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.values && data.values[0]) || [];
  } catch (e) {
    return null;
  }
}

/**
 * Terapkan mode tulis: 'overwrite' -> pakai nilai baru apa adanya (default).
 * 'append' -> kalau sel target SUDAH ada isi sebelumnya, isi baru ditulis di
 * ATAS, isi lama dipindah ke bawah sebagai riwayat (dipisah garis pembatas) -
 * dipakai saat teknisi pilih "Perawatan Baru" (bukan "Perbaikan") pas ada
 * isian ganda untuk bulan yang sama, supaya data lama nggak hilang.
 */
function applyWriteMode(newValue, writeMode, existingValue) {
  if (writeMode !== 'append' || !existingValue || !existingValue.trim()) {
    return newValue;
  }
  return `${newValue}\n\n── Riwayat sebelumnya ──\n${existingValue}`;
}

/**
 * Cek nilai V/R tiap baterai terhadap standar resistansi (beda per kelas
 * tegangan: baterai ~2V pakai batas class2V, baterai ~12V pakai class12V).
 * Return 'Ada temuan' kalau ADA baterai yang R-nya melebihi batas, 'Normal'
 * kalau semua baterai (yang keisi) masih dalam batas, atau null kalau tidak
 * ada data yang bisa dicek sama sekali.
 */
function classifyBatteryFindings(answerArray, standard) {
  if (!standard) return null;
  let hasAny = false;
  let hasFinding = false;
  for (const cell of answerArray) {
    if (typeof cell !== 'string') continue;
    const vMatch = cell.match(/V:\s*([\d.,]+)/);
    const rMatch = cell.match(/R:\s*([\d.,]+)/);
    if (!vMatch || !rMatch) continue;
    const v = parseFloat(vMatch[1].replace(',', '.'));
    const r = parseFloat(rMatch[1].replace(',', '.'));
    if (isNaN(v) || isNaN(r)) continue;
    hasAny = true;
    const isClass2V = v < 6; // baterai ~2V vs ~12V, dipisah dari nilai V yang diketik
    const limit = isClass2V ? standard.class2V?.maxR : standard.class12V?.maxR;
    if (limit !== undefined && r > limit) hasFinding = true;
  }
  if (!hasAny) return null;
  return hasFinding ? 'Ada temuan' : 'Normal';
}

/**
 * Baca isi sel-sel item tertentu di 1 baris (dipakai sebelum submit, buat cek
 * apakah bulan yang sama sudah pernah diisi - kalau iya, ChecksheetForm akan
 * tanya teknisi dulu: Perbaikan (timpa) atau Perawatan Baru (tambahkan sebagai
 * riwayat baru di sel yang sama, bukan bikin baris fisik baru - itu bisa
 * ngerusak susunan baris kategori lain yang berbagi baris yang sama).
 */
export async function getRowCellValues(spreadsheetId, tabName, slotMap, tanggal, itemColumns) {
  if (!itemColumns.length) return {};
  // Tiap item dibaca di baris yang SAMA dengan tempat ia ditulis (computeItemRow:
  // item 3/6/12-bulanan di anchor blok, bukan baris bulan). Untuk tabel baterai
  // sel yang dibaca = sel ringkasan di baris anchor.
  const ranges = itemColumns.map((ic) => `'${tabName}'!${colLetter(ic.colStart)}${computeItemRow(slotMap, ic, tanggal, false)}`);
  const query = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const data = await sheetsFetch(`/${spreadsheetId}/values:batchGet?${query}`);
  const result = {};
  (data.valueRanges || []).forEach((vr, i) => {
    const val = vr.values && vr.values[0] && vr.values[0][0];
    result[itemColumns[i].id] = val || '';
  });
  return result;
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
 *
 * writeMode: 'overwrite' (default, timpa apa adanya) atau 'append' - kalau 'append'
 * DAN sel target sudah ada isinya (existingValues), isi baru ditulis di ATAS, isi
 * lama dipindah ke bawah sebagai riwayat (bukan hilang) - dipakai saat teknisi
 * memilih "Perawatan Baru" (bukan "Perbaikan") pas ada isian ganda di bulan sama.
 */
export async function writeMonthlySlot(spreadsheetId, tabName, slotMap, { tanggal, petugas, answers, writeMode = 'overwrite', existingValues = {} }) {
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

  for (const itemCol of slotMap.itemColumns) {
    const answer = answers[itemCol.id];
    if (answer === undefined || answer === null) continue;

    const isBatteryTable = Array.isArray(answer);
    // Item yang periodenya lebih jarang dari grid dasar (mis. 3-bulanan di grid
    // bulanan) ditulis ke baris ANCHOR blok periodenya sendiri, bukan baris row
    // di atas (lihat computeItemRow). Item tabel baterai selalu baris normal.
    const itemRow = computeItemRow(slotMap, itemCol, tanggal, isBatteryTable);

    if (isBatteryTable) {
      // Tabel baterai: tulis HANYA ke sel yang benar-benar ada. Merge lebar
      // menelan kolom (mis. K33:R34 di lokasi Repeater) - nilai yang ditulis ke
      // situ HILANG tanpa error. Karena itu petakan ke slot nyata dari merge.
      const values = answer.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
      const layout = batteryLayout(slotMap, itemCol, tanggal);

      // Kapasitas NYATA dari merge file ini dulu - itu yang menentukan. Batas
      // dari config cuma dipakai kalau merge tak terbaca (jaringan gagal).
      const slots = await slotBateraiUntukTulis(spreadsheetId, tabName, slotMap, itemCol, tanggal, layout);
      const kapasitasNyata = slots ? slots.capacity : layout.capacity;

      if (values.length > kapasitasNyata) {
        const sebab = kapasitasNyata === 0
          ? `Baris ${layout.dataRows.join(' & ')} di sheet ini BUKAN baris data baterai ` +
            `(layout template-nya beda - area baterai ada di baris lain).`
          : `Kapasitasnya cuma ${kapasitasNyata} sel` +
            (slots && slots.capacity < layout.dataRows.length * layout.colWidth
              ? ` karena sebagian kolom ditelan sel gabungan.` : `.`);
        throw new Error(
          `Jumlah baterai (${values.length}) melebihi kapasitas template di sheet ini (${kapasitasNyata}). ` +
          `${sebab} Kurangi jumlah baterai atau perbesar area data di file Drive-nya.`
        );
      }

      if (slots) {
        const { rencana, sisa } = rencanaTulisBaterai(values, slots);
        if (sisa > 0) {
          const sebab = slots.capacity === 0
            ? `Baris ${layout.dataRows.join(' & ')} di sheet ini BUKAN baris data baterai ` +
              `(layout template-nya beda - area baterai ada di baris lain).`
            : `Kapasitasnya cuma ${slots.capacity} sel karena kolom ditelan sel gabungan.`;
          throw new Error(
            `Baterai ${values.length} unit tidak muat di sheet ini. ${sebab} ` +
            `${sisa} nilai tidak punya tempat - tidak ada yang ditulis supaya data tidak salah tempat. ` +
            `Perbaiki merge di file Drive-nya, atau pakai template yang benar.`
          );
        }
        // Baris ringkasan justru terisi slot per-kolom = blok baterai file ini
        // bergeser. Tolak HANYA kalau baris itu memang berisi data - kalau
        // kosong, tidak ada yang bisa hilang dan teknisi tetap harus bisa isi.
        if (layout.summaryRow) {
          const mergesTab = cacheMerges.get(`${spreadsheetId}|${tabName}`) || [];
          const kolomAnchor = kolomTerbukaDiBaris(mergesTab, layout.summaryRow, itemCol.colStart, layout.colWidth);
          if (kolomAnchor.length > 0) {
            const isiBaris = await bacaBaris(spreadsheetId, tabName, layout.summaryRow,
                                             itemCol.colStart, layout.colWidth);
            if (!barisRingkasanAman(mergesTab, layout, itemCol, isiBaris)) {
              throw new Error(
                `Susunan baris di sheet ini berbeda dari template: baris ${layout.summaryRow} seharusnya ` +
                `ringkasan, tapi di file ini justru berisi data baterai per-kolom` +
                `${Array.isArray(isiBaris) ? ' (sudah ada isian teknisi)' : ''}. ` +
                `Tidak ada yang ditulis supaya data lama tidak tertimpa. ` +
                `Rapikan file Drive-nya dulu (geser blok baterai ke baris ${layout.dataRows.join(' & ')}).`
              );
            }
          }
        }
        for (const r of rencana) {
          data.push({
            range: `'${tabName}'!${colLetter(r.colStart)}${r.row}:` +
                   `${colLetter(r.colStart + r.values.length - 1)}${r.row}`,
            values: [r.values]
          });
        }
      } else {
        // Merge tak terbaca -> pakai baris layout apa adanya, potong sebatas
        // kapasitas supaya tidak meluber ke kolom Petugas.
        let sisaNilai = values;
        for (const r of layout.dataRows) {
          if (sisaNilai.length === 0) break;
          const chunk = sisaNilai.slice(0, layout.colWidth);
          sisaNilai = sisaNilai.slice(layout.colWidth);
          data.push({
            range: `'${tabName}'!${colLetter(itemCol.colStart)}${r}:` +
                   `${colLetter(itemCol.colStart + chunk.length - 1)}${r}`,
            values: [chunk]
          });
        }
      }

      // Ringkasan periode ("Tgl: X  Catatan: Normal/Ada temuan") di baris anchor.
      // "Ada temuan" otomatis kalau ada baterai yang R-nya lewat batas standar.
      // HANYA ditulis kalau baris itu memang sel gabungan lebar - kalau justru
      // punya slot per-kolom, itu baris DATA dan ringkasan akan menimpa isinya.
      if (layout.summaryRow) {
        const aman = slots
          ? barisRingkasanAman(cacheMerges.get(`${spreadsheetId}|${tabName}`) || [], layout, itemCol)
          : layout.summaryRow;
        if (aman) {
          const status = classifyBatteryFindings(answer, itemCol.batteryStandard) || '';
          data.push({
            range: `'${tabName}'!${colLetter(itemCol.colStart)}${aman}`,
            values: [[`Tgl: ${formattedDate}\nCatatan:\n${status}`]]
          });
        }
      }
    } else if (typeof answer === 'object' && answer.__rawText !== undefined) {
      // Item dengan format sendiri (mis. "Lokasi Uji Fungsi: ... Catatan: ...")
      // - ditulis apa adanya, TIDAK dibungkus prefix "Tgl: ..." otomatis.
      data.push({
        range: `'${tabName}'!${colLetter(itemCol.colStart)}${itemRow}`,
        values: [[applyWriteMode(answer.__rawText, writeMode, existingValues[itemCol.id])]]
      });
    } else {
      // Item teks biasa -> otomatis dibungkus format "Tgl: <tanggal>\nCatatan:\n<isian>"
      // (VERTIKAL, pakai baris baru - bukan 1 baris disambung spasi) sesuai pola
      // tampilan data lama di template asli. User cuma perlu isi bagian catatannya.
      const newValue = `Tgl: ${formattedDate}\nCatatan:\n${answer}`;
      data.push({
        range: `'${tabName}'!${colLetter(itemCol.colStart)}${itemRow}`,
        values: [[applyWriteMode(newValue, writeMode, existingValues[itemCol.id])]]
      });
    }
  }

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
 * Cari baris KOSONG berikutnya di kolom tertentu, mulai dari startRow - dipakai
 * buat sheet log berurutan (mis. "Entry and exit registration") yang formatnya
 * "nambah baris berikutnya" (bukan slot bulanan tetap kayak checksheet biasa).
 * Baris dianggap kosong kalau kolom acuan (mis. Tanggal) belum terisi.
 */
export async function findNextEmptyRow(spreadsheetId, tabName, startRow, checkCol, maxRows = 300) {
  const colL = colLetter(checkCol);
  const data = await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(`'${tabName}'!${colL}${startRow}:${colL}${startRow + maxRows}`)}`);
  const values = data.values || [];
  for (let i = 0; i < maxRows; i++) {
    const cell = values[i] ? values[i][0] : undefined;
    if (!cell || String(cell).trim() === '') {
      return startRow + i;
    }
  }
  return startRow + maxRows; // fallback kalau semua baris ternyata sudah terisi
}

/**
 * Baca kolom Tanggal (kolom B) dari baris tertentu s/d baris tertentu - dipakai
 * buat cek apakah "Entry and exit registration" sudah pernah diisi bulan ini.
 *
 * PENTING: dibaca sebagai nilai MENTAH (UNFORMATTED_VALUE), bukan teks
 * tampilan. Kolom B di file site formatnya campur-aduk - ada yang M/D/YYYY,
 * ada yang dd/mm/yyyy. Nilai tampilan "2/10/2026" bisa berarti 2 Oktober
 * (dd/mm) ATAU 10 Februari (mm/dd), dan tidak ada cara membedakannya dari
 * teksnya saja. Nilai mentahnya berupa angka serial tanggal yang tidak ambigu,
 * jadi pembacaan ini menghilangkan salah-baca bulan sepenuhnya.
 */
export async function readEntryExitDates(spreadsheetId, tabName, startRow, endRow) {
  if (endRow < startRow) return [];
  const data = await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(`'${tabName}'!B${startRow}:B${endRow}`)}?valueRenderOption=UNFORMATTED_VALUE`);
  return (data.values || []).map((r) => r[0]);
}

/**
 * Tulis 1 baris log "Entry and exit registration" ke baris kosong berikutnya.
 */
export async function writeEntryExitRow(spreadsheetId, tabName, row, entry) {
  const data = [
    { range: `'${tabName}'!B${row}`, values: [[entry.tanggal]] },
    { range: `'${tabName}'!C${row}`, values: [[entry.waktuMasuk]] },
    { range: `'${tabName}'!D${row}`, values: [[entry.nama]] },
    { range: `'${tabName}'!E${row}`, values: [[entry.namaUnit]] },
    { range: `'${tabName}'!F${row}`, values: [[entry.nomorKontak]] },
    { range: `'${tabName}'!G${row}`, values: [[entry.kegiatan]] },
    { range: `'${tabName}'!H${row}`, values: [[entry.waktuKeluar]] }
  ];
  if (entry.signatureImageUrl) {
    data.push({ range: `'${tabName}'!I${row}`, values: [[`=IMAGE("${entry.signatureImageUrl}")`]] });
  }
  await sheetsFetch(`/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data })
  });
}
export async function getSheetGid(spreadsheetId, tabName) {
  const meta = await sheetsFetch(`/${spreadsheetId}?fields=sheets.properties`);
  const found = meta.sheets.find((s) => s.properties.title === tabName);
  return found ? found.properties.sheetId : 0;
}

/**
 * Ambil daftar SEMUA nama tab di 1 spreadsheet - dipakai buat filter "dari
 * sheet apa" di daftar Temuan & Gangguan (Dashboard), karena 1 file log bisa
 * punya beberapa tab (mis. per periode/kategori).
 */
export async function listSheetTabs(spreadsheetId) {
  const meta = await sheetsFetch(`/${spreadsheetId}?fields=sheets.properties`);
  return meta.sheets.map((s) => s.properties.title);
}

/**
 * Baca 1 blok range mentah dari sheet manapun - dipakai buat parsing "Jadwal
 * Kunjungan MR" di Dashboard (bukan slot tetap kayak checksheet, jadi baca
 * apa adanya lalu di-parse di lapisan atas / cfillService.js).
 */
export async function readRawRange(spreadsheetId, tabName, range) {
  const data = await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(`'${tabName}'!${range}`)}`);
  return data.values || [];
}

/**
 * Cari nama tab yang SEBENARNYA ada di spreadsheet.
 *
 * Aturan pencocokan (dari paling ketat ke paling longgar) ada di
 * lib/tabNames.js - murni, ada test-nya. Yang ditangani:
 *
 *   - beda spasi & huruf besar/kecil
 *     "Baterai HFSPS Grup 1 (1M,3M)" == "Baterai HFSPS Grup1 (1M,3M)"
 *     "Lembar Verifikasi pekerjaan"  == "Lembar Verifikasi Pekerjaan"
 *   - akhiran pendek
 *     "jadwal kunjungan MR New"      <- "Jadwal Kunjungan MR"
 *   - nama terpotong batas 31 karakter Excel (Sheets memotong lagi dengan
 *     aturan sendiri, jadi hasilnya bisa beda 1-3 karakter dari file .xlsx)
 *     "Pemeriksaan jalur FO (1M, 3M, 1Y)" <- "Pemeriksaan jalur FO (1M, 3M, 1"
 *   - alias nama kategori yang memang dipakai beda di sebagian file
 *     "Telephone AG (3,6M)"          <- "Telephone dan Softswitch AG (3M, 6M)"
 *
 * HASILNYA DI-CACHE, TERMASUK KEGAGALANNYA - kalau dulu gagal lalu sekarang
 * pakai nama asli, tiap submit akan menembak Sheets dengan tab yang tidak ada
 * dan error "Unable to parse range" muncul berulang. Sekarang kegagalan
 * dilempar SEKALI dengan daftar tab yang benar-benar ada.
 *
 * `expected` boleh berupa array (nama utama + alias) - dicoba berurutan.
 */
const tabNameCache = new Map();

export async function resolveTabName(spreadsheetId, expected) {
  const kandidat = (Array.isArray(expected) ? expected : [expected])
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  if (kandidat.length === 0) throw new Error('resolveTabName: nama tab kosong.');

  const cacheKey = spreadsheetId + '|' + kandidat.join('\u0000');
  const cached = tabNameCache.get(cacheKey);
  if (cached) {
    if (cached.error) throw new Error(cached.error);
    return cached.tab;
  }

  const meta = await sheetsFetch(`/${spreadsheetId}?fields=sheets.properties`);
  const titles = meta.sheets.map((s) => s.properties.title);

  const { tab, dari } = matchTabNameFromCandidates(titles, kandidat);
  if (tab) {
    tabNameCache.set(cacheKey, { tab });
    return tab;
  }

  const pesan = `Tab "${kandidat.join('" / "')}" tidak ada di spreadsheet ini. ` +
    `Tab yang benar-benar ada (${titles.length}): ${titles.join(' | ')}. ` +
    `Perbaiki nama tab di file Drive-nya, atau samakan "sheetName" di config kategori.`;
  tabNameCache.set(cacheKey, { error: pesan });
  throw new Error(pesan);
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
