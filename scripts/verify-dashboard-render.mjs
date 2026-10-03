/**
 * Render-uji kartu "Progress Kerja" Dashboard memakai data sheet ASLI, tanpa
 * browser dan tanpa jaringan:
 *
 *   fixture JSON (hasil baca sheet sungguhan, lihat make-jadwal-fixtures.py)
 *     -> summarizeJadwal()          (lib/jadwalProgress.js)
 *     -> <ProgressKerjaCard>        (komponen yang sama dengan produksi)
 *     -> nilai ditarik dari markup HTML hasil render
 *
 * Tujuannya membuktikan angka yang BENAR-BENAR tampil di donut, bukan cuma
 * angka di dalam fungsi hitung.
 *
 * Jalankan:  npm run verify:dashboard
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ProgressKerjaCard from '../src/components/ProgressKerjaCard.jsx';
import { summarizeJadwal } from '../src/lib/jadwalProgress.js';

globalThis.React = React;

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const PERIODS = ['1M', '3M', '6M', '1Y'];

const CASES = [
  { nama: 'Oktober 2026 (bulan berjalan)', fixture: 'oktober-2026.B3-O120.json', bulan: 'Oktober', tahun: 2026, file: 'Jadwal Kunjungan MR Oktober 2026' },
  { nama: 'September 2026 (bulan selesai)', fixture: 'september-2026.B3-O120.json', bulan: 'September', tahun: 2026, file: 'Jadwal Kunjungan MR September 2026' },
];

let lulus = 0;
let gagal = 0;

for (const c of CASES) {
  const rows = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', c.fixture), 'utf8'));
  const jadwal = {
    available: true, bulan: c.bulan, tahun: c.tahun, fileName: c.file,
    sheetUrl: 'https://docs.google.com/spreadsheets/d/EXAMPLE/edit',
    ...summarizeJadwal(rows),
  };

  const html = renderToStaticMarkup(React.createElement(ProgressKerjaCard, { jadwal }));
  const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  console.log('='.repeat(74));
  console.log(c.nama);
  console.log('='.repeat(74));

  const checks = [];
  for (const p of PERIODS) {
    const b = jadwal.periodBreakdown[p];
    checks.push([`donut ${p} = ${b.finished}/${b.total}`, teks.includes(`${b.finished}/${b.total}`)]);
  }
  checks.push([
    'ringkasan pekerjaan di header kartu',
    teks.includes(`${jadwal.finishedCount} selesai, ${jadwal.notYetCount} belum dari ${jadwal.total} pekerjaan terjadwal`),
  ]);
  checks.push([
    'baris rencana/realisasi lengkap 4 periode',
    PERIODS.every((p) => teks.includes(`rencana ${jadwal.periodBreakdown[p].total} / realisasi ${jadwal.periodBreakdown[p].finished}`)),
  ]);
  checks.push(['blok "Diagnostik sementara" sudah dihapus', !teks.includes('Diagnostik sementara')]);
  checks.push(['tidak lagi semua donut 0/0', PERIODS.some((p) => jadwal.periodBreakdown[p].total > 0)]);
  checks.push(['label periode manusiawi (bukan cuma "1M")', teks.includes('1 Bulanan') && teks.includes('3 Bulanan')]);
  if (jadwal.unlabeledRows > 0) {
    checks.push([
      `peringatan ${jadwal.unlabeledRows} baris tanpa tag periode muncul`,
      teks.includes(`${jadwal.unlabeledRows} baris jadwal belum punya tag periode`),
    ]);
  }
  const mismatch = PERIODS.filter((p) => jadwal.sheetPlanCounters[p] !== null && jadwal.sheetPlanCounters[p] !== jadwal.periodBreakdown[p].total);
  if (mismatch.length === 0) {
    checks.push(['tidak ada peringatan selisih rencana (angka cocok dgn kolom bantu sheet)', !teks.includes('rencana sheet:')]);
  }

  for (const [label, ok] of checks) {
    console.log(`  ${ok ? '✔' : '✖'} ${label}`);
    if (ok) lulus += 1; else gagal += 1;
  }
  const m = teks.match(/Progress Kerja .{0,230}/);
  if (m) console.log('  teks kartu:\n    ' + m[0]);
  console.log();
}

console.log(`hasil: ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
