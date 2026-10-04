/**
 * QA 8 — INSTRUMEN, APAR/LIGHTNING, JADWAL KUNJUNGAN (read-only).
 * Jalankan: node scripts/qa/08-instrumen.mjs
 */
import fs from 'node:fs';
import { INSTRUMENTS } from '../../src/config/instruments.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(`${j.error.code} ${j.error.message}`); return j; };
const kids = async (fid) => { const j = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}&fields=files(id,name,mimeType,createdTime)&pageSize=1000&supportsAllDrives=true`); return j.files || []; };
const tabsOf = async (sid) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties`)).sheets.map((s) => s.properties.title);

const ID = {
  checksheet: '1EBanKF2gfpdDY8e7gqCW_3dcP053sZjR',
  dokumentasi: '1XNDon9QhdZmQtY7m1dZP95t77JEUXYHX',
  tahun: '1bgFxvG7gP3-r11MSL0mfjyTShXP9iSBT',
  instrumen: '1lezBJPao4Q_myGn38jRiEG1AHH1rpgCI',
};

console.log('=== INSTRUMEN ===');
const ik = await kids(ID.instrumen);
const namaFile = ik.map((k) => k.name);
console.log(`  entri folder       : ${ik.length}`);
console.log(`  .xlsx              : ${ik.filter((k) => k.mimeType.includes('spreadsheetml')).length}`);
console.log(`  Google Sheets      : ${ik.filter((k) => k.mimeType === 'application/vnd.google-apps.spreadsheet').length}`);
console.log(`  folder/subfolder   : ${ik.filter((k) => k.mimeType.includes('folder')).length}`);
if (ik.some((k) => k.mimeType.includes('folder'))) {
  console.log(`  nama subfolder     : ${JSON.stringify(ik.filter((k) => k.mimeType.includes('folder')).map((k) => k.name))}`);
}

const baseNama = namaFile.map((n) => n.replace(/\.xlsx$/i, ''));
const tanpaFile = INSTRUMENTS.filter((n) => !baseNama.includes(n));
console.log(`\n  instrument di config : ${INSTRUMENTS.length}`);
console.log(`  punya file           : ${INSTRUMENTS.length - tanpaFile.length}`);
if (tanpaFile.length) console.log(`  TANPA FILE (${tanpaFile.length}):\n     ${tanpaFile.join('\n     ')}`);
const asing = baseNama.filter((n) => !INSTRUMENTS.includes(n));
if (asing.length) console.log(`  file yang TIDAK ada di config (${asing.length}):\n     ${asing.join('\n     ')}`);

// Cek tab yang dipakai submitInstrumentChecksheet
const sheetInstr = ik.filter((k) => k.mimeType === 'application/vnd.google-apps.spreadsheet');
if (sheetInstr.length) {
  const T = await tabsOf(sheetInstr[0].id);
  console.log(`\n  contoh "${sheetInstr[0].name}" → tab: ${JSON.stringify(T)}`);
  console.log(`  config submitInstrumentChecksheet minta tab "Instrumen Telekomunikasi" → ada? ${T.includes('Instrumen Telekomunikasi')}`);
} else {
  console.log(`\n  -> belum ada Google Sheets; app akan KONVERSI saat submit pertama.`);
  console.log(`     Tab yang diharapkan setelah konversi: "Instrumen Telekomunikasi"`);
  console.log(`     Ini TIDAK bisa diuji tanpa membuat file baru di Drive - dilewati.`);
}

console.log('\n=== FOLDER "12. Draft APAR dan Lightning Protect" ===');
const rootKids = await kids(ID.checksheet);
const apar = rootKids.find((k) => /APAR dan Lightning/i.test(k.name));
if (apar) {
  const ak = await kids(apar.id);
  console.log(`  ${ak.length} entri:`);
  for (const k of ak) {
    const jenis = k.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'SHEET' : k.mimeType.includes('folder') ? 'DIR  ' : 'XLSX ';
    console.log(`     [${jenis}] ${JSON.stringify(k.name)}`);
  }
  for (const k of ak.filter((x) => x.mimeType === 'application/vnd.google-apps.spreadsheet')) {
    const T = await tabsOf(k.id);
    console.log(`     "${k.name}" → tab: ${JSON.stringify(T)}`);
  }
} else {
  console.log('  folder tidak ketemu');
}

console.log('\n=== JADWAL KUNJUNGAN (folder tahun) ===');
const tk = await kids(ID.tahun);
console.log(`  subfolder: ${JSON.stringify(tk.map((k) => k.name))}`);
for (const k of tk.filter((x) => x.mimeType.includes('folder'))) {
  const isi = await kids(k.id);
  console.log(`\n  "${k.name}": ${isi.length} entri`);
  for (const f of isi) {
    const jenis = f.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'SHEET' : f.mimeType.includes('folder') ? 'DIR  ' : 'XLSX ';
    console.log(`     [${jenis}] ${JSON.stringify(f.name)}`);
  }
  const sh = isi.find((f) => f.mimeType === 'application/vnd.google-apps.spreadsheet');
  if (sh) {
    const T = await tabsOf(sh.id);
    console.log(`     → tab: ${JSON.stringify(T)}`);
  }
}

console.log('\n=== DOKUMENTASI KEGIATAN ===');
const dk = await kids(ID.dokumentasi);
for (const k of dk) {
  const jenis = k.mimeType.includes('folder') ? 'DIR ' : 'FILE';
  const n = k.mimeType.includes('folder') ? ` (${(await kids(k.id)).length} isi)` : '';
  console.log(`  [${jenis}] ${JSON.stringify(k.name)}${n}`);
}
