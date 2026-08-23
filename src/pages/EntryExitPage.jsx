import React, { useState } from 'react';
import { SITES } from '../config/sites';
import EntryExitForm from '../components/EntryExitForm';

export default function EntryExitPage() {
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);

  const q = search.trim().toLowerCase();
  const matchingSites = q ? SITES.filter((s) => s.siteName.toLowerCase().includes(q)) : [];

  if (!selectedSite) {
    return (
      <section>
        <div className="card form-card">
          <div className="card-title">Formulir Keluar-Masuk Machinery Room</div>
          <input
            className="input search-input"
            placeholder="Cari site (mis. K10+200)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          {q && (
            <div className="grid grid-3 card-grid">
              {matchingSites.map((s) => (
                <div
                  key={s.buildingCategory + s.siteName}
                  className="card clickable-card"
                  onClick={() => setSelectedSite(s)}
                >
                  <div className="card-title-sm">{s.siteName}</div>
                  <div className="muted">{s.buildingCategory.replace(/^\d+\.\s*/, '')}</div>
                </div>
              ))}
              {matchingSites.length === 0 && <div className="muted">Tidak ada site yang cocok.</div>}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="breadcrumb">
        <span className="link-like" onClick={() => setSelectedSite(null)}>Entry/Exit Registration</span> / {selectedSite.siteName}
      </div>
      <EntryExitForm site={selectedSite} mandatory={false} />
    </section>
  );
}
