/**
 * QA 1/4 — PEMERIKSAAN STATIS C-Fill.
 * Tanpa jaringan, tanpa risiko: hanya memeriksa konsistensi konfigurasi dan
 * logika murni. Dijalankan: npx vite-node scripts/qa/01-statistik.mjs
 *
 * CATATAN: beberapa temuan awal di skrip ini ternyata SALAH karena asumsi
 * pengujian, bukan bug aplikasi:
 *  - slotMap kategori matrix punya bentuk lain (itemRowStart/unitColStart),
 *    jadi tidak punya slotCount/slotStep — memang begitu.
 *  - INSTRUMENT_SLOT_MAP itu SATU peta bersama untuk 32 instrumen, bukan
 *    peta per-instrumen.
 *  - computeSlotRow menerima tanggal format ISO "YYYY-MM-DD" (dari <input
 *    type="date">), bukan "DD/MM/YYYY". new Date('01/02/2026') = 2 Januari.
 * Ketiganya sudah dikoreksi di bawah.
 */
import { BUILDING_CATEGORIES, SITES } from '../../src/config/sites.js';
import { CATEGORIES } from '../../src/config/categories.js';
import { INSTRUMENTS, INSTRUMENT_SLOT_MAP } from '../../src/config/instruments.js';
import { SLOT_MAP_OVERRIDES } from '../../src/config/slotMapOverrides.js';
import { ALLOWED_EMAILS, isAllowedEmail, EXTRA_ALLOWED_EMAILS } from '../../src/config/access.js';
import { FOREMAN_EMAILS, isForemanEmail } from '../../src/config/foremen.js';
import { computeSlotRow } from '../../src/lib/sheetsApi.js';

let lulus = 0; const temuan = [];
const cek = (nama, syarat, detail = '') => {
  if (syarat) { lulus += 1; console.log(`  ✔ ${nama}`); }
  else { temuan.push({ nama, detail }); console.log(`  ✖ ${nama}${detail ? ' — ' + detail : ''}`); }
};
const info = (s) => console.log('    ' + s);

console.log('=== 1. KATEGORI ===');
const idKategori = new Set(CATEGORIES.map((c) => c.id));
const dupId = CATEGORIES.map((c) => c.id).filter((v, i, a) => a.indexOf(v) !== i);
cek('tidak ada id kategori ganda', dupId.length === 0, dupId.join(','));

const kataItemKosong = CATEGORIES.filter((c) => !c.items || c.items.length === 0);
cek('semua kategori punya item', kataItemKosong.length === 0, kataItemKosong.map((c) => c.id).join(','));

// inputType kosong = jatuh ke kotak teks bebas (memang disengaja di ChecksheetForm).
const INPUT_TYPE_DIKENAL = new Set([
  'yes_no', 'status_only', 'measurement_multi', 'battery_table', 'status_ohm',
  'measurement_ohm', 'unit_value_table', 'pemadaman', 'sensor_checklist',
]);
const tipeTakDikenal = {};
for (const c of CATEGORIES) {
  for (const it of c.items) {
    if (it.inputType && !INPUT_TYPE_DIKENAL.has(it.inputType)) {
      tipeTakDikenal[it.inputType] = (tipeTakDikenal[it.inputType] || 0) + 1;
    }
  }
}
cek('tidak ada inputType yang tidak punya komponennya', Object.keys(tipeTakDikenal).length === 0,
  JSON.stringify(tipeTakDikenal));

const idItemGanda = [];
for (const c of CATEGORIES) {
  const ids = c.items.map((i) => i.id);
  const d = ids.filter((v, i, a) => a.indexOf(v) !== i);
  if (d.length) idItemGanda.push(`${c.id}:${d.join(',')}`);
}
cek('id item unik di tiap kategori', idItemGanda.length === 0, idItemGanda.join(' | '));

// slotMap: matrix punya bentuk berbeda, jadi diperiksa terpisah sesuai tipenya.
const slotRusak = [];
for (const c of CATEGORIES) {
  const sm = c.slotMap;
  if (!sm) { slotRusak.push(`${c.id} tanpa slotMap`); continue; }
  if (sm.type === 'matrix') {
    if (!(sm.itemRowStart >= 1)) slotRusak.push(`${c.id} (matrix) itemRowStart=${sm.itemRowStart}`);
    if (!(sm.unitColStart >= 1)) slotRusak.push(`${c.id} (matrix) unitColStart=${sm.unitColStart}`);
    if (!(sm.defaultUnitCount >= 1)) slotRusak.push(`${c.id} (matrix) defaultUnitCount=${sm.defaultUnitCount}`);
    continue;
  }
  const ids = new Set(c.items.map((i) => i.id));
  for (const ic of (sm.itemColumns || [])) {
    if (!ids.has(ic.id)) slotRusak.push(`${c.id}.${ic.id} (tidak ada di items)`);
  }
  if (!(sm.slotCount >= 1)) slotRusak.push(`${c.id} slotCount=${sm.slotCount}`);
  if (!(sm.slotStep >= 1)) slotRusak.push(`${c.id} slotStep=${sm.slotStep}`);
  if (!(sm.slotStartRow >= 1)) slotRusak.push(`${c.id} slotStartRow=${sm.slotStartRow}`);
}
cek('slotMap konsisten dgn daftar item (monthly & matrix)', slotRusak.length === 0,
  slotRusak.slice(0, 6).join(' | '));

const sebaran = {};
for (const c of CATEGORIES) {
  for (const it of c.items) {
    const k = it.inputType || '(teks bebas)';
    sebaran[k] = (sebaran[k] || 0) + 1;
  }
}
info(`kategori: ${CATEGORIES.length} | total item: ${CATEGORIES.reduce((n, c) => n + c.items.length, 0)}`);
info('inputType: ' + JSON.stringify(sebaran));

console.log('\n=== 2. SITE ===');
const ID_NON_SITE = new Set(['cat36', 'cat38']);
const siteTanpaKategori = SITES.filter((s) => !s.categoryIds || s.categoryIds.length === 0);
cek('semua site punya daftar kategori', siteTanpaKategori.length === 0,
  siteTanpaKategori.map((s) => s.siteName).join(', '));

const kategoriHilang = [];
for (const s of SITES) {
  for (const cid of (s.categoryIds || [])) {
    if (!idKategori.has(cid) && !ID_NON_SITE.has(cid)) kategoriHilang.push(`${s.siteName} -> ${cid}`);
  }
}
cek('semua categoryIds merujuk kategori yang ada', kategoriHilang.length === 0,
  `${kategoriHilang.length} rujukan hilang: ${kategoriHilang.slice(0, 5).join(' | ')}`);

cek('semua site punya originalFileName',
  SITES.every((s) => !!s.originalFileName),
  SITES.filter((s) => !s.originalFileName).map((s) => s.siteName).join(', '));

const siteDup = SITES.map((s) => `${s.buildingCategory}::${s.siteName}`)
  .filter((v, i, a) => a.indexOf(v) !== i);
cek('tidak ada site ganda', siteDup.length === 0, siteDup.slice(0, 3).join(' | '));

cek('semua buildingCategory site terdaftar',
  SITES.every((s) => BUILDING_CATEGORIES.includes(s.buildingCategory)),
  [...new Set(SITES.filter((s) => !BUILDING_CATEGORIES.includes(s.buildingCategory)).map((s) => s.buildingCategory))].join(' | '));

cek('setiap buildingCategory punya minimal 1 site',
  BUILDING_CATEGORIES.every((bc) => SITES.some((s) => s.buildingCategory === bc)),
  BUILDING_CATEGORIES.filter((bc) => !SITES.some((s) => s.buildingCategory === bc)).join(' | '));

// Kategori yang dirujuk site tapi tidak punya slotMap -> tidak bisa diisi
const kategoriDipAI = new Set(SITES.flatMap((s) => s.categoryIds || []));
const tanpaSlot = CATEGORIES.filter((c) => kategoriDipAI.has(c.id) && !c.slotMap);
cek('kategori yang dipakai site semuanya punya slotMap', tanpaSlot.length === 0,
  tanpaSlot.map((c) => `${c.id}:${c.short_name}`).join(' | '));

// originalFileName ganda: kalau >1 site menunjuk file .xlsx yang sama, tulisan bisa bertabrakan
const hitungFile = {};
for (const s of SITES) hitungFile[s.originalFileName] = (hitungFile[s.originalFileName] || 0) + 1;
const fileGanda = Object.entries(hitungFile).filter(([, n]) => n > 1);
cek('tidak ada dua site memakai file .xlsx yang sama', fileGanda.length === 0,
  `berbagi file: ${fileGanda.slice(0, 4).map(([f, n]) => `${f} (${n} site)`).join(' | ')}`);

info(`site: ${SITES.length} | buildingCategory: ${BUILDING_CATEGORIES.length} | file .xlsx unik: ${Object.keys(hitungFile).length}`);

console.log('\n=== 3. INSTRUMEN ===');
cek('jumlah instrumen = 32', INSTRUMENTS.length === 32, `ada ${INSTRUMENTS.length}`);
cek('tidak ada nama instrumen ganda',
  INSTRUMENTS.filter((v, i, a) => a.indexOf(v) !== i).length === 0,
  INSTRUMENTS.filter((v, i, a) => a.indexOf(v) !== i).join(', '));
// INSTRUMENT_SLOT_MAP = satu peta bersama untuk semua instrumen (bukan per instrumen).
cek('peta slot instrumen lengkap',
  INSTRUMENT_SLOT_MAP.slotStartRow >= 1 && INSTRUMENT_SLOT_MAP.slotStep >= 1
  && INSTRUMENT_SLOT_MAP.slotCount >= 1 && Array.isArray(INSTRUMENT_SLOT_MAP.itemColumns));
info(`instrumen: ${INSTRUMENTS.length} (memakai 1 peta slot bersama, ${INSTRUMENT_SLOT_MAP.itemColumns.length} item)`);

console.log('\n=== 4. OVERRIDE SLOTMAP (8 file template khusus) ===');
const overrideRusak = [];
const namaFileSite = new Set(SITES.map((s) => s.originalFileName));
for (const [file, perKategori] of Object.entries(SLOT_MAP_OVERRIDES)) {
  if (!namaFileSite.has(file)) overrideRusak.push(`${file} (tidak dipakai site mana pun)`);
  for (const [cid, sm] of Object.entries(perKategori)) {
    if (!idKategori.has(cid)) overrideRusak.push(`${file}.${cid} (kategori tidak ada)`);
    if (sm.itemColumns && !sm.itemColumns.length) overrideRusak.push(`${file}.${cid} itemColumns kosong`);
  }
}
cek('override menunjuk file & kategori yang ada', overrideRusak.length === 0, overrideRusak.join(' | '));
info(`file dengan override: ${Object.keys(SLOT_MAP_OVERRIDES).length}`);

console.log('\n=== 5. AKSES & FOREMAN ===');
cek('daftar email akses tidak kosong', ALLOWED_EMAILS.length > 0, `${ALLOWED_EMAILS.length} email`);
cek('semua foreman otomatis boleh masuk',
  FOREMAN_EMAILS.every((e) => isAllowedEmail(e)), FOREMAN_EMAILS.join(', '));
cek('email di luar daftar ditolak',
  !isAllowedEmail('orang.luar@gmail.com') && !isAllowedEmail('') && !isAllowedEmail(null));
cek('cek email tidak peka huruf besar/kecil',
  isAllowedEmail(FOREMAN_EMAILS[0].toUpperCase()));
cek('isForemanEmail benar untuk foreman, salah untuk yang bukan',
  isForemanEmail(FOREMAN_EMAILS[0]) && !isForemanEmail('teknisi@gmail.com') && !isForemanEmail(null));
cek('tidak ada email ganda di daftar akses',
  ALLOWED_EMAILS.filter((v, i, a) => a.indexOf(v) !== i).length === 0,
  ALLOWED_EMAILS.filter((v, i, a) => a.indexOf(v) !== i).join(','));
info(`akses: ${ALLOWED_EMAILS.length} email (${FOREMAN_EMAILS.length} foreman + ${EXTRA_ALLOWED_EMAILS.length} tambahan)`);
info('email yang boleh masuk: ' + ALLOWED_EMAILS.join(', '));

console.log('\n=== 6. LOGIKA SLOT BULAN (computeSlotRow) ===');
// Tanggal dari <input type="date"> = "YYYY-MM-DD".
const sm12 = { slotStartRow: 6, slotStep: 1, slotCount: 12 };
const harapan = [
  ['2026-01-01', 6], ['2026-01-15', 6], ['2026-02-01', 7], ['2026-02-28', 7],
  ['2026-03-31', 8], ['2026-04-30', 9], ['2026-06-30', 11], ['2026-09-30', 14],
  ['2026-10-31', 15], ['2026-12-31', 17],
];
const salahSlot = [];
for (const [tgl, baris] of harapan) {
  const got = computeSlotRow(sm12, tgl);
  if (Number(got) !== baris) salahSlot.push(`${tgl} -> ${got} (harusnya ${baris})`);
}
cek('slot 12-bulanan: Jan–Des 2026 tepat', salahSlot.length === 0, salahSlot.join(' | '));

// Kategori yang cuma punya item 3/6/12-bulanan -> slot lebih sedikit.
const smKuartal = { slotStartRow: 10, slotStep: 1, slotCount: 4 };
cek('slot 4 (kuartalan): Jan-Mar -> baris 10, Apr-Jun -> 11, Jul-Sep -> 12, Okt-Des -> 13',
  [computeSlotRow(smKuartal, '2026-01-15'), computeSlotRow(smKuartal, '2026-05-15'),
    computeSlotRow(smKuartal, '2026-08-15'), computeSlotRow(smKuartal, '2026-11-15')].join(',') === '10,11,12,13',
  [computeSlotRow(smKuartal, '2026-01-15'), computeSlotRow(smKuartal, '2026-05-15'),
    computeSlotRow(smKuartal, '2026-08-15'), computeSlotRow(smKuartal, '2026-11-15')].join(','));

const smSemester = { slotStartRow: 10, slotStep: 1, slotCount: 2 };
cek('slot 2 (semesteran): Jan-Jun -> 10, Jul-Des -> 11',
  computeSlotRow(smSemester, '2026-03-01') === 10 && computeSlotRow(smSemester, '2026-08-01') === 11);

const smTahunan = { slotStartRow: 10, slotStep: 1, slotCount: 1 };
cek('slot 1 (tahunan): selalu baris yang sama',
  computeSlotRow(smTahunan, '2026-01-01') === 10 && computeSlotRow(smTahunan, '2026-12-31') === 10);

// slotStep 2 (dua bulan sekali)
const smStep2 = { slotStartRow: 10, slotStep: 2, slotCount: 6 };
cek('slotStep=2 menghasilkan jarak antar slot 2 baris',
  computeSlotRow(smStep2, '2026-01-01') === 10 && computeSlotRow(smStep2, '2026-02-01') === 12,
  `${computeSlotRow(smStep2, '2026-01-01')}, ${computeSlotRow(smStep2, '2026-02-01')}`);

// Tanggal tidak valid: tidak boleh diam-diam menulis ke slot Januari.
const tglTdkValid = ['', 'bukan tanggal', null, undefined, '2026-13-45'];
const hasilTdkValid = tglTdkValid.map((t) => {
  try { return computeSlotRow(sm12, t); } catch (e) { return 'ERROR'; }
});
info(`tanggal tidak valid ${JSON.stringify(tglTdkValid)} -> ${JSON.stringify(hasilTdkValid)}`);
cek('tanggal tidak valid TIDAK menghasilkan baris slot yang salah-menyesatkan (NaN bukan angka)',
  hasilTdkValid.every((v) => Number.isNaN(Number(v)) || v === 'ERROR'),
  `dapat ${JSON.stringify(hasilTdkValid)} — pemanggil harus menolak input tanggal kosong`);

console.log(`\nRINGKASAN STATIS: ${lulus} lulus, ${temuan.length} temuan`);
for (const t of temuan) console.log(`  ✖ ${t.nama}${t.detail ? ' — ' + t.detail : ''}`);
process.exit(temuan.length === 0 ? 0 : 1);
