/**
 * Pengganti src/lib/googleAuth.js saat kode app dijalankan DI LUAR browser
 * (untuk pengujian). Menyediakan fungsi yang sama, tapi mengambil access token
 * dari /tmp/cfill_access_token.txt alih-alih dari Google Identity Services.
 *
 * Dipakai lewat scripts/qa/vite.qa.config.mjs - src/ TIDAK diubah sama sekali.
 */
import fs from 'node:fs';

const TOKEN_PATH = '/tmp/cfill_access_token.txt';

function bacaToken() {
  return fs.readFileSync(TOKEN_PATH, 'utf8').trim();
}

export async function getValidAccessToken() {
  return bacaToken();
}

export function getCurrentUser() {
  return { email: 'qa-sandbox@uji-lokal', name: 'QA Sandbox' };
}

export function isLoggedIn() { return true; }
export function hasLoggedInBefore() { return true; }
export function preloadAuth() {}
export function silentLogin() {}
export function logout() {}
export async function login() { throw new Error('login() tidak dipakai di luar browser'); }
