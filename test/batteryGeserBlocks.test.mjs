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

/** ID spreadsheet dari label fixture ("17iAFPX0…__K41+607_…"). */
function idDari(f) {
  return String(f.file || '').split('__')[0];
}

/** Isi r29 yang NYATA di tiap file - dibaca dari Drive 10 Okt 2026.
 *  Dipakai supaya tes mencerminkan kondisi asli, bukan asumsi. */
const ISI_R29 = {
  '17iAFPX0d1ndgDJ4DDa5JjbqDLhTEcTvm': ['V:13,545V   R:5,5mΩ', 'V:13,492V   R:5,4mΩ', 'V:13,497V   R:5,4mΩ',
    'V:13,474V   R:5,3mΩ', 'V:13,562V   R:5,4mΩ', 'V:13,589V   R:5,2mΩ', 'V:13,606V   R:5,3mΩ',
    'V:13,642V   R:5,3mΩ', 'V:13,689V   R:5,3mΩ', 'V:13,506V   R:5,6mΩ', 'V:13,445V   R:5,6mΩ',
    'V:13,498V   R:5,9mΩ'],   // 12 nilai asli teknisi
  '1BXdR2zMbaWFofVl9OX14SC20Qld6fo-S': [],   // r29 memang ringkasan (sel lebar)
  '1m9Jybe1gFmHIUv0zD9WVHRXzBKmCHVIo': ['V: 13,589V\\nR: 5,2mΩ', 'V: 13,489V\\nR: 5,3mΩ', 'V: 13,691V\\nR: 5,0mΩ',
    'V: 13,749V\\nR: 4,5mΩ', 'V: 13,620V\\nR: 5,1mΩ', 'V: 13,481V\\nR: 5,2mΩ', 'V: 13,504V\\nR: 5,3mΩ',
    'V: 13,640V\\nR: 5,0mΩ', 'V: 13,569V\\nR: 5,2mΩ', 'V: 13,507V\\nR: 5,2mΩ', 'V: 13,586V\\nR: 5,1mΩ',
    'V: 13,589V\\nR: 3,8mΩ'],   // 12 nilai asli teknisi
  '1YnflBQUAuuW0f5YACenqtqalPQC8h09t5mKu1d9P4f8': [],   // r29 ringkasan (kosong)
};

/** Jalankan writeMonthlySlot dengan merge tertentu, tangkap request tulis. */
async function coba(sid, merges, jumlah = 16, isiR29 = undefined) {
  const isi = isiR29 !== undefined ? isiR29 : (ISI_R29[sid] ?? []);
  let tertangkap = null;
  globalThis.fetch = async (url, opts = {}) => {
    if (!opts.method || opts.method === 'GET') {
      // pembacaan nilai baris (untuk memutuskan boleh/tidak menulis ringkasan)
      if (String(url).includes('/values/')) {
        const baris = /:([A-Z]+)(\d+)/.exec(decodeURIComponent(String(url)));
        const nomor = baris ? Number(baris[2]) : 0;
        return {
          ok: true, status: 200,
          json: async () => (nomor === 29 && isi.length ? { values: [isi] } : { values: [] }),
        };
      }
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
    await m.writeMonthlySlot(sid, TAB, cat.slotMap, {
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

test('blok geser: K41+607 & K0+316 -> BISA ditulis, mendarat di blok periodenya', async () => {
  const m0 = await mod();
  const layout = m0.batteryLayout(cat.slotMap, IC, '2026-10-08');
  // "bergeser" = baris ringkasan versi config tidak mendarat di kepala blok
  // mana pun, jadi baris itu bukan ringkasan melainkan anggota blok periode lain.
  const geser = DATA.filter(
    (f) => !m0.headerPeriodeBaterai(f.merges, IC).includes(layout.summaryRow)
  );
  assert.equal(geser.length, 2, `harus tepat 2 file bergeser (K41+607 & K0+316), dapat ${geser.length}`);

  for (const f of geser) {
    const sid = idDari(f);
    const { galat, tertangkap, m } = await coba(sid, f.merges);
    console.log(`      ${f.label}: ${galat ? 'DITOLAK' : `DITULIS ke ${(tertangkap.body.data || []).map((d) => d.range.split('!')[1]).join(', ')}`}`);
    assert.equal(galat, null, `${f.label} harus bisa ditulis: ${galat && galat.message}`);

    // Tujuan tulis harus bagian dari blok periode Okt-Des (blok ke-4), BUKAN
    // baris ringkasan config. Di situasi ini baris ringkasan config justru baris
    // data periode lain.
    const barisTulis = (tertangkap.body.data || [])
      .filter((d) => /![A-Z]+\d+:[A-Z]+\d+$/.test(d.range))
      .map((d) => Number(d.range.match(/!([A-Z]+)(\d+):/)[2]));
    const blok = m.blokPeriodeBaterai(f.merges, IC);
    assert.equal(blok.length, 4, 'tab ini harus punya 4 blok periode');
    // 16 nilai tidak selalu memenuhi seluruh blok, jadi yang diperiksa: tulisannya
    // jatuh di baris-baris blok ke-4, berurutan dari baris pertama.
    assert.deepEqual(barisTulis, blok[3].dataRows.slice(0, barisTulis.length),
      `${f.label}: Okt-Des (blok ke-4) harus jadi tujuan tulis`);
    assert.ok(!barisTulis.includes(layout.summaryRow),
      `${f.label}: baris ringkasan config (r${layout.summaryRow}) tidak boleh jadi tujuan`);
  }
});

test('blok geser: K0+316 datanya mendarat di r34 & r36, bukan r29/r32', async () => {
  const f = DATA.find((x) => /K0\+316/.test(x.label));
  if (!f) return;
  const { galat, tertangkap } = await coba(idDari(f), f.merges);
  assert.equal(galat, null, `K0+316 harus bisa ditulis: ${galat && galat.message}`);
  const tujuan = (tertangkap.body.data || []).map((d) => d.range.split('!')[1]);
  console.log(`      K0+316 -> ${tujuan.join(', ')}`);
  assert.ok(tujuan.some((t) => /^G34:/.test(t)), `harus menulis ke r34, dapat ${tujuan.join(', ')}`);
  assert.ok(tujuan.every((t) => !/^G(29|32):/.test(t)),
    `r29/r32 baris periode lain - tidak boleh jadi tujuan: ${tujuan.join(', ')}`);
});

test('blok geser: r29 berisi data periode LAIN tetap aman - tujuan tulis pindah ke blok nyata', async () => {
  const m0 = await mod();
  const layout = m0.batteryLayout(cat.slotMap, IC, '2026-10-08');
  const geser = DATA.find((x) => !m0.headerPeriodeBaterai(x.merges, IC).includes(layout.summaryRow));
  assert.ok(geser, 'butuh satu file bergeser untuk uji ini');
  const sid = idDari(geser);

  // r29 di file ini berisi 12 nilai asli teknisi (periode Jul-Sep). Penulisan
  // periode Okt-Des TIDAK boleh menyentuhnya sama sekali.
  const berisi = await coba(sid, geser.merges, 16, ['V:13,545V  R:5,5mΩ', 'V:13,492V  R:5,4mΩ']);
  console.log(`      r29 berisi -> ${berisi.galat ? 'DITOLAK' : 'DITULIS ke ' +
    (berisi.tertangkap.body.data || []).map((d) => d.range.split('!')[1]).join(', ')}`);
  assert.equal(berisi.galat, null, `harus tetap bisa menulis: ${berisi.galat && berisi.galat.message}`);
  const tujuanBerisi = (berisi.tertangkap.body.data || []).map((d) => d.range.split('!')[1]);
  assert.ok(!tujuanBerisi.some((t) => /^G29:/.test(t)),
    `r29 berisi data asli - tidak boleh jadi tujuan: ${tujuanBerisi.join(', ')}`);

  // Kalau r29 kosong (kasus K27+985), perilakunya harus sama: tetap ke blok nyata.
  const kosong = await coba(sid, geser.merges, 16, []);
  console.log(`      r29 kosong -> ${kosong.galat ? 'DITOLAK' : 'DITULIS ke ' +
    (kosong.tertangkap.body.data || []).map((d) => d.range.split('!')[1]).join(', ')}`);
  assert.equal(kosong.galat, null,
    `r29 kosong tidak boleh diblokir (itu kasus K27+985): ${kosong.galat && kosong.galat.message}`);
  assert.ok(kosong.tertangkap, 'harus ada penulisan');
});

test('blok geser: r29 tak terbaca -> tetap ke blok nyata, tidak menebak', async () => {
  const m0 = await mod();
  const layout = m0.batteryLayout(cat.slotMap, IC, '2026-10-08');
  const geser = DATA.find((x) => !m0.headerPeriodeBaterai(x.merges, IC).includes(layout.summaryRow));
  if (!geser) return;
  // bacaBaris balikin [] saat API gagal -> keputusan blok TIDAK bergantung pada
  // isi r29 lagi (blok ditentukan dari merge), jadi hasilnya harus tetap benar.
  const { galat, tertangkap } = await coba(idDari(geser), geser.merges, 16, null);
  console.log(`      baca gagal -> ${galat ? 'DITOLAK' : 'DITULIS'}`);
  assert.equal(galat, null, `tidak boleh gagal: ${galat && galat.message}`);
  const tujuan = (tertangkap.body.data || []).map((d) => d.range.split('!')[1]);
  assert.ok(tujuan.some((t) => /^G37:/.test(t) || /^G34:/.test(t)),
    `harus ke blok periode Okt-Des: ${tujuan.join(', ')}`);
  assert.ok(!tujuan.some((t) => /^G29:/.test(t)),
    `tidak boleh menulis ke r29: ${tujuan.join(', ')}`);
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
