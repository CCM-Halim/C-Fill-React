import test from 'node:test';
import assert from 'node:assert/strict';
import { shiftSekarang, kodeKeShift, personilPadaShift, cocokkanFoto, normNama } from '../src/lib/shiftBipo.js';

const hdr = ['', '', '', '', ...Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0') + '/11')];
const baris = (n, kode, nip = '', hp = '') => ['', n, nip, hp, ...kode];
const rows = [
  [], [], hdr,
  baris('Afrian', ['P','P','S','S','S','L','L','P','P','M','M','M','L','L','P','P']),
  baris('Adib',   ['S','S','M','M','L','L','P','P','P','S','S','M','L','L','P','S'], '1234567', '0812-3456'),
  baris('Dandy',  ['P','P','L','L','P','P','P','P','M','L','L','P','L','L','P','PM']),
  ['', '', 'Shift Malam :', '', 1, 3],
];

test('shiftSekarang: batas jam & malam memakai kemarin sebelum 08:00', () => {
  const t = (h, m = 0) => shiftSekarang(new Date(2026, 10, 17, h, m));
  assert.equal(t(0, 22).aktif, 'malam');
  assert.equal(t(0, 22).tanggal.malam.getDate(), 16);
  assert.equal(t(0, 22).tanggal.pagi.getDate(), 17);
  assert.equal(t(7, 59).aktif, 'malam');
  assert.equal(t(8).aktif, 'pagi');
  assert.equal(t(15, 59).aktif, 'pagi');
  assert.equal(t(16).aktif, 'siang');
  assert.equal(t(21, 59).aktif, 'siang');
  assert.equal(t(22).aktif, 'malam');
  assert.equal(t(22).tanggal.malam.getDate(), 17);
  assert.equal(shiftSekarang(new Date(2026, 11, 1, 3)).tanggal.malam.getMonth(), 10); // lintas bulan
});

test('kodeKeShift', () => {
  assert.deepEqual(kodeKeShift('p'), ['pagi']);
  assert.deepEqual(kodeKeShift(' PM '), ['pagi', 'malam']);
  for (const k of ['L', 'C', 'R', 'z', '', undefined]) assert.deepEqual(kodeKeShift(k), []);
});

test('personilPadaShift: kolom tanggal & daftar nama', () => {
  assert.deepEqual(personilPadaShift(rows, new Date(2026, 10, 1), 'pagi').nama, ['Afrian', 'Dandy']);
  assert.deepEqual(personilPadaShift(rows, new Date(2026, 10, 1), 'siang').nama, ['Adib']);
  assert.deepEqual(personilPadaShift(rows, new Date(2026, 10, 16), 'pagi').nama, ['Afrian', 'Dandy']);
  assert.deepEqual(personilPadaShift(rows, new Date(2026, 10, 16), 'malam').nama, ['Dandy']);
  assert.deepEqual(personilPadaShift(rows, new Date(2026, 10, 3), 'malam').nama, ['Adib']);
});

test('personilPadaShift: NIP & kontak ikut terbaca', () => {
  const r = personilPadaShift(rows, new Date(2026, 10, 1), 'siang');
  assert.deepEqual(r.orang, [{ nama: 'Adib', nip: '1234567', kontak: '0812-3456' }]);
  assert.deepEqual(personilPadaShift(rows, new Date(2026, 10, 1), 'pagi').orang[0], { nama: 'Afrian', nip: '', kontak: '' });
});

test('personilPadaShift: error jelas', () => {
  assert.match(personilPadaShift([[], ['x']], new Date(2026, 10, 1), 'pagi').error, /tidak ditemukan/);
  assert.match(personilPadaShift(rows, new Date(2026, 9, 5), 'pagi').error, /05\/10/);
});

test('cocokkanFoto', () => {
  const files = [{ name: 'Adib.pdf' }, { name: 'Afrian.pdf' }, { name: 'Gilang.jpg' }, { name: 'Ari.pdf' }];
  assert.equal(cocokkanFoto('Adib', files).name, 'Adib.pdf');
  assert.equal(cocokkanFoto(' gilang ', files).name, 'Gilang.jpg');
  assert.equal(cocokkanFoto('Dandy', files), null);
  assert.equal(normNama('Adib.PDF'), 'adib');
});
