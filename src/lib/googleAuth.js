/**
 * googleAuth.js
 * Login & manajemen access token pakai Google Identity Services (GIS).
 *
 * Pola yang dipakai: OAuth 2.0 Token Client (implicit-ish, tapi lewat GIS resmi,
 * bukan deprecated gapi.auth2). Token & info user disimpan di sessionStorage
 * (bukan localStorage) - jadi REFRESH halaman nggak perlu login ulang (sesi
 * tetap ada selama tab ini masih terbuka), tapi begitu tab/browser ditutup
 * total, sesi otomatis hilang (lebih aman drpd localStorage yang bertahan
 * selamanya sampai dihapus manual).
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SESSION_KEY = 'cfill_auth_session_v1';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

let tokenClient = null;
let currentToken = null; // { access_token, expires_at }
let currentUser = null;  // { email, name, picture }

// Pulihkan sesi dari sessionStorage begitu module ini dimuat (sebelum React
// sempat render apapun) - biar refresh halaman nggak sempat kelihatan layar
// login sama sekali kalau sesi lama masih valid.
(function restoreSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.token && saved.token.expires_at > Date.now()) {
      currentToken = saved.token;
      currentUser = saved.user;
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
})();

function persistSession() {
  if (currentToken && currentUser) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: currentToken, user: currentUser }));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
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

function initTokenClient(onToken) {
  ensureClientIdConfigured();
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    throw new Error('Google Identity Services belum termuat. Cek koneksi internet & reload halaman.');
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) {
        onToken(null, resp.error);
        return;
      }
      currentToken = {
        access_token: resp.access_token,
        expires_at: Date.now() + (resp.expires_in * 1000) - 60000 // buffer 1 menit
      };
      fetchUserInfo().then(() => {
        persistSession();
        onToken(currentToken, null);
      });
    }
  });
}

async function fetchUserInfo() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + currentToken.access_token }
  });
  if (res.ok) {
    currentUser = await res.json();
  }
  return currentUser;
}

/**
 * Coba dapetin token TANPA popup (silent) - manfaatin sesi Google browser yang
 * masih aktif + consent yang udah pernah diberikan sebelumnya. Dipanggil pas
 * aplikasi baru dibuka/di-refresh, biar teknisi nggak perlu klik "Login
 * dengan Google" ulang tiap kali refresh halaman. Resolve `null` (BUKAN
 * reject) kalau gagal - ini emang cuma "coba dulu diam-diam", gagalnya wajar
 * (mis. sesi Google browser udah habis / belum pernah login sama sekali) dan
 * BUKAN error yang perlu ditampilkan - biarkan fallback ke tombol login biasa.
 */
export function silentLogin() {
  return new Promise((resolve) => {
    try {
      initTokenClient((token) => {
        resolve(token ? { token, user: currentUser } : null);
      });
      tokenClient.requestAccessToken({ prompt: '' });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Memicu popup login Google. Resolve dengan { token, user } kalau berhasil.
 */
export function login() {
  return new Promise((resolve, reject) => {
    initTokenClient((token, error) => {
      if (error || !token) {
        reject(new Error(error || 'Login dibatalkan.'));
        return;
      }
      resolve({ token, user: currentUser });
    });
    tokenClient.requestAccessToken({ prompt: currentUser ? '' : 'select_account' });
  });
}

export function logout() {
  if (currentToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(currentToken.access_token, () => {});
  }
  currentToken = null;
  currentUser = null;
  persistSession();
}

export function getCurrentUser() {
  return currentUser;
}

export function isLoggedIn() {
  return !!(currentToken && Date.now() < currentToken.expires_at);
}

/**
 * Mengambil access token yang masih valid. Kalau sudah expired, minta token baru
 * secara silent (tanpa popup, karena user sudah pernah consent sebelumnya).
 */
export async function getValidAccessToken() {
  if (currentToken && Date.now() < currentToken.expires_at) {
    return currentToken.access_token;
  }
  // Token expired -> refresh silent
  return new Promise((resolve, reject) => {
    initTokenClient((token, error) => {
      if (error || !token) {
        reject(new Error('Sesi login berakhir. Silakan login ulang.'));
        return;
      }
      persistSession();
      resolve(token.access_token);
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}
