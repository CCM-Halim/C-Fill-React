/**
 * QA 2/4 — UJI BACA DATA NYATA (READ-ONLY, tidak menulis apa pun).
 *
 * Meniru persis yang dilakukan aplikasi: token, endpoint, nama folder, nama tab,
 * dan fungsi parser yang sama. Tujuan: menemukan beda antara ASUMSI CONFIG dan
 * KENYATAAN Drive.
 *
 * Cara app mencari file (lihat driveApi.findAllSheetsForName): dicari DUA varian
 * nama sekaligus - "X.xlsx" DAN "X" - karena Drive membuang ekstensi saat
 * konversi. Kalau ketemu >1, app pakai yang PALING LAMA dibuat dan memunculkan
 * peringatan duplikat.
 *
 * Jalankan: npx vite-node scripts/qa/02-live-read.mjs
 */
import fs from 'node:fs';
import { SITES, BUILDING_CATEGORIES } from '../../src/config/sites.js';
import { CATEGORIES } from '../../src/config/categories.js';
import { INSTRUMENTS, INSTRUMENT_SLOT_MAP } from '../../src/config/instruments.js';
import { SLOT_MAP_OVERRIDES } from '../../src/config/slotMapOverrides.js';
import { computeSlotRow } from '../../src/lib/sheetsApi.js';
import { parseGangguanRows, summarizeGangguan } from '../../src/lib/gangguanLog.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const CHECK_ROOT = '1EBanKF2gfpdDY8e7gqCW_3dcP053sZjR';
const LOG_GANGGUAN_ID = '1UJZwW1CXeR0DUpoGWqWK4X3L6q7DfXWQbJ13kV6VHgw';

let lulus = 0; const temuan = [];
const cek = (nama, ok, detail = '') => {
  if (ok) { lulus += 1; console.log(`  ✔ ${nama}`); }
  else { temuan.push({ nama, detail }); console.log(`  ✖ ${nama}${detail ? ' — ' + detail : ''}`); }
};
const api = async (u) => { const r = await fetch(u, { headers: H }); const j = await r.json(); if (j.error) throw new Error(j.error.message); return j; };
const listKids = async (fid) => {
  const out = []; let tok = '';
  do {
    const j = await api(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${fid}' in parents and trashed=false`)}&fields=files(id,name,mimeType,size,createdTime),nextPageToken&pageSize=1000&supportsAllDrives=true${tok}`);
    out.push(...(j.files || [])); tok = j.nextPageToken ? `&pageToken=${j.nextPageToken}` : '';
  } while (tok);
  return out;
};
const tabs = async (sid) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties(title,gridProperties)`)).sheets.map((s) => s.properties);
const range = async (sid, tab, r) => (await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(`'${tab}'!${r}`)}`)).values || [];

const SHEET = 'application/vnd.google-apps.spreadsheet';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DIR = 'application/vnd.google-apps.folder';
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

console.log('=== A. FOLDER CHECK SHEET & BUILDING CATEGORY ===');
const rootKids = await listKids(CHECK_ROOT);
const bcFolders = {};
for (const k of rootKids.filter((k) => k.mimeType === DIR)) bcFolders[k.name] = k.id;
const bcHilang = BUILDING_CATEGORIES.filter((bc) => !bcFolders[bc]);
cek('semua 10 buildingCategory ada sebagai subfolder', bcHilang.length === 0, bcHilang.join(' | '));
console.log(`  subfolder lain: ${Object.keys(bcFolders).filter((n) => !BUILDING_CATEGORIES.includes(n)).join(', ')}`);

console.log('\n=== B. FILE SHEET SETIAP 69 SITE ===');
const petaSite = {};
const tanpaFile = []; const dobel = []; const adaXlsxMentah = [];
for (const [bc, fid] of Object.entries(bcFolders)) {
  if (!BUILDING_CATEGORIES.includes(bc)) continue;
  const files = await listKids(fid).catch(() => []);
  const sheets = files.filter((f) => f.mimeType === SHEET);
  const xlsxs = files.filter((f) => f.mimeType === XLSX);
  for (const s of SITES.filter((x) => x.buildingCategory === bc)) {
    const base = s.originalFileName.replace(/\.xlsx$/i, '');
    const kandidat = sheets.filter((f) => f.name === s.originalFileName || f.name === base)
      .sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
    const xlsxAsli = xlsxs.find((f) => f.name === s.originalFileName);
    if (xlsxAsli) adaXlsxMentah.push(s.originalFileName);
    if (!kandidat.length) { tanpaFile.push(`${bc} / ${s.originalFileName}`); continue; }
    if (kandidat.length > 1) dobel.push(`${s.originalFileName} (${kandidat.length} salinan)`);
    petaSite[s.originalFileName] = { id: kandidat[0].id, bc, salinan: kandidat.length };
  }
}
cek('semua 69 site punya file Google Sheets', tanpaFile.length === 0,
  `${tanpaFile.length} tanpa file: ${tanpaFile.slice(0, 6).join(' | ')}`);
console.log(`  sheet ditemukan: ${Object.keys(petaSite).length}/${SITES.length}`);
console.log(`  .xlsx asli masih tersimpan (arsip): ${adaXlsxMentah.length}/${SITES.length}`);
if (dobel.length) {
  console.log(`  ⚠ ${dobel.length} site punya >1 salinan Sheets (app pakai paling lama + muncul peringatan):`);
  dobel.slice(0, 8).forEach((d) => console.log(`     - ${d}`));
}

console.log('\n=== C. TAB KATEGORI & TAB VERIFIKASI DI FILE SITE (SEMUA 69) ===');
const tabHilang = []; const verifHilang = []; const slotLuarGrid = [];
let nFile = 0; let nTabDiperiksa = 0;
for (const s of SITES) {
  const info = petaSite[s.originalFileName];
  if (!info) continue;
  nFile += 1;
  let T; try { T = await tabs(info.id); } catch (e) { tabHilang.push(`${s.originalFileName}: ${e.message}`); continue; }
  const judul = T.map((t) => t.title);
  if (!judul.some((t) => norm(t) === norm('Lembar Verifikasi Pekerjaan'))) verifHilang.push(s.originalFileName);

  const catIds = (s.categoryIds || []).filter((c) => !['cat36', 'cat38'].includes(c));
  for (const c of CATEGORIES.filter((x) => catIds.includes(x.id))) {
    const sm = SLOT_MAP_OVERRIDES[s.originalFileName]?.[c.id] || c.slotMap;
    if (!sm) continue;
    const ketemu = judul.find((t) => t === c.sheetName) || judul.find((t) => norm(t) === norm(c.sheetName));
    if (!ketemu) { tabHilang.push(`${s.siteName} · ${c.short_name} → "${c.sheetName}"`); continue; }
    nTabDiperiksa += 1;
    if (sm.type === 'matrix') continue; // matrix: cek baris item, bukan slot bulan
    const row = computeSlotRow(sm, '2026-10-01');
    const barisCount = T.find((t) => t.title === ketemu)?.gridProperties?.rowCount || 0;
    if (row > barisCount) slotLuarGrid.push(`${s.siteName} · ${c.short_name}: slot ${row} > ${barisCount} baris`);
  }
}
cek('semua tab kategori yang dirujuk config ada di file site', tabHilang.length === 0,
  `${tabHilang.length} hilang: ${tabHilang.slice(0, 6).join(' || ')}`);
cek('tab "Lembar Verifikasi Pekerjaan" ada di semua 69 file', verifHilang.length === 0,
  verifHilang.slice(0, 6).join(' | '));
cek('slot Oktober 2026 masih di dalam jumlah baris sheet', slotLuarGrid.length === 0,
  slotLuarGrid.slice(0, 6).join(' || '));
console.log(`  file diperiksa: ${nFile} | tab kategori diperiksa: ${nTabDiperiksa}`);

console.log('\n=== D. KATEGORI MATRIX (APAR & Lightning) ===');
for (const c of CATEGORIES.filter((x) => x.slotMap?.type === 'matrix')) {
  const sitePakai = SITES.filter((s) => (s.categoryIds || []).includes(c.id));
  console.log(`  ${c.id} ${c.short_name}: dipakai ${sitePakai.length} site — ${sitePakai.slice(0, 3).map((s) => s.siteName).join(', ')}`);
  const target = sitePakai.find((s) => petaSite[s.originalFileName]);
  if (!target) { cek(`${c.id}: file site untuk uji matrix ada`, false); continue; }
  const T = await tabs(petaSite[target.originalFileName].id);
  const judul = T.map((t) => t.title);
  const ketemu = judul.find((t) => t === c.sheetName) || judul.find((t) => norm(t) === norm(c.sheetName));
  cek(`${c.id}: tab "${c.sheetName}" ada (di ${target.siteName})`, !!ketemu,
    ketemu ? '' : `tab tersedia: ${judul.slice(0, 8).join(', ')}`);
}

console.log('\n=== E. INSTRUMEN ===');
const instrKids = await listKids('1VlGnRNWYZ9Xp8iDxpk2-xd0oEf_uFw-3').catch(() => []);
const namaInstrumenDiDrive = instrKids.map((k) => k.name.replace(/\.xlsx$/i, ''));
const instrTanpaFile = INSTRUMENTS.filter((n) => !namaInstrumenDiDrive.includes(n));
cek('semua 32 instrumen punya file di folder Instrumen', instrTanpaFile.length === 0, instrTanpaFile.join(' | '));
const instrSheet = instrKids.filter((k) => k.mimeType === SHEET);
console.log(`  entri di folder: ${instrKids.length} | .xlsx: ${instrKids.filter((k) => k.mimeType === XLSX).length} | sudah jadi Sheets: ${instrSheet.length}`);
if (instrSheet.length) {
  const T = await tabs(instrSheet[0].id);
  const ketemu = T.map((t) => t.title).find((t) => norm(t) === norm('Instrumen Telekomunikasi'));
  cek(`tab "Instrumen Telekomunikasi" ada (${instrSheet[0].name})`, !!ketemu,
    ketemu ? '' : `tab: ${T.map((t) => t.title).join(', ')}`);
  if (ketemu) {
    const row = computeSlotRow(INSTRUMENT_SLOT_MAP, '2026-10-01');
    const bc = T.find((t) => t.title === ketemu).gridProperties.rowCount;
    cek(`slot instrumen Oktober 2026 (baris ${row}) ada di dalam grid (${bc} baris)`, row <= bc);
    const isi = await range(instrSheet[0].id, ketemu, `A${row}:H${row}`);
    console.log(`  isi baris slot Oktober: ${JSON.stringify(isi).slice(0, 160)}`);
  }
}

console.log('\n=== F. LOG BOOK GANGGUAN (6 tab) ===');
const logTabs = (await tabs(LOG_GANGGUAN_ID)).map((t) => t.title);
cek('6 tab Log Book Gangguan ada', logTabs.length === 6, logTabs.join(', '));
let totalSemua = 0; const ringkasTab = {};
for (const t of logTabs) {
  const rows = await range(LOG_GANGGUAN_ID, t, 'A1:Z400');
  const items = parseGangguanRows(rows, { tab: t });
  const s = summarizeGangguan(items);
  ringkasTab[t] = s;
  totalSemua += items.length;
  console.log(`  ${t}: ${items.length} baris | open ${s.open ?? '-'} | close ${s.closed ?? '-'}`);
}
cek('parser Log Gangguan mengembalikan kejadian dari semua tab', totalSemua > 0, `total ${totalSemua}`);

console.log('\n=== G. JADWAL KUNJUNGAN MR (folder 2026) ===');
const tahunKids = await listKids('1lezBJPao4Q_myGn38jRiEG1AHH1rpgCI').catch(() => []);
const bulanFolders = tahunKids.filter((k) => k.mimeType === DIR).map((k) => k.name);
console.log(`  subfolder di 2026: ${bulanFolders.join(' | ')}`);
cek('folder bulan berjalan (10. Oktober) ada', bulanFolders.some((n) => /oktober/i.test(n)),
  bulanFolders.join(' | '));
const okt = tahunKids.find((k) => /oktober/i.test(k.name));
if (okt) {
  const dalam = await listKids(okt.id).catch(() => []);
  console.log(`  isi ${okt.name}:`);
  dalam.slice(0, 5).forEach((k) => console.log(`     [${k.mimeType === SHEET ? 'SHEET' : k.mimeType === XLSX ? 'XLSX ' : 'FILE '}] ${k.name}`));
  const sheetJadwal = dalam.find((k) => k.mimeType === SHEET);
  if (sheetJadwal) {
    const T = await tabs(sheetJadwal.id);
    const tabName = T.map((t) => t.title).find((t) => norm(t).includes('jadwalkunjungan')) || T[0].title;
    const rows = await range(sheetJadwal.id, tabName, 'B3:O120');
    const { summarizeJadwal } = await import('../../src/lib/jadwalProgress.js');
    const j = summarizeJadwal(rows);
    console.log(`  tab "${tabName}" → ${rows.length} baris terbaca`);
    console.log(`  ringkasan: total ${j.total} | selesai ${j.finishedCount} | belum ${j.notYetCount}`);
    console.log(`  per periode: ${['1M', '3M', '6M', '1Y'].map((p) => `${p} ${j.periodBreakdown[p].finished}/${j.periodBreakdown[p].total}`).join(' | ')}`);
    console.log(`  rencana di kolom bantu sheet: ${JSON.stringify(j.sheetPlanCounters)}`);
    const cocok = ['1M', '3M', '6M', '1Y'].every((p) => j.periodBreakdown[p].total === j.sheetPlanCounters[p]);
    cek('penyebut donut == rencana di kolom bantu sheet', cocok, JSON.stringify(j.sheetPlanCounters));
    cek('donut tidak 0/0', ['1M', '3M', '6M', '1Y'].some((p) => j.periodBreakdown[p].total > 0));
  }
}

console.log('\n=== H. FOLDER DOKUMENTASI & JALUR ===');
for (const [nama, id] of [['Dokumentasi Kegiatan', '1j3JnzDKARyMMXxNBQAV-o462vvqRQSrE'], ['2026 (Jadwal)', '1lezBJPao4Q_myGn38jRiEG1AHH1rpgCI'], ['Instrumen', '1VlGnRNWYZ9Xp8iDxpk2-xd0oEf_uFw-3']]) {
  console.log(`  ${nama}: ${(await listKids(id)).length} entri`);
}
cek('semua folder dokumentasi & jalur dapat diakses', true);

console.log(`\nRINGKASAN UJI BACA: ${lulus} lulus, ${temuan.length} temuan`);
for (const t of temuan) console.log(`  ✖ ${t.nama}${t.detail ? ' — ' + t.detail : ''}`);
fs.writeFileSync('/tmp/qa-live-read.json', JSON.stringify({ lulus, temuan, petaSite, dobel, ringkasTab }, null, 1));
process.exit(temuan.length === 0 ? 0 : 1);
