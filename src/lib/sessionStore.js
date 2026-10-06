/**
 * sessionStore.js
 * Logika penyimpanan sesi login — dipisah dari googleAuth.js supaya bisa diuji
 * di Node tanpa browser (localStorage/sessionStorage disuntik sebagai argumen).
 *
 * PERUBAHAN PENTING (permintaan 6 Okt 2026): sesi sekarang disimpan di
 * localStorage, BUKAN sessionStorage. Sebelumnya sessionStorage membuat sesi
 * hilang begitu tab/browser ditutup — jadi teknisi harus login ulang tiap kali
 * membuka aplikasi. localStorage bertahan lintas sesi, jadi cukup login SEKALI.
 *
 * Karena token tetap kedaluwarsa (~1 jam), yang disimpan bukan cuma token tapi
 * juga `savedAt`. Saat app dibuka lagi: percobaan login DIAM-DIAM (tanpa popup)
 * dijalankan otomatis selama masih dalam jendela SILENT_REFRESH_MAX_AGE_MS.
 *
 * Catatan penting soal Google: sesi OAuth di browser hanya bisa diperbarui
 * tanpa interaksi kalau cookie sesi Google *user* masih aktif. Kalau dia sudah
 * logout dari Google / browser sudah bersihkan cookie pihak ketiga, app TIDAK
 * bisa memaksa — yang bisa dilakukan cuma: (1) jangan pernah minta login ulang
 * selama sesi masih bisa disegarkan, dan (2) begitu gagal sekali, app tetap
 * terbuka dengan sesi terakhir (tidak melempar ke layar login).
 */

export const SESSION_KEY = 'cfill_auth_session_v1';
export const HAS_LOGGED_IN_BEFORE_KEY = 'cfill_has_logged_in_before';

/**
 * Berapa lama sesi terakhir masih boleh dicoba disegarkan tanpa popup.
 * 30 hari: cukup panjang untuk "login sekali", tapi tetap ada batas supaya
 * device yang sudah lama mangkrak tidak memicu percobaan sia-sia terus-menerus.
 */
export const SILENT_REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Baca sesi tersimpan. Return null kalau tidak ada / rusak / tidak punya email.
 * TIDAK memeriksa masa berlaku token — pemanggil yang memutuskan (lihat
 * isTokenValid), karena user tetap boleh dianggap "sudah login" walau tokennya
 * sedang kedaluwarsa (akan disegarkan diam-diam).
 */
export function readSession(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || !saved.user || !saved.user.email) return null;
    return {
      token: saved.token || null,
      user: saved.user,
      savedAt: typeof saved.savedAt === 'number' ? saved.savedAt : 0,
    };
  } catch {
    return null;
  }
}

/** Simpan sesi (token + user + waktu). `token` boleh null (token sudah basi). */
export function saveSession(storage, { token, user }, now = Date.now()) {
  if (!user || !user.email) return;
  try {
    storage.setItem(SESSION_KEY, JSON.stringify({ token: token || null, user, savedAt: now }));
  } catch {
    /* localStorage penuh/diblokir — abaikan */
  }
}

/** Perbarui HANYA stempel waktunya (dipakai tiap token baru didapat). */
export function touchSession(storage, now = Date.now()) {
  const sesi = readSession(storage);
  if (!sesi) return;
  saveSession(storage, { token: sesi.token, user: sesi.user }, now);
}

export function clearSession(storage) {
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    /* abaikan */
  }
}

/** Token masih berlaku? (buffer 1 menit sudah dipotong saat token dibuat) */
export function isTokenValid(token, now = Date.now()) {
  return !!(token && typeof token.expires_at === 'number' && token.expires_at > now);
}

/**
 * Boleh mencoba login diam-diam? Hanya kalau device ini PERNAH login (biar user
 * baru tidak langsung disodori popup Google sendiri) dan sesi terakhirnya belum
 * lewat jendela SILENT_REFRESH_MAX_AGE_MS.
 */
export function shouldAttemptSilentLogin({ hasLoggedInBefore, savedAt, now = Date.now() }) {
  if (!hasLoggedInBefore) return false;
  if (!savedAt) return false;
  return now - savedAt < SILENT_REFRESH_MAX_AGE_MS;
}
