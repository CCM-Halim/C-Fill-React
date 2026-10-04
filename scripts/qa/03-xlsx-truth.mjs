/**
 * KEBENARAN DASAR: nama tab di file .xlsx ASLI vs nama tab setelah dikonversi
 * ke Google Sheets vs nama yang diminta config.
 *
 * File .xlsx hanya DIUNDUH (tidak diubah, tidak dikonversi) - Drive tidak
 * tersentuh. Nama sheet dibaca langsung dari xl/workbook.xml di dalam zip.
 *
 * Jalankan: node scripts/qa/03-xlsx-truth.mjs
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SITES, BUILDING_CATEGORIES } from '../../src/config/sites.js';
import { CATEGORIES } from '../../src/config/categories.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const CHECK_ROOT = '1EBanKF2gfpdDY8e7gqCW_3dcP053sZjR';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET = 'application/vnd.google-apps.spreadsheet';
const DIR = 'application/vnd.google-apps.folder';

const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };
const kids = async (fid) => (await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}&fields=files(id,name,mimeType)&pageSize=1000&supportsAllDrives=true`)).files || [];
const tabsOf = async (sid) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties`)).sheets.map((s) => s.properties.title);

async function download(id, dest) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, { headers: H });
  if (!r.ok) throw new Error(`unduh gagal ${r.status}`);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  return fs.statSync(dest).size;
}

/** Nama sheet dari .xlsx lokal (unzip + baca xl/workbook.xml). Tanpa dependensi. */
function xlsxSheetNames(path) {
  const out = execFileSync('/usr/bin/python3', ['-c', `
import zipfile, re, sys, json, html
z = zipfile.ZipFile(sys.argv[1])
wb = z.read('xl/workbook.xml').decode('utf-8','replace')
print(json.dumps([html.unescape(n) for n in re.findall(r'<sheet[^>]*name="([^"]*)"', wb)]))
`, path], { encoding: 'utf8' });
  return JSON.parse(out);
}

// --- siapkan peta buildingCategory -> folder id ---
const rootKids = await kids(CHECK_ROOT);
const bcId = {};
for (const k of rootKids.filter((k) => k.mimeType === DIR)) bcId[k.name] = k.id;
const peta = JSON.parse(fs.readFileSync('/tmp/qa-live-read.json', 'utf8')).petaSite;

const TARGET = [
  { site: 'K12+075 - Halim 150KV Substation', alasan: 'cat35 Kabel Optik' },
  { site: 'K42 + 365 AT Post 3', alasan: 'cat01 + cat21 + cat41 (3 pola sekaligus)' },
  { site: 'K41+ 683 Base Station Karawang (204)', alasan: 'cat44 Telephone (18 site kena)' },
  { site: 'K27+985 Signal Relay Station 2 (HA-KA 7 _ BTS 7)', alasan: 'cat30 HFSPS' },
  { site: 'K0+316 Halim Signal Building Communication (101)', alasan: 'PEMBANDING — normal' },
];

let nUbahNama = 0; let nUbahJumlah = 0;
const temuan = [];

for (const t of TARGET) {
  const site = SITES.find((s) => s.siteName === t.site);
  if (!site) { console.log(`! tidak ditemukan: ${t.site}`); continue; }
  console.log('='.repeat(78));
  console.log(`${site.siteName}`);
  console.log(`  folder : ${site.buildingCategory}`);
  console.log(`  file   : ${site.originalFileName}`);
  console.log(`  alasan : ${t.alasan}`);

  const fid = bcId[site.buildingCategory];
  const isi = fid ? await kids(fid) : [];
  const xf = isi.find((f) => f.name === site.originalFileName && f.mimeType === XLSX);
  const sf = isi.find((f) => f.name === site.originalFileName && f.mimeType === SHEET);
  const info = peta[site.originalFileName];

  const sheetsTabs = info ? await tabsOf(info.id).catch(() => []) : [];

  if (!xf) {
    console.log('  .xlsx asli TIDAK ADA di folder ini');
  } else {
    const dest = `/tmp/qa-dl-${xf.id}.xlsx`;
    const size = await download(xf.id, dest);
    const asli = xlsxSheetNames(dest);
    fs.unlinkSync(dest);

    console.log(`  .xlsx asli : ${asli.length} tab (${(size / 1024).toFixed(0)} KB)`);
    console.log(`  Sheets     : ${sheetsTabs.length} tab`);

    const asliSet = new Set(asli); const shSet = new Set(sheetsTabs);
    const namaHilang = asli.filter((x) => !shSet.has(x));
    const namaBaru = sheetsTabs.filter((x) => !asliSet.has(x));

    if (asli.length !== sheetsTabs.length) {
      nUbahJumlah += 1;
      console.log(`  ⚠ jumlah tab BERUBAH saat konversi`);
    }
    if (namaHilang.length) {
      nUbahNama += 1;
      console.log(`  ⚠ ${namaHilang.length} nama tab BERUBAH karena konversi:`);
      for (const h of namaHilang.slice(0, 5)) {
        const p31 = [...h].slice(0, 31).join('');
        const kandidat = shSet.has(p31) ? p31 : namaBaru.find((x) => [...h].slice(0, [...x].length).join('') === x || x === p31);
        const terpotong = [...h].length > 31 && kandidat;
        console.log(`      asli   : ${JSON.stringify(h)} (${[...h].length} char)`);
        console.log(`      sheets : ${JSON.stringify(kandidat || '(tidak ketemu padanannya)')}`);
        if (terpotong) console.log(`      >>> TERPOTONG di 31 karakter`);
        temuan.push({ file: site.originalFileName, asli: h, sheets: kandidat || null, terpotong31: !!terpotong });
      }
    }

    // konfrontasi dengan config
    const cats = CATEGORIES.filter((c) => (site.categoryIds || []).includes(c.id) && c.slotMap);
    for (const c of cats) {
      const a = asli.includes(c.sheetName); const b = sheetsTabs.includes(c.sheetName);
      if (a !== b) {
        console.log(`  !! ${c.id} ${c.short_name}: config "${c.sheetName}"`);
        console.log(`     ada di .xlsx asli : ${a}`);
        console.log(`     ada di Sheets     : ${b}`);
        if (a && !b) console.log(`     SEBAB: nama tab berubah/hilang saat konversi`);
        if (!a && b) console.log(`     SEBAB: nama di config beda dari file asli (salah ketik config)`);
      }
    }
  }
  console.log('');
}

console.log('=== RINGKASAN ===');
console.log(`file yang jumlah tabnya berubah saat konversi : ${nUbahJumlah}`);
console.log(`file yang nama tabnya berubah saat konversi   : ${nUbahNama}`);
console.log(`nama tab terpotong 31 karakter                : ${temuan.filter((x) => x.terpotong31).length}`);
fs.writeFileSync('/tmp/qa-xlsx-truth.json', JSON.stringify({ nUbahJumlah, nUbahNama, temuan }, null, 1));
