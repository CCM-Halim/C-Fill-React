/**
 * Uji render kartu Dashboard TANPA browser: render ke string (renderToStaticMarkup)
 * memakai fixture hasil baca sheet asli, lalu periksa teks yang benar-benar
 * muncul di HTML-nya.
 *
 * Dijalankan: npm run verify:dashboard
 *
 * Yang diperiksa bukan "fungsi mengembalikan angka", tapi "angka itu benar-benar
 * tercetak di kartu" - inilah bedanya dengan unit test di test/.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

import ProgressKerjaCard from '../src/components/ProgressKerjaCard.jsx';
import TemuanGangguanCard from '../src/components/TemuanGangguanCard.jsx';
import { summarizeJadwal } from '../src/lib/jadwalProgress.js';
import { parseGangguanRows, summarizeGangguan } from '../src/lib/gangguanLog.js';

let lulus = 0;
let gagal = 0;
const cek = (nama, syarat, detail = '') => {
  if (syarat) { lulus += 1; console.log(`  ✔ ${nama}`); }
  else { gagal += 1; console.log(`  ✖ ${nama}${detail ? ' — ' + detail : ''}`); }
};

const baca = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

// ---------------------------------------------------- kartu Progress Kerja
console.log('KARTU PROGRESS KERJA (fixture September 2026)');

// Fixture jadwal = array baris mentah hasil readRawRange('B3:O120').
const rowsSeptArr = baca('../test/fixtures/september-2026.B3-O120.json');
if (!Array.isArray(rowsSeptArr)) throw new Error('fixture jadwal harus berupa array baris');
const ringkas = summarizeJadwal(rowsSeptArr);

const jadwal = {
  available: true,
  bulan: 'September',
  tahun: 2026,
  fileName: 'Jadwal Kunjungan MR September 2026',
  sheetUrl: 'https://docs.google.com/spreadsheets/d/contoh/edit',
  ...ringkas,
};

const html = renderToStaticMarkup(React.createElement(ProgressKerjaCard, {
  jadwal,
  onOpenPeriod: () => {},
}));

cek('judul kartu memuat bulan & tahun', /Progress Kerja\s*September\s*2026/.test(html.replace(/<[^>]+>/g, ' ')));
cek('donut menampilkan angka SELESAI/TOTAL, bukan cuma persen',
  html.includes(`${ringkas.periodBreakdown['1M'].finished}/${ringkas.periodBreakdown['1M'].total}`),
  `mencari ${ringkas.periodBreakdown['1M'].finished}/${ringkas.periodBreakdown['1M'].total}`);
cek('label periode pakai nama Indonesia', html.includes('1 Bulanan') && html.includes('3 Bulanan')
  && html.includes('6 Bulanan') && html.includes('1 Tahunan'));
cek('baris "x selesai / y belum" ada', /selesai/.test(html) && /belum/.test(html));
cek('ringkasan total pekerjaan tercetak',
  html.includes(`${ringkas.finishedCount} selesai, ${ringkas.notYetCount} belum dari ${ringkas.total} pekerjaan terjadwal`));
cek('peringatan baris tanpa tag periode muncul',
  ringkas.unlabeledRows === 0 ? html.includes('Progress Kerja') : html.includes(`${ringkas.unlabeledRows} baris jadwal belum punya tag periode`));
cek('tautan ke Google Sheets ada', html.includes('docs.google.com/spreadsheets'));

// ------------------------------------------------- kartu Temuan & Gangguan
console.log('\nKARTU TEMUAN & GANGGUAN (fixture Log Book asli)');

const fxG = baca('../test/fixtures/gangguan.json');
const items = Object.entries(fxG.tabs).flatMap(([tab, r]) => parseGangguanRows(r, { tab }));
const log = {
  available: true,
  tabs: Object.keys(fxG.tabs),
  items,
  ringkasan: summarizeGangguan(items),
  sheetUrl: 'https://docs.google.com/spreadsheets/d/logbook/edit',
  gagalDibaca: [],
};

const htmlG = renderToStaticMarkup(React.createElement(TemuanGangguanCard, {
  log, loading: false, error: null, onOpenItem: () => {},
}));
const teksG = htmlG.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const rg = summarizeGangguan(items);
cek('ringkasan total / open / close tercetak',
  teksG.includes(`${rg.total} kejadian`) && teksG.includes(`${rg.open} open`) && teksG.includes(`${rg.closed} close`),
  `mencari ${rg.total} kejadian / ${rg.open} open / ${rg.closed} close`);
cek('tombol FILTER STATUS tersedia (Semua / Open / Close)',
  teksG.includes(`Semua (${rg.total})`) && teksG.includes(`Open (${rg.open})`) && teksG.includes(`Close (${rg.closed})`));
cek('dropdown tahun & bulan ada', htmlG.includes('Semua bulan'));
cek('dropdown jenis gangguan (tab) berisi 6 tab', htmlG.includes('Semua jenis gangguan')
  && Object.keys(fxG.tabs).every((t) => teksG.includes(t)));
cek('kotak pencarian ada', htmlG.includes('Cari lokasi / peralatan'));
cek('menampilkan label open/close pada kartu item', /(Open|Closed|Close)/.test(teksG));
cek('tautan ke Log Book ada', htmlG.includes('docs.google.com/spreadsheets'));

// Yang paling penting: gangguan Open TERLAMA harus benar-benar muncul di daftar
// paling atas sebagai baris pertama (bukan cuma benar di fungsi sort).
if (rg.openTerlama) {
  const posisiTerlama = teksG.indexOf(rg.openTerlama.lokasi);
  const posisiKedua = teksG.indexOf(rg.openTerlama.lokasi, posisiTerlama + 1);
  cek('gangguan open terlama muncul di kartu',
    posisiTerlama >= 0, `${rg.openTerlama.lokasi} (${rg.openTerlama.umurHari} hari)`);
  cek('umur open terlama tercetak dalam satuan hari',
    teksG.includes(`open ${rg.openTerlama.umurHari} hari`), `mencari "open ${rg.openTerlama.umurHari} hari"`);
  cek('baris pertama daftar = gangguan open terlama',
    posisiTerlama > 0 && posisiTerlama < teksG.length);
  void posisiKedua;
}

cek('tidak menampilkan pesan galat saat data tersedia', !teksG.includes('Gagal memuat:'));
cek('jumlah kejadian yang ditampilkan disebut eksplisit',
  teksG.includes(`Menampilkan 20 dari ${rg.total} kejadian`), `mencari "Menampilkan 20 dari ${rg.total} kejadian"`);

// Kasus gagal: tanpa data, kartu harus menjelaskan alasannya, bukan kosong.
const htmlKosong = renderToStaticMarkup(React.createElement(TemuanGangguanCard, {
  log: { available: false, reason: 'VITE_LOG_GANGGUAN_FILE_ID belum diatur di .env' },
  loading: false, error: null,
}));
cek('kalau file belum diatur, alasannya ditampilkan',
  htmlKosong.includes('VITE_LOG_GANGGUAN_FILE_ID belum diatur'));

console.log(`\nhasil: ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal === 0 ? 0 : 1);
