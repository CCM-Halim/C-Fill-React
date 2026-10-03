/**
 * Uji end-to-end jalur Log Gangguan: token OAuth Jo -> Sheets API (URL & range
 * PERSIS seperti yang dipakai app) -> parseGangguanRows() -> angka yang muncul
 * di kartu Temuan & Gangguan.
 *
 * Dijalankan manual: node scripts/verify-live-gangguan.mjs
 * Tujuannya membuktikan angka di Dashboard berasal dari sheet asli, bukan dari
 * fixture. Kalau angka di sini beda dari ekspektasi, berarti sheet-nya berubah
 * (dan itu memang perlu diketahui).
 */
import { readFileSync } from 'node:fs';
import { parseGangguanRows, summarizeGangguan, filterGangguan, STATUS } from '../src/lib/gangguanLog.js';

const TOKEN_FILE = '/home/dandysetiawan/.hermes/google_token.json';
// ID & range SAMA dengan yang dipakai src/lib/cfillService.js
const FILE_ID = '1UJZwW1CXeR0DUpoGWqWK4X3L6q7DfXWQbJ13kV6VHgw';
const RANGE = 'A2:R500';

const cred = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
const tokRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: cred.client_id,
    client_secret: cred.client_secret,
    refresh_token: cred.refresh_token,
    grant_type: 'refresh_token',
  }),
});
if (!tokRes.ok) throw new Error('gagal refresh token: ' + tokRes.status);
const { access_token: token } = await tokRes.json();
const H = { Authorization: 'Bearer ' + token };

const meta = await (await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${FILE_ID}?fields=sheets.properties`, { headers: H },
)).json();
const tabs = meta.sheets.map((s) => s.properties.title);
console.log('tab terbaca dari Sheets API:', tabs.join(' | '));

let items = [];
for (const tab of tabs) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${FILE_ID}/values/`
    + `${encodeURIComponent(`'${tab}'!${RANGE}`)}?valueRenderOption=FORMATTED_VALUE`;
  const res = await fetch(url, { headers: H });
  if (!res.ok) { console.log(`  ! ${tab}: HTTP ${res.status}`); continue; }
  const rows = (await res.json()).values || [];
  const parsed = parseGangguanRows(rows, { tab });
  console.log(`  ${tab.padEnd(22)} ${rows.length} baris mentah -> ${parsed.length} kejadian`);
  items = items.concat(parsed);
}

const ringkas = summarizeGangguan(items);
console.log('\nringkasan dari SHEET ASLI:');
console.log(' ', JSON.stringify({ total: ringkas.total, open: ringkas.open, closed: ringkas.closed, unknown: ringkas.unknown }));
console.log('  tanpa tanggal:', ringkas.tanpaTanggal, '| tanggal ambigu:', ringkas.ambigu);

// Bandingkan dengan fixture yang di-commit — harus sama selama sheet belum berubah.
const fixture = JSON.parse(readFileSync(new URL('../test/fixtures/gangguan.json', import.meta.url), 'utf8'));
const fixtureItems = Object.entries(fixture.tabs)
  .flatMap(([tab, rows]) => parseGangguanRows(rows, { tab }));
const fixtureRingkas = summarizeGangguan(fixtureItems);

const sama = ['total', 'open', 'closed', 'unknown'].every((k) => ringkas[k] === fixtureRingkas[k]);
console.log('\nfixture di test/:', JSON.stringify({
  total: fixtureRingkas.total, open: fixtureRingkas.open, closed: fixtureRingkas.closed,
}));
console.log(sama
  ? '✔ angka sheet asli == fixture (app akan menampilkan angka yang sama)'
  : '✖ BEDA — sheet sudah berubah, jalankan: python3 scripts/make-gangguan-fixtures.py lalu npm test');

// Contoh nyata 5 gangguan open paling lama, seperti yang tampil di kartu.
console.log('\n5 gangguan OPEN paling lama (urut seperti di Dashboard):');
const now = new Date();
const openTerlama = items
  .filter((it) => it.status === STATUS.OPEN)
  .sort((a, b) => (b.umurHari ?? -1) - (a.umurHari ?? -1))
  .slice(0, 5);
for (const it of openTerlama) {
  console.log(`  ${it.lokasi.padEnd(18)} ${it.tab.padEnd(20)} ${it.tanggalRaw.padEnd(12)} open ${it.umurHari} hari`);
}

const filterOktober = filterGangguan(items, { bulan: 10 });
console.log('\nfilter "Oktober" ->', filterOktober.length, 'kejadian, semuanya bulan:',
  [...new Set(filterOktober.map((it) => it.tanggal.month))].join(','));

const semuaKonsisten = ringkas.open + ringkas.closed + ringkas.unknown === ringkas.total;
console.log(semuaKonsisten ? '✔ jumlah open+close+unknown == total' : '✖ jumlah status tidak konsisten');
process.exit(sama && semuaKonsisten ? 0 : 1);
