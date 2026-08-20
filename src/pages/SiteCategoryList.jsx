import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCategoriesForSite } from '../lib/cfillService';

export default function SiteCategoryList() {
  const { buildingCategory, siteName } = useParams();
  const decodedBc = decodeURIComponent(buildingCategory);
  const decodedSite = decodeURIComponent(siteName);
  const categories = getCategoriesForSite(decodedSite);

  return (
    <section>
      <div className="breadcrumb">
        <Link to="/peralatan">Checksheet Peralatan</Link> /{' '}
        <Link to={`/peralatan/${buildingCategory}`}>{decodedBc}</Link> / {decodedSite}
      </div>
      <div className="grid grid-3 card-grid">
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/peralatan/${buildingCategory}/${siteName}/${c.id}`}
            className="card clickable-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card-title-sm">{c.short_name}</div>
            <div className="muted">{c.items.length} item pemeriksaan</div>
            <div className="badges">
              {(c.periods || []).map((p) => <span key={p} className="badge">{p}</span>)}
            </div>
          </Link>
        ))}
        {categories.length === 0 && <div className="muted">Tidak ada kategori terdaftar untuk site ini.</div>}
      </div>
    </section>
  );
}
