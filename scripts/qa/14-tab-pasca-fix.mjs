/**
 * QA 14 — PEMBUKTIAN PERBAIKAN (jalankan SETELAH perubahan kode).
 *
 * Membaca daftar tab SEBENARNYA dari setiap file site di Drive (read-only),
 * lalu menjalankan logika pencocokan yang BARU dipakai aplikasi
 * (lib/tabNames.js) untuk SEMUA pasangan site x kategori.
 *
 * Tujuannya menjawab satu pertanyaan: "masih ada kategori yang tab-nya tidak
 * ketemu?" - dengan angka, bukan perkiraan.
 *
 * Jalankan: node scripts/qa/14-tab-pasca-fix.mjs
 */
import fs from 'node:fs';
import { CATEGORIES } from '../../src/config/categories.js';
import { SITES } from '../../src/config/sites.js';
import { matchTabNameFromCandidates } from '../../src/lib/tabNames.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const D = 'https://www.googleapis.com/drive/v3/files';
const S = 'https://sheets.googleapis.com/v4/spreadsheets';

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

const api = async (u) => {
  const r = await fetch(u, { headers: H });
  const j = await r.json();
  if (j.error) throw new Error(`${j.error.code} ${j.error.message}`);
  return j;
};

/** Cari file Google Sheets dari "originalFileName" (tanpa folder - cari global). */
async function cariFile(nama) {
  const base = nama.replace(/\.xlsx$/i, '').replace(/\//g, '_');
  const q = `name = ${JSON.stringify(base)} and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const j = await api(`${D}?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime)&pageSize=50&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=createdTime`);
  return j.files || [];
}

const tabsCache = new Map();
async function tabsOf(spreadsheetId) {
  if (tabsCache.has(spreadsheetId)) return tabsCache.get(spreadsheetId);
  const j = await api(`${S}/${spreadsheetId}?fields=sheets.properties.title`);
  const t = j.sheets.map((s) => s.properties.title);
  tabsCache.set(spreadsheetId, t);
  return t;
}

const kandidatKategori = (c) => [c.sheetName, ...(c.sheetAliases || [])];

// ---------------------------------------------------------------------------
console.log('=== QA 14: PEMBUKTIAN PERBAIKAN NAMA TAB ===');
console.log(`kategori: ${CATEGORIES.length} | site: ${SITES.length}\n`);

// File site dikelompokkan: banyak site berbagi file kategori bangunan, tapi
// nama file unik per site, jadi cukup 1 pencarian per file.
const fileUnik = [...new Set(SITES.map((s) => s.originalFileName))];
console.log(`file site unik: ${fileUnik.length} - mencari di Drive...`);

const petaFile = new Map();
let tidakKetemu = 0;
for (const f of fileUnik) {
  try {
    const hasil = await cariFile(f);
    if (hasil.length) petaFile.set(f, hasil[0]); else tidakKetemu += 1;
  } catch (e) {
    console.log(`  ! gagal cari "${f}": ${e.message.slice(0, 80)}`);
  }
  await tidur(220);
}
console.log(`ketemu: ${petaFile.size} | tidak ada file Sheets-nya: ${tidakKetemu}\n`);

let total = 0;
let cocok = 0;
const gagal = [];
const lewatAlias = [];
const perAturan = { persis: 0, variasi: 0, alias: 0 };

for (const site of SITES) {
  const fileInfo = petaFile.get(site.originalFileName);
  if (!fileInfo) continue;

  let tabs;
  try {
    tabs = await tabsOf(fileInfo.id);
  } catch (e) {
    console.log(`  ! gagal baca tab "${fileInfo.name}": ${e.message.slice(0, 80)}`);
    continue;
  }

  for (const cid of site.categoryIds || []) {
    const cat = CATEGORIES.find((c) => c.id === cid);
    if (!cat) continue;
    total += 1;

    const kandidat = kandidatKategori(cat);
    const { tab, dari } = matchTabNameFromCandidates(tabs, kandidat);

    if (tab === kandidat[0]) perAturan.persis += 1;
    else if (tab) { perAturan.variasi += 1; if (dari !== kandidat[0]) perAturan.alias += 1; }

    if (tab) {
      cocok += 1;
      if (dari && dari !== kandidat[0]) lewatAlias.push({ site: site.siteName, cid, kat: cat.short_name, cfg: kandidat[0], dipakai: dari });
    } else {
      gagal.push({
        site: site.siteName,
        file: site.originalFileName,
        cid,
        kat: cat.short_name,
        cfg: kandidat.join(' / '),
        tabs
      });
    }
  }
  await tidur(120);
}

console.log('=== HASIL ===');
console.log(`pasangan diperiksa : ${total}`);
console.log(`cocok              : ${cocok}`);
console.log(`  · persis         : ${perAturan.persis}`);
console.log(`  · lewat varian   : ${perAturan.variasi - perAturan.alias}`);
console.log(`  · lewat alias    : ${perAturan.alias}`);
console.log(`GAGAL              : ${gagal.length}`);

if (lewatAlias.length) {
  console.log(`\n=== DITANGKAP LEWAT ALIAS (${lewatAlias.length}) ===`);
  for (const l of lewatAlias) {
    console.log(`  ${l.kat} [${l.cid}] @ ${l.site}\n     config: "${l.cfg}"  ->  dipakai: "${l.dipakai}"`);
  }
}

if (gagal.length) {
  console.log(`\n=== MASIH GAGAL (${gagal.length}) ===`);
  const perKat = new Map();
  for (const g of gagal) {
    const k = `${g.cid} · ${g.kat}`;
    if (!perKat.has(k)) perKat.set(k, { cfg: g.cfg, sites: [], contohTab: g.tabs });
    perKat.get(k).sites.push(g.site);
  }
  for (const [k, v] of perKat) {
    console.log(`\n  ${k}  (${v.sites.length} site)`);
    console.log(`    config minta : "${v.cfg}"`);
    console.log(`    tab di file  : ${v.contohTab.filter((t) => !/^Cover$|^Lembar|^Entry and exit/i.test(t)).slice(0, 12).map((t) => `"${t}"`).join(', ')}`);
    console.log(`    site         : ${v.sites.slice(0, 6).join(' | ')}${v.sites.length > 6 ? ` … (+${v.sites.length - 6})` : ''}`);
  }
} else {
  console.log('\nSemua kategori menemukan tab-nya. Tidak ada yang gagal.');
}

fs.writeFileSync('/tmp/qa14-pasca-fix.json', JSON.stringify({ total, cocok, perAturan, gagal, lewatAlias }, null, 1));
console.log('\nhasil lengkap: /tmp/qa14-pasca-fix.json');
