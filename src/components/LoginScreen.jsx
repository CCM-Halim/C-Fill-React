import React from 'react';
import { useAuth } from './AuthContext';
import { LOGIN_HEADER_IMAGE_URL } from '../config/loginHeader';

function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.3 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16.2 3 9.4 7.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.4 26.7 37.3 24 37.3c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.3 40.6 16.1 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C41.5 35.7 45 30.5 45 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

export default function LoginScreen() {
  const { login, loading, error } = useAuth();

  return (
    <div className="login-screen-v2">
      <div className="login-hero">
        <img src={LOGIN_HEADER_IMAGE_URL} alt="" className="login-hero-img" />
        <div className="login-hero-fade" />
        <div className="login-hero-text">
          <div className="login-hero-brand">CCM Halim</div>
          <div className="login-hero-tagline">Communication &amp; Checksheet Maintenance</div>
          <div className="login-hero-sub">Telecommunication Maintenance Team — CCM Halim Karawang</div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-panel-inner">
          <div className="login-brand-row">
            <svg className="login-bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
            </svg>
            <div className="login-brand-text">C-Fill</div>
          </div>

          <div className="login-welcome">Selamat Datang Kembali</div>
          <p className="login-desc">Masuk untuk membuka Checksheet Peralatan &amp; Instrumen Telekomunikasi.</p>

          <button className="google-signin-btn" onClick={login} disabled={loading}>
            {loading ? <span className="spinner" /> : <GoogleIcon />}
            <span>{loading ? 'Menghubungkan...' : 'Masuk dengan Gmail'}</span>
          </button>

          <button className="account-signin-btn" disabled title="Segera hadir">
            👤 <span>Masuk dengan Akun</span>
            <span className="coming-soon-badge">Segera Hadir</span>
          </button>

          {error ? <div className="login-error">{error}</div> : null}

          <div className="login-panel-footer">C-Fill v1.0 &copy; CCM Halim</div>
        </div>
      </div>
    </div>
  );
}
