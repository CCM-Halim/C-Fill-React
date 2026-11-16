import React from 'react';

// Urutan & label periode, disamakan dengan modul parsing (lib/jadwalProgress.js)
// supaya kalau penamaan di sheet berubah, cuma satu tempat yang perlu diubah.
export const PERIODS = ['1M', '3M', '6M', '1Y'];
export const PERIOD_LABEL = { '1M': '1 Bulanan', '3M': '3 Bulanan', '6M': '6 Bulanan', '1Y': '1 Tahunan' };

/**
 * Donut per periode (1M/3M/6M/1Y) - CSS conic-gradient, tanpa library.
 *
 * Angka di tengah = SELESAI/TOTAL (bukan persen saja) plus persen kecil di
 * bawahnya, dan baris "x selesai · y belum" yang masing-masing bisa diklik buat
 * membuka daftar lokasinya.
 *
 * Kalau `planTotal` (angka rencana di kolom bantu sheet) beda dari `total`
 * (hasil hitung baris jadwal), selisihnya DITAMPILKAN - bukan disembunyikan -
 * supaya kelihatan kalau ada baris jadwal yang salah tag periode.
 */
export function PeriodDonut({ label, total, finished, planTotal, onClickFinished, onClickNotYet }) {
  const notYet = total - finished;
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
  const bg = total > 0
    ? `conic-gradient(var(--accent-strong) ${pct}%, #E8CDB4 ${pct}% 100%)`
    : '#EDEAE0';
  const planMismatch = Number.isFinite(planTotal) && planTotal !== total;

  return (
    <div className="donut-item">
      <div className="donut-ring" style={{ background: bg }}>
        <div className="donut-isi">
          <div className="donut-angka">{finished}/{total}</div>
          <div className="donut-persen">{pct}%</div>
        </div>
      </div>
      <div className="donut-label">{label}</div>
      <div className="donut-tautan">
        <span className="link-like" onClick={onClickFinished} style={{ color: 'var(--accent-strong)' }}>
          {finished} selesai
        </span>
        <span className="link-like" onClick={onClickNotYet} style={{ color: '#B4302F' }}>
          {notYet} belum
        </span>
      </div>
      {planMismatch && (
        <div style={{ fontSize: 10, color: '#8A5A00' }} title="Angka rencana di kolom bantu sheet tidak sama dengan jumlah baris jadwal">
          rencana sheet: {planTotal}
        </div>
      )}
    </div>
  );
}

/**
 * Kartu "Progress Kerja <Bulan> <Tahun>" - angka di donut diambil dari baris jadwal
 * sebenarnya (lib/jadwalProgress.js). Versi ringkas: satu baris donut, tanpa daftar
 * bullet/penjelasan panjang (penjelasan ada di tooltip ⓘ dan di halaman Panduan).
 */
export default function ProgressKerjaCard({ jadwal, onOpenPeriod }) {
  if (!jadwal || !jadwal.available) return null;
  const persen = jadwal.total > 0 ? Math.round((jadwal.finishedCount / jadwal.total) * 100) : 0;

  return (
    <div className="card progress-card">
      <div className="progress-kepala">
        <div className="card-title" style={{ marginBottom: 0 }}>Progress Kerja {jadwal.bulan} {jadwal.tahun}</div>
        <a href={jadwal.sheetUrl} target="_blank" rel="noreferrer" className="link-like" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}
           title={'Sumber: ' + jadwal.fileName}>
          Buka sheet ↗
        </a>
      </div>
      {jadwal.catatanFallback && (
        <div className="notice-box" style={{ fontSize: 12, margin: '8px 0 0' }}>🕘 {jadwal.catatanFallback}</div>
      )}
      <div className="muted" style={{ margin: '4px 0 0' }}
           title="Rencana = jumlah baris berlabel periode (1M/3M/6M/1Y) di kolom Kegiatan; realisasi = baris dengan Status Kegiatan 'Finish'.">
        <b>{jadwal.finishedCount}</b> selesai · <b>{jadwal.notYetCount}</b> belum dari {jadwal.total} pekerjaan ({persen}%) ⓘ
      </div>

      <div className="donut-baris">
        {PERIODS.map((p) => (
          <PeriodDonut
            key={p}
            label={PERIOD_LABEL[p]}
            total={jadwal.periodBreakdown[p].total}
            finished={jadwal.periodBreakdown[p].finished}
            planTotal={jadwal.sheetPlanCounters ? jadwal.sheetPlanCounters[p] : undefined}
            onClickFinished={() => onOpenPeriod({
              label: PERIOD_LABEL[p], status: 'Selesai', items: jadwal.periodBreakdown[p].finishedItems,
            })}
            onClickNotYet={() => onOpenPeriod({
              label: PERIOD_LABEL[p], status: 'Belum Selesai', items: jadwal.periodBreakdown[p].notYetItems,
            })}
          />
        ))}
      </div>

      {jadwal.unlabeledRows > 0 && (
        <details className="notice-box" style={{ fontSize: 11.5, marginTop: 10 }}>
          <summary style={{ cursor: 'pointer' }}>⚠️ {jadwal.unlabeledRows} baris jadwal belum bertag periode</summary>
          <div style={{ marginTop: 6 }}>
            Baris tanpa tag di kolom Kegiatan (1M/3M/6M/1Y), mis. pekerjaan TL atau "Pendampingan Perawatan AC",
            tidak masuk hitungan periode mana pun. Isi tag-nya di sheet kalau memang termasuk salah satu periode.
          </div>
        </details>
      )}
    </div>
  );
}
