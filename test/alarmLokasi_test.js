import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { kunciLokasi, alarmOpenDiLokasi } from '../src/lib/alarmLokasi.js';
import { parseGangguanRows } from '../src/lib/gangguanLog.js';

test('kunciLokasi menyeragamkan penulisan kilometer', () => {
  assert.equal(kunciLokasi('K48 + 680 Base Station'), 'k48+680');
  assert.equal(kunciLokasi('K48+680'), 'k48+680');
  assert.equal(kunciLokasi('k041 + 607 (202)'), 'k41+607');
  assert.equal(kunciLokasi('CCTV K77+350 tunnel 4'), 'k77+350');
  assert.equal(kunciLokasi('OCE St Halim'), 'ocesthalim');
  assert.equal(kunciLokasi(''), '');
});

const items = [
  { status: 'open', tab: 'Gangguan AC', baris: 5, lokasi: 'K45+241', alat: 'AC', fenomena: 'AC mati', tanggalRaw: '06/01/2026', umurHari: 300 },
  { status: 'open', tab: 'Gangguan Peralatan', baris: 9, lokasi: 'K45 + 241', alat: 'RTU', fenomena: 'RTU offline', tanggalRaw: '23/01/2026', umurHari: 100 },
  { status: 'closed', tab: 'Gangguan AC', baris: 6, lokasi: 'K45+241', alat: 'AC', fenomena: 'lama', tanggalRaw: '01/01/2026', umurHari: null },
  { status: 'open', tab: 'Gangguan K3', baris: 2, lokasi: 'K46+000', alat: 'x', fenomena: 'y', tanggalRaw: '', umurHari: 1 },
  { status: 'open', tab: 'Gangguan Peralatan', baris: 3, lokasi: 'OCE St Halim', alat: 'Telp', fenomena: 'z', tanggalRaw: '', umurHari: 3 },
];
test('hanya yang OPEN, lokasi cocok, terlama dulu', () => {
  const r = alarmOpenDiLokasi(items, 'K45 + 241 Base Station');
  assert.deepEqual(r.map((a) => a.alat), ['AC', 'RTU']);
  assert.equal(r[0].tab, 'AC');
  assert.equal(alarmOpenDiLokasi(items, 'K99 + 000').length, 0);
  assert.equal(alarmOpenDiLokasi(items, 'OCE St Halim').length, 1);
  assert.equal(alarmOpenDiLokasi(items, '').length, 0);
});
test('data asli: lokasi K66+000 punya alarm open', () => {
  const g = JSON.parse(fs.readFileSync(new URL('./fixtures/gangguan.json', import.meta.url)));
  const all = []; for (const [tab, rows] of Object.entries(g.tabs)) all.push(...parseGangguanRows(rows, { tab }));
  assert.ok(alarmOpenDiLokasi(all, 'K66 + 000 Base Station').length >= 1);
});
