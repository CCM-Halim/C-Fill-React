/**
 * entryExitMatch — pencocokan tanggal Entry/Exit dengan bulan berjalan.
 *
 * Modul murni (tanpa jaringan / import.meta.env) supaya bisa diuji di Node.
 *
 * KENAPA TIDAK SEKADAR `numbers.includes(String(year))`:
 * Google Sheets kadang menormalkan tanggal jadi "MM/DD/YYYY" walau kita
 * mengirim "DD/MM/YYYY". Pencocokan lewat daftar angka tidak bergantung posisi,
 * jadi aman untuk kedua bentuk. Tapi ada jebakan: tahun juga muncul sebagai
 * bagian lain (mis. "2026" ada di nomor kontak), dan angka bulan bisa
 * tertukar dengan angka tanggal. Karena itu:
 *
 *   - tahun harus muncul sebagai angka UTUH,
 *   - bulan harus ada DAN tidak boleh lebih dari 12 (bulan memang 1-12),
 *   - kalau tanggalnya jelas berformat DD/MM/YYYY atau MM/DD/YYYY, dipakai
 *     pembacaan posisional yang lebih pasti (angka tengah = bulan).
 *
 * Yang penting: fungsi ini HANYA memutuskan "ada baris di bulan berjalan".
 * Salah bilang "ada" berakibat teknisi berhenti diminta isi (mereka tetap bisa
 * isi lewat menu EntryExit); salah bilang "tidak ada" berakibat isian ganda.
 * Karena itu pembacaan posisional diutamakan, deteksi longgar jadi cadangan.
 */

/** Pecah tanggal jadi angka-angka. Kembalikan null kalau tidak masuk akal. */
export function angkaTanggal(dateStr) {
  if (dateStr === null || dateStr === undefined) return null;
  const numbers = String(dateStr).match(/\d+/g);
  if (!numbers || numbers.length < 3) return null;
  return numbers.map((n) => parseInt(n, 10));
}

/** Nama bulan (Indonesia + Inggris) -> nomor. Dipakai kalau tanggal berupa teks. */
const NAMA_BULAN = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
  juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8, agt: 8,
  sep: 9, okt: 10, nov: 11, des: 12,
};

/** Cari nomor bulan dari nama bulan di dalam teks. null kalau tidak ada. */
function bulanDariNama(teks) {
  const kata = String(teks || '').toLowerCase().match(/[a-z]+/g);
  if (!kata) return null;
  for (const k of kata) {
    if (NAMA_BULAN[k]) return NAMA_BULAN[k];
  }
  return null;
}

/**
 * Ubah angka serial tanggal Google Sheets/Excel jadi {tahun, bulan, hari}.
 * Sheets menyimpan tanggal sebagai jumlah hari sejak 30 Des 1899.
 */
export function serialKeTanggal(serial) {
  if (typeof serial !== 'number' || !isFinite(serial)) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  // Pakai UTC - waktu di dalam serial memang tanpa zona.
  return { tahun: d.getUTCFullYear(), bulan: d.getUTCMonth() + 1, hari: d.getUTCDate() };
}

/**
 * Apakah nilai tanggal ini jatuh di bulan & tahun yang diminta?
 *
 * Menerima (sesuai apa yang benar-benar dikembalikan Sheets API):
 *   - ANGKA SERIAL (nilai mentah): 46300 -> 5 Okt 2026  <- paling andal
 *   - Date object
 *   - teks ISO "2026-10-06T..."
 *   - teks "06/10/2026", "10/06/2026", "6 Oktober 2026"
 *
 * Angka serial diutamakan karena kolom B di file site formatnya campur-aduk
 * (sebagian M/D/YYYY, sebagian dd/mm/yyyy). Teks "2/10/2026" ambigu - bisa
 * 2 Oktober atau 10 Februari - dan itu sudah pernah bikin salah hitung.
 * Serialnya tidak ambigu.
 */
export function cocokBulanIni(dateStr, bulan, tahun) {
  // Nilai MENTAH dari Sheets: angka serial tanggal.
  if (typeof dateStr === 'number' && isFinite(dateStr)) {
    const t = serialKeTanggal(dateStr);
    return !!t && t.bulan === bulan && t.tahun === tahun;
  }

  // Sheets kadang mengembalikan objek Date yang sudah di-string jadi ISO.
  if (dateStr instanceof Date) {
    return dateStr.getMonth() + 1 === bulan && dateStr.getFullYear() === tahun;
  }

  const teks = String(dateStr || '').trim();
  if (!teks) return false;

  // Bentuk ISO "2026-10-06..." -> paling pasti, baca posisional.
  const iso = teks.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return parseInt(iso[1], 10) === tahun && parseInt(iso[2], 10) === bulan;
  }

  // Teks dengan NAMA bulan, mis. "7 Oktober 2026". Teknisi kadang mengetik
  // tanggal sebagai teks, bukan lewat pemilih tanggal - dan bentuk ini hanya
  // punya 2 angka, jadi pencocokan berbasis angka di bawah akan melewatkannya.
  const namaBulan = bulanDariNama(teks);
  if (namaBulan !== null) {
    const adaTahun = (teks.match(/\d{4}/g) || []).some((t) => parseInt(t, 10) === tahun);
    const adaTahun4Digit = /\d{4}/.test(teks);
    return namaBulan === bulan && (adaTahun || !adaTahun4Digit);
  }

  const angka = angkaTanggal(teks);
  if (!angka) return false;

  // Bentuk DD/MM/YYYY atau MM/DD/YYYY. Urutan hari-bulan tidak bisa dipastikan
  // dari teks saja (format selnya beda-beda per baris), jadi bulan diterima
  // kalau ada di antara angka yang nilainya 1-12.
  if (angka.length >= 3) {
    const tahunCocok = angka.some((n) => n === tahun);
    if (!tahunCocok) return false;
    const kandidat = angka.filter((n) => n !== tahun && n >= 1 && n <= 12);
    return kandidat.includes(bulan);
  }

  return false;
}
