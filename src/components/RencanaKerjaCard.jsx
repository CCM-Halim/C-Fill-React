import React, { useEffect, useRef, useState } from 'react';
import { getRencanaKerja } from '../lib/rencanaKerjaService';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const fmt = (d) => `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`;

function Status({ s }) {
  const selesai = /^(finish|finished|done|selesai|sudah)$/i.test((s || '').trim());
  return (
    <span className="badge" style={selesai ? { background: 'var(--accent-soft)', color: 'var(--accent-strong)' } : { background: '#FCE4E4', color: '#B4302F' }}>
      {selesai ? 'Selesai' : 'Belum'}
    </span>
  );
}

function Hari({ judul, hasil, kelas }) {
  return (
    <div className={'rencana-hari ' + kelas}>
      <div className="rencana-judul">{judul}</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{fmt(hasil.tanggal)}</div>
      {hasil.error && <div className="notice-box" style={{ fontSize: 12 }}>{hasil.error}</div>}
      {!hasil.error && hasil.daftar.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Tidak ada rencana kerja.</div>}
      {hasil.daftar.map((it, i) => (
        <div className="rencana-item" key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, overflowWrap: 'anywhere' }}>{it.lokasi}</div>
            <Status s={it.status} />
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {it.jam}{it.kegiatan && ` · ${it.kegiatan}`}{it.pic && ` · PIC: ${it.pic}`}
          </div>
          {it.detail && <div style={{ fontSize: 12, marginTop: 2 }}>{it.detail}</div>}
        </div>
      ))}
    </div>
  );
}

export default function RencanaKerjaCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const hariMuat = useRef('');

  const muat = () => {
    hariMuat.current = new Date().toDateString();
    getRencanaKerja().then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message));
  };

  useEffect(() => {
    muat();
    const t = setInterval(() => { if (hariMuat.current !== new Date().toDateString()) muat(); }, 60000);
    return () => clearInterval(t);
  }, []);

  const sheetUrl = data?.hariIni?.sheetUrl || data?.besok?.sheetUrl;

  return (
    <div className="card rencana-card">
      <div className="card-title">Rencana Kerja</div>
      {error && <div className="notice-box">📋 {error}</div>}
      {!data && !error && <div className="muted">Memuat rencana kerja...</div>}
      {data && (
        <div className="rencana-dua">
          <Hari judul="Hari ini" hasil={data.hariIni} kelas="hijau" />
          <Hari judul="Besok" hasil={data.besok} kelas="abu" />
        </div>
      )}
      {sheetUrl && (
        <a href={sheetUrl} target="_blank" rel="noreferrer" className="link-like" style={{ display: 'inline-block', fontSize: 13, marginTop: 12 }}>
          Buka jadwal lengkap di Google Sheets →
        </a>
      )}
    </div>
  );
}
