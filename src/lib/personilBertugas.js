/**
 * personilBertugas.js — ambil siapa yang bertugas (sheet "Shift BIPO" di file
 * Jadwal Kunjungan MR bulan berjalan) + foto smartcard-nya dari Drive.
 *
 * Foto: file di folder smartcard (kebanyakan PDF). Drive membuat gambar halaman
 * pertama PDF (thumbnailLink), jadi PDF & JPG diperlakukan sama — tanpa konversi.
 */
import { resolveTabName, readRawRange } from './sheetsApi';
import { listFilesInFolder } from './driveApi';
import { cariSpreadsheetJadwalBulan } from './cfillService';
import { SHIFT_LIST, shiftSekarang, personilPadaShift, cocokkanFoto } from './shiftBipo';

const SMARTCARD_FOLDER_ID =
  import.meta.env.VITE_SMARTCARD_FOLDER_ID || '1wQiU7pt1NGLyMzPCVYTapuukQB1zVcT_';
const UKURAN_FOTO = 'w600';

function besarkan(url) {
  if (!url) return null;
  // thumbnailLink berakhir "=s220": minta lebih besar supaya tajam di kartu.
  return /=s\d+$/.test(url) ? url.replace(/=s\d+$/, '=' + UKURAN_FOTO) : url;
}

/**
 * Return { aktif, tanggal: {pagi,siang,malam: Date}, shifts: { pagi:[{nama,fotoUrl}], ... }, error? }
 */
export async function getPersonilBertugas(now = new Date()) {
  const info = shiftSekarang(now);

  // Tiap shift bisa memakai bulan berbeda (hanya tanggal 1 dini hari: malam = bulan lalu).
  const bulanUnik = new Map();
  for (const sh of SHIFT_LIST) {
    const d = info.tanggal[sh.kode];
    bulanUnik.set(`${d.getFullYear()}-${d.getMonth()}`, d);
  }

  const rowsPerBulan = new Map();
  for (const [kunci, d] of bulanUnik) {
    const id = await cariSpreadsheetJadwalBulan(d.getMonth(), d.getFullYear());
    const tab = await resolveTabName(id, ['Shift BIPO']);
    rowsPerBulan.set(kunci, await readRawRange(id, tab, 'A1:AL40'));
  }

  let files = [];
  try { files = await listFilesInFolder(SMARTCARD_FOLDER_ID); } catch { /* foto opsional: tampil inisial */ }
  files = files.filter((f) => f.mimeType !== 'application/vnd.google-apps.folder');

  const shifts = {};
  let error = null;
  for (const sh of SHIFT_LIST) {
    const d = info.tanggal[sh.kode];
    const rows = rowsPerBulan.get(`${d.getFullYear()}-${d.getMonth()}`);
    const hasil = personilPadaShift(rows, d, sh.kode);
    if (hasil.error) { error = hasil.error; shifts[sh.kode] = []; continue; }
    shifts[sh.kode] = hasil.orang.map(({ nama, nip, kontak }) => {
      const f = cocokkanFoto(nama, files);
      return { nama, nip, kontak, fotoUrl: f ? besarkan(f.thumbnailLink) : null, adaFile: !!f };
    });
  }
  return { aktif: info.aktif, tanggal: info.tanggal, shifts, error };
}
