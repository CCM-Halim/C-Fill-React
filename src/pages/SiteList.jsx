import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SITES } from '../config/sites';

export default function SiteList() {
  const { buildingCategory } = useParams();
  const decoded = decodeURIComponent(buildingCategory);
  const [search, setSearch] = useState('');

  const sites = useMemo(() => {
    const q = search.toLowerCase();
    return SITES.filter((s) => s.buildingCategory === decoded && s.siteName.toLowerCase().includes(q));
  }, [decoded, search]);

  return (
    <section>
      <div className="breadcrumb">
        <Link to="/peralatan">Checksheet Peralatan</Link> / {decoded}
      </div>
      <div className="toolbar">
        <input
          className="input search-input"
          placeholder="Cari nama site..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid grid-3 card-grid">
        {sites.map((s) => (
          <Link
            key={s.siteName}
            to={`/peralatan/${encodeURIComponent(buildingCategory)}/${encodeURIComponent(s.siteName)}`}
            className="card clickable-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card-title-sm">{s.siteName}</div>
            <div className="muted">{s.categoryIds.length} kategori peralatan</div>
          </Link>
        ))}
        {sites.length === 0 && <div className="muted">Tidak ada site yang cocok.</div>}
      </div>
    </section>
  );
}
