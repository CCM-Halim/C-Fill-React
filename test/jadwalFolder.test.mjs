import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBulanTahun, pilihFolderTahun, kandidatPersis, kandidatTerbaru, pilihFileJadwal } from '../src/lib/jadwalFolder.js';

const F = (name, modifiedTime = '2026-10-01T00:00:00Z') => ({ id: name, name, modifiedTime });

test('parseBulanTahun: nama folder berbagai bentuk', () => {
  assert.deepEqual(parseBulanTahun('9. September'), { bulan: 8, tahun: null });
  assert.deepEqual(parseBulanTahun('01. Januari 2027'), { bulan: 0, tahun: 2027 });
  assert.deepEqual(parseBulanTahun('Jadwal Kunjungan MR Mei 2028'), { bulan: 4, tahun: 2028 });
  assert.deepEqual(parseBulanTahun('2027'), { bulan: null, tahun: 2027 });
});

test('folder tahun dipilih hanya kalau namanya persis tahun', () => {
  const e = [F('2026'), F('2027'), F('Arsip 2027')];
  assert.equal(pilihFolderTahun(e, 2027).name, '2027');
  assert.equal(pilihFolderTahun(e, 2028), null);
});

test('persis: Januari 2027 tidak mengambil folder Januari 2026 bertahun di nama', () => {
  const e = [F('1. Januari 2026'), F('1. Januari 2027'), F('2. Februari 2027')];
  const k = kandidatPersis(e, 0, 2027);
  assert.equal(k[0].folder.name, '1. Januari 2027');
});

test('terbaru: November belum ada -> Oktober 2026', () => {
  const e = [F('9. September'), F('10. Oktober', '2026-10-05T00:00:00Z')];
  const k = kandidatTerbaru(e, 10, 2026);
  assert.equal(k[0].folder.name, '10. Oktober');
});

test('terbaru: Januari 2027 belum ada -> Desember 2026 (lintas tahun)', () => {
  const e = [F('11. November', '2026-11-03T00:00:00Z'), F('12. Desember', '2026-12-04T00:00:00Z')];
  assert.equal(kandidatTerbaru(e, 0, 2027)[0].folder.name, '12. Desember');
});

test('terbaru: tidak pernah memilih bulan di masa depan', () => {
  const e = [F('12. Desember 2026'), F('1. Januari 2027')];
  assert.equal(kandidatTerbaru(e, 10, 2026).length, 0);
});

test('file jadwal: memuat tahun, atau file tunggal', () => {
  assert.equal(pilihFileJadwal([{ name: 'Jadwal 2026' }, { name: 'Jadwal 2027' }], 2027).name, 'Jadwal 2027');
  assert.equal(pilihFileJadwal([{ name: 'Jadwal MR' }], 2027).name, 'Jadwal MR');
  assert.equal(pilihFileJadwal([{ name: 'A' }, { name: 'B' }], 2027), null);
});
