/**
 * Susun rencana kerja Senin-Jumat minggu depan (5-9 Okt 2026) dari
 * "Jadwal Kunjungan MR Oktober 2026", + cek silang dengan tab "Shift BIPO".
 * Tulis hasil lengkap ke /tmp/rencana-minggu.json
 */
import fs from 'node:fs';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const SID = '1H62ttfzOcVTuGMdbTdVvprWHNp7ymp4QkldjVKGQkV4';
const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };
const baca = async (tab, r) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${SID}/values/${encodeURIComponent(`'${tab}'!${r}`)}?valueRenderOption=FORMATTED_VALUE`)).values || [];

const jadwal = await baca('Jadwal Kunjungan MR', 'A1:P120');
const shift = await baca('Shift BIPO', 'A1:N40');

// ---- peta shift: nama -> { '05/10': 'M', ... } ----
const DATE_COLS = ['01/10', '02/10', '03/10', '04/10', '05/10', '06/10', '07/10', '08/10', '09/10', '10/10'];
const petaShift = {};
for (const r of shift) {
  const nama = String(r[1] || '').trim();
  if (!nama || nama === 'Nama' || /Shift|Jam Kerja|Jadwal Masuk|Hari ini|Besok|Kemarin|Pagi|Siang|Malam/.test(nama)) continue;
  const v = {};
  DATE_COLS.forEach((d, i) => { const x = String(r[4 + i] || '').trim(); if (x) v[d] = x; });
  if (Object.keys(v).length) petaShift[nama] = v;
}

// ---- baris jadwal ----
const HARI = { Senin: 'Sen', Selasa: 'Sel', Rabu: 'Rab', Kamis: 'Kam', Jumat: 'Jum' };
const rencana = {};
for (const r of jadwal) {
  const hariTgl = String(r[1] || '').trim();      // "Senin,05 Oktober 2026"
  const m = hariTgl.match(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!m) continue;
  const [, hari, tgl, bulan, tahun] = m;
  if (!HARI[hari]) continue;                       // hanya Senin-Jumat
  if (Number(tgl) < 5 || Number(tgl) > 9) continue; // minggu depan: 5-9 Okt
  const lokasi = String(r[3] || '').trim();
  if (!lokasi) continue;
  const key = `${hari} ${tgl}/${bulan.slice(0, 3)}/${tahun.slice(2)}`;
  (rencana[key] = rencana[key] || []).push({
    jam: String(r[2] || '').trim(),
    lokasi,
    kegiatan: String(r[4] || '').trim(),
    pic: String(r[6] || '').trim(),
    temuan: String(r[7] || '').trim(),
    status: String(r[9] || '').trim(),
    _tgl: `${String(tgl).padStart(2, '0')}/10`,
  });
}

// ---- cek silang shift ----
const KODE = { P: 'Pagi 08-16', S: 'Siang 16-22', M: 'Malam 22-08', L: 'LIBUR', C: 'Cuti', PM: '?', R: '?' };
console.log('=== RENCANA KERJA 5-9 OKTOBER 2026 (dari spreadsheet) ===\n');
for (const [tgl, daftar] of Object.entries(rencana)) {
  const [, dd] = tgl.split(' ')[1].split('/');
  console.log(`▌ ${tgl.toUpperCase()} — ${daftar.length} pekerjaan`);
  for (const p of daftar) {
    const sh = p.pic ? (petaShift[p.pic]?.[`${dd}/10`] || '?') : '-';
    const jamShift = p.jam === '10:00 PM' ? 'M' : p.jam === '9:00 AM' ? 'P' : '?';
    const cocok = !p.pic ? '' : (sh === jamShift ? '✓' : `⚠ (shift ${sh}=${KODE[sh] || sh})`);
    console.log(`   ${p.jam.padEnd(9)} ${p.lokasi}`);
    console.log(`      kegiatan: ${p.kegiatan || '(kosong)'} | PIC: ${p.pic || '(BELUM DITENTUKAN)'} | shift: ${sh} ${cocok}`);
    if (p.temuan) console.log(`      temuan bawa: ${JSON.stringify(p.temuan)}`);
  }
  console.log('');
}

console.log('\n=== BEBAN PER PERSONIL (minggu ini 5-9 Okt) ===');
const beban = {};
for (const daftar of Object.values(rencana)) for (const p of daftar) {
  const k = p.pic || '(tanpa PIC)';
  beban[k] = (beban[k] || 0) + 1;
}
Object.entries(beban).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`   ${k.padEnd(12)} ${v} pekerjaan`));

console.log('\n=== SHIFT BIPO 5-9 OKT (P=Pagi 08-16, S=Siang 16-22, M=Malam 22-08, L=Libur) ===');
console.log(`   ${'Nama'.padEnd(12)} Sen(05) Sel(06) Rab(07) Kam(08) Jum(09)`);
for (const [nama, v] of Object.entries(petaShift)) {
  console.log(`   ${nama.padEnd(12)} ${['05/10', '06/10', '07/10', '08/10', '09/10'].map((d) => String(v[d] || '-').padEnd(7)).join(' ')}`);
}

fs.writeFileSync('/tmp/rencana-minggu.json', JSON.stringify({ rencana, petaShift, beban }, null, 1));
console.log('\n(ditulis /tmp/rencana-minggu.json)');
