/**
 * entryExitMemory — ingatan lokal "bulan ini sudah pernah terisi Entry/Exit".
 *
 * KENAPA ADA
 * Pemeriksaan "sudah diisi bulan ini" dilakukan dengan MEMBACA Google Sheets.
 * Cara itu benar (konsisten walau teknisi ganti HP), tapi punya satu lubang:
 * kalau pembacaan GAGAL - jaringan HP hilang, kuota Sheets kena, atau file
 * site itu sedang bermasalah - fungsi pemeriksaan mengembalikan "belum diisi".
 * Akibatnya teknisi yang KEMARIN sudah mengisi dipaksa mengisi ulang, dan
 * pengisian ulang itu menambah BARIS BARU di sheet untuk bulan yang sama.
 *
 * Ingatan ini cuma CADANGAN saat pemeriksaan gagal, bukan pengganti:
 * hasil pembacaan langsung dari Sheets selalu menang. Tujuannya satu - jangan
 * sampai "gagal membaca" diterjemahkan jadi "belum pernah diisi".
 *
 * Modul ini murni (storage disuntik sebagai argumen) supaya bisa diuji di Node.
 */

export const ENTRY_EXIT_MEMORY_KEY = 'cfill_entry_exit_filled_v1';

/** Batas usia ingatan - cukup untuk 1 bulan berjalan + cadangan. */
export const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 hari

/** Kunci per site per BULAN - bukan per tanggal (Entry/Exit memang bulanan). */
export function memoryKey(buildingCategory, siteName, date = new Date()) {
  const bulan = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `${buildingCategory}||${siteName}||${bulan}`;
}

function bacaSemua(storage) {
  try {
    const raw = storage.getItem(ENTRY_EXIT_MEMORY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function tulisSemua(storage, isi) {
  try {
    storage.setItem(ENTRY_EXIT_MEMORY_KEY, JSON.stringify(isi));
  } catch {
    /* localStorage penuh/diblokir - abaikan, ini cuma cadangan */
  }
}

/** Buang entri yang sudah terlalu tua supaya storage tidak menumpuk. */
function bersihkan(isi, now) {
  const hasil = {};
  for (const [k, v] of Object.entries(isi)) {
    const waktu = v && typeof v === 'object' ? v.at : v;
    if (typeof waktu === 'number' && now - waktu <= MAX_AGE_MS) hasil[k] = v;
  }
  return hasil;
}

/** Catat bahwa bulan ini SUDAH terbukti terisi (hasil baca Sheets yang benar). */
export function tandaiSudahDiisi(storage, buildingCategory, siteName, date = new Date(), sheetUrl = null) {
  const isi = bersihkan(bacaSemua(storage), date.getTime());
  isi[memoryKey(buildingCategory, siteName, date)] = { at: date.getTime(), sheetUrl: sheetUrl || null };
  tulisSemua(storage, isi);
}

/**
 * Pernah terbukti terisi bulan ini? Hanya dipakai kalau pemeriksaan ke Sheets
 * gagal - kalau pemeriksaan berhasil, hasilnya yang dipakai.
 */
export function pernahTerisi(storage, buildingCategory, siteName, date = new Date()) {
  const isi = bersihkan(bacaSemua(storage), date.getTime());
  const rec = isi[memoryKey(buildingCategory, siteName, date)];
  if (!rec) return null;
  const waktu = rec && typeof rec === 'object' ? rec.at : rec;
  if (typeof waktu !== 'number' || date.getTime() - waktu > MAX_AGE_MS) return null;
  return { at: waktu, sheetUrl: (rec && rec.sheetUrl) || null };
}
