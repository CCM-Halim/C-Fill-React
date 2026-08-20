import React from 'react';
import { useAuth } from './AuthContext';

export default function LoginScreen() {
  const { login, loading, error } = useAuth();

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand-mark" style={{ fontSize: 40, marginBottom: 4 }}>C‑Fill</div>
        <div className="muted" style={{ marginBottom: 24 }}>Communication Fillment</div>
        <p className="muted" style={{ marginBottom: 24 }}>
          Login pakai akun Google kamu untuk mengisi checksheet & upload dokumentasi
          pekerjaan — datanya langsung tersimpan ke Google Sheets &amp; Drive.
        </p>
        <button className="btn btn-primary btn-block" onClick={login} disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Menghubungkan...' : 'Login dengan Google'}
        </button>
        {error ? <div className="muted" style={{ color: 'var(--danger)', marginTop: 14 }}>{error}</div> : null}
      </div>
    </div>
  );
}
