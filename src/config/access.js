// access.js — Daftar email yang DIIZINKAN mengakses aplikasi C-Fill.
//
// Siapa pun yang login pakai akun Google di luar daftar ini akan DITOLAK di
// layar login (sesi dibersihkan + muncul pesan "akun tidak memiliki akses").
//
// Daftar izin = SEMUA email Foreman (dari foremen.js) + EXTRA_ALLOWED_EMAILS.
//
// PENTING untuk admin: teknisi yang boleh mengisi checksheet tapi BUKAN
// foreman harus ditambahkan ke EXTRA_ALLOWED_EMAILS di bawah ini, kalau tidak
// mereka tidak akan bisa masuk sama sekali. (Foreman otomatis sudah termasuk,
// tidak perlu ditulis dua kali di sini.)
//
// Catatan: ini penjagaan di sisi aplikasi (UI). Akses data sebenarnya tetap
// dijaga Google OAuth — aplikasi membaca/menulis Drive & Sheets pakai token
// akun yang login. Daftar ini menentukan siapa yang boleh memakai aplikasinya.
import { FOREMAN_EMAILS } from './foremen';

// Email non-foreman yang tetap diizinkan masuk (akun operasional/admin).
// Tambahkan email teknisi di sini bila perlu.
export const EXTRA_ALLOWED_EMAILS = [
  'ccmhalimonsite@gmail.com',
];

// Gabungan final daftar yang diizinkan (dinormalisasi ke huruf kecil).
export const ALLOWED_EMAILS = [
  ...FOREMAN_EMAILS,
  ...EXTRA_ALLOWED_EMAILS,
].map((e) => String(e).toLowerCase());

/**
 * Cek apakah sebuah email boleh mengakses aplikasi.
 * Perbandingan case-insensitive; aman untuk email kosong/undefined.
 */
export function isAllowedEmail(email) {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(String(email).toLowerCase());
}
