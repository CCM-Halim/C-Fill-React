/**
 * Blok baterai yang BERGESER - 3 file UPS MR nyata yang menyimpang.
 *
 * Di file-file ini blok baterai turun: r29 (yang di template lain jadi baris
 * ringkasan "Tgl: ... / Catatan: ...") justru berisi data baterai per-kolom,
 * dan sudah diisi teknisi (mis. 13,545 V / 5,5 mΩ, 8 Agustus 2026).
 *
 * Kalau app tetap menulis ringkasan ke r29, data asli itu TERTIMPA. Karena itu
 * penulisan harus DITOLAK - bukan jalan setengah.
 *
 * Merge diambil dari .xlsx asli via ~/drive-ccm/ambil_merge_3file.py.
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
let cache = null;
async function mod() { if (!cache) cache = await import(sifatkan()); return cache; }

const berkas = new URL('./fixtures/merge_geser.json', import.meta.url);
const ada = fs.existsSync(berkas);
const DATA = ada ? JSON.parse(fs.readFileSync(berkas, 'utf8')) : [];

const cat = CATEGORIES.find((c) => c.id === 'cat12');
const itemRef = cat.items.find((x) => x.inputType === 'battery_table');
const IC = cat.slotMap.itemColumns.find((x) => x.id === itemRef.id);
const TAB = 'Baterai UPS MR (1M,3M)';

/** Jalankan writeMonthlySlot dengan merge tertentu, tangkap request tulis. */
async function coba(merges, jumlah = 16) {
  let tertangkap = null;
  globalThis.fetch = async (url, opts = {}) => {
    if (!opts.method || opts.method === 'GET') {
      return { ok: true, status: 200, json: async () => ({ sheets: [{ properties: { title: TAB }, merges }] }) };
    }
    tertangkap = { url, body: JSON.parse(opts.body) };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const m = await mod();
  m.bersihkanCacheMerges();
  const nilai = Array.from({ length: jumlah }, (_, i) => `B${i + 1}`);
  let galat = null;
  try {
    await m.writeMonthlySlot('SID', TAB, cat.slotMap, {
      tanggal: '2026-10-08', petugas: 'Uji', answers: { [itemRef.id]: nilai },
    });
  } catch (e) { galat = e; }
  return { tertangkap, galat, m };
}

test('blok geser: fixture merge nyata 3 file tersedia', () => {
  assert.ok(ada, 'jalankan ~/drive-ccm/ambil_merge_3file.py lalu salin ke test/fixtures/merge_geser.json');
  assert.ok(DATA.length >= 3, `harus >=3 file, dapat ${DATA.length}`);
});

test('blok geser: r29 di file bergeser terdeteksi sebagai baris DATA, bukan ringkasan', async () => {
  const m = await mod();
  const layout = m.batteryLayout(cat.slotMap, IC, '2026-10-08');
  assert.equal(layout.summaryRow, 29, 'config mengharap ringkasan di r29');

  for (const f of DATA) {
    const kolomRingkasan = m.kolomTerbukaDiBaris(f.merges, layout.summaryRow, IC.colStart, IC.colWidth);
    const slots = m.batterySlots(f.merges, layout, IC);
    console.log(`      ${f.label}: r29 punya ${kolomRingkasan.length} slot per-kolom | kapasitas nyata ${slots.capacity}`);
  }
});

test('blok geser: file normal -> ringkasan AMAN ditulis di r29', async () => {
  const normal = DATA.find((f) => /NORMAL/.test(f.label));
  assert.ok(normal, 'fixture harus punya satu file normal sebagai pembanding');
  const m = await mod();
  const layout = m.batteryLayout(cat.slotMap, IC, '2026-10-08');
  assert.equal(
    m.barisRingkasanAman(normal.merges, layout, IC), 29,
    'file normal: r29 memang sel gabungan lebar -> ringkasan boleh ditulis'
  );
});

test('blok geser: K41+607 & K0+316 -> DITOLAK, data lama tidak tertimpa', async () => {
  const m0 = await mod();
  const layout = m0.batteryLayout(cat.slotMap, IC, '2026-10-08');
  // "bergeser" = r29 justru punya slot per-kolom, jadi baris itu BARIS DATA.
  const geser = DATA.filter(
    (f) => m0.kolomTerbukaDiBaris(f.merges, layout.summaryRow, IC.colStart, IC.colWidth).length > 0
  );
  assert.equal(geser.length, 2, `harus tepat 2 file bergeser (K41+607 & K0+316), dapat ${geser.length}`);
  for (const f of geser) {
    const { galat, tertangkap } = await coba(f.merges);
    console.log(`      ${f.label}: ${galat ? 'DITOLAK' : 'DITERIMA'}`);
    assert.ok(galat, `${f.label}: harus ditolak karena blok baterainya bergeser`);
    // Ditolak di cek kapasitas ATAU di cek baris ringkasan - dua-duanya aman,
    // yang penting nol penulisan.
    assert.match(galat.message, /melebihi kapasitas|berbeda dari template|menimpa/);
    assert.equal(tertangkap, null, `${f.label}: tidak boleh ada penulisan sama sekali`);
  }
});

test('blok geser: K0+316 walau diisi 12 (pas kapasitas) tetap DITOLAK', async () => {
  const f = DATA.find((x) => /K0\+316/.test(x.label));
  if (!f) return;
  // 12 nilai muat di kapasitas nyatanya (12), jadi cek kapasitas lolos -
  // penolakan harus datang dari cek baris ringkasan.
  const { galat, tertangkap } = await coba(f.merges, 12);
  console.log(`      12 nilai -> ${galat ? 'DITOLAK' : 'DITERIMA'} ${galat ? `(${galat.message.slice(0, 60)}...)` : ''}`);
  assert.ok(galat, 'K0+316 harus tetap ditolak walau jumlahnya pas');
  assert.match(galat.message, /berbeda dari template/);
  assert.equal(tertangkap, null, 'tidak boleh ada penulisan');
});

test('blok geser: K41+475 (r29 ringkasan, r33 selebar 12) tetap bisa ditulis', async () => {
  const f = DATA.find((x) => /K41\+475/.test(x.label));
  if (!f) return;
  const { galat, tertangkap } = await coba(f.merges);
  assert.equal(galat, null, `K41+475 tidak boleh ditolak: ${galat && galat.message}`);
  const entri = tertangkap.body.data.filter((d) => /![A-Z]+\d+:[A-Z]+\d+$/.test(d.range));
  assert.ok(entri.length >= 1, 'harus ada entri data baterai');
  const baris = entri.map((e) => Number(e.range.match(/(\d+):/)[1]));
  assert.ok(!baris.includes(29), 'r29 di file ini baris ringkasan - data tidak boleh ke situ');
});
