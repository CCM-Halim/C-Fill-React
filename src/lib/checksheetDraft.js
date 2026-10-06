/**
 * checksheetDraft.js
 * Draf isian checksheet — supaya pengisian yang belum selesai bisa DILANJUTKAN
 * besok (atau kapan saja) dan hasilnya masuk ke SATU file, bukan terbelah.
 *
 * Kenapa perlu: sebelumnya jawaban hanya hidup di memori React. Begitu teknisi
 * menutup app di tengah pengisian (sinyal hilang, baterai habis, jam kerja
 * usai), semua isian hilang — jadi besoknya dia mengisi ulang dari nol. Karena
 * submit berikutnya bisa mendarat di berkas/baris berbeda (lihat riwayat bug
 * file kembar), hasil hari-1 dan hari-2 bisa terpisah di dua file.
 *
 * Kunci draf memakai SITUS + KATEGORI + BULAN (YYYY-MM), bukan tanggal persis:
 * satu slot bulan = satu baris di sheet (lihat computeSlotRow), jadi draf yang
 * dilanjutkan di hari berikutnya dalam bulan yang sama tetap menempel ke slot
 * yang sama — persis yang diinginkan.
 *
 * Modul ini murni (tanpa jaringan / import.meta.env) supaya bisa diuji di Node.
 */

export const DRAFT_PREFIX = 'cfill_checksheet_draft_v1:';

/** Draf lebih tua dari ini diabaikan (bulan sudah berganti jauh / data basi). */
export const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** Bulan dari tanggal 'YYYY-MM-DD' -> 'YYYY-MM'. */
export function bulanDari(tanggal) {
  const s = String(tanggal || '').trim();
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return 'tanpa-tanggal';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Kunci draf: satu slot bulan (situs + kategori + bulan) = satu draf. */
export function draftKey({ buildingCategory, siteName, categoryId, tanggal }) {
  return `${DRAFT_PREFIX}${buildingCategory}|${siteName}|${categoryId}|${bulanDari(tanggal)}`;
}

/** Buang kunci internal `__raw` / nilai kosong sebelum disimpan. */
function bersihkan(answers) {
  const out = {};
  Object.entries(answers || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v) && v.length === 0) return;
    out[k] = v;
  });
  return out;
}

/** Ada isian berarti? (menghitung item, termasuk yang nilainya di kunci `__raw`) */
export function jumlahTerisi(answers) {
  const bersih = bersihkan(answers);
  const ids = new Set();
  for (const k of Object.keys(bersih)) {
    if (k === '__petugas') continue;
    // Item pilihan (ya/tidak, status) hanya menulis `<id>__raw` — jangan
    // dihitung sebagai nol, karena bagi teknisi item itu SUDAH terisi.
    ids.add(k.endsWith('__raw') ? k.slice(0, -5) : k);
  }
  return ids.size;
}

/**
 * Simpan draf. Return false kalau tidak ada yang perlu disimpan (isian kosong)
 * — dalam kasus itu draf lama justru DIHAPUS, supaya tidak ada draf hantu.
 */
export function saveDraft(storage, key, answers, now = Date.now()) {
  const isi = bersihkan(answers);
  try {
    if (Object.keys(isi).length === 0) {
      storage.removeItem(key);
      return false;
    }
    storage.setItem(key, JSON.stringify({ answers: isi, savedAt: now }));
    return true;
  } catch {
    /* kuota penuh / diblokir — draf cuma kemudahan, jangan sampai menghalangi isi form */
    return false;
  }
}

/**
 * Ambil draf. Return null kalau tidak ada, rusak, kosong, atau sudah kedaluwarsa.
 */
export function loadDraft(storage, key, now = Date.now(), maxAgeMs = DRAFT_MAX_AGE_MS) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !d.answers || typeof d.answers !== 'object') return null;
    if (Object.keys(d.answers).length === 0) return null;
    const savedAt = typeof d.savedAt === 'number' ? d.savedAt : 0;
    if (savedAt && now - savedAt > maxAgeMs) return null;
    return { answers: d.answers, savedAt, jumlahTerisi: jumlahTerisi(d.answers) };
  } catch {
    return null;
  }
}

export function clearDraft(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    /* abaikan */
  }
}

/**
 * Susun ulang state `answers` DARI draf, sesuai tipe tiap item.
 *
 * Kenapa perlu: tiap tipe input menyimpan jawabannya di kunci yang berbeda.
 * Item teks biasa hanya memakai kunci id, item berpengukur (measurement/status/
 * baterai/dll) memakai `id` untuk tampilan + `id__raw` untuk nilai mentah
 * komponennya, dan item ber-`noTglPrefix` membungkus teks dalam objek
 * `{ __rawText }`. Kalau draf dipasang mentah-mentah ke state, item teks biasa
 * ikut dibaca sebagai objek dan tidak muncul di kotak isian.
 *
 * @param {object} draf        hasil loadDraft()
 * @param {Array}  items       category.items
 * @returns {object} answers siap dipasang ke setAnswers()
 */
export function restoreAnswers(draf, items) {
  const out = {};
  const simpan = (draf && draf.answers) || {};
  for (const item of items || []) {
    if (!item || !item.id) continue;
    const rawKey = item.id + '__raw';
    const punyaRaw = Object.prototype.hasOwnProperty.call(simpan, rawKey);
    const nilai = simpan[item.id];
    const adaNilai = nilai !== undefined && nilai !== null && nilai !== '';

    if (item.noTglPrefix) {
      // Item teks polos: state-nya berbentuk { __rawText: '...' }
      const teks = adaNilai
        ? (typeof nilai === 'object' ? (nilai.__rawText || '') : nilai)
        : '';
      if (teks) out[item.id] = { __rawText: teks };
    } else if (adaNilai) {
      out[item.id] = nilai;
    }

    // Nilai mentah komponen dikembalikan apa adanya — komponen yang tahu cara
    // memakainya (boleh berupa angka, teks, atau baris tabel).
    if (punyaRaw) out[rawKey] = simpan[rawKey];
  }
  return out;
}

/** Petugas yang tersimpan di draf (kunci internal `__petugas`). */
export function petugasDariDraf(draf) {
  const p = draf && draf.answers && draf.answers.__petugas;
  return typeof p === 'string' ? p : '';
}

/**
 * Pesan singkat untuk ditampilkan ke teknisi: kapan draf terakhir disimpan dan
 * berapa item yang sudah terisi.
 */
export function pesanDraf(draf, sekarang = Date.now()) {
  if (!draf) return null;
  const menit = Math.max(0, Math.round((sekarang - draf.savedAt) / 60000));
  let kapan;
  if (menit < 1) kapan = 'beberapa detik lalu';
  else if (menit < 60) kapan = `${menit} menit lalu`;
  else if (menit < 60 * 24) kapan = `${Math.round(menit / 60)} jam lalu`;
  else kapan = `${Math.round(menit / (60 * 24))} hari lalu`;
  return `Isian sebelumnya dipulihkan (${draf.jumlahTerisi} item, disimpan ${kapan}). Lanjutkan atau ubah sesuai kondisi hari ini.`;
}
