import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { IconDashboard, IconClipboard, IconGauge, IconUpload, IconLogout, IconBolt, IconCheckShield } from './Icons';

const NAV_ITEMS = [
  { to: '/', end: true, icon: IconDashboard, label: 'Dashboard' },
  { to: '/peralatan', end: false, icon: IconClipboard, label: 'Peralatan' },
  { to: '/instrumen', end: false, icon: IconGauge, label: 'Instrumen' },
  { to: '/dokumentasi', end: false, icon: IconUpload, label: 'Dokumentasi' }
];

const FOREMAN_NAV_ITEM = { to: '/verifikasi', end: false, icon: IconCheckShield, label: 'Verifikasi' };

const LABELS = {
  Peralatan: 'Checksheet Peralatan',
  Instrumen: 'Checksheet Instrumen',
  Dokumentasi: 'Upload Dokumentasi',
  Verifikasi: 'Verifikasi Pekerjaan'
};

export default function Sidebar() {
  const { user, logout, isForeman } = useAuth();
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();
  const navItems = isForeman ? [...NAV_ITEMS, FOREMAN_NAV_ITEM] : NAV_ITEMS;

  return (
    <>
      {/* Header mobile: brand + user + logout, cuma tampil di layar sempit */}
      <header className="mobile-header">
        <div className="brand-mark"><IconBolt /> C‑Fill</div>
        <button className="mobile-logout" onClick={logout} aria-label="Keluar">
          <span className="user-avatar">{initial}</span>
        </button>
      </header>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><IconBolt /> C‑Fill</div>
          <div className="brand-sub">Communication Fillment</div>
        </div>
        <nav className="nav">
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              <Icon /><span className="label">{LABELS[label] || label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar">{initial}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          {isForeman ? <div className="badge" style={{ marginBottom: 4 }}>Foreman</div> : null}
          <button className="btn btn-ghost btn-block" onClick={logout}><IconLogout /> Keluar</button>
        </div>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {navItems.map(({ to, end, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
            <Icon /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
