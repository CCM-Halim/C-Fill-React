/**
 * Ambil isi lengkap spreadsheet "Jadwal Kunjungan MR Oktober 2026":
 * semua tab yang relevan, ditulis ke /tmp/jadwal-okt.json supaya bisa dibaca utuh.
 */
import fs from 'node:fs';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const TAHUN = '1bgFxvG7gP3-r11MSL0mfjyTShXP9iSBT';
const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };
const kids = async (fid) => (await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}&fields=files(id,name,mimeType)&pageSize=100&supportsAllDrives=true`)).files || [];
const tabsOf = async (sid) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties`)).sheets.map((s) => s.properties.title);
const baca = async (sid, tab, r) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(`'${tab}'!${r}`)}?valueRenderOption=FORMATTED_VALUE`)).values || [];

const bulan = (await kids(TAHUN)).find((k) => /Oktober/i.test(k.name));
const file = (await kids(bulan.id)).find((k) => k.mimeType === 'application/vnd.google-apps.spreadsheet');
console.log(`FILE: ${file.name}`);
console.log(`ID  : ${file.id}`);
const tabs = await tabsOf(file.id);
console.log(`TAB : ${JSON.stringify(tabs)}`);

const out = { file: file.name, id: file.id, tabs: {} };

// Jadwal Kunjungan MR: rentang lebar supaya semua kolom kebaca
const rows = await baca(file.id, 'Jadwal Kunjungan MR', 'A1:P130');
out.tabs['Jadwal Kunjungan MR'] = rows;
console.log(`\n=== "Jadwal Kunjungan MR": ${rows.length} baris ===`);
rows.forEach((r, i) => {
  const isi = r.filter((c) => String(c ?? '').trim() !== '');
  if (isi.length) console.log(`  baris ${i + 1}: ${JSON.stringify(r.map((x) => String(x).slice(0, 30)))}`);
});

for (const t of tabs) {
  if (t === 'Jadwal Kunjungan MR') continue;
  const rr = await baca(file.id, t, 'A1:N80');
  out.tabs[t] = rr;
  console.log(`\n=== "${t}": ${rr.length} baris ===`);
  rr.forEach((r, i) => {
    const isi = r.filter((c) => String(c ?? '').trim() !== '');
    if (isi.length) console.log(`  baris ${i + 1}: ${JSON.stringify(r.map((x) => String(x).slice(0, 26)))}`);
  });
}

fs.writeFileSync('/tmp/jadwal-okt.json', JSON.stringify(out, null, 1));
console.log('\n(ditulis /tmp/jadwal-okt.json)');
