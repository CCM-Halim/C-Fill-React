import React from 'react';

/**
 * PhotoCard
 * Kartu list (kategori bangunan / site / kategori peralatan) dengan foto
 * samar di sisi kiri + gradasi ke background. Kalau `photoUrl` null/kosong,
 * otomatis fallback ke kartu polos (nggak ada bedanya visual dari sebelumnya).
 */
export function PhotoCard({ photoUrl, children, className = '', ...rest }) {
  if (!photoUrl) {
    return <div className={`card clickable-card ${className}`} {...rest}>{children}</div>;
  }
  return (
    <div className={`photo-card card clickable-card ${className}`} {...rest}>
      <div className="pc-photo" style={{ backgroundImage: `url(${photoUrl})` }} />
      <div className="pc-fade" />
      <div className="pc-label">{children}</div>
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
