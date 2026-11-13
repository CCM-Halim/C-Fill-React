import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { IconDashboard, IconClipboard, IconGauge, IconUpload, IconLogout, IconBolt, IconCheckShield, IconLogInOut, IconTrackInOut } from './Icons';
import { APP_VERSION, COPYRIGHT_LINE } from '../config/appInfo';
import './navGroups.css';

/* Ikon khusus menu bertingkat (dibuat di sini supaya Icons.jsx tidak perlu diubah). */
const svgProps = { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const IconWrench = () => (
  <svg {...svgProps}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></svg>
);
const IconClock = () => (
  <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const IconChevron = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
);

/**
 * Susunan menu. Item bertipe `group` punya sub menu (drop-down di sidebar,
 * drop-up di bottom nav HP). Untuk menambah sub menu baru cukup tambah entri
 * di `children`.
 */
const MENU = [
  { to: '/', end: true, icon: IconDashboard, label: 'Dashboard' },
  {
    key: 'perawatan', label: 'Perawatan', icon: IconWrench,
    children: [
      { to: '/peralatan', icon: IconClipboard, label: 'Peralatan' },
      { to: '/instrumen', icon: IconGauge, label: 'Instrumen' },
      { to: '/entry-exit', icon: IconLogInOut, label: 'Entry Exit' },
      { to: '/dokumentasi', icon: IconUpload, label: 'Dokumentasi' },
    ],
  },
  {
    key: 'window-time', label: 'Window Time', icon: IconClock,
    children: [
      { to: '/jalur', icon: IconTrackInOut, label: 'Jalur' },
    ],
  },
  { to: '/panduan', end: false, icon: IconClipboard, label: 'Panduan' },
];

const FOREMAN_NAV_ITEM = { to: '/verifikasi', end: false, icon: IconCheckShield, label: 'Verifikasi' };

const cocok = (path, to) => path === to || path.startsWith(to + '/');
const grupAktif = (grup, path) => grup.children.some((c) => cocok(path, c.to));

export default function Sidebar() {
  const { user, logout, isForeman, foremanRole } = useAuth();
  const { pathname } = useLocation();
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();
  const menu = isForeman ? [...MENU, FOREMAN_NAV_ITEM] : MENU;

  // Sidebar: grup yang berisi halaman aktif otomatis terbuka. Pilihan manual
  // teknisi (buka/tutup) tetap dihormati sampai pindah ke halaman di grup lain.
  const [terbuka, setTerbuka] = useState(() => {
    const init = {};
    MENU.forEach((m) => { if (m.children) init[m.key] = grupAktif(m, pathname); });
    return init;
  });
  // Bottom nav HP: hanya 1 kotak pilihan yang terbuka pada satu waktu.
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    setSheet(null);
    setTerbuka((prev) => {
      const next = { ...prev };
      MENU.forEach((m) => { if (m.children && grupAktif(m, pathname)) next[m.key] = true; });
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    if (!sheet) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSheet(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  return (
    <>
      {/* Header mobile: brand + user + logout, cuma tampil di layar sempit */}
      <header className="mobile-header">
        <div className="brand-mark"><IconBolt /> C‑Fill <span className="brand-version">{APP_VERSION}</span></div>
        <button className="mobile-logout" onClick={logout} aria-label="Keluar">
          <span className="user-avatar">{initial}</span>
        </button>
      </header>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><IconBolt /> C‑Fill <span className="brand-version">{APP_VERSION}</span></div>
          <div className="brand-sub">Communication Fillment</div>
        </div>
        <nav className="nav">
          {menu.map((m) => {
            const Icon = m.icon;
            if (!m.children) {
              return (
                <NavLink key={m.to} to={m.to} end={m.end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
                  <Icon /><span className="label">{m.label}</span>
                </NavLink>
              );
            }
            const buka = !!terbuka[m.key];
            const aktif = grupAktif(m, pathname);
            return (
              <div key={m.key}>
                <button
                  type="button"
                  className={'nav-item nav-group-btn' + (aktif ? ' has-active' : '')}
                  aria-expanded={buka}
                  onClick={() => setTerbuka((p) => ({ ...p, [m.key]: !p[m.key] }))}
                >
                  <Icon /><span className="label">{m.label}</span>
                  <IconChevron className="chev" />
                </button>
                {buka && (
                  <div className="nav-sub">
                    {m.children.map(({ to, icon: CIcon, label }) => (
                      <NavLink key={to} to={to} className={({ isActive }) => 'nav-item nav-sub-item' + (isActive || cocok(pathname, to) ? ' active' : '')}>
                        <CIcon /><span className="label">{label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar">{initial}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          {isForeman ? <div className="badge" style={{ marginBottom: 4 }}>{foremanRole || 'Foreman'}</div> : null}
          <button className="btn btn-ghost btn-block" onClick={logout}><IconLogout /> Keluar</button>
          <div className="brand-copyright">{COPYRIGHT_LINE}</div>
        </div>
      </aside>

      {/* Bottom nav mobile */}
      {sheet && <div className="bn-scrim" onClick={() => setSheet(null)} aria-hidden="true" />}
      <nav className="bottom-nav">
        {menu.map((m) => {
          const Icon = m.icon;
          if (!m.children) {
            return (
              <NavLink key={m.to} to={m.to} end={m.end} className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
                <Icon /><span>{m.label}</span>
              </NavLink>
            );
          }
          const terbukaIni = sheet === m.key;
          const aktif = grupAktif(m, pathname);
          return (
            <div key={m.key} className="bn-group">
              <button
                type="button"
                className={'bottom-nav-item' + (aktif ? ' active' : '') + (terbukaIni ? ' open' : '')}
                aria-haspopup="menu"
                aria-expanded={terbukaIni}
                onClick={() => setSheet(terbukaIni ? null : m.key)}
              >
                <Icon />
                <IconChevron className="bn-chev" />
                <span className="bn-label">{m.label}</span>
              </button>
              {terbukaIni && (
                <div className="bn-sheet" role="menu">
                  {m.children.map(({ to, icon: CIcon, label }) => (
                    <NavLink key={to} to={to} role="menuitem" className={({ isActive }) => 'bn-sheet-item' + (isActive || cocok(pathname, to) ? ' active' : '')}>
                      <CIcon /><span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}
