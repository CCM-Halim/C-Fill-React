// Daftar email akun Foreman & Deputy Foreman - akun-akun ini yang bisa akses
// menu "Verifikasi" (cek & sahkan hasil pengisian checksheet teknisi).
//
// Ganti/tambah email di sini sesuai kebutuhan (misal ada Foreman baru, atau
// pindah tugas) - tinggal edit array ini, tidak perlu ubah bagian lain kode.
export const FOREMAN_EMAILS = [
   'dandy.pujist@gmail.com',
  // 'aziz@contoh.com',
];

export function isForemanEmail(email) {
  if (!email) return false;
  return FOREMAN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
