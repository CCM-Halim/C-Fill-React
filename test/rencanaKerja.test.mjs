import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseTanggalJadwal, menitDariJam, rencanaPadaTanggal } from '../src/lib/rencanaKerja.js';
import { parseJadwalItems } from '../src/lib/jadwalProgress.js';

test('parseTanggalJadwal', () => {
  const d = parseTanggalJadwal('Senin,05 Oktober 2026');
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate()], [2026, 9, 5]);
  assert.equal(parseTanggalJadwal('Kamis, 1 Januari 2027').getFullYear(), 2027);
  assert.equal(parseTanggalJadwal(''), null);
  assert.equal(parseTanggalJadwal('Senin,05 Foo 2026'), null);
});

test('menitDariJam', () => {
  assert.equal(menitDariJam('9:00 AM'), 540);
  assert.equal(menitDariJam('10:00 PM'), 1320);
  assert.equal(menitDariJam('12:00 AM'), 0);
  assert.equal(menitDariJam('12:30 PM'), 750);
  assert.equal(menitDariJam('13:30'), 810);
  assert.equal(menitDariJam('?'), 9999);
});

test('rencanaPadaTanggal memakai data Oktober asli', () => {
  const raw = JSON.parse(fs.readFileSync(new URL('./fixtures/oktober-2026.B3-O120.json', import.meta.url)));
  const items = parseJadwalItems(Array.isArray(raw) ? raw : raw.rows);
  const r = rencanaPadaTanggal(items, new Date(2026, 9, 5));
  assert.equal(r.length, 4);
  assert.deepEqual(r.map((x) => x.jam), ['9:00 AM', '9:00 AM', '10:00 PM', '10:00 PM']);
  assert.equal(r[0].lokasi, 'K48 + 680 Base Station');
  assert.equal(rencanaPadaTanggal(items, new Date(2026, 9, 1)).length, 0); // tanggal tanpa lokasi
});
