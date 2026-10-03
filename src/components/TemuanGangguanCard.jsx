import React, { useMemo, useState } from 'react';
import {
  STATUS, STATUS_LABEL, filterGangguan, sortGangguan, buildFilterOptions, summarizeGangguan,
} from '../lib/gangguanLog';

/**
 * Kartu "Temuan & Gangguan" di Dashboard.
 *
 * Dipisah jadi komponen sendiri (bukan inline di Dashboard) supaya bisa
 * di-render & diperiksa tanpa browser - lihat scripts/verify-dashboard-render.mjs.
 *
 * FILTER yang tersedia:
 *   - Status : Semua / *Open (belum selesai)* / Close (selesai)  <-- diminta Jo
 *   - Tahun  : hanya tahun yang ada datanya
 *   - Bulan  : hanya bulan yang ada datanya di tahun terpilih
 *   - Jenis  : tab sheet (Peralatan/AC/K3/Kontruksi/Instrumen/Lain-Lain)
 *   - Cari   : lokasi / peralatan / analisis
 *
 * Daftarnya juga meringkas jumlah open & close, dan menyorot gangguan open yang
 * paling lama menggantung.
 */

const CHIP = (active) => ({
  padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
  border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
  background: active ? 'var(--accent-soft)' : 'var(--surface)',
  color: active ? 'var(--accent-strong)' : 'var(--ink-soft)',
});

function StatusBadge({ status, statusRaw }) {
  const open = status === STATUS.OPEN;
  const unknown = status === STATUS.UNKNOWN;
  const style = unknown
    ? { background: '#F1EFE8', color: 'var(--ink-soft)' }
    : open
      ? { background: '#FCE4E4', color: '#B4302F' }
      : { background: 'var(--accent-soft)', color: 'var(--accent-strong)' };
  return <span className="badge" style={style}>{statusRaw || STATUS_LABEL[status]}</span>;
}

function ItemRow({ it, onOpen }) {
  if (!it) return null;
  return (
    <div
      onClick={() => onOpen && onOpen(it)}
      style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 10, cursor: onOpen ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.lokasi}</div>
        <StatusBadge status={it.status} statusRaw={it.statusRaw} />
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        {it.tab}{it.alat ? ` · ${it.alat}` : ''}{it.sistem ? ` · ${it.sistem}` : ''}
      </div>
      <div style={{ fontSize: 12, marginTop: 3 }}>
        {it.tanggalRaw ? `Tanggal: ${it.tanggalRaw}` : 'Tanggal: (belum diisi)'}
        {it.pulihRaw && ` · Pulih: ${it.pulihRaw}`}
        {it.status === STATUS.OPEN && it.umurHari !== null && (
          <span style={{ color: '#B4302F', fontWeight: 600 }}> · open {it.umurHari} hari</span>
        )}
        {it.tanggalDariWaktuGangguan && (
          <span className="muted"> · tanggal dari kolom Waktu Gangguan</span>
        )}
        {it.tanggalAmbigu && (
          <span style={{ color: '#8A5A00' }}> ⚠️ tanggal &amp; waktu gangguan beda hari/bulan — cek sheet</span>
        )}
      </div>
    </div>
  );
}

export default function TemuanGangguanCard({ log, loading, error, onOpenItem }) {
  const [status, setStatus] = useState('all');
  const [tahun, setTahun] = useState('all');
  const [bulan, setBulan] = useState('all');
  const [tab, setTab] = useState('all');
  const [cari, setCari] = useState('');
  const [tanpaTanggal, setTanpaTanggal] = useState(false);
  const [batas, setBatas] = useState(20);

  const items = (log && log.available) ? log.items : [];
  const ringkas = useMemo(() => summarizeGangguan(items), [items]);
  const opsi = useMemo(() => buildFilterOptions(items), [items]);

  const hasil = useMemo(
    () => sortGangguan(filterGangguan(items, { status, tahun, bulan, tab, cari, hanyaTanpaTanggal: tanpaTanggal })),
    [items, status, tahun, bulan, tab, cari, tanpaTanggal]
  );

  const bulanTersedia = tahun === 'all' ? [] : (opsi.monthsByYear[tahun] || []);
  // Kalau tab/tahun diganti dan bulan yang dipilih tidak ada di situ, jangan
  // biarkan daftar kosong tanpa penjelasan - reset ke "semua bulan".
  const bulanEfektif = (tahun !== 'all' && bulan !== 'all' && !bulanTersedia.includes(Number(bulan)))
    ? 'all' : bulan;

  return (
    <div className="card">
      <div className="card-title">Temuan &amp; Gangguan</div>

      {loading && <div className="muted">Memuat data temuan &amp; gangguan...</div>}
      {error && <div className="notice-box">Gagal memuat: {error}</div>}
      {log && !log.available && <div className="notice-box">📋 {log.reason}</div>}

      {log && log.available && (
        <>
          {/* Ringkasan cepat: berapa yang masih open vs sudah close */}
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
            {ringkas.total} kejadian · <b style={{ color: '#B4302F' }}>{ringkas.open} open</b> ·{' '}
            <b style={{ color: 'var(--accent-strong)' }}>{ringkas.closed} close</b>
            {ringkas.unknown > 0 && ` · ${ringkas.unknown} status tidak dikenal`}
            {ringkas.openTerlama && (
              <> · open terlama: {ringkas.openTerlama.lokasi} ({ringkas.openTerlama.umurHari} hari)</>
            )}
          </div>

          {/* FILTER STATUS — ini yang bikin kelihatan mana yang masih open */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              { key: 'all', label: `Semua (${ringkas.total})` },
              { key: STATUS.OPEN, label: `Open (${ringkas.open})` },
              { key: STATUS.CLOSED, label: `Close (${ringkas.closed})` },
            ].map((c) => (
              <button key={c.key} type="button" style={CHIP(status === c.key)}
                onClick={() => { setStatus(c.key); setBatas(20); }}>
                {c.label}
              </button>
            ))}
            {ringkas.tanpaTanggal > 0 && (
              <button type="button" style={CHIP(tanpaTanggal)}
                onClick={() => { setTanpaTanggal(!tanpaTanggal); setBatas(20); }}>
                Tanpa tanggal ({ringkas.tanpaTanggal})
              </button>
            )}
          </div>

          {/* Filter tahun / bulan / jenis + pencarian */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            {opsi.years.length > 1 && (
              <select className="input" style={{ maxWidth: 110 }} value={tahun}
                onChange={(e) => { setTahun(e.target.value === 'all' ? 'all' : Number(e.target.value)); setBulan('all'); setBatas(20); }}>
                <option value="all">Semua tahun</option>
                {opsi.years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            <select className="input" style={{ maxWidth: 150 }} value={bulanEfektif}
              onChange={(e) => { setBulan(e.target.value === 'all' ? 'all' : Number(e.target.value)); setBatas(20); }}>
              <option value="all">Semua bulan</option>
              {(tahun === 'all'
                ? [...new Set(Object.values(opsi.monthsByYear).flat())].sort((a, b) => a - b)
                : bulanTersedia
              ).map((m) => <option key={m} value={m}>{opsi.bulanLabel(m)}</option>)}
            </select>
            {log.tabs && log.tabs.length > 1 && (
              <select className="input" style={{ maxWidth: 210 }} value={tab}
                onChange={(e) => { setTab(e.target.value); setBatas(20); }}>
                <option value="all">Semua jenis gangguan</option>
                {log.tabs.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <input className="input" style={{ maxWidth: 200 }} placeholder="Cari lokasi / peralatan..."
              value={cari} onChange={(e) => { setCari(e.target.value); setBatas(20); }} />
          </div>

          {log.gagalDibaca && log.gagalDibaca.length > 0 && (
            <div className="notice-box" style={{ fontSize: 11.5, marginBottom: 10 }}>
              ⚠️ {log.gagalDibaca.length} tab gagal dibaca: {log.gagalDibaca.join('; ')}
            </div>
          )}

          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
            Menampilkan {Math.min(batas, hasil.length)} dari {hasil.length} kejadian
            {status !== 'all' && ` · status ${STATUS_LABEL[status]}`}
          </div>

          {hasil.length === 0 && <div className="muted">Tidak ada temuan/gangguan dengan filter ini.</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hasil.slice(0, batas).map((it) => (
              <ItemRow key={`${it.tab}-${it.baris}`} it={it} onOpen={onOpenItem} />
            ))}
          </div>

          {hasil.length > batas && (
            <button className="btn btn-secondary" style={{ marginTop: 12, width: '100%' }}
              onClick={() => setBatas(batas + 30)}>
              Tampilkan {Math.min(30, hasil.length - batas)} lagi
            </button>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href={log.sheetUrl} target="_blank" rel="noreferrer" className="link-like" style={{ fontSize: 13 }}>
              Buka Log Book di Google Sheets →
            </a>
          </div>

          <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            Status diambil apa adanya dari kolom &quot;Status&quot; sheet (Close/Closed = selesai, Open = belum).
            Dropdown bulan/tahun hanya menawarkan pilihan yang ada datanya.
          </div>
        </>
      )}
    </div>
  );
}
