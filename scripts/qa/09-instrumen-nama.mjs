/**
 * QA 9 — INSTRUMEN yang namanya mengandung "/" dan RESOLUSI TAB JADWAL.
 *
 * Dua dugaan yang diuji:
 *  (a) Drive TIDAK mengizinkan "/" di nama file, jadi .xlsx yang diunggah
 *      Jo namanya berubah ("Power Meter / Dynamometer" -> "Power Meter _ Dynamometer").
 *      App mencari nama PERSIS dari config + ".xlsx" -> tidak ketemu -> error.
 *  (b) Tab jadwal Januari/Februari bernama "jadwal kunjungan MR New",
 *      Maret-Oktober "Jadwal Kunjungan MR" -> app harus tahan beda nama itu.
 *
 * Jalankan: node scripts/qa/09-instrumen-nama.mjs
 */
import fs from 'node:fs';
import { INSTRUMENTS } from '../../src/config/instruments.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(`${j.error.code} ${j.error.message}`); return j; };
const kids = async (fid) => (await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}&fields=files(id,name,mimeType)&pageSize=1000&supportsAllDrives=true`)).files || [];

const INSTR = '1lezBJPao4Q_myGn38jRiEG1AHH1rpgCI';

console.log('=== INSTRUMEN: pencocokan nama config vs nama file di Drive ===');
const ik = await kids(INSTR);
const fileSheets = ik.filter((k) => k.mimeType === 'application/vnd.google-apps.spreadsheet').map((k) => k.name);
const fileXlsx = ik.filter((k) => k.mimeType.includes('spreadsheetml')).map((k) => k.name);
const semuaNama = [...fileSheets, ...fileXlsx];

console.log(`  config INSTRUMENTS : ${INSTRUMENTS.length}`);
console.log(`  file Sheets di Drive: ${fileSheets.length}`);
console.log(`  file .xlsx di Drive : ${fileXlsx.length}`);
console.log('');

let tanpaKeduanya = []; let hanyaXlsx = []; let dgnGarisMiring = [];
for (const n of INSTRUMENTS) {
  const punyaSheet = fileSheets.includes(n);
  const punyaXlsx = fileXlsx.includes(n + '.xlsx');
  if (!punyaSheet && !punyaXlsx) {
    tanpaKeduanya.push({ nama: n, kandidat: semuaNama.filter((f) => {
      const a = n.replace(/[\/]/g, '_').toLowerCase();
      return f.toLowerCase().replace(/\.xlsx$/, '').replace(/[\/]/g, '_') === a;
    }) });
    if (n.includes('/')) dgnGarisMiring.push(n);
  }
  if (punyaXlsx && !punyaSheet) hanyaXlsx.push(n);
}

console.log(`instrumen yang TIDAK ketemu file sama sekali : ${tanpaKeduanya.length}`);
for (const t of tanpaKeduanya) {
  console.log(`\n  ✖ ${JSON.stringify(t.nama)}`);
  console.log(`     mengandung "/" : ${t.nama.includes('/')}`);
  console.log(`     kandidat di Drive (setelah "/" -> "_"): ${JSON.stringify(t.kandidat)}`);
}
console.log(`\ninstrumen yang namanya mengandung "/" : ${INSTRUMENTS.filter((n) => n.includes('/')).length}`);
for (const n of INSTRUMENTS.filter((x) => x.includes('/'))) {
  const alt = n.replace(/\//g, '_');
  const ada = semuaNama.some((f) => f.replace(/\.xlsx$/, '') === alt);
  console.log(`   ${JSON.stringify(n)}`);
  console.log(`      -> Drive menyimpannya sebagai ${JSON.stringify(alt)} : ${ada ? 'ADA' : 'tidak ada'}`);
}
console.log(`\ninstrumen yang sudah jadi Sheets tapi belum dikonversi (masih .xlsx): ${hanyaXlsx.length}`);

console.log('\n=== SEMUA FILE DI FOLDER INSTRUMEN ===');
ik.forEach((k) => console.log(`   [${k.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'SHEET' : k.mimeType.includes('folder') ? 'DIR  ' : 'XLSX '}] ${JSON.stringify(k.name)}`));
