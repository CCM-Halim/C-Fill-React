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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 96 }}>
      <div style={{
        width: 96, height: 96, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
      }}>
        <div style={{
          width: 68, height: 68, borderRadius: '50%', background: 'var(--surface)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, lineHeight: 1.05 }}>
            {finished}/{total}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{pct}%</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)' }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, fontSize: 10.5 }}>
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
 * Kartu "Progress Kerja <Bulan> <Tahun>" - angka di donut & daftar rencana/
 * realisasi DIAMBIL DARI BARIS JADWAL SEBENARNYA (lihat lib/jadwalProgress.js),
 * sehingga nilainya sama dengan yang ada di spreadsheet.
 *
 * Dipisah jadi komponen sendiri (bukan inline di Dashboard) supaya bisa
 * di-render & diperiksa tanpa browser: lihat scripts/verify-dashboard-render.mjs.
 */
export default function ProgressKerjaCard({ jadwal, onOpenPeriod }) {
  if (!jadwal || !jadwal.available) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title">Progress Kerja {jadwal.bulan} {jadwal.tahun}</div>
      <div className="muted" style={{ marginBottom: 6 }}>
        Dari: {jadwal.fileName} · {jadwal.finishedCount} selesai, {jadwal.notYetCount} belum dari {jadwal.total} pekerjaan terjadwal
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', margin: '14px 0 10px', justifyContent: 'flex-start' }}>
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

      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <div key={p} style={{ marginTop: 2 }}>
            • {PERIOD_LABEL[p]}: rencana {jadwal.periodBreakdown[p].total} / realisasi {jadwal.periodBreakdown[p].finished}
          </div>
        ))}
        <div style={{ marginTop: 6, fontSize: 11 }}>
          Rencana dihitung dari tag periode di kolom Kegiatan (1M/3M/6M/1Y); realisasi = baris yang
          kolom Status Kegiatan-nya berisi "Finish".
        </div>
      </div>

      {jadwal.unlabeledRows > 0 && (
        <div className="notice-box" style={{ fontSize: 11.5, marginBottom: 12 }}>
          ⚠️ {jadwal.unlabeledRows} baris jadwal belum punya tag periode di kolom Kegiatan (mis. pekerjaan
          TL atau "Pendampingan Perawatan AC"). Baris seperti itu tidak masuk hitungan periode mana pun —
          isi tag-nya di sheet kalau memang termasuk salah satu periode.
        </div>
      )}

      <a href={jadwal.sheetUrl} target="_blank" rel="noreferrer" className="link-like" style={{ display: 'inline-block', fontSize: 13 }}>
        Buka jadwal lengkap di Google Sheets →
      </a>
    </div>
  );
}
