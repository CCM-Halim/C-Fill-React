import React, { useMemo, useState } from 'react';
import { buildFilterOptions, hitungTrenBulanan } from '../lib/gangguanLog';

/**
 * Grafik tren temuan per bulan (kombinasi batang + garis) dari Log Gangguan.
 *   Batang bertumpuk : kejadian per bulan - Close (hijau) + Open (merah)
 *   Garis            : total kumulatif SEMUA kejadian sampai bulan itu (sumbu kanan)
 * Digambar dengan SVG biasa (tanpa library tambahan).
 */

const W = 640; const H = 280;
const M = { l: 40, r: 44, t: 16, b: 34 };
const C_CLOSE = 'var(--accent)'; const C_OPEN = '#B4302F'; const C_UNK = '#B9B5A6'; const C_LINE = 'var(--ink)';

// Batas atas sumbu: kelipatan 4 supaya 4 garis bantu jatuh di bilangan bulat.
function niceMax(v) {
  return Math.max(4, Math.ceil(v / 4) * 4);
}

export default function TrenTemuanCard({ log }) {
  const items = (log && log.available) ? log.items : [];
  const opsi = useMemo(() => buildFilterOptions(items), [items]);
  const [tahun, setTahun] = useState(null); // null = tahun terbaru
  const [tab, setTab] = useState('all');
  const [pilih, setPilih] = useState(null);

  if (!log || !log.available || items.length === 0) return null;

  // Default = tahun berjalan (bukan "tahun terbesar di sheet": salah ketik tahun
  // seperti 2027 akan membuat grafik pertama kali terbuka hampir kosong).
  const tahunIni = new Date().getFullYear();
  const tahunDefault = opsi.years.includes(tahunIni)
    ? tahunIni
    : (opsi.years.find((y) => y < tahunIni) ?? opsi.years[0] ?? 'all');
  const tahunAktif = tahun === null ? tahunDefault : tahun;
  const akanDatang = items.filter((it) => it.tanggal && it.tanggal.year > tahunIni);
  const tren = hitungTrenBulanan(items, { tahun: tahunAktif, tab });
  const bulan = tren.bulan;
  const maxBatang = niceMax(Math.max(1, ...bulan.map((b) => b.total)));
  const maxKum = niceMax(Math.max(1, ...bulan.map((b) => b.kumulatif)));
  const iw = W - M.l - M.r; const ih = H - M.t - M.b;
  const slot = bulan.length ? iw / bulan.length : iw;
  const bw = Math.min(34, slot * 0.62);
  const x = (i) => M.l + slot * i + slot / 2;
  const yB = (v) => M.t + ih - (v / maxBatang) * ih;
  const yK = (v) => M.t + ih - (v / maxKum) * ih;
  const garis = bulan.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yK(b.kumulatif).toFixed(1)}`).join(' ');
  const terpilih = pilih !== null && bulan[pilih] ? bulan[pilih] : null;
  const labelEvery = bulan.length > 14 ? 2 : 1;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title">Tren Temuan per Bulan</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <select className="input" style={{ maxWidth: 130 }} value={tahunAktif}
          onChange={(e) => { setTahun(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPilih(null); }}>
          {opsi.years.map((y) => <option key={y} value={y}>{y}</option>)}
          <option value="all">Semua tahun</option>
        </select>
        {log.tabs && log.tabs.length > 1 && (
          <select className="input" style={{ maxWidth: 210 }} value={tab}
            onChange={(e) => { setTab(e.target.value); setPilih(null); }}>
            <option value="all">Semua jenis gangguan</option>
            {log.tabs.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {bulan.length === 0 ? (
        <div className="muted">Belum ada temuan bertanggal untuk filter ini.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img"
            aria-label="Grafik batang dan garis jumlah temuan per bulan">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={M.l} x2={W - M.r} y1={M.t + ih * (1 - f)} y2={M.t + ih * (1 - f)} stroke="var(--border-soft)" />
                <text x={M.l - 6} y={M.t + ih * (1 - f) + 4} textAnchor="end" fontSize="10.5" fill="var(--ink-soft)">{Math.round(maxBatang * f)}</text>
                <text x={W - M.r + 6} y={M.t + ih * (1 - f) + 4} fontSize="10.5" fill="var(--ink-soft)">{Math.round(maxKum * f)}</text>
              </g>
            ))}
            {bulan.map((b, i) => {
              const hClose = (b.closed / maxBatang) * ih;
              const hUnk = (b.unknown / maxBatang) * ih;
              const hOpen = (b.open / maxBatang) * ih;
              const base = M.t + ih;
              return (
                <g key={b.key} onClick={() => setPilih(i === pilih ? null : i)} style={{ cursor: 'pointer' }}>
                  <rect x={x(i) - slot / 2} y={M.t} width={slot} height={ih} fill="transparent" />
                  {terpilih === b && <rect x={x(i) - slot / 2} y={M.t} width={slot} height={ih} fill="var(--accent-soft)" opacity="0.6" />}
                  <rect x={x(i) - bw / 2} y={base - hClose} width={bw} height={hClose} fill={C_CLOSE} />
                  <rect x={x(i) - bw / 2} y={base - hClose - hUnk} width={bw} height={hUnk} fill={C_UNK} />
                  <rect x={x(i) - bw / 2} y={base - hClose - hUnk - hOpen} width={bw} height={hOpen} fill={C_OPEN} />
                  <title>{`${b.label}: ${b.total} temuan (${b.closed} close, ${b.open} open) · kumulatif ${b.kumulatif}`}</title>
                  {i % labelEvery === 0 && (
                    <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--ink-soft)">{b.label}</text>
                  )}
                </g>
              );
            })}
            <path d={garis} fill="none" stroke={C_LINE} strokeWidth="2.2" strokeLinejoin="round" />
            {bulan.map((b, i) => <circle key={b.key} cx={x(i)} cy={yK(b.kumulatif)} r="3.4" fill="var(--surface)" stroke={C_LINE} strokeWidth="2" />)}
            <text x={M.l - 6} y={9} textAnchor="end" fontSize="10" fill="var(--ink-soft)">per bln</text>
            <text x={W - M.r + 6} y={9} fontSize="10" fill="var(--ink-soft)">total</text>
          </svg>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, marginTop: 4 }}>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, background: C_CLOSE, marginRight: 5 }} />Close</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, background: C_OPEN, marginRight: 5 }} />Open</span>
            <span><i style={{ display: 'inline-block', width: 18, height: 0, borderTop: '2.2px solid var(--ink)', verticalAlign: 'middle', marginRight: 5 }} />Total kumulatif (sumbu kanan)</span>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, minHeight: 36 }}>
            {terpilih ? (
              <>
                <b>{terpilih.label} {terpilih.year}</b>: {terpilih.total} temuan —{' '}
                <span style={{ color: 'var(--accent-strong)' }}>{terpilih.closed} close</span>,{' '}
                <span style={{ color: C_OPEN }}>{terpilih.open} open</span>
                {terpilih.unknown > 0 && `, ${terpilih.unknown} status tidak dikenal`}
                . Total sampai bulan ini: {terpilih.kumulatif}.
              </>
            ) : (
              <span className="muted">Ketuk satu batang untuk melihat rinciannya.</span>
            )}
          </div>
          {akanDatang.length > 0 && (
            <div className="notice-box" style={{ fontSize: 11.5, marginTop: 8 }}>
              ⚠️ {akanDatang.length} kejadian bertanggal tahun {[...new Set(akanDatang.map((it) => it.tanggal.year))].join(', ')} (belum terjadi) —
              kemungkinan salah ketik tahun di sheet. Kejadian itu muncul di pilihan tahun tersebut, bukan di {tahunIni}.
            </div>
          )}
          {tren.tanpaTanggal > 0 && (
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
              {tren.tanpaTanggal} kejadian tanpa tanggal tidak masuk grafik (tetap ada di daftar di bawah).
            </div>
          )}
        </>
      )}
    </div>
  );
}
