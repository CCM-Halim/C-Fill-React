/**
 * Uji kode produksi terhadap MERGE NYATA dari 3 file Drive yang berbeda tipe.
 * Bukan merge karangan - diambil langsung via Sheets API.
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
let modCache = null;
async function mod() { if (!modCache) modCache = await import(sifatkan()); return modCache; }

const berkas = new URL('./fixtures/merge_nyata.json', import.meta.url);
const adaBerkas = fs.existsSync(berkas);
const data = adaBerkas ? JSON.parse(fs.readFileSync(berkas, 'utf8')) : [];

test('merge nyata: fixture hasil pembacaan Drive tersedia', () => {
  assert.ok(adaBerkas, 'fixture test/fixtures/merge_nyata.json hilang');
  assert.ok(data.length >= 3, `harus >=3 file, dapat ${data.length}`);
});

for (const d of data) {
  test(`merge nyata [${d.tipe}] ${d.file} / ${d.tab}`, async () => {
    const m = await mod();
    const cat = CATEGORIES.find((c) => c.id === 'cat06');
    const itemRef = cat.items.find((x) => x.inputType === 'battery_table');
    const item = cat.slotMap.itemColumns.find((x) => x.id === itemRef.id);
    const layout = m.batteryLayout(cat.slotMap, item, '2026-10-08');
    const slots = m.batterySlots(d.merges, layout, item);

    console.log(`      baris layout : ${JSON.stringify(layout.dataRows)} (ringkasan ${layout.summaryRow})`);
    console.log(`      slot nyata   : ${slots.capacity} -> ${JSON.stringify(slots.rows.map((r) => ({ r: r.row, n: r.cols.length })))}`);

    // Kapasitas harus dilaporkan apa adanya, bukan dikarang 24.
    assert.equal(slots.capacity, slots.rows.reduce((n, x) => n + x.cols.length, 0));

    // Kalau tidak muat 24, harus error - bukan tulis sebagian.
    if (slots.capacity < 24) {
      let tertangkap = null;
      globalThis.fetch = async (url, opts = {}) => {
        if (!opts.method || opts.method === 'GET') {
          return { ok: true, status: 200, json: async () => ({ sheets: [{ properties: { title: d.tab }, merges: d.merges }] }) };
        }
        tertangkap = { body: JSON.parse(opts.body) };
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      };
      m.bersihkanCacheMerges();
      const nilai = Array.from({ length: 24 }, (_, i) => `B${i + 1}`);
      let galat = null;
      try {
        await m.writeMonthlySlot(d.sid, d.tab, cat.slotMap, {
          tanggal: '2026-10-08', petugas: 'Uji', answers: { [item.id]: nilai },
        });
      } catch (e) { galat = e; }
      console.log(`      -> kapasitas ${slots.capacity} < 24 : ${galat ? 'DITOLAK (benar)' : 'DITERIMA (bahaya!)'}`);
      assert.ok(galat, `kapasitas ${slots.capacity} harus menolak 24 nilai`);
      if (slots.capacity === 0) {
        assert.match(galat.message, /BUKAN baris data baterai/, 'pesan harus menyebut layout-nya beda');
      }
      assert.equal(tertangkap, null, 'tidak boleh ada penulisan parsial');
    } else {
      // Kapasitas penuh: 24 nilai harus terpakai semua, tanpa sisa.
      const nilai = Array.from({ length: 24 }, (_, i) => `B${i + 1}`);
      const { terpakai, sisa, rencana } = m.rencanaTulisBaterai(nilai, slots);
      console.log(`      -> 24 nilai: terpakai ${terpakai}, sisa ${sisa}`);
      assert.equal(terpakai, 24);
      assert.equal(sisa, 0);
      // Setiap rentang harus kontigu dan tidak melewati kolom R (18)
      for (const r of rencana) {
        assert.ok(r.colStart >= 7, 'tidak boleh sebelum kolom G');
        assert.ok(r.colStart + r.values.length - 1 <= 18, 'tidak boleh melewati kolom R');
      }
    }
  });
}
