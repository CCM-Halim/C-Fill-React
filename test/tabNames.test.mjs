/**
 * Test untuk lib/tabNames.js - pencocokan nama tab & nama file Drive.
 *
 * SEMUA kasus di bawah diambil dari hasil baca file Drive/SHEETS YANG
 * SEBENARNYA (lihat docs/qa-2026-10.md), bukan contoh karangan:
 *
 *   - "Telephone dan Softswitch AG (3M, 6M)"  : nama tab di 18 site
 *     vs config lama "Telephone AG (3,6M)"    : nama tab di 4 site lain
 *   - "HFSPS (1Y)" vs "HFSPS (1M, 3M)"        : HARUS tetap dianggap berbeda
 *   - "Pemeriksaan jalur FO (1M, 3M, 1Y)"     : hasil konversi Sheets
 *     vs "Pemeriksaan jalur FO (1M, 3M, 1"    : isi .xlsx asli (terpotong 31)
 *
 * Yang paling penting: aturan "terpotong" TIDAK BOLEH jadi terlalu longgar,
 * karena kalau salah cocok nilainya akan tertulis ke tab yang SALAH.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TAB_NAME_LIMIT,
  sanitizeDriveName,
  nameVariants,
  normalizeName,
  isTruncatedVariant,
  isShortSuffixVariant,
  matchTabName,
  matchTabNameFromCandidates
} from '../src/lib/tabNames.js';

// ---------------------------------------------------------------------------
// sanitizeDriveName & nameVariants - 4 alat ukur yang namanya memuat "/"
// ---------------------------------------------------------------------------

test('sanitizeDriveName: "/" jadi "_", spasi sekitarnya TIDAK diubah', () => {
  // Persis seperti yang tersimpan di Drive (nama file tidak boleh memuat "/").
  assert.equal(sanitizeDriveName('Power Meter / Dynamometer'), 'Power Meter _ Dynamometer');
  assert.equal(
    sanitizeDriveName('Network Performance Tester/analyzer (10 G)'),
    'Network Performance Tester_analyzer (10 G)'
  );
  assert.equal(sanitizeDriveName('Optic Power Source (OPS/OLS)'), 'Optic Power Source (OPS_OLS)');
  assert.equal(
    sanitizeDriveName('portable GSM-R / GPRS Network drive test device (501)'),
    'portable GSM-R _ GPRS Network drive test device (501)'
  );
});

test('nameVariants: 4 bentuk untuk nama ber-"/", 2 bentuk untuk nama biasa', () => {
  const alias = nameVariants('Power Meter / Dynamometer.xlsx');
  for (const wajib of ['Power Meter / Dynamometer.xlsx', 'Power Meter / Dynamometer',
    'Power Meter _ Dynamometer.xlsx', 'Power Meter _ Dynamometer']) {
    assert.ok(alias.includes(wajib), `harus memuat ${wajib}`);
  }
  assert.equal(new Set(alias).size, alias.length, 'tidak boleh ada duplikat');

  // Nama tanpa ".xlsx" -> cuma 2 bentuk, tidak ada tambahan permintaan API.
  assert.deepEqual(nameVariants('Multimeter'), ['Multimeter']);
  assert.deepEqual(nameVariants('Multimeter.xlsx'), ['Multimeter.xlsx', 'Multimeter']);
});

test('nameVariants: nama kosong -> kosong (tidak error)', () => {
  assert.deepEqual(nameVariants(''), []);
  assert.deepEqual(nameVariants(null), []);
});

// ---------------------------------------------------------------------------
// Aturan "terpotong 31 karakter" - harus KETAT
// ---------------------------------------------------------------------------

test('isTruncatedVariant: benar untuk pasangan hasil konversi yang nyata', () => {
  const pasangan = [
    ['Pemeriksaan jalur FO (1M, 3M, 1Y)', 'Pemeriksaan jalur FO (1M, 3M, 1'],
    ['Sistem Monitoring RTU (1M,3M,1Y)', 'Sistem Monitoring RTU (1M,3M,1Y'],
    ['AC Distribution Cabinet (box) (1M, 3M, 6M, 1Y)', 'AC Distribution Cabinet (box) ('],
    ['Comprehensive Lightning Protect (1M, 3M, 1Y)', 'Comprehensive Lightning Protect']
  ];
  for (const [sheets, xlsx] of pasangan) {
    assert.ok(isTruncatedVariant(sheets, xlsx), `${sheets} ~ ${xlsx}`);
    assert.ok(isTruncatedVariant(xlsx, sheets), 'harus simetris');
  }
});

test('isTruncatedVariant: yang lebih pendek HARUS >= 31 karakter', () => {
  // Ini yang mencegah "HFSPS (1Y)" dianggap versi terpotong dari "HFSPS (1M, 3M)".
  assert.equal(isTruncatedVariant('HFSPS (1Y)', 'HFSPS (1M, 3M)'), false);
  assert.equal(isTruncatedVariant('Tower (6M,1Y)', 'Tower (3M)'), false);
  assert.equal(isTruncatedVariant('UPS (1M,3M)', 'UPS (6M,1Y)'), false);
  assert.equal(isTruncatedVariant('CCTV (3M)', 'CCTV (6M,1Y)'), false);
  // Yang panjangnya < 31 dan bukan awalan dari yang lain.
  assert.equal(isTruncatedVariant('Pemeriksaan lingkungan MR (1M)', 'Pemeriksaan jalur FO (1M, 3M, 1'), false);
});

test('isTruncatedVariant: nama sama persis bukan "varian"', () => {
  assert.equal(isTruncatedVariant('Telephone IP (3,6M)', 'Telephone IP (3,6M)'), false);
  assert.equal(isTruncatedVariant('', 'apa pun'), false);
});

test('TAB_NAME_LIMIT = 31 (batas nama sheet Excel)', () => {
  assert.equal(TAB_NAME_LIMIT, 31);
});

// ---------------------------------------------------------------------------
// Akhiran pendek - "Jadwal Kunjungan MR New"
// ---------------------------------------------------------------------------

test('isShortSuffixVariant: "New"/"Baru" di ujung boleh, sisanya tidak', () => {
  assert.equal(isShortSuffixVariant('jadwal kunjungan MR New', 'Jadwal Kunjungan MR'), true);
  assert.equal(isShortSuffixVariant('Jadwal Kunjungan MR2', 'Jadwal Kunjungan MR'), true);
  // Sisaan berupa tanda baca / lebih dari 4 huruf -> TIDAK dianggap varian.
  assert.equal(isShortSuffixVariant('HFSPS (1Y)', 'HFSPS (1M, 3M)'), false);
  assert.equal(isShortSuffixVariant('Telephone IP (3,6M)', 'Telephone'), false);
  assert.equal(isShortSuffixVariant('Jadwal Kunjungan MR Lama Sekali', 'Jadwal Kunjungan MR'), false);
});

// ---------------------------------------------------------------------------
// matchTabName - urutan aturan & kasus negatif
// ---------------------------------------------------------------------------

test('matchTabName: cocok persis dipakai apa adanya', () => {
  const titles = ['Cover', 'CCTV (3M)', 'CCTV (6M,1Y)'];
  assert.equal(matchTabName(titles, 'CCTV (3M)'), 'CCTV (3M)');
});

test('matchTabName: beda spasi & huruf besar/kecil', () => {
  assert.equal(matchTabName(['Lembar Verifikasi pekerjaan'], 'Lembar Verifikasi Pekerjaan'),
    'Lembar Verifikasi pekerjaan');
  assert.equal(matchTabName(['Baterai HFSPS Grup1 (1M,3M)'], 'Baterai HFSPS Grup 1 (1M,3M)'),
    'Baterai HFSPS Grup1 (1M,3M)');
});

test('matchTabName: nama tab terpotong hasil konversi Sheets', () => {
  const titles = ['Cover', 'Pemeriksaan jalur FO (1M, 3M, 1Y)', 'Transmisi (3M,6M)'];
  assert.equal(matchTabName(titles, 'Pemeriksaan jalur FO (1M, 3M, 1'),
    'Pemeriksaan jalur FO (1M, 3M, 1Y)');
});

test('matchTabName: K22+025-style - tab panjang sementara config terpotong', () => {
  // Config punya nama terpotong, file punya nama lengkap (atau sebaliknya).
  const titles = ['AC Distribution Cabinet (box) (1M, 3M, 6M, 1Y)'];
  assert.equal(matchTabName(titles, 'AC Distribution Cabinet (box) ('),
    'AC Distribution Cabinet (box) (1M, 3M, 6M, 1Y)');
});

test('matchTabName: TIDAK salah cocok kalau memang beda periode', () => {
  // Ini kasus yang berbahaya: K27+985 punya "HFSPS (1M, 3M)" & "HFSPS (6M, 1Y)",
  // dan config-nya menunjuk "HFSPS (1Y)". Tidak ada yang cocok -> null, supaya
  // pemanggil melempar error yang jelas, BUKAN menulis ke tab yang salah.
  const titles = ['HFSPS (1M, 3M)', 'HFSPS (6M, 1Y)', 'UPS (1M,3M)'];
  assert.equal(matchTabName(titles, 'HFSPS (1Y)'), null);
});

test('matchTabName: "jadwal kunjungan MR New" ketemu', () => {
  assert.equal(matchTabName(['jadwal kunjungan MR New', 'Kode Perawatan'], 'Jadwal Kunjungan MR'),
    'jadwal kunjungan MR New');
});

test('matchTabName: daftar kosong / nama kosong -> null', () => {
  assert.equal(matchTabName([], 'apa pun'), null);
  assert.equal(matchTabName(null, 'apa pun'), null);
  assert.equal(matchTabName(['Cover'], ''), null);
});

// ---------------------------------------------------------------------------
// matchTabNameFromCandidates - nama utama + alias (Telephone AG)
// ---------------------------------------------------------------------------

test('alias: 18 site pakai nama panjang, config menunjuk nama panjang', () => {
  const titles = ['Cover', 'Telephone dan Softswitch AG (3M, 6M)'];
  const kandidat = ['Telephone dan Softswitch AG (3M, 6M)', 'Telephone AG (3,6M)'];
  assert.deepEqual(matchTabNameFromCandidates(titles, kandidat),
    { tab: 'Telephone dan Softswitch AG (3M, 6M)', dari: 'Telephone dan Softswitch AG (3M, 6M)' });
});

test('alias: 4 site (Halim CC, dst) pakai nama pendek -> alias yang menangkap', () => {
  const titles = ['Cover', 'Telephone IP (3,6M)', 'Telephone AG (3,6M)'];
  const kandidat = ['Telephone dan Softswitch AG (3M, 6M)', 'Telephone AG (3,6M)'];
  assert.deepEqual(matchTabNameFromCandidates(titles, kandidat),
    { tab: 'Telephone AG (3,6M)', dari: 'Telephone AG (3,6M)' });
});

test('alias: nama utama menang duluan walau alias juga ada', () => {
  const titles = ['Telephone AG (3,6M)', 'Telephone dan Softswitch AG (3M, 6M)'];
  const kandidat = ['Telephone dan Softswitch AG (3M, 6M)', 'Telephone AG (3,6M)'];
  assert.equal(matchTabNameFromCandidates(titles, kandidat).tab, 'Telephone dan Softswitch AG (3M, 6M)');
});

test('alias: tidak ada yang cocok -> null (bukan menebak)', () => {
  const titles = ['Cover', 'CCTV (3M)'];
  assert.deepEqual(matchTabNameFromCandidates(titles, ['Telephone dan Softswitch AG (3M, 6M)', 'Telephone AG (3,6M)']),
    { tab: null, dari: null });
});

// ---------------------------------------------------------------------------
// normalizeName
// ---------------------------------------------------------------------------

test('normalizeName: buang semua spasi & samakan huruf', () => {
  assert.equal(normalizeName('  Grup 1  (1M,3M) '), 'grup1(1m,3m)');
  assert.equal(normalizeName(null), '');
});
