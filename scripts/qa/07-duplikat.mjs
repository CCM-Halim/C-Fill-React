/**
 * QA 7 — APAKAH SALINAN GANDA BERISI DATA BERBEDA? (read-only)
 *
 * App SELALU memakai salinan Google Sheets yang PALING LAMA dibuat
 * (driveApi.findAllSheetsForName, diurutkan createdAt naik, lalu diambil [0]).
 * Kalau teknisi pernah mengisi ke salinan LAIN, isian itu tidak akan pernah
 * terbaca app -> DATA HILANG dari sudut pandang aplikasi.
 *
 * Skrip ini membandingkan isi tiap salinan: berapa sel terisi di tab-tab
 * kategori, untuk melihat apakah datanya terpecah antar salinan.
 *
 * Jalankan: node scripts/qa/07-duplikat.mjs
 */
import fs from 'node:fs';
import { SITES } from '../../src/config/sites.js';
import { CATEGORIES } from '../../src/config/categories.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const SHEET = 'application/vnd.google-apps.spreadsheet';
const DIR = 'application/vnd.google-apps.folder';
const CHECK_ROOT = '1EBanKF2gfpdDY8e7gqCW_3dcP053sZjR';

const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };
const kids = async (fid) => (await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}&fields=files(id,name,mimeType,createdTime,modifiedTime)&pageSize=1000&supportsAllDrives=true`)).files || [];
const tabsOf = async (sid) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties`)).sheets.map((s) => s.properties.title);

// Hitung sel tidak-kosong di seluruh tab (sampling rentang lebar) = "berapa banyak data".
async function hitungIsi(sid, tabList) {
  let totalSel = 0; let selTerisi = 0; const perTab = {};
  for (const t of tabList) {
    if (t === 'Cover') continue;
    try {
      const j = await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(`'${t}'!A1:Z120`)}?valueRenderOption=FORMATTED_VALUE`);
      const vals = j.values || [];
      let terisi = 0;
      for (const row of vals) for (const c of row) if (c !== '' && c !== null && c !== undefined) terisi += 1;
      const sel = vals.reduce((n, r) => n + r.length, 0);
      perTab[t] = terisi;
      selTerisi += terisi; totalSel += sel;
    } catch { perTab[t] = -1; }
  }
  return { selTerisi, totalSel, perTab };
}

const rootKids = await kids(CHECK_ROOT);
const bcId = {};
for (const k of rootKids.filter((k) => k.mimeType === DIR)) bcId[k.name] = k.id;

// Ambil daftar file ganda dari hasil sebelumnya
const cek = JSON.parse(fs.readFileSync('/tmp/qa-cek-file.json', 'utf8')).hasil;
const ganda = cek.filter((h) => h.jmlSheet > 1);

console.log(`site dengan salinan ganda: ${ganda.length}\n`);

const laporan = [];
for (const g of ganda) {
  const fid = bcId[g.bc];
  const files = await kids(fid);
  const base = g.file.replace(/\.xlsx$/i, '');
  const copies = files.filter((f) => f.mimeType === SHEET && (f.name === g.file || f.name === base))
    .sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));

  console.log('='.repeat(76));
  console.log(`${g.site}`);
  console.log(`  ${copies.length} salinan (app memakai yg PALING LAMA = urutan 1)`);

  const info = [];
  for (let i = 0; i < copies.length; i++) {
    const c = copies[i];
    let T;
    try { T = await tabsOf(c.id); } catch (e) { console.log(`  #${i + 1} gagal baca: ${e.message}`); continue; }
    const isi = await hitungIsi(c.id, T);
    info.push({ urutan: i + 1, dibuat: c.createdTime, diubah: c.modifiedTime, tab: T.length, terisi: isi.selTerisi, perTab: isi.perTab });
    console.log(`  #${i + 1} dibuat ${c.createdTime.slice(0, 16).replace('T', ' ')} | diubah ${c.modifiedTime.slice(0, 16).replace('T', ' ')} | tab ${T.length} | sel terisi ${isi.selTerisi}`);
  }

  // Cari tab yang isinya hanya ada di salinan NON-pertama (= data tersembunyi)
  const dipakai = info[0];
  const tersembunyi = [];
  for (const c of info.slice(1)) {
    for (const [t, n] of Object.entries(c.perTab || {})) {
      const nUtama = (dipakai.perTab || {})[t];
      if (n > 0 && (nUtama === undefined || nUtama < n)) tersembunyi.push(`#${c.urutan} tab "${t}": ${n} sel (vs #1: ${nUtama ?? 0})`);
    }
  }
  if (tersembunyi.length) {
    console.log(`  ⚠ DATA HANYA ADA DI SALINAN LAIN (tidak akan terbaca app):`);
    tersembunyi.slice(0, 8).forEach((x) => console.log(`      ${x}`));
  } else {
    console.log(`  ✔ tidak ada tab yang lebih terisi di salinan lain`);
  }
  laporan.push({ site: g.site, copies: info, tersembunyi });
  console.log('');
}

console.log('=== RINGKASAN ===');
const berisiko = laporan.filter((l) => l.tersembunyi.length > 0);
console.log(`site dengan salinan ganda          : ${laporan.length}`);
console.log(`site yang datanya berpotensi hilang: ${berisiko.length}`);
for (const b of berisiko) console.log(`   - ${b.site}`);
fs.writeFileSync('/tmp/qa-duplikat.json', JSON.stringify(laporan, null, 1));
