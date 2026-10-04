/**
 * QA 15 — PEMBUKTIAN PERBAIKAN INSTRUMEN (nama file memuat "/").
 *
 * Membaca isi folder Instrumen di Drive (read-only), lalu memakai logika yang
 * BENAR-BENAR dipakai aplikasi (nameVariants dari lib/tabNames.js) untuk
 * memastikan setiap nama di config INSTRUMENTS menemukan file-nya.
 *
 * Jalankan: node scripts/qa/15-instrumen-pasca-fix.mjs
 */
import fs from 'node:fs';
import { INSTRUMENTS, INSTRUMENT_ALIASES, resolveInstrumentName } from '../../src/config/instruments.js';
import { nameVariants, sanitizeDriveName } from '../../src/lib/tabNames.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const api = async (u) => {
  const r = await fetch(u, { headers: H });
  const j = await r.json();
  if (j.error) throw new Error(`${j.error.code} ${j.error.message}`);
  return j;
};

const INSTR = '1lezBJPao4Q_myGn38jRiEG1AHH1rpgCI';

const kids = async (fid) => (await api(
  `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}` +
  `&fields=files(id,name,mimeType)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`
)).files || [];

console.log('=== QA 15: INSTRUMEN SETELAH PERBAIKAN ===\n');
const isi = await kids(INSTR);
const namaDrive = new Set(isi.map((f) => f.name));

console.log(`nama di config INSTRUMENTS : ${INSTRUMENTS.length}`);
console.log(`file di folder Instrumen   : ${isi.length}\n`);

// ---------------------------------------------------------------------------
// 1. Apakah SETIAP nama di config menemukan file-nya (pakai nameVariants)?
// ---------------------------------------------------------------------------
const gagal = [];
for (const nama of INSTRUMENTS) {
  const varian = nameVariants(nama + '.xlsx');
  const ketemu = varian.find((v) => namaDrive.has(v));
  if (!ketemu) gagal.push({ nama, varian });
}

console.log(`1) pencocokan nama config -> file Drive`);
console.log(`   ketemu : ${INSTRUMENTS.length - gagal.length}/${INSTRUMENTS.length}`);
console.log(`   gagal  : ${gagal.length}`);
for (const g of gagal) console.log(`     ! "${g.nama}" — varian dicoba: ${g.varian.join(' | ')}`);

// ---------------------------------------------------------------------------
// 2. Alias: penulisan asli (pakai "/") tetap harus jalan
// ---------------------------------------------------------------------------
console.log(`\n2) alias penulisan asli (pakai "/")`);
for (const [alias, kanonik] of Object.entries(INSTRUMENT_ALIASES)) {
  const hasil = resolveInstrumentName(alias);
  const varian = nameVariants(hasil + '.xlsx');
  const ketemu = varian.find((v) => namaDrive.has(v));
  const ok = hasil === kanonik && !!ketemu;
  console.log(`   ${ok ? '✔' : '✘'} "${alias}"`);
  console.log(`        -> "${hasil}"  file: ${ketemu ? `"${ketemu}"` : 'TIDAK KETEMU'}`);
}

// ---------------------------------------------------------------------------
// 3. Nama yang mengandung "/" tidak boleh tersisa di config
// ---------------------------------------------------------------------------
const sisa = INSTRUMENTS.filter((n) => n.includes('/'));
console.log(`\n3) nama config yang masih memuat "/" : ${sisa.length}`);
for (const s of sisa) console.log(`     ! "${s}" (di Drive pasti tersimpan sebagai "${sanitizeDriveName(s)}")`);

// ---------------------------------------------------------------------------
// 4. resolveInstrumentName: beda huruf besar/kecil & spasi tetap ketemu
// ---------------------------------------------------------------------------
console.log(`\n4) resolveInstrumentName tahan beda penulisan`);
const uji = [
  ['power meter / dynamometer', 'Power Meter _ Dynamometer'],
  ['  Power  Meter   _  Dynamometer  ', 'Power Meter _ Dynamometer'],
  ['OTDR', 'OTDR'],
  ['otdr', 'OTDR']
];
let salah = 0;
for (const [masuk, harap] of uji) {
  const hasil = resolveInstrumentName(masuk);
  const ok = hasil === harap;
  if (!ok) salah += 1;
  console.log(`   ${ok ? '✔' : '✘'} ${JSON.stringify(masuk)} -> ${JSON.stringify(hasil)}`);
}

console.log('\n=== RINGKASAN ===');
console.log(`   instrumen tanpa file : ${gagal.length}`);
console.log(`   nama masih pakai "/" : ${sisa.length}`);
console.log(`   uji penulisan salah  : ${salah}`);

fs.writeFileSync('/tmp/qa15-instrumen-pasca-fix.json', JSON.stringify({ gagal, sisa, salah }, null, 1));
console.log('   hasil lengkap        : /tmp/qa15-instrumen-pasca-fix.json');
