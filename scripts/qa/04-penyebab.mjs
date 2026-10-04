/**
 * Pemisahan penyebab 24 pasangan yang gagal:
 *
 *   SEBAB-1 "config cocok dgn .xlsx asli"  -> nama tab BERUBAH saat konversi
 *                                            .xlsx -> Google Sheets.
 *   SEBAB-2 "tidak ada di .xlsx asli"      -> nama di config memang BEDA
 *                                            dari nama tab file-nya.
 *
 * .xlsx hanya diunduh (read-only), Drive tidak diubah.
 * Jalankan: node scripts/qa/04-penyebab.mjs
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SITES } from '../../src/config/sites.js';
import { CATEGORIES } from '../../src/config/categories.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const CHECK_ROOT = '1EBanKF2gfpdDY8e7gqCW_3dcP053sZjR';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SHEET = 'application/vnd.google-apps.spreadsheet';
const DIR = 'application/vnd.google-apps.folder';

const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };
const kids = async (fid) => (await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}&fields=files(id,name,mimeType,createdTime)&pageSize=1000&supportsAllDrives=true`)).files || [];
const tabsOf = async (sid) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties`)).sheets.map((s) => s.properties.title);
const xlsxNames = (p) => JSON.parse(execFileSync('/usr/bin/python3', ['-c', `
import zipfile, re, sys, json, html
z=zipfile.ZipFile(sys.argv[1]); wb=z.read('xl/workbook.xml').decode('utf-8','replace')
print(json.dumps([html.unescape(n) for n in re.findall(r'<sheet[^>]*name="([^"]*)"', wb)]))
`, p], { encoding: 'utf8' }));

const rootKids = await kids(CHECK_ROOT);
const bcId = {}; for (const k of rootKids.filter((k) => k.mimeType === DIR)) bcId[k.name] = k.id;
const peta = JSON.parse(fs.readFileSync('/tmp/qa-live-read.json', 'utf8')).petaSite;

// file terdampak (dari analisis sebelumnya)
const terdampak = new Set();
const gagalPasangan = [];
for (const s of SITES) {
  const info = peta[s.originalFileName]; if (!info) continue;
  let T; try { T = await tabsOf(info.id); } catch { continue; }
  for (const c of CATEGORIES.filter((x) => (s.categoryIds || []).includes(x.id) && x.slotMap)) {
    const ok = T.includes(c.sheetName) || T.find((t) => t.replace(/\s+/g, '').toLowerCase() === c.sheetName.replace(/\s+/g, '').toLowerCase());
    if (!ok) { terdampak.add(s.originalFileName); gagalPasangan.push({ site: s, c }); }
  }
}
console.log(`pasangan gagal: ${gagalPasangan.length} | file terdampak: ${terdampak.size}\n`);

// unduh & baca tiap file terdampak (cache)
const cacheXlsx = {};
for (const fn of terdampak) {
  const site = SITES.find((s) => s.originalFileName === fn);
  const isi = await kids(bcId[site.buildingCategory]);
  const xf = isi.find((f) => f.name === fn && f.mimeType === XLSX);
  if (!xf) { cacheXlsx[fn] = null; continue; }
  const dest = `/tmp/x-${xf.id}.xlsx`;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${xf.id}?alt=media&supportsAllDrives=true`, { headers: H });
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
  cacheXlsx[fn] = xlsxNames(dest);
  fs.unlinkSync(dest);
}

const sebab1 = []; const sebab2 = [];
const grupSebab2 = {};
for (const g of gagalPasangan) {
  const asli = cacheXlsx[g.site.originalFileName];
  const adaDiXlsx = asli ? asli.includes(g.c.sheetName) : null;
  const rec = { file: g.site.originalFileName, site: g.site.siteName, cid: g.c.id, kat: g.c.short_name, cfg: g.c.sheetName, adaDiXlsx };
  if (adaDiXlsx === true) { sebab1.push(rec); }
  else {
    sebab2.push(rec);
    const k = `${g.c.id}|${g.c.sheetName}`;
    grupSebab2[k] = grupSebab2[k] || { cid: g.c.id, kat: g.c.short_name, cfg: g.c.sheetName, sites: [], contohTab: asli ? asli.filter((t) => t.slice(0, 10).toLowerCase() === g.c.sheetName.slice(0, 10).toLowerCase() || t.toLowerCase().includes(g.c.short_name.slice(0, 12).toLowerCase())) : [] };
    grupSebab2[k].sites.push(g.site.siteName);
  }
}

console.log('='.repeat(78));
console.log(`SEBAB 1 — nama di config COCOK dgn .xlsx asli, tapi HILANG/DIUBAH di Google Sheets`);
console.log(`          (nama tab berubah saat konversi .xlsx -> Google Sheets)`);
console.log(`          jumlah pasangan: ${sebab1.length}  |  file: ${new Set(sebab1.map((x) => x.file)).size}`);
console.log('='.repeat(78));
const g1 = {};
for (const x of sebab1) { g1[x.cid] = g1[x.cid] || { kat: x.kat, cfg: x.cfg, n: 0 }; g1[x.cid].n += 1; }
for (const [cid, v] of Object.entries(g1)) console.log(`  ${cid} · ${v.kat}\n     config: ${JSON.stringify(v.cfg)}  →  ${v.n} site`);
console.log(`  file terdampak: ${[...new Set(sebab1.map((x) => x.file))].join('\n                  ')}`);

console.log('');
console.log('='.repeat(78));
console.log(`SEBAB 2 — nama di config TIDAK ADA di .xlsx asli (salah tulis / beda dengan file)`);
console.log(`          jumlah pasangan: ${sebab2.length}  |  file: ${new Set(sebab2.map((x) => x.file)).size}`);
console.log('='.repeat(78));
for (const [k, v] of Object.entries(grupSebab2).sort((a, b) => b[1].sites.length - a[1].sites.length)) {
  console.log(`  ${v.cid} · ${v.kat}  (${v.sites.length} site)`);
  console.log(`     config minta : ${JSON.stringify(v.cfg)}`);
  console.log(`     tab yg mirip di file: ${JSON.stringify(v.contohTab)}`);
  console.log(`     contoh site  : ${v.sites.slice(0, 3).join(' | ')}`);
}

fs.writeFileSync('/tmp/qa-penyebab.json', JSON.stringify({ sebab1, sebab2, grupSebab2 }, null, 1));
console.log('\n(ditulis /tmp/qa-penyebab.json)');
