/**
 * QA 18 — DAFTAR LENGKAP SITE YANG PUNYA SALINAN GOOGLE SHEETS GANDA.
 *
 * Untuk SETIAP site yang terdaftar di config, cari file Google Sheets bernama
 * sama di Drive dan hitung berapa salinannya. Yang lebih dari satu dicetak
 * lengkap: tanggal dibuat, terakhir diubah, tab terbanyak, dan LINK.
 *
 * READ-ONLY.
 * Jalankan: node scripts/qa/18-duplikat-penuh.mjs
 */
import fs from 'node:fs';
import { SITES } from '../../src/config/sites.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const D = 'https://www.googleapis.com/drive/v3/files';
const S = 'https://sheets.googleapis.com/v4/spreadsheets';

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

const api = async (u, coba = 4) => {
  for (let i = 1; i <= coba; i++) {
    const r = await fetch(u, { headers: H });
    const j = await r.json();
    if (!j.error) return j;
    // 429/rate limit -> mundur sebentar lalu coba lagi
    if (j.error.code === 429 || j.error.code === 403) { await tidur(2000 * i); continue; }
    throw new Error(`${j.error.code} ${j.error.message}`);
  }
  throw new Error('terlalu banyak percobaan gagal');
};

async function salinanSite(originalFileName) {
  const base = originalFileName.replace(/\.xlsx$/i, '').replace(/\//g, '_');
  const q = `name = ${JSON.stringify(base)} and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const j = await api(`${D}?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime,modifiedTime)&pageSize=50&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=createdTime`);
  return j.files || [];
}

async function infoTab(id) {
  try {
    const j = await api(`${S}/${id}?fields=sheets.properties.title`);
    return j.sheets.map((s) => s.properties.title);
  } catch { return null; }
}

console.log('=== QA 18: SITE DENGAN SALINAN GOOGLE SHEETS GANDA ===');
console.log(`memeriksa ${SITES.length} site...\n`);

const ganda = [];
let satu = 0;
let nol = 0;

for (const s of SITES) {
  let files;
  try {
    files = await salinanSite(s.originalFileName);
  } catch (e) {
    console.log(`  ! ${s.siteName}: ${e.message.slice(0, 70)}`);
    await tidur(2500);
    continue;
  }
  if (files.length === 0) { nol += 1; }
  else if (files.length === 1) { satu += 1; }
  else {
    ganda.push({ site: s.siteName, kategori: s.buildingCategory, file: s.originalFileName, files });
  }
  await tidur(260);
}

console.log(`site dengan 1 salinan : ${satu}`);
console.log(`site belum dikonversi: ${nol}`);
console.log(`site dengan salinan GANDA: ${ganda.length}\n`);

for (const g of ganda) {
  console.log('─'.repeat(78));
  console.log(`${g.site}`);
  console.log(`   kategori: ${g.kategori}  |  ${g.files.length} salinan`);
  for (let i = 0; i < g.files.length; i++) {
    const f = g.files[i];
    const tabs = await infoTab(f.id);
    const tanda = i === 0 ? '◀ DIPAKAI APP' : 'diabaikan';
    console.log(`   ${i + 1}. dibuat ${(f.createdTime || '').slice(0, 10)} | diubah ${(f.modifiedTime || '').slice(0, 10)} | ${tabs ? tabs.length + ' tab' : '?'} | ${tanda}`);
    console.log(`      ${f.id}`);
  }
  await tidur(400);
}

// Ringkasan yang bisa langsung dipakai
const ringkas = ganda.map((g) => ({
  site: g.site,
  kategori: g.kategori,
  jumlah: g.files.length,
  dipakai: { id: g.files[0].id, dibuat: (g.files[0].createdTime || '').slice(0, 10) },
  lain: g.files.slice(1).map((f) => ({ id: f.id, dibuat: (f.createdTime || '').slice(0, 10), diubah: (f.modifiedTime || '').slice(0, 10) }))
})).sort((a, b) => b.jumlah - a.jumlah);

fs.writeFileSync('/tmp/qa18-duplikat.json', JSON.stringify({ total: ganda.length, satu, nol, ringkas }, null, 1));
console.log('\n' + '='.repeat(78));
console.log(`TOTAL site dengan salinan ganda: ${ganda.length}`);
console.log('hasil lengkap: /tmp/qa18-duplikat.json');
