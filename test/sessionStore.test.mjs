/**
 * Test untuk lib/sessionStore.js — "login sekali per device".
 *
 * Kasus nyata yang jadi latar: teknisi menutup aplikasi di sela pekerjaan, lalu
 * membukanya lagi esok hari dan harus login ulang dari awal. Penyebabnya sesi
 * disimpan di sessionStorage (hilang begitu tab/browser ditutup).
 *
 * Semua test memakai storage tiruan supaya bisa jalan di Node tanpa browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SESSION_KEY,
  HAS_LOGGED_IN_BEFORE_KEY,
  SILENT_REFRESH_MAX_AGE_MS,
  readSession,
  saveSession,
  clearSession,
  touchSession,
  isTokenValid,
  shouldAttemptSilentLogin,
} from '../src/lib/sessionStore.js';

/** Storage tiruan — cukup untuk getItem/setItem/removeItem. */
function buatStorage(awal = {}) {
  const isi = { ...awal };
  return {
    getItem: (k) => (k in isi ? isi[k] : null),
    setItem: (k, v) => { isi[k] = String(v); },
    removeItem: (k) => { delete isi[k]; },
    _isi: isi,
  };
}

const USER = { email: 'teknisi@ccmhalim.id', name: 'Teknisi' };
const SEKARANG = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// menyimpan & membaca sesi
// ---------------------------------------------------------------------------

test('sesi tersimpan bisa dibaca kembali lengkap (token, user, savedAt)', () => {
  const s = buatStorage();
  const token = { access_token: 'tok-1', expires_at: SEKARANG + 3600_000 };
  saveSession(s, { token, user: USER }, SEKARANG);

  const sesi = readSession(s);
  assert.deepEqual(sesi.token, token);
  assert.equal(sesi.user.email, USER.email);
  assert.equal(sesi.savedAt, SEKARANG);
});

test('storage kosong -> null, bukan error', () => {
  assert.equal(readSession(buatStorage()), null);
});

test('isi storage rusak (bukan JSON) -> null, tidak melempar', () => {
  const s = buatStorage({ [SESSION_KEY]: '{bukan json' });
  assert.equal(readSession(s), null);
});

test('sesi tanpa email dianggap tidak valid (email dipakai cek whitelist)', () => {
  const s = buatStorage();
  saveSession(s, { token: { access_token: 'x', expires_at: SEKARANG + 1000 }, user: { name: 'Tanpa Email' } }, SEKARANG);
  assert.equal(readSession(s), null);
});

test('saveSession menolak user tanpa email (tidak menulis sampah)', () => {
  const s = buatStorage();
  saveSession(s, { token: null, user: { name: 'X' } }, SEKARANG);
  assert.equal(s.getItem(SESSION_KEY), null);
});

test('clearSession benar-benar menghapus', () => {
  const s = buatStorage();
  saveSession(s, { token: null, user: USER }, SEKARANG);
  clearSession(s);
  assert.equal(readSession(s), null);
});

// ---------------------------------------------------------------------------
// token basi TETAP mempertahankan identitas
// ---------------------------------------------------------------------------

test('token sudah kedaluwarsa: sesi tetap terbaca (tidak membuang user ke login)', () => {
  const s = buatStorage();
  const token = { access_token: 'tok-lama', expires_at: SEKARANG - 1 }; // sudah lewat
  saveSession(s, { token, user: USER }, SEKARANG);

  const sesi = readSession(s);
  assert.ok(sesi, 'sesi harus tetap terbaca walau tokennya basi');
  assert.equal(sesi.user.email, USER.email);
  assert.equal(isTokenValid(sesi.token, SEKARANG), false, 'token tetap dianggap tidak valid');
});

test('isTokenValid: token masih berlaku -> true', () => {
  assert.equal(isTokenValid({ access_token: 'a', expires_at: SEKARANG + 60_000 }, SEKARANG), true);
});

test('isTokenValid: token null / bentuk aneh -> false', () => {
  assert.equal(isTokenValid(null, SEKARANG), false);
  assert.equal(isTokenValid({}, SEKARANG), false);
  assert.equal(isTokenValid({ access_token: 'a' }, SEKARANG), false); // tanpa expires_at
});

// ---------------------------------------------------------------------------
// touchSession — memperpanjang jendela silent refresh
// ---------------------------------------------------------------------------

test('touchSession memperbarui savedAt tanpa mengubah token/user', () => {
  const s = buatStorage();
  const token = { access_token: 'tok', expires_at: SEKARANG + 1000 };
  saveSession(s, { token, user: USER }, SEKARANG);

  const NANTI = SEKARANG + 5 * 60_000;
  touchSession(s, NANTI);

  const sesi = readSession(s);
  assert.equal(sesi.savedAt, NANTI);
  assert.deepEqual(sesi.token, token);
  assert.equal(sesi.user.email, USER.email);
});

test('touchSession pada storage kosong tidak membuat sesi palsu', () => {
  const s = buatStorage();
  touchSession(s, SEKARANG);
  assert.equal(readSession(s), null);
});

// ---------------------------------------------------------------------------
// shouldAttemptSilentLogin — kapan boleh coba login diam-diam
// ---------------------------------------------------------------------------

test('pernah login + sesi baru -> boleh coba login diam-diam', () => {
  assert.equal(shouldAttemptSilentLogin({
    hasLoggedInBefore: true, savedAt: SEKARANG - 60_000, now: SEKARANG,
  }), true);
});

test('belum pernah login -> TIDAK boleh (mencegah popup muncul sendiri)', () => {
  assert.equal(shouldAttemptSilentLogin({
    hasLoggedInBefore: false, savedAt: SEKARANG - 60_000, now: SEKARANG,
  }), false);
});

test('sesi lebih tua dari batas -> TIDAK boleh', () => {
  assert.equal(shouldAttemptSilentLogin({
    hasLoggedInBefore: true,
    savedAt: SEKARANG - SILENT_REFRESH_MAX_AGE_MS - 1,
    now: SEKARANG,
  }), false);
});

test('sesi persis di batas -> masih boleh (batas eksklusif)', () => {
  assert.equal(shouldAttemptSilentLogin({
    hasLoggedInBefore: true,
    savedAt: SEKARANG - SILENT_REFRESH_MAX_AGE_MS + 1,
    now: SEKARANG,
  }), true);
});

test('tanpa savedAt -> TIDAK boleh (sesi lama sebelum fitur ini ada)', () => {
  assert.equal(shouldAttemptSilentLogin({
    hasLoggedInBefore: true, savedAt: 0, now: SEKARANG,
  }), false);
});

test('batas waktunya 30 hari', () => {
  assert.equal(SILENT_REFRESH_MAX_AGE_MS, 30 * 24 * 60 * 60 * 1000);
});

test('kunci penyimpanan tetap sama seperti versi lama (sesi lama tidak terbuang)', () => {
  assert.equal(SESSION_KEY, 'cfill_auth_session_v1');
  assert.equal(HAS_LOGGED_IN_BEFORE_KEY, 'cfill_has_logged_in_before');
});
