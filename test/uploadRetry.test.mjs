/**
 * Test untuk lib/uploadRetry.js - penentuan kesalahan sesaat + percobaan ulang.
 *
 * Kasus di bawah diambil dari KEJADIAN SUNGGUHAN: 11 foto gagal berturut-turut
 * dengan pesan "Failed to fetch" di halaman Dokumentasi (lihat screenshot
 * 5 Okt 2026, 09:38:40-09:40:40). Isi file TIDAK berubah antara yang berhasil
 * (09:38:24) dan yang gagal - bedanya cuma jaringannya hilang ~2 menit.
 *
 * Jadi yang diuji di sini: percobaan ulang otomatis HARUS dilakukan untuk
 * kesalahan jaringan, dan TIDAK boleh dilakukan untuk kesalahan izin/sesi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { isTransientError, pesanGagal, withRetry } from '../src/lib/uploadRetry.js';

// ---------------------------------------------------------------------------
// isTransientError - pesan persis seperti yang keluar dari browser di HP
// ---------------------------------------------------------------------------

test('isTransientError: "Failed to fetch" (pesan nyata di screenshot) HARUS diulang', () => {
  assert.equal(isTransientError(new TypeError('Failed to fetch')), true);
});

test('isTransientError: variasi pesan jaringan lain antar browser', () => {
  assert.equal(isTransientError(new TypeError('NetworkError when attempting to fetch resource.')), true); // Firefox
  assert.equal(isTransientError(new TypeError('Load failed')), true);                                     // Safari
  assert.equal(isTransientError(new Error('Network request failed')), true);                              // React Native
  assert.equal(isTransientError(new Error('ERR_CONNECTION_RESET')), true);
  assert.equal(isTransientError(new Error('ERR_INTERNET_DISCONNECTED')), true);
  assert.equal(isTransientError(new Error('request timed out')), true);
});

test('isTransientError: Drive 5xx diulang, 4xx tidak', () => {
  assert.equal(isTransientError(new Error('Upload gagal (500): internal error')), true);
  assert.equal(isTransientError(new Error('Upload gagal (503): backend error')), true);
  assert.equal(isTransientError(new Error('Upload gagal (429): rate limit')), false);
  assert.equal(isTransientError(new Error('Upload gagal (403): insufficient permissions')), false);
  assert.equal(isTransientError(new Error('Upload gagal (401): invalid credentials')), false);
  assert.equal(isTransientError(new Error('Upload gagal (400): bad request')), false);
});

test('isTransientError: sesi login habis TIDAK diulang (percuma)', () => {
  assert.equal(isTransientError(new Error('Sesi login berakhir. Silakan login ulang.')), false);
});

test('isTransientError: dibatalkan user bukan kesalahan', () => {
  const err = new Error('dibatalkan');
  err.name = 'AbortError';
  assert.equal(isTransientError(err), false);
});

test('isTransientError: masukan kosong/null tidak bikin error', () => {
  assert.equal(isTransientError(null), false);
  assert.equal(isTransientError(undefined), false);
  assert.equal(isTransientError(new Error('')), false);
});

// ---------------------------------------------------------------------------
// withRetry - hitungan percobaan & jeda
// ---------------------------------------------------------------------------

test('withRetry: berhasil di percobaan pertama -> hanya 1 panggilan, tanpa jeda', async () => {
  let n = 0;
  const hasil = await withRetry(async () => { n++; return 'ok'; }, { baseDelayMs: 1 });
  assert.equal(hasil, 'ok');
  assert.equal(n, 1);
});

test('withRetry: gagal 2x lalu berhasil -> 3 panggilan, hasil akhir tetap keluar', async () => {
  let n = 0;
  const hasil = await withRetry(async () => {
    n++;
    if (n < 3) throw new TypeError('Failed to fetch');
    return 'berhasil di percobaan ke-' + n;
  }, { baseDelayMs: 1 });
  assert.equal(hasil, 'berhasil di percobaan ke-3');
  assert.equal(n, 3);
});

test('withRetry: gagal terus -> menyerah setelah 3 percobaan & melempar kesalahan asli', async () => {
  let n = 0;
  await assert.rejects(
    () => withRetry(async () => { n++; throw new TypeError('Failed to fetch'); }, { baseDelayMs: 1 }),
    /Failed to fetch/
  );
  assert.equal(n, 3, 'harus tepat 3 percobaan, tidak kurang tidak lebih');
});

test('withRetry: kesalahan menetap (403) TIDAK diulang - langsung menyerah', async () => {
  let n = 0;
  await assert.rejects(
    () => withRetry(async () => { n++; throw new Error('Upload gagal (403): insufficient permissions'); }, { baseDelayMs: 1 }),
    /403/
  );
  assert.equal(n, 1, '403 tidak boleh diulang');
});

test('withRetry: kesalahan menetap di tengah jalan juga tidak diulang', async () => {
  let n = 0;
  await assert.rejects(
    () => withRetry(async () => {
      n++;
      if (n === 1) throw new TypeError('Failed to fetch');
      throw new Error('Upload gagal (403): insufficient permissions');
    }, { baseDelayMs: 1 }),
    /403/
  );
  assert.equal(n, 2, 'ulang sekali untuk kesalahan jaringan, lalu berhenti saat 403');
});

test('withRetry: onRetry dipanggil dengan nomor percobaan berikutnya', async () => {
  const jejak = [];
  let n = 0;
  await withRetry(async () => {
    n++;
    if (n < 3) throw new TypeError('Failed to fetch');
    return 'ok';
  }, { baseDelayMs: 1, onRetry: (berikutnya, total) => jejak.push(`${berikutnya}/${total}`) });

  assert.deepEqual(jejak, ['2/3', '3/3']);
});

test('withRetry: attempts bisa diatur', async () => {
  let n = 0;
  await assert.rejects(
    () => withRetry(async () => { n++; throw new TypeError('Failed to fetch'); }, { attempts: 5, baseDelayMs: 1 })
  );
  assert.equal(n, 5);
});

// ---------------------------------------------------------------------------
// pesanGagal - bahasa yang bisa dipakai teknisi
// ---------------------------------------------------------------------------

test('pesanGagal: "Failed to fetch" diganti penjelasan yang jelas', () => {
  const p = pesanGagal(new TypeError('Failed to fetch'));
  assert.match(p, /koneksi terputus/i);
  assert.doesNotMatch(p, /failed to fetch/i, 'pesan mentah browser tidak boleh lolos ke layar');
});

test('pesanGagal: sesi login habis -> arahan yang benar', () => {
  assert.match(pesanGagal(new Error('Sesi login berakhir. Silakan login ulang.')), /login ulang/i);
});

test('pesanGagal: kesalahan lain dibiarkan apa adanya (jangan disembunyikan)', () => {
  assert.equal(pesanGagal(new Error('Upload gagal (403): insufficient permissions')),
    'Upload gagal (403): insufficient permissions');
});
