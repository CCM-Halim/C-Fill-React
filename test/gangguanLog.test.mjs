/**
 * Test parsing Log Book Gangguan (src/lib/gangguanLog.js).
 *
 * Fixture = hasil baca SHEET ASLI (test/fixtures/gangguan.json, dibuat oleh
 * scripts/make-gangguan-fixtures.py), bukan data karangan. Angka yang
 * di-assert di sini dihitung langsung dari isi sheet itu.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  parseGangguanRows, normalizeStatus, parseTanggal, parseWaktu, findHeaderRow,
  findColumn, isTanggalAmbigu, summarizeGangguan, filterGangguan, sortGangguan,
  buildFilterOptions, STATUS,
} from '../src/lib/gangguanLog.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/gangguan.json', import.meta.url), 'utf8')
);
const TABS = Object.keys(fixture.tabs);
const parseTab = (tab) => parseGangguanRows(fixture.tabs[tab], { tab });
const semuaItems = TABS.flatMap(parseTab);

// ---------------------------------------------------------------- header kolom

test('6 tab, semuanya punya baris header yang bisa ditemukan', () => {
  assert.equal(TABS.length, 6);
  assert.deepEqual(TABS, ['Gangguan Peralatan', 'Gangguan AC', 'Gangguan K3',
    'Gangguan Kontruksi', 'Gangguan Instrumen', 'Gangguan Lain-Lain']);
  for (const tab of TABS) {
    assert.ok(findHeaderRow(fixture.tabs[tab]) >= 0, `header tidak ketemu di ${tab}`);
  }
});

test('kolom "Lokasi Gangguan" ada di posisi BERBEDA antar tab (D vs E)', () => {
  // Inilah sebab bug lama: kode lama selalu membaca index 3 (= kolom E).
  const kolom = TABS.map((tab) => findColumn(fixture.tabs[tab][0], 'lokasi'));
  assert.deepEqual(kolom, [4, 4, 3, 4, 3, 4], 'K3 & Instrumen pakai kolom D');
  // "Sistem Terkait" di Gangguan Instrumen ada di index 16 (Q), bukan 15 (P).
  assert.equal(findColumn(fixture.tabs['Gangguan Instrumen'][0], 'sistem terkait'), 16);
  assert.equal(findColumn(fixture.tabs['Gangguan Peralatan'][0], 'sistem terkait'), 15);
});

// ------------------------------------------------------------------- jumlah

test('jumlah kejadian & sebaran status sesuai isi sheet asli', () => {
  const per = {};
  for (const tab of TABS) per[tab] = summarizeGangguan(parseTab(tab));

  assert.equal(per['Gangguan Peralatan'].total, 152);
  assert.equal(per['Gangguan AC'].total, 17);
  assert.equal(per['Gangguan K3'].total, 2);
  assert.equal(per['Gangguan Kontruksi'].total, 23);
  assert.equal(per['Gangguan Instrumen'].total, 0, 'isinya masih baris template');
  assert.equal(per['Gangguan Lain-Lain'].total, 0, 'isinya masih baris template');

  const ringkas = summarizeGangguan(semuaItems);
  assert.equal(ringkas.total, 194);
  assert.equal(ringkas.open, 95);
  assert.equal(ringkas.closed, 99);
  assert.equal(ringkas.unknown, 0);
  assert.equal(ringkas.open + ringkas.closed + ringkas.unknown, ringkas.total);
});

test('"Gangguan K3" terbaca — dulu hilang karena lokasinya di kolom D', () => {
  const k3 = parseTab('Gangguan K3');
  assert.equal(k3.length, 2, 'dulu 0 item, sekarang 2');
  assert.equal(k3.find((it) => it.lokasi === '1:00').status, STATUS.CLOSED);
  assert.equal(k3.find((it) => it.lokasi === '7:41').status, STATUS.OPEN);
  assert.equal(k3.find((it) => it.lokasi === '1:00').tanggal.month, 2, '03/02/2026 = 3 Februari');

  // TEMUAN DATA (bukan bug kode): di tab K3 ini kolom "Lokasi Gangguan" (D)
  // isinya JAM ("1:00", "7:41") — lokasi aslinya tertulis di kolom "Item
  // Gangguan"/"Waktu Pelaporan". Sheet-nya yang salah kolom, jadi yang tampil
  // di app apa adanya dari sheet. Ini bukti kenapa peta kolom per-tab penting:
  // di 5 tab lain kolom D memang lokasi sungguhan.
  assert.ok(k3.every((it) => /^\d{1,2}:\d{2}$/.test(it.lokasi)), 'isinya jam, bukan lokasi');
  assert.ok(k3.every((it) => it.tanggal && it.status !== STATUS.UNKNOWN));
});

test('baris template (201 baris, status sudah terisi, lokasi kosong) tidak dihitung', () => {
  for (const tab of ['Gangguan K3', 'Gangguan Kontruksi', 'Gangguan Lain-Lain']) {
    assert.equal(fixture.tabs[tab].length, 201, `${tab} punya 201 baris di sheet`);
  }
  assert.equal(parseTab('Gangguan Lain-Lain').length, 0);
  // Baris template Instrumen statusnya "New" — juga tidak dianggap kejadian.
  assert.equal(parseTab('Gangguan Instrumen').length, 0);
});

// -------------------------------------------------------- parsing nilai sel

test('normalizeStatus: Close/Closed, dan "New"/"Progress" dihitung belum selesai', () => {
  assert.equal(normalizeStatus('Close'), STATUS.CLOSED);
  assert.equal(normalizeStatus('Closed'), STATUS.CLOSED);
  assert.equal(normalizeStatus(' CLOSE '), STATUS.CLOSED);
  assert.equal(normalizeStatus('Open'), STATUS.OPEN);
  assert.equal(normalizeStatus('New'), STATUS.OPEN);
  assert.equal(normalizeStatus('In Progress'), STATUS.OPEN);
  assert.equal(normalizeStatus(''), STATUS.UNKNOWN);
  assert.equal(normalizeStatus('Entah'), STATUS.UNKNOWN);
});

test('parseTanggal: DD/MM/YYYY tidak konsisten + tolak nilai mustahil', () => {
  assert.deepEqual(parseTanggal('01/01/2026'), { day: 1, month: 1, year: 2026 });
  assert.deepEqual(parseTanggal('23/1/2026'), { day: 23, month: 1, year: 2026 });
  assert.deepEqual(parseTanggal('2026-10-03'), { day: 3, month: 10, year: 2026 });
  assert.equal(parseTanggal(''), null);
  assert.equal(parseTanggal('belum ada'), null);
  assert.equal(parseTanggal('99/99/2026'), null, 'bulan/tanggal mustahil ditolak');
});

test('parseWaktu: baca tanggal + jam, tolak jam mustahil', () => {
  const d = parseWaktu('08/02/2026 18:00:00');
  assert.deepEqual([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()], [2026, 2, 8, 18]);
  assert.ok(parseWaktu('23/1/2026 10:25'), 'jam tanpa detik tetap terbaca');
  assert.equal(parseWaktu('08/02/2026 25:00:00'), null);
  assert.equal(parseWaktu(''), null);
});

test('tanggal pelaporan dipakai; kalau kosong jatuh ke Waktu Gangguan (ditandai)', () => {
  const ac = parseTab('Gangguan AC');
  const k56 = ac.find((it) => it.lokasi === 'K56+665');
  assert.equal(k56.tanggal.month, 2);
  assert.equal(k56.tanggalDariWaktuGangguan, false);

  const k32 = ac.find((it) => it.lokasi === 'K32+475');
  assert.equal(k32.tanggalDariWaktuGangguan, false, 'K32+475 tanggal pelaporannya ada (08/02/2026)');
  assert.equal(k32.tanggal.day, 8);

  const k1 = ac.find((it) => it.lokasi === 'K1+267');
  assert.equal(k1.tanggal, null, 'K1+267 memang tidak punya tanggal sama sekali');
});

test('tanggal yang kemungkinan tertukar hari/bulan ditandai, bukan dipilih diam-diam', () => {
  // Kasus nyata di tab AC: Tanggal "08/02/2026" tapi Waktu Gangguan "02/08/2026".
  assert.equal(isTanggalAmbigu({ day: 8, month: 2, year: 2026 }, { day: 2, month: 8, year: 2026 }), true);
  assert.equal(isTanggalAmbigu({ day: 3, month: 2, year: 2026 }, { day: 3, month: 2, year: 2026 }), false);
  assert.equal(isTanggalAmbigu({ day: 23, month: 1, year: 2026 }, { day: 23, month: 1, year: 2026 }), false);
  assert.equal(isTanggalAmbigu(null, { day: 1, month: 2, year: 2026 }), false);

  const ambigu = semuaItems.filter((it) => it.tanggalAmbigu);
  assert.ok(ambigu.length >= 1, 'harus ada baris yang ditandai ambigu');
  assert.ok(ambigu.some((it) => it.lokasi === 'K32+475'));
  // Peringatan dihitung juga di ringkasan.
  assert.equal(summarizeGangguan(semuaItems).ambigu, ambigu.length);
});

// ------------------------------------------------------------ filter status

test('filter status: open / closed / all', () => {
  const semua = filterGangguan(semuaItems, { status: 'all' });
  const open = filterGangguan(semuaItems, { status: STATUS.OPEN });
  const closed = filterGangguan(semuaItems, { status: STATUS.CLOSED });
  assert.equal(semua.length, 194);
  assert.equal(open.length, 95);
  assert.equal(closed.length, 99);
  assert.equal(open.length + closed.length, semua.length);
  assert.ok(open.every((it) => it.status === STATUS.OPEN));
  assert.ok(closed.every((it) => it.status === STATUS.CLOSED));
});

// ----------------------------------------------------- filter bulan & tahun

test('filter tahun + bulan pakai kolom Tanggal yang benar-benar di-parse', () => {
  const feb = filterGangguan(semuaItems, { tahun: 2026, bulan: 2 });
  assert.ok(feb.length > 0);
  assert.ok(feb.every((it) => it.tanggal.year === 2026 && it.tanggal.month === 2));
});

test('BUG LAMA: "Oktober" ikut menarik kejadian 10 Januari — sekarang tidak', () => {
  const okt = filterGangguan(semuaItems, { bulan: 10 });
  assert.ok(okt.every((it) => it.tanggal.month === 10), 'hanya bulan 10 yang lolos');

  // Cara lama: cocokkan angka apa pun di string tanggal.
  const caraLama = semuaItems.filter((it) => {
    const angka = (it.mulaiRaw || it.tanggalRaw || '').match(/\d+/g);
    return angka && angka.some((n) => {
      const v = parseInt(n, 10);
      return v === 10 && v <= 12;
    });
  });
  const salahIkut = caraLama.filter((it) => !it.tanggal || it.tanggal.month !== 10);
  assert.ok(salahIkut.length > 0,
    'cara lama memang memasukkan kejadian bulan lain sebagai Oktober');
  assert.notEqual(caraLama.length, okt.length);
});

test('filter tanpa tanggal: baris yang tidak ada tanggalnya tetap bisa dilihat', () => {
  const tanpa = filterGangguan(semuaItems, { hanyaTanpaTanggal: true });
  assert.ok(tanpa.length > 0);
  assert.ok(tanpa.every((it) => !it.tanggal));
  assert.equal(summarizeGangguan(semuaItems).tanpaTanggal, tanpa.length);
});

// ------------------------------------------------------- filter lain & sort

test('filter tab, pencarian teks, dan gabungan', () => {
  const ac = filterGangguan(semuaItems, { tab: 'Gangguan AC' });
  assert.equal(ac.length, 17);
  assert.ok(ac.every((it) => it.tab === 'Gangguan AC'));

  const cctv = filterGangguan(semuaItems, { cari: 'cctv' });
  assert.ok(cctv.length > 0);
  assert.ok(cctv.every((it) => `${it.lokasi} ${it.alat} ${it.sistem} ${it.analisis} ${it.fenomena}`
    .toLowerCase().includes('cctv')));

  const gabung = filterGangguan(semuaItems, {
    status: STATUS.OPEN, tab: 'Gangguan Kontruksi', bulan: 1,
  });
  assert.ok(gabung.length > 0);
  assert.ok(gabung.every((it) => it.status === STATUS.OPEN && it.tab === 'Gangguan Kontruksi' && it.tanggal.month === 1));
});

test('sortGangguan: Open dulu (paling lama di atas), lalu yang terbaru', () => {
  const urut = sortGangguan(semuaItems);
  assert.equal(urut.length, semuaItems.length);
  const rank = { [STATUS.OPEN]: 0, [STATUS.UNKNOWN]: 1, [STATUS.CLOSED]: 2 };
  for (let i = 1; i < urut.length; i++) {
    assert.ok(rank[urut[i - 1].status] <= rank[urut[i].status],
      `urutan status salah di index ${i}: ${urut[i - 1].status} sebelum ${urut[i].status}`);
  }

  // Yang open: yang paling lama menggantung di atas. Umurnya dihitung dari
  // Waktu Gangguan, jadi pakai satu `now` tetap supaya bisa dibandingkan.
  const now = new Date(2026, 9, 3, 12, 0, 0);
  const items = TABS.flatMap((tab) => parseGangguanRows(fixture.tabs[tab], { tab, now }));
  const urutItems = sortGangguan(items);
  const opens = urutItems.filter((it) => it.status === STATUS.OPEN);
  const opensBerumur = opens.filter((it) => it.umurHari !== null);
  for (let i = 1; i < opensBerumur.length; i++) {
    assert.ok(opensBerumur[i - 1].umurHari >= opensBerumur[i].umurHari, 'yang paling lama menggantung harus di atas');
  }
  // Yang belum ada Waktu Gangguan-nya tidak dibuang: tetap masuk daftar Open,
  // ditaruh di bawah yang sudah punya umur.
  assert.equal(opensBerumur.length, opens.length - opens.filter((it) => it.umurHari === null).length);
  assert.equal(opens.length, summarizeGangguan(items).open);
  const idxPertamaTanpaUmur = urutItems.findIndex((it) => it.status === STATUS.OPEN && it.umurHari === null);
  if (idxPertamaTanpaUmur >= 0) {
    assert.ok(urutItems.slice(idxPertamaTanpaUmur).every((it) => it.status !== STATUS.OPEN || it.umurHari === null),
      'Open tanpa umur harus di bawah semua Open yang punya umur');
  }
});

test('umur gangguan open dihitung dari Waktu Gangguan', () => {
  const now = new Date(2026, 9, 3, 12, 0, 0); // 3 Okt 2026 12:00
  const ac = parseGangguanRows(fixture.tabs['Gangguan AC'], { tab: 'Gangguan AC', now });
  const k80 = ac.find((it) => it.lokasi === 'K80+835'); // mulai 01/07/2026 8:11
  const acuan = Math.floor((now.getTime() - new Date(2026, 6, 1, 8, 11, 0).getTime()) / 86400000);
  assert.equal(acuan, 94, 'aritmetika acuan: 1 Jul 08:11 -> 3 Okt 12:00 = 94 hari penuh');
  assert.equal(k80.umurHari, acuan);
  assert.equal(k80.status, STATUS.OPEN);
  assert.equal(ac.find((it) => it.lokasi === 'K56+665').umurHari, null, 'yang sudah close tanpa umur');
});

test('durasi jam dihitung kalau waktu mulai & pemulihan lengkap', () => {
  const ac = parseTab('Gangguan AC');
  const k0 = ac.find((it) => it.lokasi === 'K0 + 316'); // 02/03 18:30 -> 09/03 17:12
  assert.equal(k0.durasiJam, 166.7);
  const tanpaPulih = ac.find((it) => it.lokasi === 'K80+835');
  assert.equal(tanpaPulih.durasiJam, null);
});

test('buildFilterOptions hanya menawarkan tahun/bulan yang ada datanya', () => {
  const opt = buildFilterOptions(filterGangguan(semuaItems, { tab: 'Gangguan AC' }));
  assert.deepEqual(opt.years, [2026]);
  assert.deepEqual(opt.monthsByYear[2026], [1, 2, 3, 5, 6, 7, 9]);
  assert.equal(opt.bulanLabel(9), 'September');

  const semua = buildFilterOptions(semuaItems);
  assert.deepEqual(semua.years, [2027, 2026], '2027 ikut muncul karena ada baris yang tahunnya salah ketik di sheet');
  assert.deepEqual(semua.monthsByYear[2026], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(semua.monthsByYear[2027], [6, 8]);
  assert.equal(buildFilterOptions(parseTab('Gangguan Lain-Lain')).years.length, 0, 'tab kosong tidak menawarkan pilihan');
});
