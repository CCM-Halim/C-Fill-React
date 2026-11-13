import React, { useRef, useState } from 'react';
import './photoCardRight.css';
import { useKartuFoto, useFotoKartuUrl } from './KartuFotoContext';

/**
 * PhotoCard
 * Kartu list (kategori bangunan / site / kategori peralatan) dengan foto
 * di sisi kiri/kanan + gradasi ke background. Kalau tidak ada foto, otomatis
 * fallback ke kartu polos.
 *
 * Sumber foto (prioritas): foto upload admin (`fotoKeys`, lihat "Kelola Kartu")
 * -> `photoUrl` bawaan dari config/backgrounds.js.
 * Saat admin menyalakan mode Kelola Kartu, kartu menampilkan tombol upload/hapus
 * yang menyimpan foto ke `fotoKeys[0]`.
 */
export function PhotoCard({ photoUrl, fotoKeys, side = 'left', children, className = '', ...rest }) {
  const { editMode, isAdmin, simpan, hapus, config } = useKartuFoto();
  const upload = useFotoKartuUrl(fotoKeys);
  const url = upload || photoUrl;
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const bisaKelola = isAdmin && editMode && fotoKeys && fotoKeys.length > 0;
  const kunci = bisaKelola ? fotoKeys[0] : null;

  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  const pilih = async (e) => {
    e.stopPropagation();
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setErr(null);
    try { await simpan(kunci, file); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const hapusFoto = async (e) => {
    stop(e);
    if (!window.confirm('Hapus foto kartu ini?')) return;
    setBusy(true); setErr(null);
    try { await hapus(kunci); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  const overlay = bisaKelola ? (
    <div className="pc-admin" onClick={stop}>
      <button type="button" className="pc-admin-btn" disabled={busy}
        onClick={(e) => { stop(e); inputRef.current && inputRef.current.click(); }}>
        {busy ? 'Menyimpan…' : url ? '📷 Ganti' : '＋ Foto'}
      </button>
      {config[kunci] && !busy && <button type="button" className="pc-admin-btn" onClick={hapusFoto}>✕</button>}
      <input ref={inputRef} type="file" accept="image/*" hidden onClick={(e) => e.stopPropagation()} onChange={pilih} />
      {err && <div className="pc-admin-err">{err}</div>}
    </div>
  ) : null;

  if (!url) {
    return (
      <div className={`card clickable-card ${className}`} style={{ position: 'relative', paddingRight: bisaKelola ? 110 : undefined }} {...rest}>
        {children}
        {overlay}
      </div>
    );
  }
  // side="right": foto di sisi kanan, gradasi halus di sisi kiri foto (teks tetap rata kiri).
  const kanan = side === 'right';
  return (
    <div className={`photo-card card clickable-card${kanan ? ' pc-right' : ''} ${className}`} {...rest}>
      <div className="pc-photo" style={{ backgroundImage: `url(${url})` }} />
      {kanan ? null : <div className="pc-fade" />}
      <div className="pc-label">{children}</div>
      {overlay}
    </div>
  );
}

/**
 * HeroHeader
 * Header foto full-width di halaman detail (site / kategori peralatan),
 * foto slide masuk dari kiri dengan animasi halus tiap kali komponen ini
 * muncul (baik pas buka halaman baru, maupun pas balik ke halaman yang
 * juga punya hero - animasi jalan lagi karena key berubah tiap mount).
 * Kalau `photoUrl` null, tidak render apa-apa (fallback ke tampilan biasa).
 */
export function HeroHeader({ photoUrl, eyebrow, title }) {
  if (!photoUrl) return null;
  return (
    <div className="hero-header" key={photoUrl}>
      <div className="hh-photo" style={{ backgroundImage: `url(${photoUrl})` }} />
      <div className="hh-fade" />
      <div className="hh-title">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <div className="title">{title}</div>
      </div>
    </div>
  );
}
