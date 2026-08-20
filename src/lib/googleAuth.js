/**
 * googleAuth.js
 * Login & manajemen access token pakai Google Identity Services (GIS).
 *
 * Pola yang dipakai: OAuth 2.0 Token Client (implicit-ish, tapi lewat GIS resmi,
 * bukan deprecated gapi.auth2). Access token disimpan di memori (bukan
 * localStorage) untuk keamanan; kalau halaman di-refresh, user perlu login ulang
 * (klik 1 tombol, biasanya langsung tanpa perlu pilih akun lagi kalau browser
 * masih ingat sesi Google-nya).
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

let tokenClient = null;
let currentToken = null; // { access_token, expires_at }
let currentUser = null;  // { email, name, picture }

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
      fetchUserInfo().then(() => onToken(currentToken, null));
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
      resolve(token.access_token);
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}
