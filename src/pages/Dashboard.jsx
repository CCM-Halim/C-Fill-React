import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../config/categories';
import { SITES } from '../config/sites';
import { INSTRUMENTS } from '../config/instruments';
import { useAuth } from '../components/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section>
      <div className="grid grid-3">
        <div className="card stat-card">
          <div className="stat-label">Total Site</div>
          <div className="stat-value">{SITES.length}</div>
          <div className="muted">di 10 kategori bangunan</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Kategori Peralatan</div>
          <div className="stat-value">{CATEGORIES.length}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Instrumen Terdaftar</div>
          <div className="stat-value">{INSTRUMENTS.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Login sebagai</div>
        <div className="muted">{user?.name} — {user?.email}</div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Mulai Cepat</div>
        <div className="quick-actions">
          <button className="btn btn-primary" onClick={() => navigate('/peralatan')}>Isi Checksheet Peralatan</button>
          <button className="btn btn-secondary" onClick={() => navigate('/instrumen')}>Isi Checksheet Instrumen</button>
          <button className="btn btn-secondary" onClick={() => navigate('/dokumentasi')}>Upload Dokumentasi</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Tentang Data</div>
        <p className="muted">
          Setiap site punya kombinasi kategori checksheet yang berbeda-beda, mengikuti
          peralatan yang benar-benar terpasang di lokasi tersebut. Data checksheet
          tersimpan otomatis ke Google Sheet per-site, dan dokumentasi ke folder
          Google Drive per-site.
        </p>
      </div>
    </section>
  );
}
