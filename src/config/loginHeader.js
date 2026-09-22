// Foto header halaman login. Kalau admin (dandy.pujist@gmail.com) sudah
// pernah upload foto lewat fitur "Ganti Foto Header Login" di Dashboard,
// pakai link publik Drive (ID file-nya TETAP SAMA walau fotonya diganti-ganti
// - lihat driveApi.js replaceFileContent). Kalau belum pernah diatur sama
// sekali, fallback ke foto lokal yang udah ada di /public/backgrounds/.
const LOGIN_HEADER_FILE_ID = import.meta.env.VITE_LOGIN_HEADER_FILE_ID;

export const LOGIN_HEADER_IMAGE_URL = LOGIN_HEADER_FILE_ID
  ? `https://drive.google.com/uc?export=view&id=${LOGIN_HEADER_FILE_ID}`
  : '/backgrounds/station-halim.jpg';

export const LOGIN_HEADER_FILE_ID_CONFIGURED = Boolean(LOGIN_HEADER_FILE_ID);
