/**
 * _buat-folder-qa.mjs — siapkan folder sementara di Drive untuk pengujian
 * unggah, lalu tulis ID-nya ke /tmp/qa-folder-id.txt.
 */
import fs from 'node:fs';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };
const NAMA = '_QA-C-Fill-Sementara';

const q = encodeURIComponent(
  `name='${NAMA}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
const cari = await (await fetch(
  `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=5`,
  { headers: H })).json();

let id = cari.files?.[0]?.id;

if (!id) {
  const buat = await (await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST', headers: H,
    body: JSON.stringify({ name: NAMA, mimeType: 'application/vnd.google-apps.folder' }),
  })).json();
  id = buat.id;
  console.log(`Folder QA dibuat: ${id}`);
} else {
  console.log(`Folder QA sudah ada: ${id}`);
}

fs.writeFileSync('/tmp/qa-folder-id.txt', id);
