// Peta foto background per Kategori Bangunan / Site / Kategori Peralatan.
// Kalau site atau kategori tidak ada di sini, tampilan otomatis fallback ke
// kartu polos (tanpa foto) - jadi aman nambah foto baru bertahap tanpa perlu
// ubah kode lain.
//
// Prioritas foto SITE: siteBackgrounds (spesifik per site, mis. Halim/Karawang)
// dipakai duluan kalau ada; kalau tidak ada, fallback ke buildingBackgrounds
// (foto generik per Kategori Bangunan).

export const siteBackgrounds = {
  'K0+316 Halim Signal Building Communication (101)': '/backgrounds/station-halim.jpg',
  'K41+607 Karawang Signal Building Communication (202)': '/backgrounds/station-karawang.jpg',
};

// Foto kategori bangunan tampil di SISI KANAN kartu, memudar halus ke kiri
// (lihat PhotoCard side="right"). Key = nama kategori bangunan persis seperti di sites.js.
export const buildingBackgrounds = {
  '8. CCTV Throat, Emergency Stairs and Bridge': '/backgrounds/cctv.jpg',
  // Tambah foto lain di sini, contoh:
  // '1. BTS Communication Room': '/backgrounds/bts-room.jpg',
};

export const equipmentBackgrounds = {
  // Diisi bertahap. Key = category.id (mis. 'cat18') ATAU category.short_name.
  // Contoh: 'CCTV': '/backgrounds/cctv.jpg',
};

/**
 * Ambil path foto background untuk 1 site tertentu (cek override site dulu,
 * baru fallback ke foto generik kategori bangunannya). Return null kalau
 * belum ada foto sama sekali (biar caller bisa fallback ke tampilan polos).
 */
export function getSiteBackground(siteName, buildingCategory) {
  return siteBackgrounds[siteName] || buildingBackgrounds[buildingCategory] || null;
}

export function getBuildingBackground(buildingCategory) {
  return buildingBackgrounds[buildingCategory] || null;
}

export function getEquipmentBackground(categoryIdOrName) {
  return equipmentBackgrounds[categoryIdOrName] || null;
}
