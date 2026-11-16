import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colLetter, gabungKolom, rentangSlotBulanan, rentangMatrix, klemRentang, RENTANG_VERIFIKASI } from '../src/lib/tutupTahun.js';
import { CATEGORIES } from '../src/config/categories.js';
import { SLOT_MAP_OVERRIDES } from '../src/config/slotMapOverrides.js';
import { INSTRUMENT_SLOT_MAP } from '../src/config/instruments.js';

test('colLetter & gabungKolom', () => {
  assert.equal(colLetter(1), 'A'); assert.equal(colLetter(27), 'AA');
  assert.deepEqual(gabungKolom([4, 2, 3, 7, 8, 3]), [[2, 4], [7, 8]]);
});

test('instrumen: A10 dst - 12 baris, kolom tanggal+item+petugas', () => {
  // kolom A (tanggal), B..G (item), H (petugas) -> satu blok A..H
  assert.deepEqual(rentangSlotBulanan(INSTRUMENT_SLOT_MAP), ['A10:H21']);
});

test('slot kuartalan memakai slotStep: 4 slot x 3 baris = 12 baris', () => {
  const sm = { slotStartRow: 20, slotStep: 3, slotCount: 4, dateCol: 1, petugasCol: 5, itemColumns: [{ colStart: 2, colWidth: 2 }] };
  assert.deepEqual(rentangSlotBulanan(sm), ['A20:C31', 'E20:E31']);
});

test('explicitAnchors memperluas baris sampai akhir blok terakhir', () => {
  const sm = { slotStartRow: 10, slotStep: 1, slotCount: 12, dateCol: 1, itemColumns: [{ colStart: 2, colWidth: 1, periodMonths: 3, explicitAnchors: [10, 13, 16, 40] }] };
  assert.deepEqual(rentangSlotBulanan(sm), ['A10:B42']);
});

test('matrix: blok item x unit + sel tanggal', () => {
  assert.deepEqual(rentangMatrix({ itemRowStart: 7, unitColStart: 2, defaultUnitCount: 12, dateRow: 11 }, 4), ['B7:M10', 'B11']);
});

test('klemRentang memotong sesuai grid dan menolak yang di luar', () => {
  assert.equal(klemRentang('B7:I206', 100, 9), 'B7:I100');
  assert.equal(klemRentang('B7:I206', 6, 9), null);
  assert.equal(klemRentang('C6:D17', 50, 3), 'C6:C17');
});

test('semua kategori & override menghasilkan rentang valid, tidak menyentuh baris header', () => {
  let dicek = 0;
  for (const cat of CATEGORIES) {
    const maps = [cat.slotMap, ...Object.values(SLOT_MAP_OVERRIDES).map((o) => o[cat.id]).filter(Boolean)];
    for (const sm of maps) {
      const rs = sm.type === 'matrix' ? rentangMatrix(sm, (cat.items || []).length) : rentangSlotBulanan(sm);
      assert.ok(rs.length > 0, cat.id);
      for (const r of rs) {
        assert.match(r, /^[A-Z]+\d+(:[A-Z]+\d+)?$/, `${cat.id} ${r}`);
        const baris = Number(r.match(/^[A-Z]+(\d+)/)[1]);
        const awal = sm.type === 'matrix' ? Math.min(sm.itemRowStart, sm.dateRow || 1e9) : sm.slotStartRow;
        assert.ok(baris >= awal, `${cat.id}: ${r} di atas awal data ${awal}`);
        dicek++;
      }
    }
  }
  assert.ok(dicek > 50);
});

test('verifikasi: Jan-Des tanggal, nama, paraf', () => {
  assert.deepEqual(RENTANG_VERIFIKASI, ['C6:D17', 'F6:F17']);
});
