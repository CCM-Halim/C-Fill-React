/**
 * rencanaKerjaService.js — rencana kerja HARI INI & BESOK dari sheet Jadwal Kunjungan MR.
 * Besok bisa jatuh di bulan berikutnya (file lain) -> dibaca terpisah; kalau file bulan
 * itu belum ada, hanya bagian itu yang diberi pesan (hari ini tetap tampil).
 */
import { resolveTabName, readRawRange } from './sheetsApi';
import { cariSpreadsheetJadwalBulan } from './cfillService';
import { parseJadwalItems } from './jadwalProgress';
import { rencanaPadaTanggal } from './rencanaKerja';

const TAB_JADWAL = ['Jadwal Kunjungan MR', 'Jadwal Kunjungan MR New', 'jadwal kunjungan MR New'];

async function itemsBulan(d) {
  const id = await cariSpreadsheetJadwalBulan(d.getMonth(), d.getFullYear());
  const tab = await resolveTabName(id, TAB_JADWAL);
  const rows = await readRawRange(id, tab, 'B3:O120');
  return { items: parseJadwalItems(rows), sheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit` };
}

export async function getRencanaKerja(now = new Date()) {
  const hariIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const besok = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const cache = new Map();
  const ambil = (d) => {
    const k = d.getFullYear() + '-' + d.getMonth();
    if (!cache.has(k)) cache.set(k, itemsBulan(d));
    return cache.get(k);
  };
  const satu = async (d) => {
    try {
      const { items, sheetUrl } = await ambil(d);
      return { tanggal: d, daftar: rencanaPadaTanggal(items, d), sheetUrl, error: null };
    } catch (e) {
      return { tanggal: d, daftar: [], sheetUrl: null, error: e.message };
    }
  };
  const [a, b] = await Promise.all([satu(hariIni), satu(besok)]);
  return { hariIni: a, besok: b };
}
