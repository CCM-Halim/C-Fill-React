/**
 * jadwalProgress.js
 * Parsing "Jadwal Kunjungan MR <Bulan> <Tahun>" -> ringkasan progress per periode.
 *
 * Modul ini SENGAJA murni (tanpa akses jaringan / import.meta.env) supaya bisa
 * diuji langsung dengan data sheet asli dari Node tanpa browser.
 *
 * === PETA KOLOM (tab "Jadwal Kunjungan MR") ===
 * Baris 2 = header. Data mulai baris 3. Kolom diambil mulai B, jadi index array
 * (dibaca dengan range B3:L120) bergeser satu:
 *
 *   idx 0  B  Hari & Tanggal        idx 6  H  Temuan
 *   idx 1  C  Jam                   idx 7  I  Realisasi
 *   idx 2  D  lokasi MR - ECS3      idx 8  J  Status Kegiatan   <-- penentu "selesai"
 *   idx 3  E  Kegiatan              idx 9  K  Keterangan
 *   idx 4  F  Detail Pekerjaan      idx 10 L  (kolom bantu counter 1M)
 *   idx 5  G  PIC Checksheet
 *
 * Riwayat: versi lama memakai D sebagai "lokasi" dan E sebagai "kegiatan" TAPI
 * membaca status dari idx 9 (= K/Keterangan). Akibatnya kolom Kegiatan selalu
 * kosong dan Status tak pernah "Finish" -> semua donut tampil 0/0. Lihat
 * computePeriodProgress() di bawah, yang sekarang membaca kolom sesuai header.
 */

export const PERIODS = ['1M', '3M', '6M', '1Y'];

/** Status yang dianggap "sudah selesai" di kolom Status Kegiatan. */
const DONE_STATUSES = new Set(['finish', 'finished', 'done', 'selesai', 'sudah']);

function cell(row, idx) {
  return (row[idx] || '').toString().trim();
}

/** "1M, 3M, 6M" / "1M,3M,6M,1Y" / "3M, 6M" -> ['1M','3M','6M'] (hanya yang dikenal). */
export function parsePeriodTags(kegiatan) {
  if (!kegiatan) return [];
  return kegiatan
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter((t) => PERIODS.includes(t));
}

export function isFinished(status) {
  return DONE_STATUSES.has((status || '').trim().toLowerCase());
}

/**
 * Ubah baris mentah (hasil readRawRange 'B3:L120') jadi daftar pekerjaan.
 * Baris tanpa lokasi dilewati - itu baris tanggal kosong / baris ringkasan
 * di bawah tabel (mis. baris total yang isinya hanya angka di kolom bantu).
 */
export function parseJadwalItems(rows) {
  const items = [];
  for (const r of rows) {
    const lokasi = cell(r, 2); // D
    if (!lokasi) continue;
    items.push({
      tanggal: cell(r, 0),      // B
      jam: cell(r, 1),          // C
      lokasi,                   // D
      kegiatan: cell(r, 3),     // E
      pic: cell(r, 5),          // G
      temuan: cell(r, 6),       // H
      status: cell(r, 8),       // J
      keterangan: cell(r, 9),   // K
    });
  }
  return items;
}

/**
 * Hitung progress per periode DARI BARIS SEBENARNYA.
 * Satu baris bisa mencakup beberapa periode (Kegiatan = "1M, 3M, 6M"), jadi
 * baris itu dihitung di tiap periode yang disebut.
 * Inilah "nilai sebenarnya": pembilang dan penyebut sama-sama berasal dari
 * daftar pekerjaan yang benar-benar ada di sheet - bukan cuma angka rencana.
 */
export function computePeriodProgress(items) {
  const breakdown = {};
  PERIODS.forEach((p) => {
    breakdown[p] = { total: 0, finished: 0, finishedItems: [], notYetItems: [], unlabeled: 0 };
  });

  for (const it of items) {
    const tags = parsePeriodTags(it.kegiatan);
    if (tags.length === 0) {
      // Baris kerjaan tanpa tag periode yang dikenali - jangan dibuang diam-diam,
      // hitung di sini supaya bisa dilaporkan sebagai peringatan di Dashboard.
      items.unlabeledCount = (items.unlabeledCount || 0) + 1;
      continue;
    }
    for (const tag of tags) {
      const b = breakdown[tag];
      b.total += 1;
      if (isFinished(it.status)) {
        b.finished += 1;
        b.finishedItems.push(it);
      } else {
        b.notYetItems.push(it);
      }
    }
  }
  return breakdown;
}

/**
 * Baca angka "rencana" yang sudah dihitung sendiri oleh sheet di kolom bantu
 * L:O (1M/3M/6M/1Y) - nilainya kumulatif dan angka terakhir ada di baris paling
 * bawah yang masih terisi. Dipakai sebagai PEMBANDING terhadap hasil hitung
 * baris, bukan sebagai sumber utama, supaya Dashboard bisa menunjukkan kalau
 * rencana di sheet dan jumlah baris jadwal tidak sinkron.
 *
 * CATATAN: butuh range yang SUDAH mencakup kolom O ('B3:O120'). Kalau range
 * yang dibaca cuma sampai L, seluruh nilai di sini akan null.
 */
export function parseSheetPlanCounters(rows) {
  const counters = {};
  PERIODS.forEach((p) => { counters[p] = null; });
  for (const r of rows) {
    PERIODS.forEach((p, i) => {
      const v = cell(r, 10 + i); // L,M,N,O
      if (v === '') return;
      const n = Number(v);
      if (!Number.isNaN(n)) counters[p] = n;
    });
  }
  return counters;
}

/**
 * Ringkasan lengkap untuk Dashboard.
 * `total` = jumlah baris pekerjaan (bukan jumlah penjumlahan periode - satu
 * baris multi-periode tetap satu pekerjaan).
 */
export function summarizeJadwal(rows) {
  const items = parseJadwalItems(rows);
  const periodBreakdown = computePeriodProgress(items);
  const unlabeledRows = items.unlabeledCount || 0;
  delete items.unlabeledCount;

  const finished = items.filter((it) => isFinished(it.status));
  const notYet = items.filter((it) => !isFinished(it.status));

  return {
    items,
    total: items.length,
    finishedCount: finished.length,
    notYetCount: notYet.length,
    periodBreakdown,
    sheetPlanCounters: parseSheetPlanCounters(rows),
    unlabeledRows,
  };
}
