/**
 * Ambil isi spreadsheet "Jadwal Kunjungan MR <Bulan> <Tahun>" dan tab "Shift BIPO",
 * keluarkan sebagai JSON ke stdout (dipakai make-rencana-minggu.py).
 *
 *   node scripts/qa/_ambil-jadwal.mjs [--bulan Oktober] [--tahun 2026]
 *
 * Struktur keluaran:
 *   { jadwal: { "Senin 05/10/2026": [ {jam,lokasi,kegiatan,pic,temuan,status} ] },
 *     petaShift: { "Iqbal": { "05/10": "M", ... } },
 *     meta: { file, bulan, tahun } }
 */
import fs from 'node:fs';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf('--' + nama);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : bawaan;
};
const BULAN = arg('bulan', 'Oktober');
const TAHUN = Number(arg('tahun', '2026'));

// Folder akar tempat subfolder tahun berada.
const ROOT_JADWAL = arg('root', '1bgFxvG7gP3-r11MSL0mfjyTShXP9iSBT');

const api = async (u) => {
  const r = await fetch(u, { headers: H });
  const j = await r.json();
  if (j.error) throw new Error(`Drive/Sheets error: ${j.error.message}`);
  return j;
};
const kids = async (fid) => (await api(
  `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}`
  + `&fields=files(id,name,mimeType)&pageSize=500&supportsAllDrives=true`)).files || [];
const baca = async (sid, tab, range) => (await api(
  `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/`
  + `${encodeURIComponent(`'${tab}'!${range}`)}?valueRenderOption=FORMATTED_VALUE`)).values || [];

// --- cari folder bulan, lalu file jadwal di dalamnya (sama seperti logika app) ---
let anak = await kids(ROOT_JADWAL);
// kalau ROOT_JADWAL ternyata folder tahun, langsung pakai; kalau bukan, cari subfolder tahun.
if (!anak.some((k) => new RegExp(BULAN, 'i').test(k.name))) {
  const folderTahun = anak.find((k) => k.mimeType.includes('folder') && k.name.trim() === String(TAHUN));
  if (folderTahun) anak = await kids(folderTahun.id);
}
const folderBulan = anak.find((k) => k.mimeType.includes('folder') && new RegExp(BULAN, 'i').test(k.name));
if (!folderBulan) throw new Error(`Folder bulan "${BULAN}" tidak ditemukan`);

const dalam = await kids(folderBulan.id);
let file = dalam.find((f) => f.mimeType === 'application/vnd.google-apps.spreadsheet' && f.name.includes(String(TAHUN)));
if (!file) file = dalam.find((f) => f.mimeType === 'application/vnd.google-apps.spreadsheet');
if (!file) throw new Error(`File jadwal tidak ditemukan di folder "${folderBulan.name}"`);

// --- tab jadwal: cocokkan persis, lalu tanpa spasi ---
const meta = await api(`https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=sheets.properties`);
const judul = meta.sheets.map((s) => s.properties.title);
const norm = (s) => s.replace(/\s+/g, '').toLowerCase();
const tabJadwal = judul.includes('Jadwal Kunjungan MR')
  ? 'Jadwal Kunjungan MR'
  : judul.find((t) => norm(t) === norm('Jadwal Kunjungan MR'));
if (!tabJadwal) throw new Error(`Tab jadwal tidak ditemukan. Tab tersedia: ${JSON.stringify(judul)}`);
const tabShift = judul.find((t) => /shift/i.test(t)) || null;

// --- baca jadwal ---
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const rows = await baca(file.id, tabJadwal, 'A1:P130');
const jadwal = {};
for (const r of rows) {
  const hariTgl = String(r[1] || '').trim();
  const m = hariTgl.match(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!m) continue;
  const [, hari, tgl, bln, thn] = m;
  const lokasi = String(r[3] || '').trim();
  if (!lokasi) continue;                       // baris tanggal tanpa pekerjaan
  // Kunci pakai tanggal ISO (YYYY-MM-DD) supaya tidak bergantung nama bulan.
  // Nama bulan di sheet bisa "Oktober"/"Okt", dan strftime Python ikut locale -
  // keduanya bikin pencocokan gagal kalau pakai string.
  const NOMOR_BULAN = ['januari','februari','maret','april','mei','juni','juli',
    'agustus','september','oktober','november','desember'];
  const idxBulan = NOMOR_BULAN.indexOf(String(bln).toLowerCase());
  if (idxBulan === -1) continue;
  const iso = `${thn}-${String(idxBulan + 1).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`;
  const kunci = iso;
  (jadwal[kunci] = jadwal[kunci] || []).push({
    hari,
    jam: String(r[2] || '').trim(),
    lokasi,
    kegiatan: String(r[4] || '').trim(),
    pic: String(r[6] || '').trim(),
    temuan: String(r[7] || '').trim(),
    status: String(r[9] || '').trim(),
  });
}

// --- baca shift ---
const petaShift = {};
if (tabShift) {
  const sr = await baca(file.id, tabShift, 'A1:N40');
  // baris 5 berisi header tanggal (01/10, 02/10, ...)
  const barisHeader = sr.find((r) => r.some((c) => /^\d{2}\/\d{2}$/.test(String(c || '').trim())));
  const kolomTgl = {};
  if (barisHeader) {
    barisHeader.forEach((c, i) => {
      const t = String(c || '').trim();
      if (/^\d{2}\/\d{2}$/.test(t)) kolomTgl[i] = t;
    });
  }
  for (const r of sr) {
    const nama = String(r[1] || '').trim();
    if (!nama || nama === 'Nama') continue;
    if (/^(Shift|Jam Kerja|Jadwal Masuk|Hari ini|Besok|Kemarin|Pagi|Siang|Malam)/i.test(nama)) continue;
    const v = {};
    for (const [i, t] of Object.entries(kolomTgl)) {
      const kode = String(r[Number(i)] || '').trim();
      if (kode) v[t] = kode;
    }
    if (Object.keys(v).length) petaShift[nama] = v;
  }
}

console.log(JSON.stringify({
  jadwal, petaShift,
  meta: { file: file.name, fileId: file.id, tabJadwal, tabShift, bulan: BULAN, tahun: TAHUN },
}, null, 1));
