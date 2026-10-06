/**
 * uploadRetry.js
 *
 * Bantu unggah file supaya TIDAK gagal hanya karena jaringan HP kedip
 * sekejap. Dua hal:
 *
 *   1. isTransientError() - pilah kesalahan yang layak dicoba ulang
 *      (jaringan putus, server 5xx) dari yang tidak
 *      (401/403 izin, sesi login habis - percuma diulang).
 *
 *   2. withRetry() - coba ulang dengan jeda bertambah (800ms, 1,6s, 3,2s).
 *      Jeda makin panjang supaya tidak menambah beban server yang sedang
 *      bermasalah, dan supaya HP tidak menghajar request bertubi-tubi.
 *
 * Modul ini SENGAJA murni: tidak menyentuh DOM, tidak ada import.meta.env,
 * tidak memanggil jaringan - supaya bisa diuji langsung pakai `node --test`.
 */

/**
 * Pesan kesalahan jaringan sesaat yang muncul dari fetch() di browser.
 * Bunyinya beda-beda antar browser ("Failed to fetch" di Chrome,
 * "NetworkError..." di Firefox, "Load failed" di Safari), jadi dicocokkan
 * dengan pola, bukan kata persis.
 */
const POLA_SESAAT = [
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /load failed/i,
  /err_(connection|network|internet|timed)/i,
  /timed?\s?out/i,
  /temporarily unavailable/i,
  /socket hang up/i
];

/**
 * Kesalahan yang TIDAK akan membaik walau diulang - jangan buang waktu
 * percobaan ulang, langsung tampilkan ke user.
 */
const POLA_MENETAP = [
  /sesi login berakhir/i,
  /\b(400|401|403|404)\b/
];

/**
 * Apakah kesalahan ini layak dicoba ulang?
 *
 * Aturannya: masalah jaringan & server sementara -> ya.
 * Masalah izin/login atau permintaan yang salah bentuk -> tidak.
 */
export function isTransientError(err) {
  if (!err) return false;
  // Dibatalkan user (tombol batal / pindah halaman) - bukan kesalahan.
  if (err.name === 'AbortError') return false;

  const pesan = String(err.message || err);

  // Unggahan yang dapat status HTTP dari Drive: 5xx layak diulang, 4xx tidak.
  const kode = pesan.match(/\((\d{3})\)/);
  if (kode) {
    const n = Number(kode[1]);
    if (n >= 500) return true;
    if (n >= 400) return false;
  }

  if (POLA_MENETAP.some((re) => re.test(pesan))) return false;
  return POLA_SESAAT.some((re) => re.test(pesan));
}

/**
 * Pesan yang enak dibaca teknisi (Indonesia), bukan pesan mentah browser.
 * "Failed to fetch" tidak memberi tahu apa-apa ke orang lapangan.
 */
export function pesanGagal(err) {
  const pesan = String(err?.message || err || 'penyebab tidak diketahui');

  if (POLA_SESAAT.some((re) => re.test(pesan))) {
    return 'koneksi terputus - file sudah dicoba 3x, jaringan HP sempat hilang';
  }
  if (/sesi login berakhir/i.test(pesan)) {
    return 'sesi login berakhir - silakan login ulang lalu coba lagi';
  }

  // Status HTTP dari Drive: kode saja tidak berarti apa-apa buat teknisi.
  const kode = pesan.match(/\b(4\d{2})\b/);
  if (kode) {
    const n = kode[1];
    if (n === '401') return 'sesi login berakhir - silakan login ulang lalu coba lagi';
    if (n === '403') return 'tidak punya izin menyimpan ke folder tujuan';
    if (n === '404') return 'folder tujuan tidak ditemukan';
    if (n === '409') return 'file ini sudah ada di folder tujuan';
    return `permintaan ditolak Google (kode ${n})`;
  }

  return pesan;
}

const jeda = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Jalankan fn(), ulangi kalau gagal karena sebab sesaat.
 *
 * @param fn        fungsi async yang dijalankan (menerima nomor percobaan, mulai 0)
 * @param attempts  jumlah percobaan total (default 3)
 * @param baseDelayMs jeda dasar antar percobaan, naik 2x lipat tiap kali
 * @param onRetry   dipanggil sebelum percobaan ulang, utk memperbarui tampilan
 */
export async function withRetry(fn, { attempts = 3, baseDelayMs = 800, onRetry } = {}) {
  const total = Math.max(1, attempts);
  let kesalahanTerakhir;

  for (let i = 0; i < total; i++) {
    try {
      return await fn(i);
    } catch (e) {
      kesalahanTerakhir = e;

      const masihBisaUlang = i < total - 1 && isTransientError(e);
      if (!masihBisaUlang) throw e;

      // Nomor percobaan yang akan datang (1-basis), supaya UI bisa menulis
      // "percobaan 2 dari 3" - bukan nomor percobaan yang baru saja gagal.
      if (onRetry) onRetry(i + 2, total);
      await jeda(baseDelayMs * Math.pow(2, i)); // 800ms, 1,6s, 3,2s
    }
  }

  throw kesalahanTerakhir;
}
