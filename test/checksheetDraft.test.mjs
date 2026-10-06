/**
 * Test untuk lib/checksheetDraft.js — draf checksheet agar pengisian bisa
 * dilanjutkan di hari berikutnya dan masuk ke file yang SAMA.
 *
 * Latar (laporan teknisi): checksheet diisi sebagian hari ini, dilanjutkan
 * besok, tapi hasilnya malah terbelah ke dua file berbeda.
 *
 * Poin desain yang dikunci di sini:
 *   1. Kunci draf memakai SITUS+KATEGORI+BULAN — bukan tanggal persis. Jadi
 *      draf hari ke-1 tetap ketemu saat dibuka hari ke-2 di bulan yang sama.
 *      Ini yang membuat keduanya menulis ke slot baris yang sama (satu file).
 *   2. Tanggal yang jatuh di bulan berbeda menghasilkan kunci berbeda.
 *   3. Draf kosong TIDAK disimpan, dan menghapus draf lama.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DRAFT_PREFIX,
  DRAFT_MAX_AGE_MS,
  draftKey,
  bulanDari,
  jumlahTerisi,
  saveDraft,
  loadDraft,
  clearDraft,
  pesanDraf,
  restoreAnswers,
  petugasDariDraf,
} from '../src/lib/checksheetDraft.js';

function buatStorage(awal = {}) {
  const isi = { ...awal };
  return {
    getItem: (k) => (k in isi ? isi[k] : null),
    setItem: (k, v) => { isi[k] = String(v); },
    removeItem: (k) => { delete isi[k]; },
    _isi: isi,
  };
}

const KONTEKS = {
  buildingCategory: '1. BTS Communication Room',
  siteName: 'K52 + 083 Base Station 13 (KA-PA 3 _ BTS 13)',
  categoryId: 'cat01',
};
const TGL_HARI1 = '2026-10-06';
const TGL_HARI2 = '2026-10-07';
const SEKARANG = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// bulanDari
// ---------------------------------------------------------------------------

test('bulanDari mengambil YYYY-MM dari tanggal ISO', () => {
  assert.equal(bulanDari('2026-10-06'), '2026-10');
  assert.equal(bulanDari('2026-01-31'), '2026-01');
  assert.equal(bulanDari('2026-12-01'), '2026-12');
});

test('bulanDari tahan terhadap tanggal kosong / aneh', () => {
  assert.equal(bulanDari(''), 'tanpa-tanggal');
  assert.equal(bulanDari(undefined), 'tanpa-tanggal');
});

// ---------------------------------------------------------------------------
// INTI: hari berbeda, bulan sama -> kunci SAMA (draf ketemu)
// ---------------------------------------------------------------------------

test('INI YANG PENTING: draf hari ke-1 masih ketemu di hari ke-2 (bulan sama)', () => {
  const k1 = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  const k2 = draftKey({ ...KONTEKS, tanggal: TGL_HARI2 });
  assert.equal(k1, k2, 'kunci harus sama supaya isian hari-1 lanjut di hari-2');
});

test('draf tersimpan hari-1 benar-benar terbaca saat form dibuka hari-2', () => {
  const s = buatStorage();
  const jawabanHari1 = { item1: 'Baik', item2: 'Normal' };

  saveDraft(s, draftKey({ ...KONTEKS, tanggal: TGL_HARI1 }), jawabanHari1, SEKARANG);

  const draf = loadDraft(s, draftKey({ ...KONTEKS, tanggal: TGL_HARI2 }), SEKARANG + 24 * 3600_000);
  assert.ok(draf, 'draf harus terbaca walau tanggalnya beda sehari');
  assert.deepEqual(draf.answers, jawabanHari1);
});

test('bulan berbeda -> kunci BEDA (isian bulan lain tidak tercampur)', () => {
  const kOkt = draftKey({ ...KONTEKS, tanggal: '2026-10-06' });
  const kNov = draftKey({ ...KONTEKS, tanggal: '2026-11-06' });
  assert.notEqual(kOkt, kNov);
});

test('site/kategori berbeda -> kunci BEDA', () => {
  const dasar = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  assert.notEqual(dasar, draftKey({ ...KONTEKS, siteName: 'Site Lain', tanggal: TGL_HARI1 }));
  assert.notEqual(dasar, draftKey({ ...KONTEKS, categoryId: 'cat99', tanggal: TGL_HARI1 }));
  assert.notEqual(dasar, draftKey({ ...KONTEKS, buildingCategory: '2. Lain', tanggal: TGL_HARI1 }));
});

test('kunci memakai prefix versi (biar bisa dibedakan dari data lain)', () => {
  assert.ok(draftKey({ ...KONTEKS, tanggal: TGL_HARI1 }).startsWith(DRAFT_PREFIX));
});

// ---------------------------------------------------------------------------
// simpan / muat / hapus
// ---------------------------------------------------------------------------

test('simpan lalu muat mengembalikan jawaban apa adanya', () => {
  const s = buatStorage();
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  const jawaban = { item1: 'Baik', item2: ['V:2.1 V  R:5 mΩ', ''] };
  saveDraft(s, k, jawaban, SEKARANG);

  const draf = loadDraft(s, k, SEKARANG);
  assert.deepEqual(draf.answers, jawaban);
});

test('isian kosong TIDAK disimpan, dan draf lama ikut dibuang', () => {
  const s = buatStorage();
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  saveDraft(s, k, { item1: 'Ada isi' }, SEKARANG);
  assert.ok(loadDraft(s, k, SEKARANG));

  const hasil = saveDraft(s, k, {}, SEKARANG); // teknisi kosongkan semua
  assert.equal(hasil, false);
  assert.equal(loadDraft(s, k, SEKARANG), null);
});

test('nilai kosong/undefined tidak ikut tersimpan (draf tidak menggelembung)', () => {
  const s = buatStorage();
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  saveDraft(s, k, { item1: 'Baik', item2: '', item3: null, item4: undefined, item5: [] }, SEKARANG);

  const draf = loadDraft(s, k, SEKARANG);
  assert.deepEqual(Object.keys(draf.answers).sort(), ['item1']);
});

test('kunci internal __raw ikut disimpan (dibutuhkan komponen untuk render nilai)', () => {
  const s = buatStorage();
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  saveDraft(s, k, { item1: 'text', 'item1__raw': 'text' }, SEKARANG);
  const draf = loadDraft(s, k, SEKARANG);
  assert.equal(draf.answers['item1__raw'], 'text');
});

test('jumlahTerisi menghitung item, BUKAN kunci __raw', () => {
  assert.equal(jumlahTerisi({ a: '1', b: '2', a__raw: '1', b__raw: '2' }), 2);
  assert.equal(jumlahTerisi({ a: '1' }), 1);
  assert.equal(jumlahTerisi({}), 0);
});

test('clearDraft menghapus draf', () => {
  const s = buatStorage();
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  saveDraft(s, k, { item1: 'x' }, SEKARANG);
  clearDraft(s, k);
  assert.equal(loadDraft(s, k, SEKARANG), null);
});

// ---------------------------------------------------------------------------
// kedaluwarsa & kerusakan
// ---------------------------------------------------------------------------

test('draf terlalu tua -> diabaikan', () => {
  const s = buatStorage();
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  saveDraft(s, k, { item1: 'x' }, SEKARANG);

  const terlaluTua = SEKARANG + DRAFT_MAX_AGE_MS + 1;
  assert.equal(loadDraft(s, k, terlaluTua), null);
});

test('draf persis di batas umur -> masih terbaca', () => {
  const s = buatStorage();
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  saveDraft(s, k, { item1: 'x' }, SEKARANG);
  assert.ok(loadDraft(s, k, SEKARANG + DRAFT_MAX_AGE_MS - 1));
});

test('draf rusak (bukan JSON) -> null, tidak melempar', () => {
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  const s = buatStorage({ [k]: 'bukan-json{{' });
  assert.equal(loadDraft(s, k, SEKARANG), null);
});

test('draf tanpa answers -> null', () => {
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  const s = buatStorage({ [k]: JSON.stringify({ savedAt: SEKARANG }) });
  assert.equal(loadDraft(s, k, SEKARANG), null);
});

test('storage yang melempar (kuota penuh) tidak membuat form crash', () => {
  const rusak = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('quota'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  assert.doesNotThrow(() => saveDraft(rusak, k, { a: '1' }, SEKARANG));
  assert.equal(saveDraft(rusak, k, { a: '1' }, SEKARANG), false);
  assert.equal(loadDraft(rusak, k, SEKARANG), null);
});

// ---------------------------------------------------------------------------
// pesanDraf
// ---------------------------------------------------------------------------

test('pesanDraf menyebut jumlah item & kapan disimpan', () => {
  const draf = { answers: { a: '1', b: '2' }, savedAt: SEKARANG, jumlahTerisi: 2 };
  const pesan = pesanDraf(draf, SEKARANG + 5 * 60_000);
  assert.match(pesan, /2 item/);
  assert.match(pesan, /5 menit lalu/);
});

test('pesanDraf: beberapa detik lalu / jam / hari', () => {
  const dasar = { answers: { a: '1' }, savedAt: SEKARANG, jumlahTerisi: 1 };
  assert.match(pesanDraf(dasar, SEKARANG + 10_000), /beberapa detik lalu/);
  assert.match(pesanDraf(dasar, SEKARANG + 3 * 3600_000), /3 jam lalu/);
  assert.match(pesanDraf(dasar, SEKARANG + 2 * 24 * 3600_000), /2 hari lalu/);
});

test('pesanDraf untuk draf null -> null (tidak ada yang ditampilkan)', () => {
  assert.equal(pesanDraf(null), null);
});

// ---------------------------------------------------------------------------
// restoreAnswers — mengembalikan isian ke bentuk state React yang benar
// ---------------------------------------------------------------------------

const ITEMS = [
  { id: 'i1', inputType: 'yes_no', noTglPrefix: true },        // teks polos
  { id: 'i2', inputType: 'measurement_multi' },                // id + id__raw
  { id: 'i3', inputType: 'text' },                             // teks biasa
  { id: 'i4', inputType: 'battery_table' },                    // array di __raw
];

test('item teks polos (noTglPrefix) dipulihkan sebagai { __rawText }', () => {
  const out = restoreAnswers({ answers: { i1: 'Baik' } }, ITEMS);
  assert.deepEqual(out.i1, { __rawText: 'Baik' });
});

test('item teks polos menerima bentuk objek maupun teks dari draf', () => {
  assert.deepEqual(restoreAnswers({ answers: { i1: { __rawText: 'X' } } }, ITEMS).i1, { __rawText: 'X' });
  assert.deepEqual(restoreAnswers({ answers: { i1: 'X' } }, ITEMS).i1, { __rawText: 'X' });
});

test('item teks biasa dipulihkan apa adanya (bukan dibungkus objek)', () => {
  const out = restoreAnswers({ answers: { i3: 'Catatan lapangan' } }, ITEMS);
  assert.equal(out.i3, 'Catatan lapangan');
});

test('INI YANG PENTING: item teks BIASA tidak ikut dibungkus __rawText', () => {
  // Kalau ikut dibungkus, kotak isiannya tampil kosong setelah reload.
  const out = restoreAnswers({ answers: { i3: 'Catatan lapangan' } }, ITEMS);
  assert.equal(typeof out.i3, 'string');
});

test('nilai mentah (__raw) dikembalikan supaya komponen bisa render', () => {
  const out = restoreAnswers({ answers: { i2: 'Tgl: 6/10\nCatatan:\nNormal', i2__raw: '77' } }, ITEMS);
  assert.equal(out.i2__raw, '77');
  assert.equal(out.i2, 'Tgl: 6/10\nCatatan:\nNormal');
});

test('nilai mentah berbentuk array (tabel baterai) dipertahankan utuh', () => {
  const baris = ['V:2.1 V  R:5 mΩ', '', 'V:2.2 V  R:6 mΩ'];
  const out = restoreAnswers({ answers: { i4: baris, i4__raw: baris } }, ITEMS);
  assert.deepEqual(out.i4__raw, baris);
});

test('item tanpa isian tidak dimasukkan ke state (form tetap kosong)', () => {
  const out = restoreAnswers({ answers: { i1: 'Ada' } }, ITEMS);
  assert.equal('i2' in out, false);
  assert.equal('i3' in out, false);
});

test('kunci asing / item yang tidak dikenal diabaikan', () => {
  const out = restoreAnswers({ answers: { i1: 'Ada', itemHantu: 'x' } }, ITEMS);
  assert.equal('itemHantu' in out, false);
});

test('draf null / items kosong -> objek kosong, tidak melempar', () => {
  assert.deepEqual(restoreAnswers(null, ITEMS), {});
  assert.deepEqual(restoreAnswers({ answers: { i1: 'x' } }, []), {});
  assert.deepEqual(restoreAnswers(undefined, undefined), {});
});

test('petugasDariDraf mengambil __petugas, aman kalau tidak ada', () => {
  assert.equal(petugasDariDraf({ answers: { __petugas: 'Dandy' } }), 'Dandy');
  assert.equal(petugasDariDraf({ answers: {} }), '');
  assert.equal(petugasDariDraf(null), '');
  assert.equal(petugasDariDraf({ answers: { __petugas: 123 } }), '');
});

test('putaran penuh: simpan -> muat -> restore menghasilkan isian yang sama', () => {
  const s = buatStorage();
  const k = draftKey({ ...KONTEKS, tanggal: TGL_HARI1 });
  // bentuk state Form: yes_no -> angka/bool di __raw, teks polos -> __rawText
  const stateForm = {
    i1: { __rawText: 'Baik' },
    i2__raw: '77',
    i3: 'Catatan hari-1',
  };
  saveDraft(s, k, stateForm, SEKARANG);

  // "besok": draf dibaca lewat kunci bulan yang sama (tanggal beda)
  const draf = loadDraft(s, draftKey({ ...KONTEKS, tanggal: TGL_HARI2 }), SEKARANG + 24 * 3600_000);
  const pulih = restoreAnswers(draf, ITEMS);

  assert.deepEqual(pulih.i1, { __rawText: 'Baik' });
  assert.equal(pulih.i2__raw, '77');
  assert.equal(pulih.i3, 'Catatan hari-1');
});
