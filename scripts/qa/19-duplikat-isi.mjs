/**
 * QA 19 — BANDINGKAN ISI SALINAN GANDA (read-only).
 *
 * Untuk tiap site yang punya salinan Google Sheets ganda, hitung berapa sel
 * TERISI di setiap salinan (per tab, digabung lewat values:batchGet - 1 request
 * per salinan, bukan 1 per tab). Tujuannya menjawab satu pertanyaan:
 *
 *   "Apakah ada data yang HANYA ADA di salinan yang tidak dipakai aplikasi?"
 *
 * Kalau ya, isian itu tidak akan pernah terbaca sampai digabungkan manual.
 *
 * Jalankan: node scripts/qa/19-duplikat-isi.mjs
 */
import fs from 'node:fs';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };
const S = 'https://sheets.googleapis.com/v4/spreadsheets';
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

const api = async (u, coba = 5) => {
  for (let i = 1; i <= coba; i++) {
    const r = await fetch(u, { headers: H });
    const j = await r.json();
    if (!j.error) return j;
    if (j.error.code === 429 || j.error.code === 403) { await tidur(3000 * i); continue; }
    throw new Error(`${j.error.code} ${j.error.message}`);
  }
  return null;
};

const RANGE_BARIS = 130;   // cukup untuk seluruh blok checksheet (slot + tabel)
const RANGE_KOLOM = 'A1:Z';

async function profil(id) {
  const meta = await api(`${S}/${id}?fields=sheets.properties.title`);
  if (!meta) return null;
  const tabs = meta.sheets.map((s) => s.properties.title);

  // Satu request untuk SEMUA tab sekaligus.
  const ranges = tabs.map((t) => `ranges=${encodeURIComponent(`'${t}'!${RANGE_KOLOM}${RANGE_BARIS}`)}`).join('&');
  const data = await api(`${S}/${id}/values:batchGet?${ranges}`);
  if (!data) return null;

  const perTab = {};
  let total = 0;
  data.valueRanges.forEach((vr, i) => {
    const n = (vr.values || []).reduce(
      (acc, row) => acc + row.filter((c) => String(c ?? '').trim() !== '').length, 0
    );
    perTab[tabs[i]] = n;
    total += n;
  });
  return { tabs, perTab, total };
}

const daftar = JSON.parse(fs.readFileSync('/tmp/qa18-duplikat.json', 'utf8'));
console.log('=== QA 19: BANDINGKAN ISI SALINAN GANDA ===');
console.log(`site diperiksa: ${daftar.ringkas.length}\n`);

const hasil = [];
for (const r of daftar.ringkas) {
  const semua = [{ id: r.dipakai.id, dibuat: r.dipakai.dibuat, dipakai: true },
    ...r.lain.map((l) => ({ ...l, dipakai: false }))];

  console.log('─'.repeat(78));
  console.log(`${r.site}  (${semua.length} salinan)`);

  const profilList = [];
  for (const s of semua) {
    const p = await profil(s.id);
    profilList.push({ ...s, profil: p });
    await tidur(700);
  }

  const utama = profilList[0].profil;
  console.log(`   dipakai app (dibuat ${utama?.dibuat ?? r.dipakai.dibuat}): ${utama ? utama.total : '?'} sel terisi`);

  const hanyaDiLain = [];
  for (let i = 1; i < profilList.length; i++) {
    const p = profilList[i].profil;
    console.log(`   ${i + 1}. dibuat ${p ? '—' : '?'} ${semua[i].dibuat}: ${p ? p.total : '?'} sel terisi`);
    if (!p || !utama) continue;

    // Tab yang di salinan ini ADA isinya, tapi di salinan yang dipakai kosong/tidak ada.
    for (const [tab, n] of Object.entries(p.perTab)) {
      const m = utama.perTab[tab] ?? 0;
      if (n > m) hanyaDiLain.push({ salinan: i + 1, tab, diLain: n, diDipakai: m, selisih: n - m });
    }
  }

  if (hanyaDiLain.length) {
    console.log(`   ⚠ ${hanyaDiLain.length} tab punya isi LEBIH BANYAK di salinan lain:`);
    for (const x of hanyaDiLain.slice(0, 8)) {
      console.log(`        salinan #${x.salinan} "${x.tab}": ${x.diLain} sel (yang dipakai: ${x.diDipakai})`);
    }
    if (hanyaDiLain.length > 8) console.log(`        … (+${hanyaDiLain.length - 8} tab lain)`);
  } else {
    console.log('   ✔ tidak ada tab yang lebih terisi di salinan lain');
  }

  hasil.push({ site: r.site, kategori: r.kategori, utamaSel: utama?.total ?? null, hanyaDiLain });
}

const berisiko = hasil.filter((h) => h.hanyaDiLain.length > 0);
console.log('\n' + '='.repeat(78));
console.log(`site dengan data hanya di salinan lain : ${berisiko.length}`);
console.log(`site yang aman (isinya sama/kosong)   : ${hasil.length - berisiko.length}`);
console.log('\nPERLU DIGABUNG MANUAL (prioritas):');
for (const b of berisiko) {
  console.log(`  · ${b.site} — ${b.hanyaDiLain.length} tab terdampak`);
}

fs.writeFileSync('/tmp/qa19-duplikat-isi.json', JSON.stringify(hasil, null, 1));
console.log('\nhasil lengkap: /tmp/qa19-duplikat-isi.json');
