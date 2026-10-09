/**
 * Test untuk penulisan tabel baterai ke Google Sheets.
 *
 * Latar: data tegangan (V) & resistansi (R) baterai pernah MELUBER ke kanan -
 * masuk ke kolom U ke atas, bukan ke kolom baterai. Penyebabnya rentang tulis
 * mengikuti jumlah isian teknisi (default lama 24), padahal template asli cuma
 * punya 12 kolom baterai (G..R). Akibatnya kolom Balanced charging (S) dan
 * Petugas pemeriksa (T) tertimpa.
 *
 * Test ini mengunci perilaku yang benar: rentang tulis TIDAK BOLEH melewati
 * lebar kolom item (colWidth). Sumbernya kode produksi src/lib/sheetsApi.js;
 * hanya import-nya yang diganti stub supaya bisa jalan di Node.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { CATEGORIES } from '../src/config/categories.js';

// ---- muat writeMonthlySlot APA ADANYA, dengan import eksternal di-stub ----
const sumberAsli = fs.readFileSync(new URL('../src/lib/sheetsApi.js', import.meta.url), 'utf8');

function sifatkan() {
  let s = sumberAsli.replace(
    /^import \{ getValidAccessToken \} from '\.\/googleAuth';$/m,
    'const getValidAccessToken = async () => "TOKEN_UJI";'
  );
  s = s.replace(
    /^import \{ matchTabNameFromCandidates \} from '\.\/tabNames';$/m,
    'const matchTabNameFromCandidates = async () => null;'
  );
  return 'data:text/javascript;base64,' + Buffer.from(s).toString('base64');
}

let modCache = null;
async function mod() {
  if (!modCache) modCache = await import(sifatkan());
  return modCache;
}

const KATEGORI_BATERAI = ['cat06', 'cat08', 'cat10', 'cat12', 'cat14', 'cat16'];

/** Jalankan writeMonthlySlot dgn jawaban tabel baterai, tangkap request-nya. */
async function tulis(catId, jumlahBaterai, tanggal = '2026-10-08') {
  let tertangkap = null;
  globalThis.fetch = async (url, opts = {}) => {
    tertangkap = { url, body: JSON.parse(opts.body) };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  const m = await mod();
  const cat = CATEGORIES.find((c) => c.id === catId);
  const item = cat.items.find((x) => x.inputType === 'battery_table');
  const values = Array.from({ length: jumlahBaterai }, (_, i) => `V:2,25${i % 10} \nR:0,3${i % 10}0`);

  await m.writeMonthlySlot('SID', 'TAB', cat.slotMap, {
    tanggal, petugas: 'Uji', answers: { [item.id]: values },
  });
  return { cat, item, tertangkap };
}

/** Ambil entri data yang menulis rentang SELAIN kolom tunggal (yaitu tabel baterai). */
function entriBaterai(body) {
  return body.data.find((d) => /![A-Z]+\d+:[A-Z]+\d+$/.test(d.range));
}

function colKeAngka(letter) {
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function angkaKeCol(n) {
  let s = '';
  while (n > 0) { n -= 1; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}

// ---------------------------------------------------------------------------
// Inti perbaikan: rentang tulis dibatasi lebar kolom template
// ---------------------------------------------------------------------------

test('baterai: 24 isian TIDAK menulis 24 kolom - dibatasi colWidth', async () => {
  const { tertangkap } = await tulis('cat06', 24);
  const entri = entriBaterai(tertangkap.body);
  const [awal, akhir] = entri.range.split('!')[1].split(':');
  const lebar = colKeAngka(akhir.replace(/\d+$/, '')) - colKeAngka(awal.replace(/\d+$/, '')) + 1;

  assert.equal(lebar, 12, 'tabel baterai harus 12 kolom (G..R), bukan 24');
  assert.equal(awal.replace(/\d+$/, ''), 'G');
  assert.equal(akhir.replace(/\d+$/, ''), 'R');
});

test('baterai: rentang tulis tidak pernah melewati kolom R (batas template asli)', async () => {
  for (const catId of KATEGORI_BATERAI) {
    // Muat sampai kapasitas template (24 = 12 kolom x 2 baris) -> tetap di dalam G..R.
    for (const jumlah of [6, 12, 24]) {
      const { tertangkap } = await tulis(catId, jumlah);
      const entri = entriBaterai(tertangkap.body);
      const akhir = entri.range.split('!')[1].split(':')[1].replace(/\d+$/, '');
      assert.ok(
        colKeAngka(akhir) <= 18,
        `${catId} dgn ${jumlah} isian menulis s/d kolom ${akhir} - melewati R (18)`
      );
    }
    // Di atas kapasitas -> DITOLAK dgn pesan jelas, bukan ditulis sebagian ke luar area.
    await assert.rejects(
      () => tulis(catId, 40),
      /melebihi kapasitas template/,
      `${catId}: 40 baterai harus ditolak, bukan ditulis sebagian`
    );
  }
});

test('baterai: tidak menimpa kolom Balanced charging (S) & Petugas pemeriksa (T)', async () => {
  for (const catId of KATEGORI_BATERAI) {
    const { cat, tertangkap } = await tulis(catId, 24);
    const entri = entriBaterai(tertangkap.body);
    const akhir = colKeAngka(entri.range.split('!')[1].split(':')[1].replace(/\d+$/, ''));
    const mulai = awalBaterai(cat);

    // Kolom Petugas SELALU ada & harus di kanan data baterai.
    // Kategori HFSPS (cat06/08/10) punya kolom Balanced charging tepat sesudah
    // baterai, jadi Petugasnya 2 kolom di kanan; kategori UPS (cat12/14/16)
    // tidak punya Balanced charging - Petugasnya tepat 1 kolom di kanan.
    assert.ok(
      akhir < cat.slotMap.petugasCol,
      `${catId}: data baterai s/d ${angkaKeCol(akhir)} menimpa kolom Petugas (${angkaKeCol(cat.slotMap.petugasCol)})`
    );

    // Kolom tepat setelah baterai (7+12 = 19 / S) harus dibiarkan utuh:
    // di HFSPS itu Balanced charging, di UPS itu Petugas pemeriksa.
    assert.ok(
      akhir < mulai + 12,
      `${catId}: data baterai menimpa kolom ${angkaKeCol(mulai + 12)}`
    );
  }
});

test('baterai: jumlah sel yang ditulis sama dgn lebar kolom', async () => {
  const { tertangkap } = await tulis('cat06', 24);
  const entri = entriBaterai(tertangkap.body);
  assert.equal(entri.values[0].length, 12);
  assert.ok(entri.values[0].every((v) => v === '' || typeof v === 'string'));
});

test('baterai: isian <= lebar kolom dibiarkan utuh (tidak dipotong)', async () => {
  const { tertangkap } = await tulis('cat06', 8);
  const entri = entriBaterai(tertangkap.body);
  assert.equal(entri.values[0].length, 8);
  assert.equal(entri.range.split('!')[1].split(':')[1].replace(/\d+$/, ''), 'N');
});

test('baterai: hanya 6 kategori baterai, semuanya colWidth 12 di kolom G', () => {
  const baterai = CATEGORIES.filter((c) => c.items?.some((i) => i.inputType === 'battery_table'));
  assert.equal(baterai.length, 6);
  for (const c of baterai) {
    const item = c.items.find((i) => i.inputType === 'battery_table');
    const ic = c.slotMap.itemColumns.find((x) => x.id === item.id);
    assert.equal(ic.colStart, 7, `${c.id}: tabel baterai harus mulai kolom G`);
    assert.equal(ic.colWidth, 12, `${c.id}: tabel baterai harus 12 kolom`);
    // Kolom Petugas harus di kanan data baterai. HFSPS: baterai G..R, Petugas T.
    // UPS: baterai G..R, Petugas tepat di S (tidak ada kolom Balanced charging),
    // jadi batasnya ">= ujung baterai + 1".
    assert.ok(
      c.slotMap.petugasCol > ic.colStart + ic.colWidth - 1,
      `${c.id}: kolom Petugas (${c.slotMap.petugasCol}) harus di kanan data baterai`
    );
  }
});

test('baterai: default isian di config tidak melebihi lebar kolom template', () => {
  for (const c of CATEGORIES) {
    const item = c.items?.find((i) => i.inputType === 'battery_table');
    if (!item) continue;
    const ic = c.slotMap.itemColumns.find((x) => x.id === item.id);
    assert.ok(
      (item.defaultBatteryCount || 0) <= ic.colWidth,
      `${c.id}: default ${item.defaultBatteryCount} baterai > lebar kolom ${ic.colWidth}`
    );
  }
});

function awalBaterai(cat) {
  const item = cat.items.find((i) => i.inputType === 'battery_table');
  return cat.slotMap.itemColumns.find((x) => x.id === item.id).colStart;
}

// ---------------------------------------------------------------------------
// Tata letak baris: ringkasan di anchor, data baterai di baris bawahnya
// ---------------------------------------------------------------------------

test('baterai: 24 isian ditulis di 2 baris DATA, bukan menimpa baris ringkasan', async () => {
  const { tertangkap } = await tulis('cat06', 24);
  const entri = tertangkap.body.data.filter((d) => /![A-Z]+\d+:[A-Z]+\d+$/.test(d.range));

  assert.equal(entri.length, 2, '24 baterai = 2 entri baris (12 + 12)');

  const baris = entri.map((e) => Number(e.range.match(/(\d+):/)[1]));
  const bulanRow = 29; // 2026-10-08 -> slot Oktober

  for (const r of baris) {
    assert.ok(r > bulanRow, `baris data (${r}) harus DI BAWAH baris ringkasan (${bulanRow})`);
    assert.equal(r % 2, 1, `baris data ${r} harus ganjil (baris data, bukan baris sisipan)`);
  }
  assert.deepEqual(baris, [31, 33], 'Oktober -> data baterai di baris 31 & 33');
  assert.equal(entri[0].values[0].length, 12);
  assert.equal(entri[1].values[0].length, 12);
});

test('baterai: ringkasan periode ditulis di baris anchor, bukan tempat data', async () => {
  const { tertangkap } = await tulis('cat06', 12);
  const ringkasan = tertangkap.body.data.find(
    (d) => !/![A-Z]+\d+:[A-Z]+\d+$/.test(d.range) && /Catatan/.test(String(d.values[0][0]))
  );

  assert.ok(ringkasan, 'harus ada entri ringkasan "Tgl: .. / Catatan: .."');
  assert.match(ringkasan.range, /!G29$/, 'ringkasan Oktober harus di G29 (baris anchor)');

  const data = tertangkap.body.data.filter((d) => /![A-Z]+\d+:[A-Z]+\d+$/.test(d.range));
  assert.equal(data.length, 1, '12 baterai = 1 baris data');
  assert.match(data[0].range, /!G31:R31$/, 'data 12 baterai di baris 31');

  // Baris ringkasan TIDAK BOLEH jadi tempat data baterai.
  for (const d of data) {
    assert.ok(!/!G29/.test(d.range), 'data baterai tidak boleh di baris 29 (baris ringkasan)');
  }
});

test('baterai: 12 isian di tiap kuartal selalu pakai baris data blok-nya', async () => {
  const peta = {
    '2026-03-10': [13, 15],
    '2026-06-10': [19, 21],
    '2026-09-10': [25, 27],
    '2026-12-10': [31, 33],
  };
  for (const [tgl, harap] of Object.entries(peta)) {
    const { tertangkap } = await tulis('cat06', 24, tgl);
    const baris = tertangkap.body.data
      .filter((d) => /![A-Z]+\d+:[A-Z]+\d+$/.test(d.range))
      .map((e) => Number(e.range.match(/(\d+):/)[1]));
    assert.deepEqual(baris, harap, `${tgl} harus menulis di baris ${harap.join(' & ')}`);
  }
});

// ---------------------------------------------------------------------------
// Kalimat jawaban "Tidak" (YesNoInput)
// ---------------------------------------------------------------------------

/**
 * Ambil HANYA badan fungsi dari src/components/YesNoInput.jsx.
 * File itu .jsx, jadi Node tidak bisa mem-parse seluruhnya tanpa transformasi.
 * negasiStandar/serializeYesNo sendiri JS murni -> ekstrak lalu jalankan.
 */
function potongFungsi(src, nama) {
  const start = src.indexOf(`function ${nama}(`);
  if (start < 0) throw new Error(`fungsi ${nama} tidak ditemukan di YesNoInput.jsx`);
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  throw new Error(`kurung ${nama} tidak seimbang`);
}

async function modulYesNo() {
  const src = fs.readFileSync(new URL('../src/components/YesNoInput.jsx', import.meta.url), 'utf8');
  const kode = `${potongFungsi(src, 'negasiStandar')}\n`
    + `${potongFungsi(src, 'serializeYesNo')}\n`
    + 'export { negasiStandar, serializeYesNo };';
  return import('data:text/javascript;base64,' + Buffer.from(kode).toString('base64'));
}

test('jawaban Tidak: kalimat negatif dibuat per-aturan, bukan sekadar "belum" di depan', async () => {
  const { negasiStandar, serializeYesNo } = await modulYesNo();

  const kasus = [
    ['Sudah dibersihkan', 'Belum dibersihkan'],
    ['Tidak ada kerusakan', 'Ada kerusakan'],
    ['Hasil pemeriksaan baik', 'Hasil pemeriksaan tidak baik'],
    ['Tidak boleh melebihi 80%', 'Melebihi 80%'],
    ['Terisi penuh', 'Tidak terisi penuh'],
  ];
  for (const [standar, harap] of kasus) {
    assert.equal(
      negasiStandar(standar), harap,
      `standar "${standar}" -> harus "${harap}"`
    );
  }

  // Jawaban "Ya" tetap apa adanya; "Tidak" memakai versi negatif.
  const cfg = { standar: 'Sudah dibersihkan' };
  assert.equal(serializeYesNo('YA', cfg), 'Sudah dibersihkan');
  assert.equal(serializeYesNo('TIDAK', cfg), 'Belum dibersihkan');
  // Jawaban kosong / item tanpa standar -> string kosong, bukan teks sampah.
  assert.equal(serializeYesNo('', cfg), '');
  assert.equal(serializeYesNo('TIDAK', {}), '');
});

test('jawaban Tidak: hasilnya tidak pernah sama persis dengan jawaban Ya', async () => {
  const { negasiStandar } = await modulYesNo();

  const daftar = CATEGORIES.flatMap((c) => (c.items || []).map((i) => i.standar)).filter(Boolean);
  assert.ok(daftar.length > 0, 'harus ada kalimat standar di config untuk diuji');

  for (const s of daftar) {
    const n = negasiStandar(s);
    if (!n) continue;
    assert.notEqual(
      n.trim().toLowerCase(), String(s).trim().toLowerCase(),
      `negasi "${s}" menghasilkan teks yang sama persis`
    );
  }
});
