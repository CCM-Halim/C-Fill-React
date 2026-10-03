/**
 * Identitas & versi aplikasi C-Fill.
 *
 * Sengaja ditulis manual (bukan diambil otomatis dari tanggal build) supaya
 * nomor versi = penanda rilis yang dikendalikan admin, bukan berubah sendiri
 * tiap kali deploy.
 *
 * Cara naik versi: ubah APP_VERSION di sini + samakan `version` di package.json.
 * Dipakai di Sidebar (badge versi), LoginScreen (footer card), dan README.
 */
export const APP_NAME = 'C-Fill';
export const APP_FULL_NAME = 'Communication Fillment';
export const APP_VERSION = 'v2.0';
export const RELEASE_YEAR = '2026';
export const COPYRIGHT_HOLDER = 'CCM-Halim';
export const COPYRIGHT_UNIT = 'UPT CCM Halim';

/** Baris copyright siap pakai: "© 2026 CCM-Halim · UPT CCM Halim". */
export const COPYRIGHT_LINE = `\u00a9 ${RELEASE_YEAR} ${COPYRIGHT_HOLDER} \u00b7 ${COPYRIGHT_UNIT}`;
