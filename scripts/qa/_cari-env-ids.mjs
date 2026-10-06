/**
 * _cari-env-ids.mjs — temukan ID folder/file Drive yang dipakai aplikasi,
 * langsung dari Drive (bukan dari .env yang tidak ada di mesin ini).
 * Hasilnya dipakai mengisi .env.local untuk pengujian LOKAL saja.
 *
 * Jalankan: node scripts/qa/_cari-env-ids.mjs
 */
import fs from 'node:fs';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const D = 'https://www.googleapis.com/drive/v3/files';

const cari = async (q, fields = 'files(id,name,mimeType)') =>
  (await (await fetch(`${D}?q=${encodeURIComponent(q)}&fields=${fields}&pageSize=20&corpora=allDrives&includeItemsFromAllDrives=true&supportsAllDrives=true`,
    { headers: H })).json());

const tampil = (label, res) => {
  console.log(`\n--- ${label} ---`);
  for (const f of res.files || []) console.log(`   ${f.id}   ${f.mimeType.replace('application/vnd.google-apps.', 'g-').padEnd(12)} ${f.name}`);
  if (!(res.files || []).length) console.log('   (tidak ketemu)');
};

// Folder root yang dipakai aplikasi
tampil('folder "Checksheet"', await cari("name='Checksheet' and mimeType='application/vnd.google-apps.folder' and trashed=false"));
tampil('folder "Instrumen"', await cari("name='Instrumen' and mimeType='application/vnd.google-apps.folder' and trashed=false"));
tampil('folder "Dokumentasi Kegiatan"', await cari("name='Dokumentasi Kegiatan' and mimeType='application/vnd.google-apps.folder' and trashed=false"));
tampil('folder mengandung "Jadwal"', await cari("mimeType='application/vnd.google-apps.folder' and name contains 'Jadwal' and trashed=false"));
tampil('folder mengandung "Masuk"', await cari("mimeType='application/vnd.google-apps.folder' and name contains 'Masuk' and trashed=false"));
tampil('folder mengandung "Keluar"', await cari("mimeType='application/vnd.google-apps.folder' and name contains 'Keluar' and trashed=false"));

// File yang dipakai aplikasi
tampil('spreadsheet "Log Book Gangguan"', await cari("name contains 'Log Book Gangguan' and trashed=false"));
tampil('spreadsheet "Jadwal Kunjungan MR"', await cari("name contains 'Jadwal Kunjungan MR' and trashed=false"));
