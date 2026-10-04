/**
 * QA 13 — JADWAL KUNJUNGAN (semua bulan) + kebersihan folder (read-only).
 * Jalankan: npx vite-node scripts/qa/13-jadwal.mjs
 */
import fs from 'node:fs';
import { summarizeJadwal } from '../../src/lib/jadwalProgress.js';
import { matchTabNameFromCandidates } from '../../src/lib/tabNames.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const TAHUN = '1bgFxvG7gP3-r11MSL0mfjyTShXP9iSBT';      // folder "2026"
const DOKUMENTASI = '1XNDon9QhdZmQtY7m1dZP95t77JEUXYHX';
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };
const kids = async (fid) => (await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}&fields=files(id,name,mimeType)&pageSize=1000&supportsAllDrives=true`)).files || [];
const tabsOf = async (sid) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties`)).sheets.map((s) => s.properties.title);
const baca = async (sid, tab, r) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(`'${tab}'!${r}`)}`)).values || [];

// Logika pencocokan tab YANG SEBENARNYA dipakai aplikasi (lib/tabNames.js) -
// bukan tulis ulang, supaya hasil QA tidak pernah beda dari perilaku app.
// Kandidat nama: sebagian bulan tab-nya bernama "jadwal kunjungan MR New".
const KANDIDAT_TAB = ['Jadwal Kunjungan MR', 'Jadwal Kunjungan MR New', 'jadwal kunjungan MR New'];
const resolve = (titles, exp) => {
  const { tab, dari } = matchTabNameFromCandidates(titles, KANDIDAT_TAB);
  if (!tab) return { tab: exp, cara: 'GAGAL' };
  return { tab, cara: dari === KANDIDAT_TAB[0] ? (tab === KANDIDAT_TAB[0] ? 'persis' : 'varian') : 'alias' };
};

console.log('=== JADWAL KUNJUNGAN: semua bulan ===');
const bulanKids = await kids(TAHUN);
const urut = bulanKids.filter((k) => k.mimeType.includes('folder'))
  .sort((a, b) => BULAN.findIndex((m) => a.name.includes(m)) - BULAN.findIndex((m) => b.name.includes(m)));

for (const f of urut) {
  const isi = await kids(f.id);
  // app: cari file yang namanya mengandung tahun; kalau tidak ada & cuma 1 file, pakai itu
  let target = isi.find((x) => x.name.includes('2026') && x.mimeType === 'application/vnd.google-apps.spreadsheet');
  if (!target) target = isi.find((x) => x.mimeType === 'application/vnd.google-apps.spreadsheet');
  if (!target) { console.log(`  ${f.name}: TIDAK ada file spreadsheet (isi: ${isi.map((x) => x.name).join(', ')})`); continue; }
  const T = await tabsOf(target.id);
  const r = resolve(T, 'Jadwal Kunjungan MR');
  let info = '';
  if (r.cara !== 'GAGAL') {
    const rows = await baca(target.id, r.tab, 'B3:O120');
    const j = summarizeJadwal(rows);
    const rusak = j.selRencanaRusak || [];
    info = `→ ${rows.length} baris | total ${j.total} | selesai ${j.finishedCount} | belum ${j.notYetCount}` +
      (rusak.length ? ` | ⚠ ${rusak.length} sel rencana rusak (${[...new Set(rusak.map((x) => x.nilai))].join(', ')})` : '');
  }
  console.log(`  ${f.name}`);
  console.log(`     file : ${target.name}`);
  console.log(`     tab  : "${r.tab}" (${r.cara})`);
  console.log(`     ${info || '⚠ tab jadwal TIDAK KETEMU — Dashboard akan gagal'}`);
  if (r.cara === 'GAGAL') console.log(`     tab tersedia: ${JSON.stringify(T)}`);
}

console.log('\n=== FOLDER DOKUMENTASI KEGIATAN: kebersihan ===');
const dok = await kids(DOKUMENTASI);
const normBul = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const bulanFolders = dok.filter((k) => k.mimeType.includes('folder'));
const ganda = bulanFolders.filter((a, i) => bulanFolders.findIndex((b) => normBul(b.name) === normBul(a.name)) !== i);
console.log(`  ${bulanFolders.length} subfolder bulan`);
if (ganda.length) console.log(`  ⚠ FOLDER BULAN GANDA: ${JSON.stringify(ganda.map((g) => g.name))}`);
const bukanBulan = bulanFolders.filter((k) => !/^\d{2}\.\s/.test(k.name));
console.log(`  folder yang tidak ikut pola "NN. Bulan": ${JSON.stringify(bukanBulan.map((b) => b.name))}`);

console.log('\n=== DOKUMEN SALAH BULAN (heuristik nama file vs folder) ===');
const BLN = [['jan', '01'], ['feb', '02'], ['mar', '03'], ['apr', '04'], ['mei', '05'], ['may', '05'], ['jun', '06'],
  ['jul', '07'], ['agu', '08'], ['aug', '08'], ['sep', '09'], ['okt', '10'], ['oct', '10'], ['nov', '11'], ['des', '12'], ['dec', '12']];
let salah = 0;
for (const bf of bulanFolders) {
  const no = bf.name.trim().slice(0, 2);
  const isi = await kids(bf.id).catch(() => []);
  for (const f of isi) {
    const n = f.name.toLowerCase();
    const ketemu = BLN.find(([p]) => new RegExp(`${p}[a-z]*\\s*20\\d\\d|${p}-20\\d\\d|20\\d\\d-${p}`).test(n) || new RegExp(`${p}[-_ ]`).test(n));
    if (ketemu && ketemu[1] !== no) {
      salah += 1;
      if (salah <= 12) console.log(`  folder ${no} "${bf.name}" ← file "${f.name}" (menyebut bulan ${ketemu[1]})`);
    }
  }
}
console.log(`  total file yang bulannya tidak cocok dengan foldernya: ${salah}`);

console.log('\n=== FOLDER _temp / SISA PROSES KONVERSI ===');
const rootFlat = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name contains '_temp' and trashed=false`)}&fields=files(id,name,mimeType,createdTime)&pageSize=50`);
if (rootFlat.files?.length) {
  for (const f of rootFlat.files) console.log(`  ${f.name}  (${f.mimeType.includes('folder') ? 'DIR' : 'FILE'}, dibuat ${f.createdTime.slice(0, 10)})`);
} else {
  console.log('  tidak ada sisa folder _temp');
}
