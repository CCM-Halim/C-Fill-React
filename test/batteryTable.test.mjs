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
    for (const jumlah of [6, 12, 24, 40]) {
      const { tertangkap } = await tulis(catId, jumlah);
      const entri = entriBaterai(tertangkap.body);
      const akhir = entri.range.split('!')[1].split(':')[1].replace(/\d+$/, '');
      assert.ok(
        colKeAngka(akhir) <= 18,
        `${catId} dgn ${jumlah} isian menulis s/d kolom ${akhir} - melewati R (18)`
      );
    }
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
