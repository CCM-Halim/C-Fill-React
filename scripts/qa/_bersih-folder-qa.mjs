/**
 * _bersih-folder-qa.mjs — kosongkan folder QA di Drive supaya tidak menumpuk
 * sisa berkas uji. Dipanggil otomatis oleh scripts/qa/run-20.sh.
 *
 *   node scripts/qa/_bersih-folder-qa.mjs <folderId>
 */
import fs from 'node:fs';

const folderId = process.argv[2];
if (!folderId) { console.log('(tanpa folderId - dilewati)'); process.exit(0); }

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };

async function hapusRekursif(id, kedalaman = 0) {
  if (kedalaman > 5) return 0;
  const q = encodeURIComponent(`'${id}' in parents and trashed=false`);
  const res = await (await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=200`,
    { headers: H })).json();

  let total = 0;
  for (const f of res.files || []) {
    if (f.mimeType === 'application/vnd.google-apps.folder') {
      total += await hapusRekursif(f.id, kedalaman + 1);
    }
    await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?supportsAllDrives=true`,
      { method: 'DELETE', headers: H });
    total++;
  }
  return total;
}

const n = await hapusRekursif(folderId);
console.log(`Folder QA dibersihkan: ${n} item dihapus.`);
