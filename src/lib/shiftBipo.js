/**
 * shiftBipo.js — logika murni (tanpa jaringan) untuk sheet "Shift BIPO":
 * siapa yang bertugas pada shift tertentu di tanggal tertentu.
 *
 * Tata letak sheet: baris header berisi tanggal "01/11", "02/11", ... ; di bawahnya
 * satu baris per orang (nama di kolom B) dengan kode shift per tanggal:
 *   P = Pagi (08:00-16:00)   S = Siang (16:00-22:00)   M = Malam (22:00-08:00)
 *   L = Libur, C = Cuti, kosong/lainnya = tidak bertugas.
 *   "PM" (muncul di baris sebagian orang) dianggap Pagi + Malam.
 * Barisnya tidak dihitung tetap: header dicari, daftar nama berhenti di baris
 * tanpa nama (ringkasan "Shift Malam/Siang/Pagi/Libur" ada di kolom C, kolom B kosong).
 */

export const SHIFT_LIST = [
  { kode: 'pagi',  label: 'Pagi',  jam: '08:00–16:00' },
  { kode: 'siang', label: 'Siang', jam: '16:00–22:00' },
  { kode: 'malam', label: 'Malam', jam: '22:00–08:00' },
];

/**
 * Shift yang sedang berjalan di waktu `now`, dan tanggal (kolom sheet) yang
 * dipakai tiap shift. Shift malam yang dimulai 22:00 kemarin masih berjalan
 * sampai 08:00, jadi pukul 00:00–07:59 shift malam memakai kolom KEMARIN.
 */
export function shiftSekarang(now) {
  const jam = now.getHours();
  const kemarin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const aktif = jam >= 8 && jam < 16 ? 'pagi' : jam >= 16 && jam < 22 ? 'siang' : 'malam';
  return {
    aktif,
    tanggal: { pagi: hariIni, siang: hariIni, malam: jam < 8 ? kemarin : hariIni },
  };
}

/** Kode sel -> daftar shift yang dikerjakan. */
export function kodeKeShift(kode) {
  const k = String(kode || '').trim().toUpperCase();
  if (k === 'PM') return ['pagi', 'malam'];
  if (k === 'P') return ['pagi'];
  if (k === 'S') return ['siang'];
  if (k === 'M') return ['malam'];
  return [];
}

function cocokTanggal(sel, hari, bulan) {
  const m = String(sel || '').trim().match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\D|$)/);
  return !!m && Number(m[1]) === hari && Number(m[2]) === bulan;
}

/**
 * rows: hasil baca range (array of array, mulai kolom A).
 * Return { nama: string[], orang: [{nama, nip, kontak}] } untuk shift & tanggal itu, atau { error } kalau tata letak tak dikenali.
 */
export function personilPadaShift(rows, tanggal, shift) {
  const hari = tanggal.getDate();
  const bulan = tanggal.getMonth() + 1;

  let hdr = -1, kol = -1;
  for (let r = 0; r < rows.length && hdr < 0; r++) {
    const row = rows[r] || [];
    const adaTanggal = row.filter((c) => /^\d{1,2}\s*\/\s*\d{1,2}/.test(String(c || '').trim())).length;
    if (adaTanggal >= 10) {
      hdr = r;
      kol = row.findIndex((c) => cocokTanggal(c, hari, bulan));
    }
  }
  if (hdr < 0) return { error: 'Baris tanggal tidak ditemukan di sheet Shift BIPO.' };
  if (kol < 0) return { error: `Tanggal ${String(hari).padStart(2, '0')}/${String(bulan).padStart(2, '0')} tidak ada di sheet Shift BIPO.` };

  const nama = [];
  const orang = [];
  for (let r = hdr + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const n = String(row[1] || '').trim();
    if (!n) break;
    if (kodeKeShift(row[kol]).includes(shift)) {
      nama.push(n);
      // Kolom C = NIP, kolom D = Contact person (nomor telepon)
      orang.push({ nama: n, nip: String(row[2] || '').trim(), kontak: String(row[3] || '').trim() });
    }
  }
  return { nama, orang };
}

/** Normalisasi nama untuk mencocokkan dengan nama file: huruf kecil, tanpa ekstensi/spasi/tanda baca. */
export function normNama(s) {
  return String(s || '').toLowerCase().replace(/\.(pdf|jpe?g|png|webp|heic)$/i, '').replace(/[^a-z0-9]+/g, '');
}

/** Cocokkan nama di sheet dengan daftar file smartcard. Persis dulu, lalu awalan unik. */
export function cocokkanFoto(nama, files) {
  const n = normNama(nama);
  if (!n) return null;
  const persis = files.find((f) => normNama(f.name) === n);
  if (persis) return persis;
  const awalan = files.filter((f) => {
    const fn = normNama(f.name);
    return fn.startsWith(n) || n.startsWith(fn);
  });
  return awalan.length === 1 ? awalan[0] : null;
}
