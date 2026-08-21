import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITES } from '../config/sites';
import { getRecentActivity } from '../lib/activityLog';

const ROOT_CHECKSHEET_FOLDER_ID = import.meta.env.VITE_ROOT_CHECKSHEET_FOLDER_ID;

export default function VerifikasiIndex() {
  const [activity, setActivity] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getRecentActivity(ROOT_CHECKSHEET_FOLDER_ID, 40)
      .then(setActivity)
      .catch((e) => setActivity({ error: e.message }));
  }, []);

  const q = search.trim().toLowerCase();
  const matchingSites = q
    ? SITES.filter((s) => s.siteName.toLowerCase().includes(q) || s.buildingCategory.toLowerCase().includes(q))
    : [];

  return (
    <section>
      <div className="toolbar">
        <input
          className="input search-input"
          placeholder="Cari site untuk verifikasi (mis. K41+475, Karawang)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {q ? (
        <div className="grid grid-3 card-grid" style={{ marginBottom: 24 }}>
          {matchingSites.map((s) => (
            <Link
              key={s.buildingCategory + s.siteName}
              to={`/verifikasi/${encodeURIComponent(s.buildingCategory)}/${encodeURIComponent(s.siteName)}`}
              className="card clickable-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card-title-sm">{s.siteName}</div>
              <div className="muted">{s.buildingCategory.replace(/^\d+\.\s*/, '')}</div>
            </Link>
          ))}
          {matchingSites.length === 0 && <div className="muted">Tidak ada site yang cocok.</div>}
        </div>
      ) : null}

      <div className="card">
        <div className="card-title">Aktivitas Terbaru dari Teknisi</div>
        {activity === null ? (
          <div className="muted">Memuat...</div>
        ) : activity.error ? (
          <div className="muted">Gagal memuat: {activity.error}</div>
        ) : activity.length === 0 ? (
          <div className="muted">Belum ada aktivitas tercatat.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activity.map((a, i) => (
              <Link
                key={i}
                to={`/verifikasi/${encodeURIComponent(a.buildingCategory)}/${encodeURIComponent(a.siteName)}`}
                className="doc-file-row"
                style={{ textDecoration: 'none', color: 'inherit', alignItems: 'center' }}
              >
                <span>
                  <strong>{a.siteName}</strong> — {a.categoryName}
                  <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                    {a.petugas} · diperiksa {a.tanggal}
                  </span>
                </span>
                <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {new Date(a.timestamp).toLocaleString('id-ID')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
