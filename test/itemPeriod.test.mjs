/**
 * Test untuk lib/itemPeriod.js — pemisahan penanda periode dari teks item.
 *
 * Semua teks di bawah diambil APA ADANYA dari src/config/categories.js,
 * termasuk salah ketik yang memang ada di data asli ("pemeriksaann",
 * "Peeriksaan", "Verivikasi") — modul ini tidak boleh "merapikan" teks item.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  bacaPenandaDariTeks, bersihkanTeksItem, teksPeriode,
  kelompokPeriode, periodeItem, siapkanItem,
} from '../src/lib/itemPeriod.js';

// ---------------------------------------------------------------------------
// Membaca penanda dari teks
// ---------------------------------------------------------------------------

test('bacaPenandaDariTeks: bentuk yang ada di data asli', () => {
  const kasus = [
    ['Pembersihan permukaan panel (1 bulan)', 1],
    ['Pengujian alarm pemadaman listrik (3 bulan)', 3],
    ['Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya(6 bulan)', 6],
    ['Verivikasi Discharge Test (1 tahun)', 12],
    ['Tes Kapasitas Baterai (2 tahun)', 24],
    ['Pemeriksaan menyeluruh (3 tahun)', 36],
  ];
  for (const [teks, bulan] of kasus) {
    assert.equal(bacaPenandaDariTeks(teks)?.months, bulan, teks);
  }
});

test('bacaPenandaDariTeks: huruf besar/kecil tidak masalah', () => {
  assert.equal(bacaPenandaDariTeks('Pemeriksaan rutin (3 Bulan)')?.months, 3);
  assert.equal(bacaPenandaDariTeks('Pemeriksaan rutin (1 Tahun)')?.months, 12);
  assert.equal(bacaPenandaDariTeks('Pengujian layanan (3 Bulanan)')?.months, 3);
});

test('bacaPenandaDariTeks: tanda kurung yang BUKAN periode tidak ikut terbaca', () => {
  // "Arus (I)" = singkatan Arus, bukan periode 1 bulan
  assert.equal(bacaPenandaDariTeks('Arus (I)'), null);
  // keterangan alat, bukan periode
  assert.equal(bacaPenandaDariTeks('Tes Kapasitas Baterai (Menggunakan battery comprehensive tester)'), null);
  // tekanan (jarum indikator) bukan periode
  assert.equal(bacaPenandaDariTeks('Tekanan / Masa sesuai ketentuan (jarum indikator)'), null);
});

test('bacaPenandaDariTeks: penanda di TENGAH teks tidak dianggap penanda periode', () => {
  // Ini penting: "Standar" sering menyebut periode di tengah, misalnya
  // "Ganti filter setiap (3 bulan) sekali" - bukan penanda periode item.
  assert.equal(bacaPenandaDariTeks('Ganti filter (3 bulan) sekali lalu periksa ulang'), null);
});

// ---------------------------------------------------------------------------
// Membersihkan teks
// ---------------------------------------------------------------------------

test('bersihkanTeksItem: membuang penanda termasuk kalau menempel tanpa spasi', () => {
  assert.equal(
    bersihkanTeksItem('Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya(6 bulan)'),
    'Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya'
  );
});

test('bersihkanTeksItem: tidak menyisakan spasi ganda di ujung', () => {
  const hasil = bersihkanTeksItem('Pengujian alarm pemadaman listrik (3 bulan)');
  assert.equal(hasil, 'Pengujian alarm pemadaman listrik');
  assert.doesNotMatch(hasil, /\s$/, 'tidak boleh ada spasi menggantung di ujung');
});

test('bersihkanTeksItem: salah ketik di data asli TIDAK diubah', () => {
  assert.equal(
    bersihkanTeksItem('Peeriksaan konektor dan kabel (3 bulan)'),
    'Peeriksaan konektor dan kabel'
  );
});

test('bersihkanTeksItem: teks tanpa penanda dibiarkan apa adanya', () => {
  const asli = 'Periksa kondisi dan kekuatan koneksi kabel grounding';
  assert.equal(bersihkanTeksItem(asli), asli);
});

test('bersihkanTeksItem: tanda kurung non-periode tidak terhapus', () => {
  assert.equal(bersihkanTeksItem('Arus (I)'), 'Arus (I)');
  assert.equal(
    bersihkanTeksItem('Tes Kapasitas Baterai (Menggunakan battery comprehensive tester)'),
    'Tes Kapasitas Baterai (Menggunakan battery comprehensive tester)'
  );
});

// ---------------------------------------------------------------------------
// Teks periode yang ditampilkan
// ---------------------------------------------------------------------------

test('teksPeriode: bulan dan tahun ditulis dengan benar', () => {
  assert.equal(teksPeriode(1), '1 bulan');
  assert.equal(teksPeriode(3), '3 bulan');
  assert.equal(teksPeriode(6), '6 bulan');
  assert.equal(teksPeriode(12), '1 tahun');
  assert.equal(teksPeriode(24), '2 tahun');
  assert.equal(teksPeriode(36), '3 tahun');
});

test('teksPeriode: nilai tidak masuk akal menghasilkan teks kosong', () => {
  assert.equal(teksPeriode(0), '');
  assert.equal(teksPeriode(null), '');
  assert.equal(teksPeriode(undefined), '');
});

// ---------------------------------------------------------------------------
// Kelompok & warna
// ---------------------------------------------------------------------------

test('kelompokPeriode: pemetaan yang diminta Jo', () => {
  assert.equal(kelompokPeriode(1), 'bulanan');
  assert.equal(kelompokPeriode(3), 'triwulanan');
  assert.equal(kelompokPeriode(6), 'semesteran');
  assert.equal(kelompokPeriode(12), 'tahunan');
});

test('warna: 1 bulan hijau, 3 bulan kuning, 6 bulan oranye, 1 tahun merah', () => {
  assert.equal(periodeItem({ periodMonths: 1 })?.warna, 'hijau');
  assert.equal(periodeItem({ periodMonths: 3 })?.warna, 'kuning');
  assert.equal(periodeItem({ periodMonths: 6 })?.warna, 'oranye');
  assert.equal(periodeItem({ periodMonths: 12 })?.warna, 'merah');
});

test('warna: 24 & 36 bulan tetap kelompok tahunan (merah)', () => {
  assert.equal(periodeItem({ periodMonths: 24 })?.warna, 'merah');
  assert.equal(periodeItem({ periodMonths: 24 })?.teks, '2 tahun');
  assert.equal(periodeItem({ periodMonths: 36 })?.teks, '3 tahun');
});

// ---------------------------------------------------------------------------
// periodeItem & siapkanItem
// ---------------------------------------------------------------------------

test('periodeItem: periodMonths diutamakan, teks jadi cadangan', () => {
  // Data lengkap
  assert.equal(periodeItem({ label: 'Periksa sesuatu (6 bulan)', periodMonths: 6 })?.months, 6);
  // Data hanya punya teks
  assert.equal(periodeItem({ label: 'Periksa sesuatu (6 bulan)' })?.months, 6);
  // Teks keliru tapi data benar -> data yang dipakai (jangan percaya teks buta)
  assert.equal(periodeItem({ label: 'Periksa sesuatu (3 bulan)', periodMonths: 6 })?.months, 6);
});

test('periodeItem: item tanpa periode mengembalikan null', () => {
  assert.equal(periodeItem({ label: 'Arus Hasil Pengukuran' }), null);
  assert.equal(periodeItem({ label: 'Status' }), null);
  assert.equal(periodeItem(null), null);
});

test('siapkanItem: contoh persis dari Jo', () => {
  const item = {
    id: 'i7',
    label: 'Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya(6 bulan)',
    periodMonths: 6,
  };
  const s = siapkanItem(item);

  assert.equal(s.periode.teks, '6 bulan');
  assert.equal(s.periode.warna, 'oranye');
  assert.equal(s.teksItem, 'Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya');
  // teks asli tetap disimpan supaya data tidak hilang
  assert.equal(s.labelAsli, item.label);
});

test('siapkanItem: item 1 tahun contohnya "Periode 1 tahun" + merah', () => {
  const s = siapkanItem({ label: 'Verivikasi Discharge Test (1 tahun)', periodMonths: 12 });
  assert.equal(s.periode.teks, '1 tahun');
  assert.equal(s.periode.warna, 'merah');
  assert.equal(s.teksItem, 'Verivikasi Discharge Test');
});

test('siapkanItem: item tanpa periode tetap tampil utuh', () => {
  const s = siapkanItem({ label: 'Periksa pembagian beban arus dan kapasitas pemutus sirkuit', periodMonths: 12 });
  // punya periodMonths -> tetap dapat penanda
  assert.equal(s.periode.teks, '1 tahun');
  assert.equal(s.teksItem, 'Periksa pembagian beban arus dan kapasitas pemutus sirkuit');
});

test('siapkanItem: label kosong tidak membuat error', () => {
  const s = siapkanItem({});
  assert.equal(s.teksItem, '');
  assert.equal(s.periode, null);
});
