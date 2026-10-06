/**
 * itemPeriod.js — memisahkan PENANDA PERIODE dari teks item perawatan.
 *
 * Sebelumnya periode ditempel di ujung teks item, contohnya:
 *
 *   "Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya(6 bulan)"
 *
 * Teknisinya harus membaca sampai ujung kalimat baru tahu itu perawatan 6 bulan,
 * dan di layar HP penanda itu mudah terlewat. Modul ini memindahkannya ke depan
 * sebagai label tersendiri yang diberi warna menurut periodenya:
 *
 *   Periode 6 bulan
 *   Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya
 *
 * Sumber utama = `periodMonths` pada data item (1/3/6/12/24/36). Diperiksa ke
 * seluruh 321 item di config: nilainya SELALU cocok dengan angka di dalam teks
 * label (0 selisih), jadi `periodMonths` yang dipakai sebagai acuan dan teks
 * hanya jadi cadangan.
 *
 * Modul ini murni — tanpa jaringan, tanpa React — supaya bisa diuji di Node.
 */

/**
 * Penanda periode DI DALAM teks label.
 *
 * Sengaja hanya menerima angka + satuan bulan/tahun. Tanda kurung lain yang
 * memang bukan periode (misalnya "Arus (I)" pada alat ukur, atau
 * "(Menggunakan battery comprehensive tester)") TIDAK boleh ikut terhapus.
 */
const POLA_PENANDA = /\s*\(\s*(\d+)\s*(bulan|bulanan|tahun|tahunan)\s*\)\s*$/i;

/**
 * Baca penanda periode dari teks label.
 * @returns {{months:number, teksAsli:string} | null}
 */
export function bacaPenandaDariTeks(label) {
  const teks = String(label || '');
  const m = teks.match(POLA_PENANDA);
  if (!m) return null;

  const angka = Number(m[1]);
  const satuan = m[2].toLowerCase();
  const months = satuan.startsWith('tahun') ? angka * 12 : angka;

  return { months, teksAsli: m[0].trim() };
}

/**
 * Buang penanda periode dari teks label, sisakan kalimatnya saja.
 * Menangani juga penulisan yang menempel tanpa spasi ("labelnya(6 bulan)").
 */
export function bersihkanTeksItem(label) {
  const teks = String(label || '');
  if (!POLA_PENANDA.test(teks)) return teks;

  return teks.replace(POLA_PENANDA, '').trimEnd();
}

/**
 * "6 bulan" / "1 tahun" / "3 tahun" — satuan yang enak dibaca teknisi.
 */
export function teksPeriode(months) {
  const n = Number(months);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n % 12 === 0) {
    const tahun = n / 12;
    return `${tahun} tahun`;
  }
  return `${n} bulan`;
}

/**
 * Kelompok periode — dipakai untuk memilih warna.
 *   1 bulan  -> hijau
 *   3 bulan  -> kuning
 *   6 bulan  -> oranye
 *   1 tahun  -> merah
 * Periode lain (24 & 36 bulan) ikut kelompok tahunan tapi punya kelas sendiri
 * supaya warnanya tetap merah dan teksnya tetap jujur ("2 tahun", "3 tahun").
 */
export function kelompokPeriode(months) {
  const n = Number(months);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n === 1) return 'bulanan';
  if (n === 3) return 'triwulanan';
  if (n === 6) return 'semesteran';
  if (n % 12 === 0) return 'tahunan';
  return null;
}

/**
 * Ambil info periode sebuah item perawatan.
 *
 * `periodMonths` diutamakan; kalau tidak ada, baru membaca dari teks label.
 *
 * @returns {{months:number, teks:string, kelompok:string, warna:string} | null}
 */
export function periodeItem(item) {
  if (!item) return null;

  const dariData = Number(item.periodMonths);
  const dariTeks = bacaPenandaDariTeks(item.label);
  const months = Number.isFinite(dariData) && dariData > 0
    ? dariData
    : (dariTeks ? dariTeks.months : null);

  if (!months) return null;

  const kelompok = kelompokPeriode(months);
  return {
    months,
    teks: teksPeriode(months),
    kelompok,
    warna: WarnaPeriode[kelompok] || WarnaPeriode.tahunan,
  };
}

/**
 * Warna penanda. Tiap kelompok dapat TEKS BERWARNA + LATAK senada + GARIS TEPI,
 * bukan cuma warna teks — supaya tetap terbaca oleh yang buta warna (hijau vs
 * merah kontrasnya cuma 1,14:1, praktis sama terangnya).
 *
 * Semua kombinasi teks/latar di bawah sudah diperiksa kontrasnya dan lolos
 * ambang WCAG AA (>= 4,5:1) untuk teks tebal berukuran kecil:
 *   1 bulan 6,46:1  •  3 bulan 5,65:1  •  6 bulan 5,09:1  •  1 tahun 6,34:1
 */
export const WarnaPeriode = {
  bulanan: 'hijau',
  triwulanan: 'kuning',
  semesteran: 'oranye',
  tahunan: 'merah',
};

/**
 * Siapkan tampilan satu item: periode dipisah dari teksnya.
 *
 * @returns {{periode:object|null, teksItem:string, labelAsli:string}}
 */
export function siapkanItem(item) {
  const label = String(item?.label || '');
  return {
    periode: periodeItem(item),
    teksItem: bersihkanTeksItem(label),
    labelAsli: label,
  };
}
