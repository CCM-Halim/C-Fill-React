/**
 * Ambil access token Google dari refresh token Hermes (~/.hermes/google_token.json).
 * Tulis ke /tmp/cfill_access_token.txt supaya bisa dipakai skrip Node/Python lain.
 * Nilai token TIDAK pernah dicetak.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tokenPath = path.join(os.homedir(), '.hermes', 'google_token.json');
const tok = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

const params = new URLSearchParams({
  client_id: tok.client_id,
  client_secret: tok.client_secret,
  refresh_token: tok.refresh_token,
  grant_type: 'refresh_token',
});

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: params,
});
const data = await res.json();
if (!data.access_token) {
  console.error('gagal refresh token:', JSON.stringify(data).slice(0, 300));
  process.exit(1);
}
fs.writeFileSync('/tmp/cfill_access_token.txt', data.access_token);
console.log('access token diperbarui, berlaku', data.expires_in, 'detik');
console.log('scope:', (data.scope || tok.scopes || '(tidak dilaporkan)').toString().slice(0, 400));
