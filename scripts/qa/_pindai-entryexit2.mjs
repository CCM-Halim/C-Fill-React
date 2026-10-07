/**
 * _pindai-entryexit2.mjs — pindai ulang memakai NILAI MENTAH (serial tanggal).
 * Read-only. Hasil -> /tmp/entryexit-scan2.json
 */
import fs from 'node:fs';
const TOK = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const ROOT = '1EBanKF2gfpdDY8e7gqCW_3dcP053sZjR';
const TAB = 'Entry and exit registration';

async function drive(p) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files${p}`, { headers: { Authorization: `Bearer ${TOK}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(`Drive ${r.status}`);
  return j;
}
async function sheets(sid, p) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}${p}`, { headers: { Authorization: `Bearer ${TOK}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status}`);
  return j;
}
function serialKeTanggal(n) {
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return { th: d.getUTCFullYear(), bl: d.getUTCMonth() + 1, hr: d.getUTCDate() };
}
const pad = (n) => String(n).padStart(2, '0');

const bcFolder = await drive(`?q=${encodeURIComponent(`'${ROOT}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&fields=files(id,name)&pageSize=100&supportsAllDrives=true`);
const folders = bcFolder.files || [];

const hasil = [];
let nFile = 0, nOkt = 0, nDobel = 0, nErr = 0, nDeserialisasi = 0;

for (const f of folders) {
  let token = null;
  const files = [];
  do {
    const q = encodeURIComponent(`'${f.id}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
    const r = await drive(`?q=${q}&fields=nextPageToken,files(id,name,createdTime)&pageSize=100&supportsAllDrives=true${token ? '&pageToken=' + token : ''}`);
    files.push(...(r.files || []));
    token = r.nextPageToken;
  } while (token);

  for (const s of files) {
    nFile++;
    try {
      const v = await sheets(s.id, `/values/${encodeURIComponent(`'${TAB}'!B7:B206`)}?valueRenderOption=UNFORMATTED_VALUE`);
      const kolom = (v.values || []).map((r) => r[0]);
      const okt = [];
      let nonSerial = 0;
      kolom.forEach((c, i) => {
        if (typeof c === 'number' && isFinite(c)) {
          const t = serialKeTanggal(c);
          if (t.bl === 10 && t.th === 2026) okt.push({ baris: 7 + i, tgl: `${pad(t.hr)}/10/2026` });
        } else if (String(c ?? '').trim() !== '') {
          nonSerial++;
          // tanggal yang bukan angka (ditulis sebagai teks)
          const teks = String(c);
          const m = teks.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (m && m[1] === '2026' && m[2] === '10') okt.push({ baris: 7 + i, tgl: `(teks) ${teks.slice(0, 10)}` });
        }
      });
      if (nonSerial) nDeserialisasi++;

      const catatan = { bc: f.name, file: s.name, id: s.id, dibuat: s.createdTime?.slice(0, 10), okt, nonSerial };
      if (okt.length) nOkt++;
      if (okt.length > 1) { nDobel++; catatan.dobel = true; }
      hasil.push(catatan);
      process.stdout.write(okt.length > 1 ? '!' : okt.length === 1 ? '.' : 'o');
    } catch (e) {
      nErr++;
      hasil.push({ bc: f.name, file: s.name, id: s.id, error: String(e.message).slice(0, 60) });
      process.stdout.write('X');
    }
  }
}

console.log(`\n\n================= RINGKASAN (nilai mentah) =================`);
console.log(`file diperiksa              : ${nFile}`);
console.log(`sudah ada isian Oktober     : ${nOkt}`);
console.log(`BARIS DOBEL Oktober         : ${nDobel}`);
console.log(`file dgn tanggal bukan-angka: ${nDeserialisasi}`);
console.log(`gagal dibaca                : ${nErr}`);

if (nDobel) {
  console.log(`\n--- SITE DENGAN ISIAN DOBEL (Oktober 2026) ---`);
  for (const h of hasil.filter((x) => x.dobel)) {
    console.log(`\n  ${h.bc}\n    ${h.file}  (file dibuat ${h.dibuat})`);
    console.log(`    ${h.id}`);
    h.okt.forEach((o) => console.log(`      baris ${o.baris}: ${o.tgl}`));
  }
}

fs.writeFileSync('/tmp/entryexit-scan2.json', JSON.stringify(hasil, null, 1));
console.log(`\nhasil lengkap: /tmp/entryexit-scan2.json`);
