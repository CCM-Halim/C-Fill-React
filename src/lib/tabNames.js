/**
 * tabNames.js
 * Pencocokan NAMA TAB & NAMA FILE Google Drive.
 *
 * Modul ini SENGAJA murni (tanpa jaringan / import.meta.env) supaya bisa diuji
 * langsung dari Node - lihat test/tabNames.test.mjs.
 *
 * ============================================================================
 * KENAPA PERBANDINGAN "SAMA PERSIS" TIDAK CUKUP
 * ============================================================================
 *
 * Nama tab di Google Sheets BUKAN salinan setia dari file .xlsx aslinya. Dua
 * hal terjadi di luar kendali aplikasi:
 *
 * 1. BATAS 31 KARAKTER. Nama sheet di Excel maksimal 31 karakter, jadi nama
 *    yang lebih panjang sudah terpotong DI FILE .xlsx-NYA. Saat dikonversi ke
 *    Google Sheets, hasilnya bisa berbeda LAGI (Sheets memotong dengan aturan
 *    sendiri). Contoh nyata:
 *
 *      config  : "Pemeriksaan jalur FO (1M, 3M, 1"     (31 - sudah terpotong)
 *      .xlsx   : "Pemeriksaan jalur FO (1M, 3M, 1"     (31)
 *      Sheets  : "Pemeriksaan jalur FO (1M, 3M, 1Y)"   (32 - BEDA 1 karakter)
 *
 *    Kejadian yang sama di K12+075 & K42 + 365 AT Post 3 (4 tab):
 *      "Sistem Monitoring RTU (1M,3M,1Y"  -> "Sistem Monitoring RTU (1M,3M,1Y)"
 *      "Comprehensive Lightning Protect"  -> "Comprehensive Lightning Protect (1M, 3M, 1Y)"
 *      "AC Distribution Cabinet (box) ("  -> "AC Distribution Cabinet (box) (1M, 3M, 6M, 1Y)"
 *
 * 2. NAMA FILE: karakter '/' TIDAK BOLEH ada di nama file Drive. Saat .xlsx
 *    diunggah, '/' berubah jadi '_' - SPASI DI SEKITARNYA TIDAK BERUBAH:
 *
 *      "Power Meter / Dynamometer"        -> "Power Meter _ Dynamometer"
 *      "Network Performance Tester/analyzer (10 G)" -> "Network Performance Tester_analyzer (10 G)"
 *      "Optic Power Source (OPS/OLS)"     -> "Optic Power Source (OPS_OLS)"
 *
 *    Karena itu 4 alat ukur tidak bisa dipilih di Checksheet Instrumen: config
 *    mencari nama yang pakai '/', sementara file di Drive pakai '_'.
 */

/** Batas panjang nama sheet di Excel/Google Sheets. */
export const TAB_NAME_LIMIT = 31;

/**
 * Nama file yang aman untuk Google Drive: '/' diganti '_' (aturan yang sama
 * dengan yang dilakukan Drive/Excel sendiri).
 */
export function sanitizeDriveName(name) {
  return String(name || '').replace(/\//g, '_');
}

/** Semua varian nama file yang masuk akal dicari di Drive (urut, tanpa duplikat). */
export function nameVariants(fileName) {
  const asli = String(fileName || '').trim();
  if (!asli) return [];
  const out = [];
  for (const n of [asli, asli.replace(/\.xlsx$/i, ''), sanitizeDriveName(asli), sanitizeDriveName(asli).replace(/\.xlsx$/i, '')]) {
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Buang semua spasi + samakan huruf kecil. */
export function normalizeName(s) {
  return String(s || '').replace(/\s+/g, '').toLowerCase();
}

/**
 * Benar kalau salah satu nama cuma versi TERPOTONG dari yang lain, di mana yang
 * lebih pendek panjangnya PERSIS batas 31 karakter. Syarat ">= 31" ini yang
 * membuat aturannya aman: "HFSPS (1Y)" (10 karakter) TIDAK akan dianggap versi
 * terpotong dari "HFSPS (1M, 3M)".
 */
export function isTruncatedVariant(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y || x === y) return false;
  if (y.length >= TAB_NAME_LIMIT && x.startsWith(y)) return true;
  if (x.length >= TAB_NAME_LIMIT && y.startsWith(x)) return true;
  return false;
}

/**
 * Akhiran pendek yang boleh diabaikan - mis. tab "Jadwal Kunjungan MR New"
 * padahal yang dicari "Jadwal Kunjungan MR".
 *
 * Dibatasi ketat (<= 4 huruf/angka, tanpa spasi/tanda baca) supaya TIDAK
 * salah cocok: "HFSPS (1Y)" tidak akan pernah dianggap varian dari
 * "HFSPS (1M, 3M)" karena sisaannya bukan huruf/angka polos.
 */
export function isShortSuffixVariant(tabName, expected) {
  const a = normalizeName(tabName);
  const b = normalizeName(expected);
  if (!a || !b || a === b || !a.startsWith(b)) return false;
  const sisa = a.slice(b.length);
  return sisa.length > 0 && sisa.length <= 4 && /^[a-z0-9]+$/.test(sisa);
}

/**
 * Cari nama tab yang PALING MUNGKIN dimaksud dari daftar tab yang benar-benar
 * ada di file. Urutan aturan sengaja dari yang paling ketat ke paling longgar -
 * makin longgar makin besar risiko salah cocok.
 *
 * Return null kalau tidak ada yang cocok (pemanggil yang memutuskan apa yang
 * harus dilakukan - JANGAN diam-diam pakai nama asli, karena error Sheets-nya
 * cuma berbunyi "Unable to parse range" dan itu tidak menjelaskan apa pun).
 */
export function matchTabName(titles, expectedTabName) {
  if (!Array.isArray(titles) || titles.length === 0) return null;
  const exp = String(expectedTabName || '').trim();
  if (!exp) return null;

  // 1. Persis - kasus normal.
  if (titles.includes(exp)) return exp;

  // 2. Beda spasi & huruf besar/kecil saja.
  //    "Lembar Verifikasi pekerjaan" == "Lembar Verifikasi Pekerjaan"
  const normExp = normalizeName(exp);
  const m2 = titles.find((t) => normalizeName(t) === normExp);
  if (m2) return m2;

  // 3. Cuma beda akhiran pendek.
  //    "jadwal kunjungan MR New" <- "Jadwal Kunjungan MR"
  const m3 = titles.find((t) => isShortSuffixVariant(t, exp));
  if (m3) return m3;

  // 4. Salah satu cuma versi terpotong 31 karakter.
  const m4 = titles.find((t) => isTruncatedVariant(t, exp));
  if (m4) return m4;

  return null;
}

/**
 * Cari nama tab dari BEBERAPA kandidat sekaligus (nama utama + alias).
 *
 * Dipakai untuk kategori "Telephone dan Softswitch AG": config menyebut nama
 * panjang, tetapi 4 site (Halim CC, dst) memakai nama pendek "Telephone AG
 * (3,6M)" di file aslinya. Keduanya nama yang SAH - hanya beda penulisan -
 * jadi alias dicoba berurutan SETELAH nama utama.
 *
 * Return { tab, dari } - `dari` = kandidat mana yang akhirnya dipakai (buat
 * ditampilkan saat menelusuri masalah).
 */
export function matchTabNameFromCandidates(titles, kandidat) {
  const daftar = (kandidat || []).map((k) => String(k || '').trim()).filter(Boolean);
  for (const k of daftar) {
    const found = matchTabName(titles, k);
    if (found) return { tab: found, dari: k };
  }
  return { tab: null, dari: null };
}
