/**
 * Uji END-TO-END jalur data asli, tanpa browser:
 *   token OAuth Jo -> Google Sheets API (URL & range PERSIS seperti app)
 *     -> summarizeJadwal() -> angka yang akan tampil di donut
 *
 * Dijalankan: node scripts/verify-live-data.mjs
 * (butuh /tmp/cfill_access_token.txt berisi access token Sheets; dibuat oleh
 *  probe OAuth. Ini uji manual, bukan bagian dari test suite.)
 */
import fs from 'node:fs';
import { summarizeJadwal } from '../src/lib/jadwalProgress.js';

const ACCESS = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const SID = '1H62ttfzOcVTuGMdbTdVvprWHNp7ymp4QkldjVKGQkV4'; // Jadwal Kunjungan MR Oktober 2026
const TAB = 'Jadwal Kunjungan MR';
const RANGE = 'B3:O120'; // sama dengan readRawRange(target.id, tabName, 'B3:O120')

const url = `https://sheets.googleapis.com/v4/spreadsheets/${SID}/values/`
  + encodeURIComponent(`'${TAB}'!${RANGE}`);

const res = await fetch(url, { headers: { Authorization: 'Bearer ' + ACCESS } });
if (!res.ok) {
  console.error('Gagal baca sheet:', res.status, await res.text());
  process.exit(1);
}
const rows = (await res.json()).values || [];
console.log('baris mentah terbaca dari Sheets API:', rows.length);

const jadwal = summarizeJadwal(rows);
console.log('bulan berjalan (Oktober 2026):');
console.log(`  total pekerjaan terjadwal : ${jadwal.total}`);
console.log(`  selesai / belum           : ${jadwal.finishedCount} / ${jadwal.notYetCount}`);
for (const p of ['1M', '3M', '6M', '1Y']) {
  const b = jadwal.periodBreakdown[p];
  console.log(`  ${p}: donut ${b.finished}/${b.total}  (rencana di kolom bantu sheet: ${jadwal.sheetPlanCounters[p]})`);
}
console.log(`  baris tanpa tag periode   : ${jadwal.unlabeledRows}`);
console.log('\ncontoh isi popup 1M (3 lokasi pertama):');
jadwal.periodBreakdown['1M'].notYetItems.slice(0, 3).forEach((it) =>
  console.log(`   - ${it.lokasi} · ${it.tanggal} ${it.jam} · PIC ${it.pic} · ${it.kegiatan}`));

const semuaCocok = ['1M', '3M', '6M', '1Y'].every(
  (p) => jadwal.periodBreakdown[p].total === jadwal.sheetPlanCounters[p]);
console.log(`\npenyebut donut == rencana di sheet untuk semua periode: ${semuaCocok ? 'YA' : 'TIDAK'}`);
console.log(`donut tidak lagi 0/0: ${['1M', '3M', '6M', '1Y'].some((p) => jadwal.periodBreakdown[p].total > 0) ? 'YA' : 'TIDAK'}`);
process.exit(semuaCocok ? 0 : 1);
