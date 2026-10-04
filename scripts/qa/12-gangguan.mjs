/**
 * QA 12 — LOG GANGGUAN mendetail + PWA + dokumen salah tempat (read-only).
 * Jalankan: node scripts/qa/12-gangguan.mjs
 */
import fs from 'node:fs';
import { parseGangguanRows, summarizeGangguan, findHeaderRow } from '../../src/lib/gangguanLog.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const LOG_ID = '1UJZwW1CXeR0DUpoGWqWK4X3L6q7DfXWQbJ13kV6VHgw';
const RANGE = 'A2:R500'; // sama persis dengan LOG_GANGGUAN_RANGE di app

const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };

console.log('=== LOG BOOK GANGGUAN — isi tiap tab (range app A2:R500) ===');
const tabs = (await api(`https://sheets.googleapis.com/v4/spreadsheets/${LOG_ID}?fields=sheets.properties`)).sheets.map((s) => s.properties.title);
let semua = [];
for (const t of tabs) {
  const rows = (await api(`https://sheets.googleapis.com/v4/spreadsheets/${LOG_ID}/values/${encodeURIComponent(`'${t}'!${RANGE}`)}`)).values || [];
  const items = parseGangguanRows(rows, { tab: t });
  const s = summarizeGangguan(items);
  semua = semua.concat(items);
  console.log(`  ${t}`);
  console.log(`     baris mentah: ${rows.length} | kejadian terbaca: ${items.length} | open ${s.open ?? '-'} | close ${s.closed ?? '-'} | tanpa tanggal ${s.tanpaTanggal ?? '-'}`);
  if (rows.length > 0 && items.length === 0) {
    console.log(`     ⚠ ADA ${rows.length} BARIS TAPI 0 KEJADIAN TERBACA — cek header:`);
    console.log(`        baris header terdeteksi di indeks: ${findHeaderRow(rows)}`);
    console.log(`        3 baris pertama: ${JSON.stringify(rows.slice(0, 3)).slice(0, 400)}`);
  }
}
const total = summarizeGangguan(semua);
console.log(`\n  TOTAL: ${semua.length} kejadian | open ${total.open} | close ${total.closed}`);

console.log('\n=== FILTER (yang dipakai UI: Semua/Open/Close + tahun + bulan + tab + cari) ===');
const { filterGangguan, buildFilterOptions } = await import('../../src/lib/gangguanLog.js');
const opsi = buildFilterOptions(semua);
console.log(`  pilihan tahun : ${JSON.stringify(opsi.tahun)}`);
console.log(`  pilihan bulan : ${opsi.bulan.length} bulan`);
console.log(`  pilihan tab   : ${JSON.stringify(opsi.tab)}`);
const kasus = [
  ['semua', {}],
  ['open saja', { status: 'open' }],
  ['close saja', { status: 'closed' }],
  ['tanpa tanggal', { hanyaTanpaTanggal: true }],
  ['cari "K45"', { cari: 'K45' }],
  ['cari "cctv"', { cari: 'cctv' }],
  ['tab Gangguan AC', { tab: 'Gangguan AC' }],
];
for (const [label, f] of kasus) {
  const h = filterGangguan(semua, f);
  console.log(`  ${label.padEnd(18)} -> ${h.length} kejadian`);
}
// konsistensi: open+close+unknown harus = total
const o = filterGangguan(semua, { status: 'open' }).length;
const c = filterGangguan(semua, { status: 'closed' }).length;
const u = filterGangguan(semua, { status: 'unknown' }).length;
console.log(`\n  konsistensi: open(${o}) + close(${c}) + unknown(${u}) = ${o + c + u} vs total ${semua.length} -> ${o + c + u === semua.length ? 'COCOK' : 'TIDAK COCOK'}`);

console.log('\n=== KUALITAS DATA (temuan data, bukan bug app) ===');
const { isTanggalAmbigu, parseTanggal } = await import('../../src/lib/gangguanLog.js');
let ambigu = 0;
for (const it of semua) if (it.tanggalAmbigu) ambigu += 1;
console.log(`  baris bertanda ⚠ tanggal/waktu tertukar: ${ambigu}`);
const tahunAneh = semua.filter((x) => x.tahun && (x.tahun > new Date().getFullYear() || x.tahun < 2024));
console.log(`  baris dengan tahun janggal             : ${tahunAneh.length} ${tahunAneh.slice(0, 3).map((x) => x.tahun).join(', ')}`);
const openLama = semua.filter((x) => x.status === 'open').sort((a, b) => new Date(a.tanggal || 0) - new Date(b.tanggal || 0)).slice(0, 3);
console.log(`  open paling lama menggantung           :`);
for (const x of openLama) console.log(`     ${x.lokasi || x.item || '?'} — sejak ${x.tanggal || '?'} (${x.tab})`);

fs.writeFileSync('/tmp/qa-gangguan.json', JSON.stringify({ total: semua.length, ringkas: total, opsi }, null, 1));
