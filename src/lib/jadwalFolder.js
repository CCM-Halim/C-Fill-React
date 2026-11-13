/**
 * jadwalFolder.js — logika murni (tanpa jaringan) buat memilih folder bulanan
 * "Jadwal Kunjungan MR" di Drive, berlaku untuk tahun berapa pun.
 *
 * Struktur yang didukung:
 *   [Root] / [9. September]        / [file jadwal]
 *   [Root] / [01. Januari 2027]    / [file jadwal]   (tahun di nama folder)
 *   [Root] / [2027] / [1. Januari] / [file jadwal]   (folder tahun dulu)
 */
export const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

/** Ambil bulan (0-11) & tahun (kalau ada) dari nama folder/file. */
export function parseBulanTahun(nama) {
  const n = String(nama || '').toLowerCase();
  let bulan = null;
  BULAN_ID.forEach((b, i) => {
    if (bulan === null && new RegExp(`(^|[^a-z])${b.toLowerCase()}([^a-z]|$)`).test(n)) bulan = i;
  });
  const t = n.match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/);
  return { bulan, tahun: t ? Number(t[1]) : null };
}

/** Folder yang namanya hanya tahun (mis. "2027") - dipakai sebagai lapisan pembungkus. */
export function pilihFolderTahun(entries, tahun) {
  const folderTahun = entries
    .map((f) => ({ f, ...parseBulanTahun(f.name) }))
    .filter((x) => x.bulan === null && x.tahun !== null && /^\s*\d{4}\s*$/.test(x.f.name));
  const persis = folderTahun.find((x) => x.tahun === tahun);
  return persis ? persis.f : null;
}

/**
 * Urutkan kandidat folder bulan, paling cocok dulu.
 * Tiap kandidat: { folder, bulan, tahunHint }  (tahunHint = tahun di nama folder,
 * atau tahun modifiedTime kalau nama folder tidak memuat tahun).
 */
export function kandidatFolderBulan(entries) {
  return entries
    .map((f) => {
      const { bulan, tahun } = parseBulanTahun(f.name);
      if (bulan === null) return null;
      const modTahun = f.modifiedTime ? new Date(f.modifiedTime).getFullYear() : null;
      return { folder: f, bulan, tahunNama: tahun, tahunHint: tahun ?? modTahun };
    })
    .filter(Boolean);
}

/** Kandidat yang cocok persis dengan bulan+tahun target (paling meyakinkan dulu). */
export function kandidatPersis(entries, bulan, tahun) {
  return kandidatFolderBulan(entries)
    .filter((k) => k.bulan === bulan && (k.tahunNama === null || k.tahunNama === tahun))
    .sort((a, b) => (b.tahunNama === tahun) - (a.tahunNama === tahun)
      || String(b.folder.modifiedTime).localeCompare(String(a.folder.modifiedTime)));
}

/** Kandidat bulan terakhir yang tidak melewati target, terbaru dulu. */
export function kandidatTerbaru(entries, bulan, tahun) {
  const target = tahun * 12 + bulan;
  return kandidatFolderBulan(entries)
    .filter((k) => k.tahunHint !== null && k.tahunHint * 12 + k.bulan <= target)
    .sort((a, b) => (b.tahunHint * 12 + b.bulan) - (a.tahunHint * 12 + a.bulan));
}

/** Pilih file jadwal dalam folder: yang memuat tahun; kalau tak ada tapi file tunggal, pakai itu. */
export function pilihFileJadwal(files, tahun) {
  const spreadsheet = files.filter((f) => !f.mimeType || /spreadsheet|excel|sheet/i.test(f.mimeType));
  const pool = spreadsheet.length ? spreadsheet : files;
  return pool.find((f) => f.name.includes(String(tahun))) || (pool.length === 1 ? pool[0] : null);
}
