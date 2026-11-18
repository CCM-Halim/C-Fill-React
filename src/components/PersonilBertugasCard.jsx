import React, { useEffect, useRef, useState } from 'react';
import { getPersonilBertugas } from '../lib/personilBertugas';
import { SHIFT_LIST, shiftSekarang, normNama } from '../lib/shiftBipo';
import { useKartuFoto } from './KartuFotoContext';
import { KUNCI_ROTASI, rotasiEfektif, putarBerikutnya } from '../lib/kartuRotasi';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const GANTI_MS = 5000;

/**
 * Gambar smartcard selalu landscape & tegak. Gambar potret otomatis diputar (lihat
 * lib/kartuRotasi.js) dengan CSS transform — bukan kanvas — supaya aman di Safari.
 * Admin bisa memutar per orang (tombol ↻).
 */
const TINGGI_MAKS = 260;

function GambarKartu({ p, onGagal }) {
  const { config, isAdmin, simpanRotasi } = useKartuFoto();
  const [ukuran, setUkuran] = useState(null);     // { w, h } ukuran asli gambar
  const imgRef = useRef(null);
  const key = KUNCI_ROTASI + normNama(p.nama);
  // Gambar dari cache bisa sudah selesai dimuat sebelum handler onLoad terpasang.
  useEffect(() => {
    const im = imgRef.current;
    if (im && im.complete && im.naturalWidth) setUkuran({ w: im.naturalWidth, h: im.naturalHeight });
  }, []);

  const sudut = ukuran ? rotasiEfektif(config[key], ukuran.w, ukuran.h) : 0;
  const tukar = sudut % 180 !== 0;
  // Rasio kotak tampilan (setelah diputar) = lebar/tinggi
  const rasio = ukuran ? (tukar ? ukuran.h / ukuran.w : ukuran.w / ukuran.h) : 1.6;
  // Gambar diputar di dalam kotak: kalau tertukar, lebar gambar = tinggi kotak = (1/rasio) x lebar kotak.
  const lebarGambar = tukar ? (100 / rasio) + '%' : '100%';

  return (
    <>
      <div className="kartu-bingkai" style={{ aspectRatio: String(rasio), width: `min(100%, ${Math.round(TINGGI_MAKS * rasio)}px)` }}>
        <img
          ref={imgRef}
          src={p.fotoUrl}
          alt={'Smartcard ' + p.nama}
          referrerPolicy="no-referrer"
          onLoad={(e) => setUkuran({ w: e.currentTarget.naturalWidth || 1, h: e.currentTarget.naturalHeight || 1 })}
          onError={onGagal}
          style={{ width: lebarGambar, transform: `translate(-50%, -50%) rotate(${sudut}deg)`, visibility: ukuran ? 'visible' : 'hidden' }}
        />
      </div>
      {isAdmin && ukuran && (
        <button type="button" className="personil-putar" title="Putar smartcard 90° (admin)"
          onClick={() => simpanRotasi(key, putarBerikutnya(sudut))}>↻</button>
      )}
    </>
  );
}

function Smartcard({ p }) {
  const [gagal, setGagal] = useState(false);
  useEffect(() => setGagal(false), [p.fotoUrl]);
  if (p.fotoUrl && !gagal) return <GambarKartu key={p.fotoUrl} p={p} onGagal={() => setGagal(true)} />;
  return (
    <div className="personil-kosong">
      <div className="personil-inisial">{p.nama.trim().slice(0, 2).toUpperCase()}</div>
      <div className="muted" style={{ fontSize: 12 }}>Smartcard belum tersedia</div>
    </div>
  );
}

export default function PersonilBertugasCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [idx, setIdx] = useState(0);
  const [jeda, setJeda] = useState(false);
  const kunciMuat = useRef('');

  const muat = () => {
    const now = new Date();
    const info = shiftSekarang(now);
    kunciMuat.current = now.toDateString() + '|' + info.tanggal.malam.getDate();
    getPersonilBertugas(now).then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message));
  };

  useEffect(() => {
    muat();
    const t = setInterval(() => {
      const now = new Date();
      const info = shiftSekarang(now);
      if (kunciMuat.current !== now.toDateString() + '|' + info.tanggal.malam.getDate()) muat();
      else setData((d) => (d && d.aktif !== info.aktif ? { ...d, aktif: info.aktif } : d));   // pergantian shift
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const aktif = data?.aktif;
  const daftar = (data && data.shifts[aktif]) || [];
  const jumlah = daftar.length;

  // Ganti tampilan tiap 5 detik (berhenti sementara saat kursor/jari di atas kartu).
  useEffect(() => {
    setIdx(0);
  }, [aktif, jumlah]);
  useEffect(() => {
    if (jumlah < 2 || jeda) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % jumlah), GANTI_MS);
    return () => clearInterval(t);
  }, [jumlah, jeda, aktif]);

  if (error) {
    return <div className="card"><div className="notice-box">👥 Personil bertugas: {error}</div></div>;
  }
  if (!data) {
    return <div className="card"><div className="muted">Memuat personil bertugas...</div></div>;
  }

  const shiftInfo = SHIFT_LIST.find((s) => s.kode === aktif);
  const tgl = data.tanggal[aktif];
  const p = daftar[Math.min(idx, Math.max(jumlah - 1, 0))];

  return (
    <div
      className={'card personil-card shift-' + aktif}
      onMouseEnter={() => setJeda(true)} onMouseLeave={() => setJeda(false)}
      onTouchStart={() => setJeda(true)} onTouchEnd={() => setJeda(false)}
    >
      <div className="personil-kepala">
        <div>
          <div className="card-title" style={{ marginBottom: 2 }}>Personil Bertugas</div>
          <div className="personil-sub">
            Shift {shiftInfo.label} · {shiftInfo.jam} · {HARI[tgl.getDay()]}, {tgl.getDate()} {BULAN[tgl.getMonth()]} {tgl.getFullYear()}
          </div>
        </div>
        {jumlah > 0 && <div className="personil-hitung">{Math.min(idx, jumlah - 1) + 1}/{jumlah}</div>}
      </div>

      {data.error && <div className="notice-box" style={{ marginTop: 10 }}>{data.error}</div>}
      {!data.error && jumlah === 0 && <div className="personil-sub" style={{ marginTop: 14 }}>Tidak ada personil terjadwal pada shift ini.</div>}

      {p && (
        <div className="personil-dua" key={aktif + '|' + p.nama}>
          <div className="personil-kotak personil-data">
            <div className="personil-label">Nama</div>
            <div className="personil-nama-besar">{p.nama}</div>
            <div className="personil-label">NIP</div>
            <div className="personil-nilai">{p.nip || '-'}</div>
            <div className="personil-label">Nomor telepon</div>
            <div className="personil-nilai">
              {p.kontak ? <a href={'tel:' + p.kontak.replace(/[^\d+]/g, '')}>{p.kontak}</a> : '-'}
            </div>
          </div>
          <div className="personil-kotak personil-kartu"><Smartcard p={p} /></div>
        </div>
      )}

      {jumlah > 1 && (
        <div className="personil-titik">
          {daftar.map((x, i) => (
            <button key={x.nama} className={i === idx ? 'aktif' : ''} aria-label={x.nama} onClick={() => setIdx(i)} />
          ))}
        </div>
      )}
      {jumlah > 1 && !jeda && <div className="personil-waktu" key={idx + '|' + aktif} style={{ animationDuration: GANTI_MS + 'ms' }} />}
    </div>
  );
}
