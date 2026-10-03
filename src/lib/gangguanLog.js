/**
 * gangguanLog.js
 * Parsing "Log Book Gangguan Dept Telco Halim" -> daftar temuan/gangguan yang
 * bisa difilter per tahun, bulan, tab, dan STATUS (open / closed).
 *
 * Modul ini SENGAJA murni (tanpa jaringan / import.meta.env) supaya bisa diuji
 * langsung dari Node pakai fixture hasil baca sheet asli:
 * scripts/make-gangguan-fixtures.py -> test/fixtures/gangguan.json
 *
 * ============================================================================
 * DUA BUG KODE LAMA YANG DIPERBAIKI DI SINI (dibuktikan di test/gangguanLog.test.mjs)
 * ============================================================================
 *
 * 1. POSISI KOLOM DI-HARDCODE, padahal 6 tab di file ini TIDAK seragam:
 *
 *      Tab                 Lokasi Gangguan   Sistem Terkait
 *      Gangguan Peralatan   E                 P
 *      Gangguan AC          E                 P
 *      Gangguan K3          D  <-- beda!     P
 *      Gangguan Kontruksi   E                 P
 *      Gangguan Lain-Lain   E                 P
 *      Gangguan Instrumen   D  <-- beda!     Q  <-- beda!
 *
 *    Kode lama menulis `lokasi = r[3]` (= kolom E) untuk SEMUA tab. Di tab
 *    "Gangguan K3" kolom E isinya "Waktu Pelaporan" (jam), jadi yang terbaca
 *    sebagai lokasi adalah "1:00" — dan baris yang kolom E-nya kosong
 *    DIANGGAP BARIS KOSONG lalu dibuang, padahal lokasinya ada di kolom D.
 *    Sekarang kolom dicari lewat NAMA HEADER, jadi tahan beda susunan.
 *
 * 2. FILTER BULAN MENCOCOKKAN ANGKA APA PUN di string tanggal. Cara lama:
 *
 *      const angka = (it.tanggalAlarm || '').match(/\d+/g);
 *      return angka.some((n) => parseInt(n,10) === bulan+1 && parseInt(n,10) <= 12);
 *
 *    Akibatnya waktu memilih "Oktober" (bulan ke-10), kejadian tanggal
 *    01/10/2026 (1 Oktober) lolos — TAPI juga 10/01/2026 (10 Januari), karena
 *    angka "10" ada di posisi hari. Sekarang tanggal di-parse jadi
 *    {hari, bulan, tahun} dulu, baru dibandingkan.
 *
 * 3. TANGGAL DI SHEET TIDAK KONSISTEN. Contoh nyata tab "Gangguan AC":
 *    kolom Tanggal "09/01/2026" tapi kolom Waktu Gangguan "01/09/2026 12:00"
 *    untuk kejadian yang sama (1 September, bukan 9 Januari). Baris seperti ini
 *    ditandai `tanggalAmbigu` supaya bisa ditampilkan sebagai peringatan -
 *    bukan dipilih diam-diam salah satu lalu dianggap beres.
 */

export const STATUS = { OPEN: 'open', CLOSED: 'closed', UNKNOWN: 'unknown' };

export const STATUS_LABEL = { [STATUS.OPEN]: 'Open', [STATUS.CLOSED]: 'Close', [STATUS.UNKNOWN]: '-' };

const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function cell(row, idx) {
  if (idx === undefined || idx === null || idx < 0 || !row) return '';
  const v = row[idx];
  return (v === undefined || v === null) ? '' : String(v).trim();
}

/**
 * Status apa pun yang diawali "close" = selesai. "Open" (dan "New"/"Progress",
 * yang artinya tiket belum selesai) = belum selesai. Sisanya 'unknown' supaya
 * kelihatan kalau ada penulisan status baru yang belum ditangani.
 */
export function normalizeStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return STATUS.UNKNOWN;
  if (s.startsWith('close') || s.startsWith('selesai') || s.startsWith('done')) return STATUS.CLOSED;
  if (s.startsWith('open') || s === 'new' || s.includes('progress') || s.startsWith('belum')) return STATUS.OPEN;
  return STATUS.UNKNOWN;
}

/**
 * Tanggal format sheet -> { day, month, year }. Menerima "01/01/2026",
 * "1/7/2026" (DD/MM/YYYY) maupun "2026-10-03" (ISO). null kalau bukan tanggal
 * yang masuk akal (menolak bulan/tanggal mustahil & tahun di luar 2000-2100,
 * karena sheet pernah punya salah ketik yang menghasilkan tahun 2033).
 */
export function parseTanggal(raw) {
  const m = String(raw || '').match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (!m) return null;
  const a = m[1]; const b = m[2]; const c = m[3];
  let day; let month; let year;
  if (a.length === 4) { year = Number(a); month = Number(b); day = Number(c); } else { day = Number(a); month = Number(b); year = Number(c); }
  if (year < 100) year += 2000;
  if (!(month >= 1 && month <= 12) || !(day >= 1 && day <= 31) || !(year >= 2000 && year <= 2100)) return null;
  return { day, month, year };
}

/** Tanggal + jam ("08/02/2026 18:00:00") -> Date, atau null. */
export function parseWaktu(raw) {
  const t = parseTanggal(raw);
  if (!t) return null;
  const tm = String(raw).match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/);
  const h = tm ? Number(tm[1]) : 0;
  const mi = tm ? Number(tm[2]) : 0;
  const se = tm && tm[3] ? Number(tm[3]) : 0;
  if (h > 23 || mi > 59) return null;
  return new Date(t.year, t.month - 1, t.day, h, mi, se);
}

const samaHari = (a, b) => a && b && a.year === b.year && a.month === b.month && a.day === b.day;

/**
 * Tandai baris yang tanggalnya kemungkinan tertukar hari/bulan.
 * Contoh nyata: Tanggal "09/01/2026" vs Waktu Gangguan "01/09/2026 12:00".
 * Hanya dicurigai kalau kedua angka ≤ 12 (jadi memang bisa tertukar) - kalau
 * "23/1/2026" vs "23/1/2026" jelas sama, bukan ambigu.
 */
export function isTanggalAmbigu(tanggal, mulai) {
  if (!tanggal || !mulai) return false;
  if (samaHari(tanggal, mulai)) return false;
  const bisaTertukar = tanggal.day <= 12 && mulai.day <= 12;
  if (!bisaTertukar) return false;
  return tanggal.day === mulai.month && tanggal.month === mulai.day && tanggal.year === mulai.year;
}

/** Baris header = baris yang punya sel "Status" DAN sel mengandung "Lokasi". */
export function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = rows[i] || [];
    const hasStatus = r.some((c) => String(c || '').trim().toLowerCase() === 'status');
    const hasLokasi = r.some((c) => String(c || '').toLowerCase().includes('lokasi'));
    if (hasStatus && hasLokasi) return i;
  }
  return -1;
}

/** Index kolom dicari dari potongan NAMA HEADER (bukan posisi tetap). */
export function findColumn(header, ...kataKunci) {
  for (const kw of kataKunci) {
    const found = header.findIndex((h) => String(h || '').toLowerCase().includes(kw.toLowerCase()));
    if (found >= 0) return found;
  }
  return -1;
}

/**
 * Ubah baris mentah satu tab (termasuk baris header) jadi item siap-tampil.
 * `now` di-inject supaya umur gangguan "open" bisa diuji tanpa tergantung jam.
 */
export function parseGangguanRows(rows, { tab = '', now = new Date() } = {}) {
  const headerIndex = findHeaderRow(rows);
  const header = headerIndex >= 0 ? rows[headerIndex] : [];
  const col = {
    status: findColumn(header, 'status'),
    tanggal: findColumn(header, 'tanggal'),
    lokasi: findColumn(header, 'lokasi'),
    alat: findColumn(header, 'nama peralatan', 'item gangguan', 'detail instrumen'),
    mulai: findColumn(header, 'waktu gangguan', 'waktu kerusakan'),
    pulih: findColumn(header, 'waktu pemulihan', 'waktu perbaikan'),
    durasi: findColumn(header, 'durasi'),
    fenomena: findColumn(header, 'ruang lingkup dampak'),
    analisis: findColumn(header, 'analisis penyebab'),
    pencegahan: findColumn(header, 'tindakan pencegahan'),
    pelapor: findColumn(header, 'pelapor'),
    sistem: findColumn(header, 'sistem terkait'),
    dokumentasi: findColumn(header, 'dokumentasi'),
  };

  const items = [];
  const stats = { barisKosong: 0, tanpaLokasi: 0 };

  for (let i = (headerIndex >= 0 ? headerIndex + 1 : 0); i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) { stats.barisKosong += 1; continue; }
    const lokasi = cell(r, col.lokasi);
    const status = cell(r, col.status);
    if (!lokasi) {
      // Dua kemungkinan: baris template yang belum dipakai (di file ini ada
      // ratusan, statusnya sudah terisi "Open" tapi seluruh kolom lain kosong),
      // atau kejadian yang lokasinya lupa diisi. Dihitung terpisah supaya bisa
      // dilaporkan, TIDAK dianggap kejadian nyata (lokasi = kunci identitas).
      if (status) stats.tanpaLokasi += 1; else stats.barisKosong += 1;
      continue;
    }

    const tanggalRaw = cell(r, col.tanggal);
    const mulaiRaw = cell(r, col.mulai);
    const tglLapor = parseTanggal(tanggalRaw);
    const tglMulai = parseTanggal(mulaiRaw);
    // Acuan = kolom "Tanggal" (tanggal pelaporan). Kalau kosong, jatuh ke
    // tanggal Waktu Gangguan supaya kejadiannya tetap masuk hitungan bulan.
    const tanggal = tglLapor || tglMulai;
    const st = normalizeStatus(status);
    const mulaiAt = parseWaktu(mulaiRaw);
    const pulihAt = parseWaktu(cell(r, col.pulih));

    items.push({
      tab,
      baris: i + 1,
      status: st,
      statusRaw: status,
      tanggalRaw,
      tanggal,
      tanggalDariWaktuGangguan: !tglLapor && !!tglMulai,
      tanggalAmbigu: isTanggalAmbigu(tglLapor, tglMulai),
      lokasi,
      alat: cell(r, col.alat),
      mulaiRaw,
      pulihRaw: cell(r, col.pulih),
      durasi: cell(r, col.durasi),
      fenomena: cell(r, col.fenomena),
      analisis: cell(r, col.analisis),
      pencegahan: cell(r, col.pencegahan),
      pelapor: cell(r, col.pelapor),
      sistem: cell(r, col.sistem),
      dokumentasi: cell(r, col.dokumentasi),
      umurHari: st === STATUS.OPEN && mulaiAt
        ? Math.max(0, Math.floor((now.getTime() - mulaiAt.getTime()) / 86400000))
        : null,
      durasiJam: (mulaiAt && pulihAt)
        ? Math.round(((pulihAt.getTime() - mulaiAt.getTime()) / 3600000) * 10) / 10
        : null,
    });
  }
  return items;
}

/** Jumlah per status + gangguan open yang paling lama menggantung. */
export function summarizeGangguan(items) {
  const out = { total: items.length, open: 0, closed: 0, unknown: 0, openTerlama: null, tanpaTanggal: 0, ambigu: 0 };
  for (const it of items) {
    out[it.status] = (out[it.status] || 0) + 1;
    if (!it.tanggal) out.tanpaTanggal += 1;
    if (it.tanggalAmbigu) out.ambigu += 1;
    if (it.status === STATUS.OPEN && it.umurHari !== null) {
      if (!out.openTerlama || it.umurHari > out.openTerlama.umurHari) out.openTerlama = it;
    }
  }
  return out;
}

/**
 * Pilihan filter hanya berisi tahun/bulan yang BENAR-BENAR ada datanya, supaya
 * dropdown tidak menawarkan pilihan kosong. Tahun diambil dari kolom Tanggal -
 * file ini tidak punya kolom tahun tersendiri.
 */
export function buildFilterOptions(items) {
  const tahun = new Set();
  const bulanPerTahun = new Map();
  for (const it of items) {
    if (!it.tanggal) continue;
    tahun.add(it.tanggal.year);
    if (!bulanPerTahun.has(it.tanggal.year)) bulanPerTahun.set(it.tanggal.year, new Set());
    bulanPerTahun.get(it.tanggal.year).add(it.tanggal.month);
  }
  const years = [...tahun].sort((a, b) => b - a);
  const monthsByYear = {};
  for (const [y, set] of bulanPerTahun) monthsByYear[y] = [...set].sort((a, b) => a - b);
  return { years, monthsByYear, bulanLabel: (m) => BULAN_ID[m - 1] || String(m) };
}

/**
 * Filter utama. `status` menerima 'open' | 'closed' | 'all'.
 * `tahun`/`bulan`/`tab` menerima angka/nama atau 'all'.
 * `hanyaTanpaTanggal` dipakai tombol "tanpa tanggal" (baris yang tidak punya
 * tanggal sama sekali tetap bisa dilihat, tidak hilang begitu saja).
 */
export function filterGangguan(items, { tahun = 'all', bulan = 'all', tab = 'all', status = 'all', cari = '', hanyaTanpaTanggal = false } = {}) {
  const q = String(cari || '').trim().toLowerCase();
  return items.filter((it) => {
    if (hanyaTanpaTanggal) return !it.tanggal;
    if (tahun !== 'all' && (!it.tanggal || it.tanggal.year !== Number(tahun))) return false;
    if (bulan !== 'all' && (!it.tanggal || it.tanggal.month !== Number(bulan))) return false;
    if (tab !== 'all' && it.tab !== tab) return false;
    if (status !== 'all' && it.status !== status) return false;
    if (q) {
      const haystack = `${it.lokasi} ${it.alat} ${it.sistem} ${it.analisis} ${it.fenomena}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Urutan daftar: yang Open di atas, dan di antara Open yang PALING LAMA
 * menggantung paling atas (itu yang paling perlu ditangani). Baris Open yang
 * bahkan tanggal/waktunya belum diisi ditaruh paling bawah, bukan dibuang.
 * Sesama Close: yang terbaru di atas. Terakhir diurutkan per lokasi supaya
 * hasilnya pasti sama setiap kali (tidak berubah-ubah antar render).
 */
export function sortGangguan(items) {
  const rank = { [STATUS.OPEN]: 0, [STATUS.UNKNOWN]: 1, [STATUS.CLOSED]: 2 };
  const ts = (it) => (it.tanggal ? Date.UTC(it.tanggal.year, it.tanggal.month - 1, it.tanggal.day) : -1);
  return [...items].sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    if (a.status === STATUS.OPEN) {
      const ua = a.umurHari === null ? -1 : a.umurHari;
      const ub = b.umurHari === null ? -1 : b.umurHari;
      if (ua !== ub) return ub - ua;
    } else {
      const d = ts(b) - ts(a);
      if (d !== 0) return d;
    }
    // Baris di sheet yang sama diurutkan menurut nomor barisnya dulu, baru
    // per lokasi - dua gangguan di lokasi sama (K45+241 ada 2) jadi tidak
    // tertukar posisinya saat difilter ulang.
    if (a.tab === b.tab && a.baris !== b.baris) return a.baris - b.baris;
    return String(a.lokasi).localeCompare(String(b.lokasi));
  });
}

export { BULAN_ID };
