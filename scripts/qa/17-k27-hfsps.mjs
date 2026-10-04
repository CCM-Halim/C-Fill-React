/**
 * Verifikasi KHUSUS K27+985 HFSPS — memakai KODE APP yang sebenarnya.
 *
 * Membuktikan tiga hal SEKALIGUS:
 *  1. resolveTabName menemukan tab "HFSPS (6M, 1Y)" untuk kategori cat30
 *     (yang sheetName-nya "HFSPS (1Y)").
 *  2. computeSlotRow menghitung baris yang BENAR untuk tanggal Oktober 2026.
 *  3. Baris itu memang slot yang tepat, dan masih kosong -> menulis di situ
 *     tidak menimpa data pemeriksaan sebelumnya.
 *
 * READ-ONLY (tidak menulis apa pun).
 * Jalankan: npx vite-node -c scripts/qa/vite.qa.config.mjs scripts/qa/17-k27-hfsps.mjs
 */
import fs from 'node:fs';
import { CATEGORIES } from '../../src/config/categories.js';
import { resolveTabName, computeSlotRow, readRawRange } from '../../src/lib/sheetsApi.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const api = async (u) => {
  const r = await fetch(u, { headers: H });
  const j = await r.json();
  if (j.error) throw new Error(`${j.error.code} ${j.error.message}`);
  return j;
};

const NAMA_FILE = 'K27+985 Signal Relay Station 2 (HA-KA 7 _ BTS 7)';
const q = `name = ${JSON.stringify(NAMA_FILE)} and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
const cari = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime)&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`);
if (!cari.files?.length) { console.log('file K27+985 tidak ketemu'); process.exit(1); }

// Pilih salinan yang PALING LAMA - sama seperti yang dipakai aplikasi.
const file = cari.files.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime))[0];
console.log(`file dipakai : ${file.name}  (${cari.files.length} salinan)`);

const cat = CATEGORIES.find((c) => c.id === 'cat30');
console.log(`kategori     : ${cat.id} · ${cat.short_name}`);
console.log(`sheetName    : "${cat.sheetName}"`);
console.log(`sheetAliases : ${JSON.stringify(cat.sheetAliases || [])}\n`);

// ---- 1. nama tab ----
const kandidat = [cat.sheetName, ...(cat.sheetAliases || [])];
const tab = await resolveTabName(file.id, kandidat);
console.log(`1) nama tab  : "${tab}"  ${tab.includes('6M, 1Y') ? '← lewat alias ✔' : ''}`);

// ---- 2. baris slot untuk Oktober 2026 ----
const tanggal = '2026-10-15';
const row = computeSlotRow(cat.slotMap, tanggal);
console.log(`2) baris slot untuk ${tanggal} : ${row}  (slotStartRow ${cat.slotMap.slotStartRow}, step ${cat.slotMap.slotStep}, count ${cat.slotMap.slotCount})`);

// ---- 3. periode tiap item (dari config) ----
console.log(`3) item & periodenya:`);
for (const ic of cat.slotMap.itemColumns) {
  console.log(`   ${ic.id}  ${String(ic.periodMonths).padStart(2)}bln  kolom ${ic.colStart}`);
}
console.log(`   -> untuk ${tanggal}, item 6 bulanan jatuh di baris ${row}, 12 bulanan di baris ${row + 6}`);

// ---- 4. isi kolom A & B di sekitar baris itu (cek kosong / sudah terisi) ----
const rows = await readRawRange(file.id, tab, 'A1:C26');
console.log(`\n4) isi kolom A-C (baris 9-22):`);
rows.slice(8, 22).forEach((r, i) => {
  const n = i + 9;
  const isi = [r?.[0] ?? '', r?.[1] ?? '', r?.[2] ?? ''].map((c) => String(c).replace(/\n/g, ' ⏎ ').slice(0, 26));
  console.log(`   ${String(n).padStart(2)} │ ${isi.join(' │ ')}${n === row ? '   ← baris slot Oktober' : ''}`);
});

// ---- 5. kolom rencana L:O (cek #NUM!) ----
const plan = await readRawRange(file.id, tab, 'L9:O20');
const rusak = [];
plan.forEach((r, i) => (r || []).forEach((v, j) => {
  if (String(v).trim() && Number.isNaN(Number(v))) rusak.push(`baris ${i + 9} kolom ${'LMNO'[j]} = "${v}"`);
}));
console.log(`\n5) sel kolom rencana yang bukan angka: ${rusak.length ? rusak.join('; ') : '(tidak ada)'}`);
