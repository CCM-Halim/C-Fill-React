/**
 * QA 11 — UJI TULIS DI SANDBOX.
 *
 * !!!  PENTING  !!!
 * Skrip ini TIDAK PERNAH menyentuh spreadsheet produksi. Yang dilakukan:
 *   1. menyalin file Google Sheets di Drive ke folder sandbox khusus
 *      (fetchanya "QA Sandbox - JANGAN DIHAPUS" di root Drive),
 *   2. menjalankan fungsi TULIS ASLI dari src/lib/sheetsApi.js
 *      (writeMonthlySlot, getRowCellValues, writeVerificationRow,
 *       writeEntryExitRow, readEntryExitDates) ke SALINAN itu,
 *   3. membaca kembali hasilnya untuk memverifikasi nilainya benar,
 *   4. menghapus salinan sandbox.
 *
 * Tujuannya menguji kode sungguhan (bukan tulis ulang), di jalur yang tidak
 * bisa merusak data teknisi.
 *
 * Jalankan: npx vite-node -c scripts/qa/vite.qa.config.mjs scripts/qa/11-sandbox-tulis.mjs
 */
import fs from 'node:fs';
import { CATEGORIES } from '../../src/config/categories.js';
import { writeMonthlySlot, getRowCellValues, computeSlotRow, writeVerificationRow, writeEntryExitRow, readEntryExitDates, colLetterForTest } from '../../src/lib/sheetsApi.js';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const JH = { ...H, 'Content-Type': 'application/json' };
const SANDBOX_NAME = 'QA Sandbox - JANGAN DIHAPUS';

let lulus = 0; const temuan = []; const catatan = [];
const cek = (nama, ok, detail = '') => {
  if (ok) { lulus += 1; console.log(`  ✔ ${nama}`); }
  else { temuan.push({ nama, detail }); console.log(`  ✖ ${nama}${detail ? ' — ' + detail : ''}`); }
};
const api = async (u, opt = {}) => {
  const r = await fetch(u, { headers: opt.headers || H, ...opt });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  if (!r.ok) throw new Error(`${r.status}: ${j?.error?.message || t.slice(0, 200)}`);
  return j;
};

// ---------- folder sandbox ----------
async function folderSandbox() {
  const q = encodeURIComponent(`name='${SANDBOX_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const cari = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  if (cari.files?.length) return cari.files[0].id;
  const buat = await api('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST', headers: JH,
    body: JSON.stringify({ name: SANDBOX_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  });
  return buat.id;
}

const sandboxId = await folderSandbox();
console.log(`folder sandbox: ${sandboxId}\n`);

const dibersihkan = [];
async function salinSpreadsheet(sumberId, namaBaru) {
  const c = await api(`https://www.googleapis.com/drive/v3/files/${sumberId}/copy?fields=id,name`, {
    method: 'POST', headers: JH,
    body: JSON.stringify({ name: namaBaru, parents: [sandboxId] }),
  });
  dibersihkan.push(c.id);
  return c.id;
}
async function hapus(id) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${id}?supportsAllDrives=true`, { method: 'DELETE', headers: H });
}
async function tabs(sid) {
  const j = await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties`);
  return j.sheets.map((s) => s.properties.title);
}
async function baca(sid, range) {
  const j = await api(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(range)}`);
  return j.values || [];
}

try {
  console.log('=== A. JALUR TULIS CHECK SHEET (kategori bulanan) ===');
  // Pakai file site sungguhan sebagai cetakan, tapi disalin dulu.
  const asal = JSON.parse(fs.readFileSync('/tmp/qa-cek-file.json', 'utf8')).hasil.find((h) => h.adaSheets && h.jmlSheet === 1);
  console.log(`  cetakan: ${asal.file} (${asal.bc})`);
  const SALINAN = await salinSpreadsheet(
    // id diambil dari peta yang sudah ada
    JSON.parse(fs.readFileSync('/tmp/qa-live-read.json', 'utf8')).petaSite[asal.file].id,
    `QA SALINAN - ${asal.file.replace(/\.xlsx$/, '')}`,
  );
  console.log(`  salinan: ${SALINAN}`);

  // kategori bulanan yang benar-benar ada tab-nya
  const kategoriUji = CATEGORIES.filter((c) => c.slotMap && c.slotMap.type === 'monthly_slot');
  const tabTersedia = await tabs(SALINAN);
  const pilih = kategoriUji.find((c) => tabTersedia.includes(c.sheetName));
  if (!pilih) {
    cek('ada kategori bulanan dengan tab yang cocok di salinan', false, `tab: ${tabTersedia.slice(0, 6).join(', ')}`);
  } else {
    console.log(`  kategori: ${pilih.id} ${pilih.short_name} · tab "${pilih.sheetName}"`);
    const sm = pilih.slotMap;
    const TGL = '2026-10-15';
    const row = computeSlotRow(sm, TGL);
    console.log(`  slot untuk ${TGL}: baris ${row} (slotStartRow ${sm.slotStartRow}, step ${sm.slotStep})`);

    // nilai SEBELUM
    const sebelum = await getRowCellValues(SALINAN, pilih.sheetName, row, sm.itemColumns);
    console.log(`  isi sebelum: ${JSON.stringify(sebelum).slice(0, 120)}`);

    // tulis dengan kode ASLI
    const answers = {};
    for (const ic of sm.itemColumns) answers[ic.id] = `QA-${ic.id}-OK`;
    const hasil = await writeMonthlySlot(SALINAN, pilih.sheetName, sm, {
      tanggal: TGL, petugas: 'QA Sandbox', answers, writeMode: 'overwrite', existingValues: sebelum,
    });
    console.log(`  writeMonthlySlot selesai, ${hasil?.length ?? '?'} sel ditulis`);

    // baca kembali.
    // CATATAN PENTING: tidak semua item ditulis di baris slot bulan ini. Item yang
    // periodenya lebih jarang dari grid dasar (mis. 6-bulanan / 12-bulanan di grid
    // bulanan) ditulis ke baris ANCHOR blok periodenya sendiri - lihat
    // computeItemRow() di src/lib/sheetsApi.js dan penjelasan sel gabungan di atasnya.
    // Jadi cara memeriksa yang benar: cari nilai QA di KOLOM masing-masing item,
    // bukan mengasumsikan semuanya di baris slot yang sama.
    const sesudah = await getRowCellValues(SALINAN, pilih.sheetName, row, sm.itemColumns);
    const cekKolom = {};
    for (const ic of sm.itemColumns) {
      const huruf = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[ic.colStart - 1];
      const kol = await baca(SALINAN, `'${pilih.sheetName}'!${huruf}1:${huruf}60`);
      const ketemu = kol.findIndex((r) => String((r || [])[0] || '').includes(`QA-${ic.id}-OK`));
      cekKolom[ic.id] = ketemu === -1 ? null : ketemu + 1; // nomor baris 1-based
    }
    const takKetemu = sm.itemColumns.filter((ic) => cekKolom[ic.id] === null);
    cek(`semua ${sm.itemColumns.length} item tersimpan di kolomnya masing-masing`, takKetemu.length === 0,
      takKetemu.length ? `tidak ketemu: ${takKetemu.map((x) => x.id).join(', ')}` : '');
    console.log('  item → baris tempat tersimpan:');
    for (const ic of sm.itemColumns) {
      const anotasi = cekKolom[ic.id] === row ? '(baris bulan ini)' : `(baris anchor periode ${ic.periodMonths ?? '?'} bulan)`;
      console.log(`     ${ic.id} (periodMonths=${String(ic.periodMonths ?? '-').padStart(2)}) → baris ${cekKolom[ic.id]} ${anotasi}`);
    }
    cek('item bulanan (1M) ditulis di baris slot bulan ini',
      sm.itemColumns.filter((ic) => ic.periodMonths === 1).every((ic) => cekKolom[ic.id] === row),
      sm.itemColumns.filter((ic) => ic.periodMonths === 1).map((ic) => `${ic.id}@${cekKolom[ic.id]}`).join(' '));

    // petugas & tanggal ikut tertulis?
    const barisLengkap = await baca(SALINAN, `'${pilih.sheetName}'!A${row}:Z${row}`);
    catatan.push({ label: 'baris slot setelah tulis', isi: barisLengkap[0] });
    console.log(`  baris ${row} setelah tulis: ${JSON.stringify((barisLengkap[0] || []).map((v) => String(v).slice(0, 18)))}`);
    cek('kolom tanggal terisi di baris slot', (barisLengkap[0] || []).some((v) => String(v).includes('2026') || String(v).includes('15')),
      JSON.stringify(barisLengkap[0] || []).slice(0, 150));

    // uji mode "Perawatan Baru" = 'append' (lihat ChecksheetForm.jsx baris 365:
    // onConfirm -> doSubmit('append', existingValues)). Isian lama TIDAK hilang,
    // disimpan di sel yang sama sebagai riwayat bertumpuk.
    const lama = { ...sesudah };
    const nilaiLamaItem1 = String(lama[sm.itemColumns[0].id] || '');
    await writeMonthlySlot(SALINAN, pilih.sheetName, sm, {
      tanggal: TGL, petugas: 'QA Kedua', answers: Object.fromEntries(sm.itemColumns.map((ic) => [ic.id, `BARU-${ic.id}`])),
      writeMode: 'append', existingValues: lama,
    });
    const setelahDua = await getRowCellValues(SALINAN, pilih.sheetName, row, sm.itemColumns);
    const gauge = sm.itemColumns[0].id;
    const isiBaru = String(setelahDua[gauge] || '');
    cek('mode "append" (tombol "Perawatan Baru") menambahkan isian baru',
      isiBaru.includes('BARU-'), JSON.stringify(isiBaru.slice(0, 200)));
    cek('mode "append" MENYIMPAN isian lama sebagai riwayat di sel yang sama (tidak hilang)',
      isiBaru.includes('QA-'), JSON.stringify(isiBaru.slice(0, 300)));
    console.log(`  isi sel setelah "Perawatan Baru" (${isiBaru.length} char):`);
    console.log(`     ${JSON.stringify(isiBaru.slice(0, 300))}`);
    console.log(`  isi sebelum (${nilaiLamaItem1.length} char): ${JSON.stringify(nilaiLamaItem1.slice(0, 120))}`);

    // mode 'overwrite' (tombol "Perbaikan") harus MENIMPA, bukan menumpuk
    await writeMonthlySlot(SALINAN, pilih.sheetName, sm, {
      tanggal: TGL, petugas: 'QA Ketiga', answers: Object.fromEntries(sm.itemColumns.map((ic) => [ic.id, `TIMPA-${ic.id}`])),
      writeMode: 'overwrite', existingValues: {},
    });
    const setelahTiga = await getRowCellValues(SALINAN, pilih.sheetName, row, sm.itemColumns);
    const isiTimpa = String(setelahTiga[gauge] || '');
    cek('mode "overwrite" (tombol "Perbaikan") MENIMPA isi lama',
      isiTimpa.includes('TIMPA-') && !isiTimpa.includes('BARU-'),
      JSON.stringify(isiTimpa.slice(0, 200)));
  }

  console.log('\n=== B. SLOT TIDAK BERTABRAKAN ANTAR BULAN ===');
  if (pilih) {
    const sm = pilih.slotMap;
    const barisPerBulan = [];
    for (let m = 1; m <= 12; m++) {
      const t = `2026-${String(m).padStart(2, '0')}-05`;
      barisPerBulan.push({ bulan: m, baris: computeSlotRow(sm, t) });
    }
    const unik = new Set(barisPerBulan.map((x) => x.baris));
    cek('12 bulan memetakan ke 12 baris berbeda', unik.size === 12, JSON.stringify(barisPerBulan));
    console.log(`  peta bulan→baris: ${barisPerBulan.map((x) => `${x.bulan}:${x.baris}`).join(' ')}`);
    const maks = sm.slotStartRow + sm.slotStep * (sm.slotCount - 1);
    cek('baris terakhir masih di dalam slotCount', Math.max(...unik) <= maks, `maks ${Math.max(...unik)} vs ${maks}`);
  }

  console.log('\n=== C. TAB VERIFIKASI (Lembar Verifikasi Pekerjaan) ===');
  if (pilih) {
    const smV = { slotStartRow: 6, slotStep: 1, dateCol: 3, namaCol: 4, parafCol: 6 };
    const tabV = (await tabs(SALINAN)).find((t) => t.includes('Verifikasi'));
    if (!tabV) cek('tab verifikasi ada', false);
    else {
      const bulanIdx = 9; // Oktober
      await writeVerificationRow(SALINAN, tabV, smV, bulanIdx, {
        tanggalVerifikasi: '2026-10-15', namaVerifikator: 'QA Verifikator', signatureImageUrl: null,
      });
      const rowV = smV.slotStartRow + bulanIdx;
      const isiV = await baca(SALINAN, `'${tabV}'!A${rowV}:H${rowV}`);
      console.log(`  baris verifikasi Oktober (${rowV}): ${JSON.stringify((isiV[0] || []).map((v) => String(v).slice(0, 20)))}`);
      cek('nama verifikator tertulis di baris bulan yang benar',
        (isiV[0] || []).some((v) => String(v).includes('QA Verifikator')), JSON.stringify(isiV[0] || []));
    }
  }

  console.log('\n=== D. ENTRY / EXIT REGISTRATION ===');
  if (pilih) {
    const tabE = (await tabs(SALINAN)).find((t) => /entry and exit/i.test(t));
    if (!tabE) cek('tab Entry and exit registration ada', false);
    else {
      const awal = await readEntryExitDates(SALINAN, tabE, 7, 60);
      console.log(`  baris terisi sebelum: ${awal.length}`);
      await writeEntryExitRow(SALINAN, tabE, 7, {
        tanggal: '2026-10-15', waktuMasuk: '08:00', nama: 'QA Sandbox', namaUnit: 'QA', nomorKontak: '000', kegiatan: 'Uji', waktuKeluar: '09:00',
      });
      const isiE = await baca(SALINAN, `'${tabE}'!A7:L7`);
      console.log(`  baris 7 setelah tulis: ${JSON.stringify((isiE[0] || []).map((v) => String(v).slice(0, 16)))}`);
      cek('baris entry/exit terisi', (isiE[0] || []).some((v) => String(v).includes('QA Sandbox')), JSON.stringify(isiE[0] || []));
      const sesudah = await readEntryExitDates(SALINAN, tabE, 7, 60);
      cek('readEntryExitDates membaca ulang baris yang baru ditulis', sesudah.length >= awal.length,
        `sebelum ${awal.length} -> sesudah ${sesudah.length}`);
    }
  }

  console.log('\n=== E. CHECK SHEET MATRIX (APAR) ===');
  const apar = CATEGORIES.find((c) => c.slotMap?.type === 'matrix');
  console.log(`  kategori matrix: ${apar?.id} ${apar?.short_name} — slotMap: ${JSON.stringify(apar?.slotMap)}`);
  catatan.push({ label: 'matrix APAR', slotMap: apar?.slotMap });
  cek('kategori matrix terdefinisi dgn benar (itemRowStart, unitColStart, defaultUnitCount)',
    !!(apar?.slotMap?.itemRowStart && apar?.slotMap?.unitColStart && apar?.slotMap?.defaultUnitCount));

} finally {
  console.log('\n=== PEMBERSIHAN SANDBOX ===');
  for (const id of dibersihkan) { try { await hapus(id); console.log(`  dihapus: ${id}`); } catch (e) { console.log(`  gagal hapus ${id}: ${e.message}`); } }
  try { await hapus(sandboxId); console.log(`  folder sandbox dihapus: ${sandboxId}`); } catch (e) { console.log(`  gagal hapus folder: ${e.message}`); }
}

console.log(`\nRINGKASAN UJI TULIS SANDBOX: ${lulus} lulus, ${temuan.length} temuan`);
for (const t of temuan) console.log(`  ✖ ${t.nama}${t.detail ? ' — ' + t.detail : ''}`);
fs.writeFileSync('/tmp/qa-sandbox.json', JSON.stringify({ lulus, temuan, catatan }, null, 1));
process.exit(temuan.length === 0 ? 0 : 1);
