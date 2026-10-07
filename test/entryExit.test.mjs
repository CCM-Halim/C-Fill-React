/**
 * Test untuk lib/entryExitMatch.js + lib/entryExitMemory.js
 *
 * Latar (laporan Jo, 7 Okt 2026): di K10+200, registrasi masuk/keluar MR
 * diminta diisi lagi padahal kemarin sudah diisi.
 *
 * Yang diuji di sini adalah KEPUTUSAN "bulan ini sudah terisi atau belum" -
 * bukan tampilan. Dua kesalahan yang mungkin, keduanya merugikan:
 *   - salah bilang "belum" -> teknisi mengisi ulang, lahir BARIS BARU untuk
 *     bulan yang sama (isian ganda di satu file)
 *   - salah bilang "sudah" -> teknisi tak bisa mengisi padahal belum pernah
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cocokBulanIni, angkaTanggal } from '../src/lib/entryExitMatch.js';
import {
  memoryKey, tandaiSudahDiisi, pernahTerisi, ENTRY_EXIT_MEMORY_KEY, MAX_AGE_MS,
} from '../src/lib/entryExitMemory.js';

/** Storage tiruan ala localStorage. */
function storagePalsu(isiAwal = {}) {
  const data = { ...isiAwal };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    _data: data,
  };
}

// ---------------------------------------------------------------------------
// cocokBulanIni — format tanggal yang benar-benar dikirim/dibaca Sheets
// ---------------------------------------------------------------------------
test('cocokBulanIni: format yang dikirim aplikasi DD/MM/YYYY', () => {
  assert.equal(cocokBulanIni('07/10/2026', 10, 2026), true, '7 Oktober 2026 harus cocok');
  assert.equal(cocokBulanIni('01/09/2026', 10, 2026), false, 'September bukan Oktober');
  assert.equal(cocokBulanIni('07/10/2025', 10, 2026), false, 'tahun beda');
});

test('cocokBulanIni: Sheets menormalkan jadi MM/DD/YYYY - tetap cocok', () => {
  // Ini kasus nyata: kita kirim 07/10/2026, Sheets menyimpannya 10/07/2026.
  assert.equal(cocokBulanIni('10/07/2026', 10, 2026), true,
    '10/07/2026 versi Sheets tidak boleh gagal dikenali sebagai Oktober');
});

test('cocokBulanIni: bentuk ISO dari Sheets API', () => {
  assert.equal(cocokBulanIni('2026-10-06T00:00:00.000Z', 10, 2026), true);
  assert.equal(cocokBulanIni('2026-10-06', 10, 2026), true);
  assert.equal(cocokBulanIni('2026-09-30', 10, 2026), false);
  assert.equal(cocokBulanIni('2025-10-06', 10, 2026), false);
});

test('cocokBulanIni: objek Date', () => {
  assert.equal(cocokBulanIni(new Date(2026, 9, 7), 10, 2026), true);
  assert.equal(cocokBulanIni(new Date(2026, 8, 7), 10, 2026), false);
});

test('cocokBulanIni: tanggal teks Indonesia', () => {
  assert.equal(cocokBulanIni('7 Oktober 2026', 10, 2026), true);
  assert.equal(cocokBulanIni('7 September 2026', 10, 2026), false);
});

test('cocokBulanIni: TIDAK salah cocok hanya karena tahunnya sama', () => {
  // Ini jebakan lama: "ada angka 2026" dulu dianggap cukup.
  assert.equal(cocokBulanIni('15/03/2026', 10, 2026), false, 'Maret bukan Oktober');
  assert.equal(cocokBulanIni('15/11/2026', 10, 2026), false, 'November bukan Oktober');
});

test('cocokBulanIni: baris kosong / bukan tanggal ditolak', () => {
  assert.equal(cocokBulanIni('', 10, 2026), false);
  assert.equal(cocokBulanIni(null, 10, 2026), false);
  assert.equal(cocokBulanIni(undefined, 10, 2026), false);
  assert.equal(cocokBulanIni('   ', 10, 2026), false);
  assert.equal(cocokBulanIni('belum diisi', 10, 2026), false);
  assert.equal(cocokBulanIni('2026', 10, 2026), false, 'cuma tahun, bukan tanggal');
});

test('angkaTanggal: pecah angka dengan benar', () => {
  assert.deepEqual(angkaTanggal('07/10/2026'), [7, 10, 2026]);
  assert.deepEqual(angkaTanggal('2026-10-07'), [2026, 10, 7]);
  assert.equal(angkaTanggal('abc'), null);
  assert.equal(angkaTanggal(''), null);
});

// ---------------------------------------------------------------------------
// cocokBulanIni dipakai untuk seluruh daftar baris (kasus K10+200)
// ---------------------------------------------------------------------------
test('K10+200: baris yang sudah ada di bulan ini TERDETEKSI walau baris pertama kosong', () => {
  // Susunan nyata yang bermasalah: B7 kosong, datanya di B8.
  // Dulu batas baca = baris kosong pertama - 1 = 6, jadi TIDAK ADA baris
  // diperiksa dan hasilnya "belum diisi".
  const kolomTanggal = ['', '07/10/2026', '', '01/09/2026'];
  const adaBulanIni = kolomTanggal.some((d) => cocokBulanIni(d, 10, 2026));
  assert.equal(adaBulanIni, true, 'isian 07/10/2026 di baris 8 harus terdeteksi');
});

test('K10+200: hanya ada isian bulan lalu -> memang belum diisi bulan ini', () => {
  const kolomTanggal = ['01/09/2026', '15/09/2026'];
  const adaBulanIni = kolomTanggal.some((d) => cocokBulanIni(d, 10, 2026));
  assert.equal(adaBulanIni, false);
});

// ---------------------------------------------------------------------------
// entryExitMemory — cadangan saat pemeriksaan GAGAL
// ---------------------------------------------------------------------------
test('memoryKey: per site per BULAN, bukan per tanggal', () => {
  const a = memoryKey('1. BTS Communication Room', 'K10+200 Base Station 2', new Date(2026, 9, 7));
  const b = memoryKey('1. BTS Communication Room', 'K10+200 Base Station 2', new Date(2026, 9, 28));
  assert.equal(a, b, 'tanggal berbeda di bulan yang sama harus berkunci sama');
  const c = memoryKey('1. BTS Communication Room', 'K10+200 Base Station 2', new Date(2026, 10, 7));
  assert.notEqual(a, c, 'bulan berbeda harus berkunci beda');
});

test('memoryKey: bulan satu digit diberi nol di depan', () => {
  const k = memoryKey('BC', 'Site', new Date(2026, 0, 5));
  assert.match(k, /2026-01$/, 'Januari harus "2026-01", bukan "2026-1"');
});

test('tandaiSudahDiisi lalu pernahTerisi: bukti tersimpan', () => {
  const s = storagePalsu();
  const tgl = new Date(2026, 9, 6);
  assert.equal(pernahTerisi(s, 'BC', 'Site', tgl), null, 'awalnya belum ada bukti');

  tandaiSudahDiisi(s, 'BC', 'Site', tgl, 'https://docs.google.com/spreadsheets/d/abc');
  const rec = pernahTerisi(s, 'BC', 'Site', tgl);
  assert.ok(rec, 'bukti harus terbaca');
  assert.equal(rec.sheetUrl, 'https://docs.google.com/spreadsheets/d/abc');
});

test('pernahTerisi: pertanyaan BESOK masih terjawab (inti keluhan)', () => {
  const s = storagePalsu();
  tandaiSudahDiisi(s, '1. BTS Communication Room', 'K10+200 Base Station 2', new Date(2026, 9, 6));
  // Besoknya, pemeriksaan ke Sheets gagal - ingatan ini yang menyelamatkan.
  const besok = new Date(2026, 9, 7);
  const rec = pernahTerisi(s, '1. BTS Communication Room', 'K10+200 Base Station 2', besok);
  assert.ok(rec, 'bukti kemarin harus masih berlaku besok');
});

test('pernahTerisi: bulan baru TIDAK dianggap sudah terisi', () => {
  const s = storagePalsu();
  tandaiSudahDiisi(s, 'BC', 'Site', new Date(2026, 9, 6));
  assert.equal(pernahTerisi(s, 'BC', 'Site', new Date(2026, 10, 2)), null,
    'November tidak boleh dianggap sudah terisi gara-gara Oktober');
});

test('pernahTerisi: site lain tidak ikut terbawa', () => {
  const s = storagePalsu();
  tandaiSudahDiisi(s, 'BC', 'K10+200 Base Station 2', new Date(2026, 9, 6));
  assert.equal(pernahTerisi(s, 'BC', 'K66+000 Base Station 17', new Date(2026, 9, 6)), null);
  assert.equal(pernahTerisi(s, 'BC lain', 'K10+200 Base Station 2', new Date(2026, 9, 6)), null);
});

test('pernahTerisi: entri tua diabaikan (lewat batas usia)', () => {
  const s = storagePalsu();
  const tgl = new Date(2026, 9, 6);
  tandaiSudahDiisi(s, 'BC', 'Site', tgl);
  // Mundurkan waktu tersimpan jauh ke belakang, langsung di storage.
  const isi = JSON.parse(s._data[ENTRY_EXIT_MEMORY_KEY]);
  for (const k of Object.keys(isi)) isi[k].at = tgl.getTime() - MAX_AGE_MS - 1000;
  s.setItem(ENTRY_EXIT_MEMORY_KEY, JSON.stringify(isi));
  assert.equal(pernahTerisi(s, 'BC', 'Site', tgl), null, 'entri kedaluwarsa harus diabaikan');
});

test('pernahTerisi: storage rusak/berisi sampah tidak bikin error', () => {
  const rusak = storagePalsu({ [ENTRY_EXIT_MEMORY_KEY]: '{bukan json' });
  assert.equal(pernahTerisi(rusak, 'BC', 'Site', new Date(2026, 9, 6)), null);

  const bukanObjek = storagePalsu({ [ENTRY_EXIT_MEMORY_KEY]: '"teks"' });
  assert.equal(pernahTerisi(bukanObjek, 'BC', 'Site', new Date(2026, 9, 6)), null);

  const kosong = storagePalsu();
  assert.equal(pernahTerisi(kosong, 'BC', 'Site', new Date(2026, 9, 6)), null);
});

test('pernahTerisi: storage yang menolak tulis tidak melempar error', () => {
  const s = {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError'); },
  };
  assert.doesNotThrow(() => tandaiSudahDiisi(s, 'BC', 'Site', new Date(2026, 9, 6)));
});
