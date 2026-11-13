// Daftar akun Foreman & Deputy Foreman - akun-akun ini yang bisa akses menu
// "Verifikasi" (cek & sahkan hasil pengisian checksheet teknisi). Hak akses
// keduanya sama; bedanya hanya label jabatan yang ditampilkan di aplikasi.
//
// Ganti/tambah akun di sini (email + jabatan) - tidak perlu ubah bagian lain kode.
export const FOREMAN_ACCOUNTS = [
  { email: 'dandy.pujist@gmail.com', role: 'Foreman' },
  { email: 'azizfuadtri@gmail.com', role: 'Deputy Foreman' },
];

// Tetap diekspor (dipakai access.js): daftar email saja.
export const FOREMAN_EMAILS = FOREMAN_ACCOUNTS.map((a) => a.email);

const norm = (email) => String(email || '').trim().toLowerCase();

export function isForemanEmail(email) {
  if (!email) return false;
  return FOREMAN_ACCOUNTS.some((a) => norm(a.email) === norm(email));
}

/** 'Foreman' / 'Deputy Foreman' / null kalau bukan keduanya. */
export function getForemanRole(email) {
  const akun = FOREMAN_ACCOUNTS.find((a) => norm(a.email) === norm(email));
  return akun ? akun.role : null;
}
