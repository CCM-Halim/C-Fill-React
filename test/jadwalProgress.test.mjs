/**
 * Uji parsing "Jadwal Kunjungan MR" pakai data ASLI dua spreadsheet (September &
 * Oktober 2026) yang dibaca lewat service account, disimpan sebagai fixture JSON
 * supaya test jalan tanpa jaringan.
 *
 * Fixture dibuat manual oleh scripts/make-jadwal-fixtures.py dengan range
 * 'B3:O120' - PERSIS sama dengan yang dibaca app (lihat readRawRange di
 * cfillService.js). Ganti fixture kalau range itu berubah.
 *
 * Jalankan:  node --test test/jadwalProgress.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PERIODS, parsePeriodTags, isFinished, parseJadwalItems,
  parseSheetPlanCounters, summarizeJadwal,
} from '../src/lib/jadwalProgress.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const load = (n) => JSON.parse(fs.readFileSync(path.join(here, 'fixtures', n), 'utf8'));

const septRows = load('september-2026.B3-O120.json');
const octRows = load('oktober-2026.B3-O120.json');

const pairs = (b) => PERIODS.map((p) => [p, b[p].finished, b[p].total]);

test('parsePeriodTags menangani berbagai penulisan', () => {
  assert.deepEqual(parsePeriodTags('1M, 3M, 6M'), ['1M', '3M', '6M']);
  assert.deepEqual(parsePeriodTags('1M,3M,6M,1Y'), ['1M', '3M', '6M', '1Y']);
  assert.deepEqual(parsePeriodTags('3M, 6M'), ['3M', '6M']);
  assert.deepEqual(parsePeriodTags(''), []);
  // label non-periode tidak dianggap periode (dulu bikin baris hilang diam-diam)
  assert.deepEqual(parsePeriodTags('Pendampingan Perawatan AC'), []);
});

test('isFinished hanya true untuk status selesai', () => {
  assert.equal(isFinished('Finish'), true);
  assert.equal(isFinished('FINISH'), true);
  assert.equal(isFinished('Not Yet'), false);
  assert.equal(isFinished(''), false);
  // angka ringkasan di bawah tabel tidak boleh dianggap status pekerjaan
  assert.equal(isFinished('46'), false);
});

test('baris di luar tabel (lokasi kosong) tidak ikut dihitung', () => {
  const items = parseJadwalItems(octRows);
  assert.ok(items.every((it) => it.lokasi !== ''));
  // 20 baris terakhir Oktober cuma berisi baris tanggal kosong + kolom bantu
  assert.equal(octRows.length, 105);
  assert.equal(items.length, 51);
});

// ---- OKTOBER 2026 (bulan berjalan): rencana 46/21/13/0, belum ada yang selesai ----
test('Oktober 2026 - nilai sebenarnya: rencana terisi, realisasi masih 0', () => {
  const s = summarizeJadwal(octRows);
  assert.deepEqual(pairs(s.periodBreakdown), [
    ['1M', 0, 46], ['3M', 0, 21], ['6M', 0, 13], ['1Y', 0, 0],
  ]);
  assert.equal(s.total, 51, 'baris kerjaan di jadwal (termasuk yg belum ada tag periode)');
  assert.equal(s.finishedCount, 0);
  assert.equal(s.notYetCount, 51);
  assert.equal(s.unlabeledRows, 0);
});

test('Oktober 2026 - penyebut donut cocok dengan kolom rencana milik sheet', () => {
  const s = summarizeJadwal(octRows);
  // Kolom bantu L:O di sheet = rencana yang dikelola manusia. Hitungan baris
  // kita HARUS sama - kalau tidak, ada baris jadwal yang salah tag/hilang.
  for (const p of PERIODS) {
    assert.equal(
      s.periodBreakdown[p].total, s.sheetPlanCounters[p],
      `rencana ${p}: hitung baris vs kolom sheet`,
    );
  }
  assert.deepEqual(s.sheetPlanCounters, { '1M': 46, '3M': 21, '6M': 13, '1Y': 0 });
});

test('Oktober 2026 - daftar lokasi untuk pop-up terisi dan lengkap', () => {
  const s = summarizeJadwal(octRows);
  assert.equal(s.periodBreakdown['1M'].notYetItems.length, 46);
  assert.equal(s.periodBreakdown['1M'].finishedItems.length, 0);
  const first = s.periodBreakdown['1M'].notYetItems[0];
  assert.equal(first.lokasi, 'K48 + 680 Base Station');
  assert.equal(first.pic, 'Adib');
  assert.equal(first.kegiatan, '1M');
  assert.equal(first.tanggal, 'Senin,05 Oktober 2026');
});

test('Oktober 2026 - donut tidak lagi 0/0 (regresi bug pemetaan kolom)', () => {
  const s = summarizeJadwal(octRows);
  const totalSum = PERIODS.reduce((a, p) => a + s.periodBreakdown[p].total, 0);
  assert.equal(totalSum, 80, '46 + 21 + 13 + 0 baris-periode');
});

// ---- SEPTEMBER 2026 (bulan selesai): 46 pekerjaan, semuanya Finish ----
test('September 2026 - nilai sebenarnya: 46/46, 15/16, 10/10, 2/2', () => {
  const s = summarizeJadwal(septRows);
  assert.deepEqual(pairs(s.periodBreakdown), [
    ['1M', 46, 46], ['3M', 15, 16], ['6M', 10, 10], ['1Y', 2, 2],
  ]);
  assert.equal(s.finishedCount, 46);
  // 6 baris kerjaan di September tidak punya tag periode yang dikenali
  // (mis. "TL EEWS K83 (Ganti Kontaktor)" dan "Pendampingan Perawatan AC").
  // Dulu baris ini hilang diam-diam; sekarang dihitung & dilaporkan.
  assert.equal(s.unlabeledRows, 6);
});

test('September 2026 - baris tanpa tag periode tetap bisa dibuka dari Dashboard', () => {
  const s = summarizeJadwal(septRows);
  const tanpaPeriode = s.items.filter((it) => parsePeriodTags(it.kegiatan).length === 0);
  assert.equal(tanpaPeriode.length, 6);
  assert.ok(tanpaPeriode.some((it) => it.lokasi.startsWith('TL ')));
});

test('September 2026 - penyebut 3M/6M/1Y juga cocok dengan rencana di sheet', () => {
  const s = summarizeJadwal(septRows);
  for (const p of PERIODS) {
    assert.equal(
      s.periodBreakdown[p].total, s.sheetPlanCounters[p],
      `rencana ${p}: hitung baris vs kolom sheet`,
    );
  }
  // 3M: 16 terjadwal, 15 selesai -> 1 baris (CCTV Emergency Stairs K32, K34, K37)
  // masih terbuka dan itu memang terlihat di daftar "belum selesai".
  assert.equal(s.periodBreakdown['3M'].notYetItems.length, 1);
  assert.ok(s.periodBreakdown['3M'].notYetItems[0].lokasi.includes('CCTV Emergency Stairs'));
});

test('parseSheetPlanCounters ambil angka terakhir tiap kolom L:O', () => {
  assert.deepEqual(parseSheetPlanCounters(octRows), { '1M': 46, '3M': 21, '6M': 13, '1Y': 0 });
  assert.deepEqual(parseSheetPlanCounters(septRows), { '1M': 46, '3M': 16, '6M': 10, '1Y': 2 });
  // range yang cuma sampai kolom L -> 3M/6M/1Y null (bukan 0 yang menyesatkan)
  const sempit = octRows.map((r) => r.slice(0, 11));
  assert.deepEqual(parseSheetPlanCounters(sempit), { '1M': 46, '3M': null, '6M': null, '1Y': null });
});
