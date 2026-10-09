/**
 * Test batas adaptif baterai - kapasitas dibaca dari MERGE tiap file, bukan
 * dari angka tetap di config.
 *
 * Latar: merge lebar menelan kolom. Di lokasi Repeater, r33 cuma punya G,H,I,J
 * (4 kolom) sementara K33:R34 satu sel lebar. Menulis 12 nilai ke G33:R33
 * menyisakan 5, dan Sheets API tetap membalas sukses. Test ini mengunci:
 * kapasitas mengikuti merge, nilai yang tak punya slot DILAPORKAN, bukan
 * dibuang diam-diam.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { CATEGORIES } from '../src/config/categories.js';

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

/** Jalankan writeMonthlySlot dengan merge tertentu; tangkap request tulis. */
async function tulisMerge(catId, jumlahBaterai, merges, tanggal = '2026-10-08') {
  let tertangkap = null;
  globalThis.fetch = async (url, opts = {}) => {
    if (!opts.method || opts.method === 'GET') {
      return { ok: true, status: 200, json: async () => ({ sheets: [{ properties: { title: 'TAB' }, merges }] }) };
    }
    tertangkap = { url, body: JSON.parse(opts.body) };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };

  const m = await mod();
  m.bersihkanCacheMerges();
  const cat = CATEGORIES.find((c) => c.id === catId);
  const item = cat.items.find((x) => x.inputType === 'battery_table');
  const values = Array.from({ length: jumlahBaterai }, (_, i) => `V:2,25${i % 10} \nR:0,3${i % 10}0`);

  let galat = null;
  try {
    await m.writeMonthlySlot('SID', 'TAB', cat.slotMap, {
      tanggal, petugas: 'Uji', answers: { [item.id]: values },
    });
  } catch (e) {
    galat = e;
  }
  return { cat, item, tertangkap, galat, m };
}

/** Semua entri yang menulis rentang sel (tabel baterai), urut kemunculan. */
function entriBaterai(body) {
  return body.data.filter((d) => /![A-Z]+\d+:[A-Z]+\d+$/.test(d.range));
}

// ---------------------------------------------------------------------------
// Logika kolom terbuka
// ---------------------------------------------------------------------------

test('merge: kolom ketelan merge lebar tidak dianggap slot', async () => {
  const m = await mod();
  // r33: G33:R34 satu sel lebar 12 kolom -> TIDAK ada slot baterai di baris itu.
  const merges = [{ startRowIndex: 32, endRowIndex: 34, startColumnIndex: 6, endColumnIndex: 18 }];
  const cols = m.kolomTerbukaDiBaris(merges, 33, 7, 12);
  assert.deepEqual(cols, []);
});

test('merge: kolom per-kolom tetap terbuka semua', async () => {
  const m = await mod();
  const merges = Array.from({ length: 12 }, (_, i) => ({
    startRowIndex: 30, endRowIndex: 31, startColumnIndex: 6 + i, endColumnIndex: 7 + i
  }));
  const cols = m.kolomTerbukaDiBaris(merges, 31, 7, 12);
  assert.equal(cols.length, 12);
  assert.deepEqual(cols, [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
});

test('merge: pola Repeater - r33 cuma G..J per-kolom', async () => {
  const m = await mod();
  const merges = [];
  ['G', 'H', 'I', 'J'].forEach((_, i) => {
    merges.push({ startRowIndex: 32, endRowIndex: 34, startColumnIndex: 6 + i, endColumnIndex: 7 + i });
  });
  merges.push({ startRowIndex: 32, endRowIndex: 34, startColumnIndex: 10, endColumnIndex: 18 });
  const cols = m.kolomTerbukaDiBaris(merges, 33, 7, 12);
  assert.deepEqual(cols, [7, 8, 9, 10]);
});

test('merge: merge di luar area baterai diabaikan', async () => {
  const m = await mod();
  // merge di kolom S (19) tidak boleh memengaruhi area G..R
  const merges = [{ startRowIndex: 30, endRowIndex: 31, startColumnIndex: 18, endColumnIndex: 21 }];
  const cols = m.kolomTerbukaDiBaris(merges, 31, 7, 12);
  assert.equal(cols.length, 12);
});

// ---------------------------------------------------------------------------
// Perencanaan tulis
// ---------------------------------------------------------------------------

test('rencana: nilai dipetakan ke kolom nyata, bukan rentang buta', async () => {
  const m = await mod();
  const slots = { rows: [{ row: 33, cols: [7, 8, 9, 10] }], capacity: 4 };
  const { rencana, terpakai } = m.rencanaTulisBaterai(['a', 'b', 'c', 'd'], slots);
  assert.equal(terpakai, 4);
  assert.deepEqual(rencana[0].values, ['a', 'b', 'c', 'd']);
  assert.match(rencana[0].range ? rencana[0].range : `G${rencana[0].row}`, /G/);
});

test('rencana: kolom bolong dipecah jadi rentang terpisah', async () => {
  const m = await mod();
  // G,H lalu bolong I..L, lanjut M,N
  const slots = { rows: [{ row: 31, cols: [7, 8, 13, 14] }], capacity: 4 };
  const { rencana, terpakai } = m.rencanaTulisBaterai(['a', 'b', 'c', 'd'], slots);
  assert.equal(terpakai, 4);
  assert.equal(rencana.length, 2, 'harus jadi 2 rentang karena kolom bolong');
  assert.deepEqual(rencana[0].values, ['a', 'b']);
  assert.equal(rencana[0].colStart, 7);
  assert.deepEqual(rencana[1].values, ['c', 'd']);
  assert.equal(rencana[1].colStart, 13);
});

test('rencana: kelebihan nilai dilaporkan sebagai sisa, bukan dibuang', async () => {
  const m = await mod();
  const slots = { rows: [{ row: 33, cols: [7, 8, 9, 10] }], capacity: 4 };
  const { terpakai, sisa } = m.rencanaTulisBaterai(['a', 'b', 'c', 'd', 'e', 'f'], slots);
  assert.equal(terpakai, 4);
  assert.equal(sisa, 2);
});

test('rencana: 24 nilai penuh terbagi rata di dua baris', async () => {
  const m = await mod();
  const slots = {
    rows: [
      { row: 31, cols: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
      { row: 33, cols: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
    ],
    capacity: 24,
  };
  const nilai = Array.from({ length: 24 }, (_, i) => `B${i + 1}`);
  const { rencana, terpakai, sisa } = m.rencanaTulisBaterai(nilai, slots);
  assert.equal(terpakai, 24);
  assert.equal(sisa, 0);
  assert.equal(rencana[0].row, 31);
  assert.equal(rencana[0].values[0], 'B1');
  assert.equal(rencana[1].row, 33);
  assert.equal(rencana[1].values[0], 'B13');
});

// ---------------------------------------------------------------------------
// Integrasi: tulis ke sheet
// ---------------------------------------------------------------------------

test('integrasi: 12 nilai di r33 hanya 4 slot -> DILAPORKAN, tidak hilang diam-diam', async () => {
  const merges = [];
  merges.push({ startRowIndex: 30, endRowIndex: 31, startColumnIndex: 6, endColumnIndex: 18 }); // r31 = 1 sel lebar
  ['G', 'H', 'I', 'J'].forEach((_, i) => {
    merges.push({ startRowIndex: 32, endRowIndex: 34, startColumnIndex: 6 + i, endColumnIndex: 7 + i });
  });
  merges.push({ startRowIndex: 32, endRowIndex: 34, startColumnIndex: 10, endColumnIndex: 18 });

  const { galat, tertangkap } = await tulisMerge('cat06', 12, merges);
  assert.ok(galat, 'harus melempar galat, bukan menulis sebagian');
  // Kapasitas nyata (dari merge) dicek lebih dulu, jadi pesannya menyebut angka
  // slot yang benar-benar tersedia - bukan janji dari config.
  assert.match(galat.message, /melebihi kapasitas template|tidak punya tempat/);
  assert.equal(tertangkap, null, 'tidak boleh ada penulisan parsial ke sheet');
});

test('integrasi: 24 nilai di layout normal -> G31:R31 + G33:R33, nol terbuang', async () => {
  const merges = [];
  [30, 32].forEach((r0) => {
    for (let i = 0; i < 12; i++) {
      merges.push({ startRowIndex: r0, endRowIndex: r0 + 1, startColumnIndex: 6 + i, endColumnIndex: 7 + i });
    }
  });
  merges.push({ startRowIndex: 28, endRowIndex: 30, startColumnIndex: 6, endColumnIndex: 18 }); // ringkasan r29

  const { tertangkap, galat } = await tulisMerge('cat06', 24, merges);
  assert.equal(galat, null);

  const entri = entriBaterai(tertangkap.body);
  assert.equal(entri.length, 2, 'harus 2 rentang: r31 dan r33');
  assert.equal(entri[0].range.split('!')[1], 'G31:R31');
  assert.equal(entri[1].range.split('!')[1], 'G33:R33');
  assert.equal(entri[0].values[0].length + entri[1].values[0].length, 24);
});

test('integrasi: 12 nilai di layout normal -> hanya r31', async () => {
  const merges = [];
  for (let i = 0; i < 12; i++) {
    merges.push({ startRowIndex: 30, endRowIndex: 31, startColumnIndex: 6 + i, endColumnIndex: 7 + i });
  }
  const { tertangkap, galat } = await tulisMerge('cat06', 12, merges);
  assert.equal(galat, null);
  const entri = entriBaterai(tertangkap.body);
  assert.equal(entri.length, 1);
  assert.equal(entri[0].range.split('!')[1], 'G31:R31');
});

test('integrasi: merge tak terbaca -> jatuh ke jalur lama, tidak gagal', async () => {
  let tertangkap = null;
  globalThis.fetch = async (url, opts = {}) => {
    if (!opts.method || opts.method === 'GET') {
      return { ok: false, status: 403, text: async () => 'forbidden' };
    }
    tertangkap = { url, body: JSON.parse(opts.body) };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const m = await mod();
  m.bersihkanCacheMerges();
  const cat = CATEGORIES.find((c) => c.id === 'cat06');
  const item = cat.items.find((x) => x.inputType === 'battery_table');
  const values = Array.from({ length: 12 }, (_, i) => `B${i + 1}`);

  await m.writeMonthlySlot('SID', 'TAB', cat.slotMap, {
    tanggal: '2026-10-08', petugas: 'Uji', answers: { [item.id]: values },
  });

  const entri = entriBaterai(tertangkap.body);
  assert.equal(entri.length, 1, 'jalur cadangan tetap menulis 12 nilai');
  assert.equal(entri[0].values[0].length, 12);
});
