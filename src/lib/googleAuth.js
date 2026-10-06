/**
 * googleAuth.js
 * Login & manajemen access token pakai Google Identity Services (GIS).
 *
 * Pola penyimpanan (DIUBAH 6 Okt 2026): sesi disimpan di **localStorage**,
 * bukan sessionStorage. Sebelumnya sesi hilang begitu tab/browser ditutup,
 * sehingga teknisi harus login ulang tiap kali membuka aplikasi. Sekarang cukup
 * **login sekali** per device: saat app dibuka lagi, sesi dipulihkan dari
 * localStorage dan token disegarkan DIAM-DIAM (tanpa popup) — lihat
 * silentLogin() + lib/sessionStore.js.
 *
 * Yang tetap tidak bisa dipaksa: kalau cookie sesi Google milik *user* sudah
 * benar-benar hilang (dia logout dari Google sendiri / cookie pihak ketiga
 * dibersihkan browser), Google mewajibkan interaksi. Dalam kondisi itu app
 * tetap membuka halaman login — tapi tidak akan pernah minta login ulang selama
 * sesi masih bisa disegarkan.
 */

import {
  saveSession,
  readSession,
  clearSession,
  touchSession,
  isTokenValid,
  shouldAttemptSilentLogin,
  HAS_LOGGED_IN_BEFORE_KEY,
} from './sessionStore';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Penanda bahwa user MENEKAN tombol logout sendiri. Dipakai supaya app tidak
 * "membantu" login ulang diam-diam setelah dia sengaja keluar — itu justru
 * menjengkelkan dan bisa terasa seperti tidak bisa logout.
 */
const MANUAL_LOGOUT_KEY = 'cfill_manual_logout';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

let tokenClient = null;
let currentToken = null; // { access_token, expires_at }
let currentUser = null;  // { email, name, picture }

/**
 * Seragamkan bentuk token. Ada dua sumber bentuk:
 *  - token dari GIS (memakai `access_token` + `expires_in`)
 *  - token dari file token eksternal (memakai `token`)
 * Dipakai juga oleh skrip QA yang menyuntik sesi ke localStorage, jadi
 * keduanya harus diterima — bukan cuma bentuk GIS.
 */
function normalisasiToken(t) {
  if (!t || typeof t !== 'object') return null;
  const access = t.access_token || t.token;
  const exp = t.expires_at || (t.expiry ? new Date(t.expiry).getTime() : null);
  if (!access || !exp) return null;
  return { access_token: access, expires_at: Number(exp) };
}

function bacaStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function tulisStorage(key, val) {
  try { localStorage.setItem(key, val); } catch { /* abaikan */ }
}

/**
 * Pulihkan sesi dari localStorage begitu module ini dimuat (sebelum React
 * sempat render apapun) — biar refresh halaman maupun buka-ulang app nggak
 * sempat kelihatan layar login sama sekali.
 *
 * BEDA dengan sebelumnya: sesi diterima WALAU tokennya sudah kedaluwarsa.
 * Dulu token basi langsung dibuang di sini (itu sebabnya user terlempar ke
 * layar login sebelum app sempat coba menyegarkan token). Sekarang token basi
 * tetap dipakai sebagai "identitas" + pemicu penyegaran diam-diam.
 */
(function restoreSession() {
  const saved = readSession(localStorage);
  if (!saved) return;
  currentUser = saved.user;
  currentToken = normalisasiToken(saved.token);
})();

function persistSession() {
  if (currentUser) {
    saveSession(localStorage, { token: currentToken, user: currentUser });
  } else {
    clearSession(localStorage);
  }
}

function ensureClientIdConfigured() {
  if (!CLIENT_ID) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID belum diatur. Buat file .env berdasarkan .env.example ' +
      'dan isi dengan OAuth Client ID dari Google Cloud Console.'
    );
  }
}

let gisScriptPromise = null;

/**
 * Muat script Google Identity Services SECARA DINAMIS, cuma dipanggil pas
 * user beneran klik "Masuk dengan Gmail" (bukan dimuat statis dari index.html
 * di setiap halaman) - biar nggak ada auto-prompt "Sign in with Google" yang
 * muncul sendiri sebelum user klik apapun (perilaku FedCM di beberapa browser
 * begitu script ini kedeteksi ada di halaman).
 */
function loadGisScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Google Identity Services. Cek koneksi internet.'));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

async function ensureTokenClient() {
  ensureClientIdConfigured();
  await loadGisScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services belum termuat. Cek koneksi internet & reload halaman.');
  }
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        const pending = pendingAuth;
        pendingAuth = null;
        if (!pending) return;
        if (resp && resp.error) {
          pending.reject(resp.error);
          return;
        }
        currentToken = {
          access_token: resp.access_token,
          expires_at: Date.now() + (resp.expires_in * 1000) - 60000 // buffer 1 menit
        };
        fetchUserInfo().then((info) => {
          // Info user gagal diambil (jaringan), TAPI kita sudah punya user dari
          // sesi tersimpan -> pakai itu. Tanpa email kita tidak bisa cek
          // whitelist, jadi jangan lanjutkan diam-diam kalau memang tidak ada.
          if (!currentUser || !currentUser.email) {
            pending.reject('Gagal mengambil data akun Google. Cek koneksi lalu coba lagi.');
            return;
          }
          persistSession();
          tulisStorage(HAS_LOGGED_IN_BEFORE_KEY, 'true');
          pending.resolve({ token: currentToken, user: currentUser });
        }).catch((e) => {
          pending.reject(e?.message || 'Gagal mengambil info user Google.');
        });
      }
    });
  }
  return tokenClient;
}

// Catatan: client di-init SEKALI di ensureTokenClient(); callback-nya permanen
// dan mengirim hasil ke pendingAuth (promise yang sedang menunggu). Tidak ada
// lagi initTokenClient(onToken) per pemanggilan — pola itu yang dulu membuat
// klik pertama gagal karena requestAccessToken dipanggil sebelum init selesai.

/**
 * Preload script GIS + init token client TANPA popup. Dipanggil saat layar
 * login tampil, supaya klik pertama user sudah siap (tidak perlu muat script
 * dulu di dalam gesture klik — itu yang bikin klik pertama gagal).
 */
export function preloadAuth() {
  ensureTokenClient().catch(() => { /* gagal preload: login akan coba lagi saat klik */ });
}

let pendingAuth = null; // { resolve, reject } untuk request popup yang sedang berjalan

async function fetchUserInfo() {
  // Batasi 20 detik: di jaringan buruk permintaan ini bisa menggantung lama,
  // dan selama menggantung promise login tidak pernah selesai (penyebab
  // pesan "Timeout menunggu Google" muncul padahal popup sudah sukses).
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + currentToken.access_token },
      signal: ctrl.signal,
    });
    if (res.ok) {
      currentUser = await res.json();
    }
  } catch {
    /* biarkan currentUser apa adanya; pemanggil yang memutuskan */
  } finally {
    clearTimeout(t);
  }
  return currentUser;
}

/**
 * Coba dapetin token TANPA popup (silent) — manfaatin sesi Google browser yang
 * masih aktif + consent yang udah pernah diberikan sebelumnya. Dipanggil pas
 * aplikasi baru dibuka/di-refresh, biar teknisi nggak perlu klik "Login
 * dengan Google" ulang. Resolve `null` (BUKAN reject) kalau gagal — ini emang
 * cuma "coba dulu diam-diam", gagalnya wajar (mis. sesi Google browser udah
 * habis) dan BUKAN error yang perlu ditampilkan.
 */
export function silentLogin() {
  return new Promise((resolve) => {
    ensureTokenClient().then((client) => {
      pendingAuth = {
        resolve: (res) => resolve(res),
        reject: () => resolve(null), // silent: gagal = null, bukan error
      };
      client.requestAccessToken({ prompt: '' });
    }).catch(() => resolve(null));
  });
}

/**
 * Memicu popup login Google. Resolve dengan { token, user } kalau berhasil.
 * Kalau gagal, reject dengan error message yang jelas.
 *
 * Perbaikan klik-pertama-gagal: init client (muat script GIS) di-AWAIT dulu
 * sebelum requestAccessToken — sebelumnya request dipanggil sinkron padahal
 * init belum selesai sehingga tokenClient masih null dan popup tidak muncul.
 */
export async function login() {
  const client = await ensureTokenClient();
  return new Promise((resolve, reject) => {
    pendingAuth = { resolve, reject };
    try {
      // Di mobile/tablet, pakai prompt='select_account' untuk pastikan popup muncul
      const prompt = currentUser ? '' : 'select_account';
      client.requestAccessToken({ prompt });
    } catch (e) {
      pendingAuth = null;
      reject(new Error('Gagal memicu popup login Google. Pastikan JavaScript aktif & bukan blocked by browser.'));
    }
  });
}

/**
 * Apakah device/browser ini PERNAH berhasil login sebelumnya — dipakai buat
 * mutuskan apakah aman coba silentLogin() otomatis pas app dibuka (aman buat
 * yang udah pernah kasih consent, TAPI JANGAN buat user baru yang belum
 * pernah - itu yang bikin popup Google muncul sendiri sebelum user klik apapun).
 */
export function hasLoggedInBefore() {
  return bacaStorage(HAS_LOGGED_IN_BEFORE_KEY) === 'true';
}

/** User menekan logout sendiri? Kalau ya, jangan login ulang diam-diam. */
export function wasManuallyLoggedOut() {
  return bacaStorage(MANUAL_LOGOUT_KEY) === 'true';
}

/** Tandai sesi terakhir baru saja disegarkan (memperpanjang jendela silent refresh). */
function catatPenyegaranBerhasil() {
  tulisStorage(MANUAL_LOGOUT_KEY, 'false');
  tulisStorage(HAS_LOGGED_IN_BEFORE_KEY, 'true');
  touchSession(localStorage);
}

export function logout() {
  if (currentToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(currentToken.access_token, () => {});
  }
  currentToken = null;
  currentUser = null;
  persistSession();
  // Penanda logout sengaja — app tidak akan mencoba login ulang sendiri.
  tulisStorage(MANUAL_LOGOUT_KEY, 'true');
}

export function getCurrentUser() {
  return currentUser;
}

export function isLoggedIn() {
  return !!(currentToken && Date.now() < currentToken.expires_at);
}

/**
 * Boleh coba pulihkan sesi tanpa popup? Butuh: (1) user sudah pernah login,
 * (2) bukan habis logout sendiri, (3) sesi terakhir belum terlalu tua.
 */
export function bisaPulihkanSesiDiamDiam() {
  const sesi = readSession(localStorage);
  return shouldAttemptSilentLogin({
    hasLoggedInBefore: hasLoggedInBefore(),
    savedAt: sesi?.savedAt,
  }) && !wasManuallyLoggedOut();
}

/**
 * Mengambil access token yang masih valid. Kalau sudah expired, minta token baru
 * secara silent (tanpa popup, karena user sudah pernah consent sebelumnya).
 */
export async function getValidAccessToken() {
  if (isTokenValid(currentToken)) {
    return currentToken.access_token;
  }
  // Token expired -> refresh silent
  const client = await ensureTokenClient();
  return new Promise((resolve, reject) => {
    pendingAuth = {
      resolve: (res) => {
        catatPenyegaranBerhasil();
        resolve(res.token.access_token);
      },
      reject: () => reject(new Error('Sesi login berakhir. Silakan login ulang.')),
    };
    client.requestAccessToken({ prompt: '' });
  });
}
