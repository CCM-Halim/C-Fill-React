import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getRencanaKerja } from '../lib/rencanaKerjaService';
import { alarmOpenDiLokasi, kunciLokasi } from '../lib/alarmLokasi';

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

const ALARM_PER_HALAMAN = 3;   // jumlah alarm per tampilan; sisanya jadi tampilan lanjutan
const DETIK_GANTI = 6;         // pergantian otomatis, seperti kartu personil
const potong = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);

// Susun "halaman" tampilan: satu lokasi per halaman, dengan alarm open di lokasi itu.
// Lokasi dengan alarm > ALARM_PER_HALAMAN dilanjutkan di halaman berikutnya.
// Alarm tiap lokasi hanya ditampilkan sekali per hari (di kemunculan pertama).
function susunHalaman(daftar, items) {
  const sudah = new Set();
  const out = [];
  daftar.forEach((it) => {
    const k = kunciLokasi(it.lokasi);
    let alarm = [];
    if (k && !sudah.has(k)) { sudah.add(k); alarm = alarmOpenDiLokasi(items, it.lokasi); }
    const n = Math.max(1, Math.ceil(alarm.length / ALARM_PER_HALAMAN));
    for (let i = 0; i < n; i++) {
      out.push({ it, alarm: alarm.slice(i * ALARM_PER_HALAMAN, (i + 1) * ALARM_PER_HALAMAN), total: alarm.length, lanjutan: i > 0 });
    }
  });
  return out;
}

function Hari({ judul, hasil, kelas, log }) {
  const halaman = useMemo(
    () => susunHalaman(hasil.daftar, log && log.available ? log.items : []),
    [hasil, log]
  );
  const [idx, setIdx] = useState(0);
  const [jeda, setJeda] = useState(false);
  const n = halaman.length;

  useEffect(() => { setIdx(0); }, [n]);
  useEffect(() => {
    if (n < 2 || jeda) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), DETIK_GANTI * 1000);
    return () => clearInterval(t);
  }, [n, jeda, idx]);

  const h = halaman[Math.min(idx, n - 1)];
  const it = h && h.it;

  return (
    <div className={'rencana-hari ' + kelas} onMouseEnter={() => setJeda(true)} onMouseLeave={() => setJeda(false)}>
      <div className="rencana-kepala">
        <div>
          <div className="rencana-judul">{judul}</div>
          <div className="rencana-tgl">{fmt(hasil.tanggal)}</div>
        </div>
        {n > 0 && <div className="rencana-hitung">{Math.min(idx, n - 1) + 1}/{n}</div>}
      </div>
      <div className="rencana-isi">
        {hasil.error && <div className="notice-box" style={{ fontSize: 14 }}>{hasil.error}</div>}
        {!hasil.error && n === 0 && <div className="muted rencana-kosong">Tidak ada rencana kerja.</div>}
        {h && (
          <div className="rencana-item" key={idx}>
            <div className="rencana-baris1">
              <div className="rencana-lokasi">{it.lokasi}{h.lanjutan && <span className="rencana-lanj"> (lanjutan)</span>}</div>
              <Status s={it.status} />
            </div>
            <div className="rencana-meta">
              {it.jam}{it.kegiatan && ` · ${it.kegiatan}`}{it.pic && ` · PIC: ${it.pic}`}
            </div>
            {it.detail && !h.lanjutan && <div className="rencana-detail">{potong(it.detail, 80)}</div>}
            {h.alarm.length > 0 && (
              <div className="alarm-kotak">
                <div className="alarm-judul">🚨 {h.total} alarm masih open</div>
                {h.alarm.map((a) => (
                  <div className="alarm-baris" key={a.tab + a.baris}>
                    <b>{a.alat || a.tab}</b>{a.fenomena && ` — ${a.fenomena}`}
                    <span className="alarm-umur">
                      {Number.isFinite(a.umurHari) && ` · ${Math.floor(a.umurHari)} hari`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {n > 1 && (
        <div className="rencana-titik">
          {halaman.map((_, i) => (
            <button key={i} type="button" aria-label={'Tampilan ' + (i + 1)} className={i === idx ? 'aktif' : ''} onClick={() => setIdx(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RencanaKerjaCard({ log }) {
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
          <Hari judul="Hari ini" hasil={data.hariIni} kelas="hijau" log={log} />
          <Hari judul="Besok" hasil={data.besok} kelas="abu" log={log} />
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
