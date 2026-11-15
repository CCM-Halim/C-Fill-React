import { isTransientError } from './uploadRetry';

/**
 * fetch() yang otomatis mengulang kalau KONEKSI terputus sesaat
 * ("Failed to fetch" / "Load failed" / "NetworkError"). Jaringan HP di lapangan
 * sering putus-nyambung; satu kedipan tidak boleh menggagalkan seluruh halaman.
 * Respons HTTP apa pun (termasuk 4xx/5xx) dikembalikan apa adanya - yang diulang
 * hanya fetch yang gagal total sebelum ada respons.
 */
export async function fetchUlang(url, options = {}, { percobaan = 4, jedaAwal = 700 } = {}) {
  let terakhir;
  for (let i = 1; i <= percobaan; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      terakhir = err;
      if (!isTransientError(err) || i === percobaan) break;
      await new Promise((r) => setTimeout(r, jedaAwal * i));
    }
  }
  throw terakhir;
}
