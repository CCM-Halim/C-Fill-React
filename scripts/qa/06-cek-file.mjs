/**
 * QA 6 — PENGECEKAN FILE SITE (ulang, tanpa menyembunyikan error).
 *
 * KOREKSI atas 02-live-read.mjs: di sana daftar file diambil dengan
 * `.catch(() => [])` sehingga ERROR jaringan ikut terbaca sebagai
 * "file tidak ada" -> laporan "24 site tanpa file" itu TIDAK SAHIH.
 * Skrip ini tidak menelan error, mencocokkan nama DENGAN & TANPA ".xlsx"
 * (seperti findAllSheetsForName di app), dan mengulang sekali kalau kosong.
 *
 * Jalankan: node scripts/qa/06-cek-file.mjs
 */
import fs from 'node:fs';
import { SITES, BUILDING_CATEGORIES } from '../../src/config/sites.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const CHECK_ROOT = '1EBanKF2gfpdDY8e7gqCW_3dcP053sZjR';
const SHEET = 'application/vnd.google-apps.spreadsheet';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DIR = 'application/vnd.google-apps.folder';

async function kids(fid, attempt = 1) {
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}`
    + `&fields=files(id,name,mimeType,createdTime)&pageSize=1000&supportsAllDrives=true`;
  const r = await fetch(url, { headers: H });
  const j = await r.json();
  if (j.error) throw new Error(`Drive error (${j.error.code}): ${j.error.message}`);
  const files = j.files || [];
  // Folder besar bisa balik kosong/parsial karena jeda indeks Drive -> ulangi
  if (files.length === 0 && attempt < 3) {
    await new Promise((s) => setTimeout(s, 1500 * attempt));
    return kids(fid, attempt + 1);
  }
  return files;
}

const rootKids = await kids(CHECK_ROOT);
const bcId = {};
for (const k of rootKids.filter((k) => k.mimeType === DIR)) {
  if (BUILDING_CATEGORIES.includes(k.name)) bcId[k.name] = k.id;
}

console.log(`buildingCategory di Drive: ${Object.keys(bcId).length}/${BUILDING_CATEGORIES.length}`);

const hasil = [];
const errorFolder = [];
for (const bc of BUILDING_CATEGORIES) {
  const fid = bcId[bc];
  if (!fid) { errorFolder.push(`${bc}: folder tidak ada`); continue; }
  let files;
  try { files = await kids(fid); } catch (e) { errorFolder.push(`${bc}: ${e.message}`); continue; }

  const sheets = files.filter((f) => f.mimeType === SHEET);
  const xlsxs = files.filter((f) => f.mimeType === XLSX);
  for (const s of SITES.filter((x) => x.buildingCategory === bc)) {
    const base = s.originalFileName.replace(/\.xlsx$/i, '');
    const kand = sheets.filter((f) => f.name === s.originalFileName || f.name === base)
      .sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
    const punyaXlsx = xlsxs.some((f) => f.name === s.originalFileName);
    hasil.push({
      site: s.siteName, bc, file: s.originalFileName,
      jmlSheet: kand.length, punyaXlsx,
      adaSheets: kand.length > 0,
      berkasAsing: files.filter((f) => f.name.startsWith('.')) .length,
    });
  }
  console.log(`  ${bc}: ${files.length} entri | sheets ${sheets.length} | xlsx ${xlsxs.length} | site config ${SITES.filter((x) => x.buildingCategory === bc).length}`);
}

const tanpa = hasil.filter((h) => !h.adaSheets);
const ganda = hasil.filter((h) => h.jmlSheet > 1);
const xlsxTakAda = hasil.filter((h) => !h.punyaXlsx);

console.log('\n=== HASIL (setelah koreksi) ===');
console.log(`site diperiksa                          : ${hasil.length}`);
console.log(`punya file Google Sheets                : ${hasil.filter((h) => h.adaSheets).length}`);
console.log(`belum dikonversi (masih .xlsx saja)     : ${tanpa.length}`);
console.log(`punya LEBIH DARI SATU salinan Sheets    : ${ganda.length}`);
console.log(`file .xlsx aslinya tidak ada            : ${xlsxTakAda.length}`);
if (errorFolder.length) console.log(`folder gagal dibaca                     : ${errorFolder.join(' | ')}`);

if (tanpa.length) {
  console.log('\n--- site yang BELUM punya Google Sheets (harus ada .xlsx-nya) ---');
  for (const h of tanpa) console.log(`   ${h.bc} / ${h.file}  [.xlsx ada: ${h.punyaXlsx}]`);
}
if (ganda.length) {
  console.log('\n--- site dengan SALINAN GANDA (app pakai yg paling lama + muncul peringatan) ---');
  for (const h of ganda) console.log(`   ${h.jmlSheet}x  ${h.bc} / ${h.file}`);
}
fs.writeFileSync('/tmp/qa-cek-file.json', JSON.stringify({ hasil, errorFolder }, null, 1));
