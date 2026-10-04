/**
 * QA 5 — BUKTI MODE KEGAGALAN + identifikasi folder sebenarnya.
 * TIDAK MENULIS APA PUN (hanya GET).
 */
import fs from 'node:fs';
import { SITES } from '../../src/config/sites.js';
import { CATEGORIES } from '../../src/config/categories.js';
import { INSTRUMENTS } from '../../src/config/instruments.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); return { status: r.status, j }; };
const kids = async (fid) => (await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}&fields=files(id,name,mimeType)&pageSize=1000&supportsAllDrives=true`)).j.files || [];
const info = async (id) => (await api(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType`)).j;
const tabsOf = async (sid) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties`)).j.sheets.map((s) => s.properties.title);

const IDS = ['1EBanKF2gfpdDY8e7gqCW_3dcP053sZjR', '1NyWaotVYAG4FATAOIHWKNtSqe746GOE8', '1RB2GWStEeruSDWN3xYFdQvqf2s_xf07K',
  '1VlGnRNWYZ9Xp8iDxpk2-xd0oEf_uFw-3', '1XNDon9QhdZmQtY7m1dZP95t77JEUXYHX', '1bgFxvG7gP3-r11MSL0mfjyTShXP9iSBT',
  '1j3JnzDKARyMMXxNBQAV-o462vvqRQSrE', '1lezBJPao4Q_myGn38jRiEG1AHH1rpgCI'];

console.log('=== NAMA SEBENARNYA SETIAP ID FOLDER ===');
const nama = {};
for (const id of IDS) {
  const i = await info(id);
  const n = (await kids(id)).length;
  nama[id] = i.name;
  console.log(`  ${i.name.padEnd(42)} (${n} entri)  ${id.slice(0, 12)}…`);
}
const findId = (kata) => Object.entries(nama).find(([, n]) => new RegExp(kata, 'i').test(n))?.[0];

console.log('\n=== BUKTI: APA YANG TERJADI KALAU TAB TIDAK ADA (read-only) ===');
const site = SITES.find((s) => s.siteName === 'K41+ 683 Base Station Karawang (204)');
// File site ada di SUBFOLDER buildingCategory, bukan di root "Checksheet".
const bcKids = await kids(findId('^Checksheet$'));
console.log(`  buildingCategory di config : ${JSON.stringify(site.buildingCategory)}`);
console.log(`  subfolder yang ada         : ${JSON.stringify(bcKids.filter((k) => k.mimeType.includes('folder')).map((k) => k.name))}`);
const bcFolder = bcKids.find((f) => f.name === site.buildingCategory)
  || bcKids.find((f) => f.name.trim() === site.buildingCategory.trim());
if (!bcFolder) throw new Error('folder buildingCategory tidak ketemu');
const isi = await kids(bcFolder.id);
console.log('  isi folder (nama + mimeType):');
for (const k of isi) console.log(`     ${k.mimeType.padEnd(58)} ${JSON.stringify(k.name)}`);
const sheetFile = isi.find((f) => f.name === site.originalFileName
  && f.mimeType === 'application/vnd.google-apps.spreadsheet');
console.log(`  file Sheets utk site ini ketemu? ${!!sheetFile}`);
if (!sheetFile) {
  const kandidat = isi.filter((f) => f.name.replace(/\.xlsx$/i, '') === site.originalFileName.replace(/\.xlsx$/i, ''));
  console.log(`  kandidat nama sama: ${JSON.stringify(kandidat.map((k) => [k.name, k.mimeType]))}`);
  process.exit(1);
}
const T = await tabsOf(sheetFile.id);
const cat44 = CATEGORIES.find((c) => c.id === 'cat44');
console.log(`  site : ${site.siteName}`);
console.log(`  tab  : ${T.length} buah`);
console.log(`  config minta tab : ${JSON.stringify(cat44.sheetName)}`);
console.log(`  ada di file?     : ${T.includes(cat44.sheetName)}`);

// Persis seperti app: resolveTabName mengembalikan nama config kalau tak ketemu,
// lalu Sheets API dipanggil dengan range itu.
const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetFile.id}/values/${encodeURIComponent(`'${cat44.sheetName}'!A1:D1`)}`;
const r = await api(url);
console.log(`\n  Panggilan yang akan dilakukan app (GET range tab tak ada):`);
console.log(`    status : ${r.status}`);
console.log(`    pesan  : ${r.j.error?.message || '(sukses!)'}`);
console.log(`    => teknisi akan melihat error "Gagal menyimpan: ..." dan isian formnya HILANG.`);

console.log('\n=== INSTRUMEN ===');
const instrId = findId('^Instrumen$') || findId('instrumen');
if (instrId) {
  const ik = await kids(instrId);
  const namaFile = ik.map((k) => k.name);
  const tanpaFile = INSTRUMENTS.filter((n) => !namaFile.some((f) => f === n + '.xlsx' || f === n));
  console.log(`  folder "${nama[namaFile[0]] || nama[instrId]}": ${ik.length} entri`);
  console.log(`  instrumen config ada file-nya: ${INSTRUMENTS.length - tanpaFile.length}/${INSTRUMENTS.length}`);
  if (tanpaFile.length) console.log(`  TANPA FILE: ${tanpaFile.join(' | ')}`);
  const bedaNama = namaFile.map((f) => f.replace(/\.xlsx$/, '')).filter((n) => !INSTRUMENTS.includes(n));
  if (bedaNama.length) console.log(`  file yang namanya BEDA dari config: ${JSON.stringify(bedaNama)}`);
  const sheets = ik.filter((k) => k.mimeType === 'application/vnd.google-apps.spreadsheet');
  console.log(`  sudah jadi Google Sheets: ${sheets.length}`);
  if (sheets.length) {
    const T2 = await tabsOf(sheets[0].id);
    console.log(`  contoh "${sheets[0].name}" → tab: ${JSON.stringify(T2)}`);
    console.log(`  config minta tab: "Instrumen Telekomunikasi" → ada? ${T2.includes('Instrumen Telekomunikasi')}`);
  } else {
    console.log(`  -> belum ada yang dikonversi; app akan mengonversi saat submit pertama.`);
    console.log(`     tab yang diharapkan: "Instrumen Telekomunikasi"`);
  }
}

console.log('\n=== JADWAL KUNJUNGAN (folder tahun) ===');
const tahunId = findId('^2026$') || findId('2026');
if (tahunId) {
  const tk = await kids(tahunId);
  console.log(`  folder "${nama[tahunId]}": ${tk.map((k) => k.name).join(' | ')}`);
  const okt = tk.find((k) => /oktober/i.test(k.name));
  if (okt) {
    const ok = await kids(okt.id);
    console.log(`  isi "${okt.name}":`);
    for (const k of ok) {
      const jenis = k.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'SHEET' : k.mimeType.includes('folder') ? 'DIR' : 'FILE';
      console.log(`     [${jenis}] ${k.name}`);
    }
  }
} else {
  console.log('  folder tahun tidak ketemu dari daftar ID yang ada.');
}

console.log('\n=== DOKUMENTASI & JALUR ===');
for (const kata of ['Dokumentasi', 'Foto Masuk', 'Foto Keluar', 'Rekaman Suara Masuk', 'Rekaman Suara Keluar']) {
  const id = findId(kata);
  if (!id) { console.log(`  ${kata}: tidak ketemu`); continue; }
  const k = await kids(id);
  const sub = k.filter((x) => x.mimeType.includes('folder')).map((x) => x.name);
  console.log(`  ${nama[id]}: ${k.length} entri | subfolder: ${JSON.stringify(sub.slice(0, 14))}`);
  // duplikat nama subfolder (mis. "9. September" vs "9  September")
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const dup = sub.filter((n, i) => sub.findIndex((m) => norm(m) === norm(n)) !== i);
  if (dup.length) console.log(`     ⚠ SUBFOLDER GANDA (nama sama setelah normalisasi): ${JSON.stringify(dup)}`);
}
