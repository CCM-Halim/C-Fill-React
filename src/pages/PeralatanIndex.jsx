import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BUILDING_CATEGORIES, SITES } from '../config/sites';
import { getSiteBackground, getBuildingBackground } from '../config/backgrounds';
import { PhotoCard } from '../components/PhotoCard';

export default function PeralatanIndex() {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  // Saat ada pencarian, tampilkan SITE yang cocok langsung (bukan cuma kategori bangunan) —
  // supaya bisa langsung cari "K41+475" atau "Karawang" tanpa harus buka kategori dulu.
  const matchingSites = useMemo(() => {
    if (!q) return [];
    return SITES.filter((s) => s.siteName.toLowerCase().includes(q) || s.buildingCategory.toLowerCase().includes(q));
  }, [q]);

  const filteredCategories = useMemo(() => {
    if (!q) return BUILDING_CATEGORIES;
    return BUILDING_CATEGORIES.filter((bc) => bc.toLowerCase().includes(q));
  }, [q]);

  const showSiteResults = q.length > 0;

  return (
    <section>
      <div className="toolbar">
        <input
          className="input search-input"
          placeholder="Cari nama site (mis. K41+475, Karawang, BTS 2)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showSiteResults ? (
        <>
          <div className="muted" style={{ marginBottom: 10 }}>
            {matchingSites.length} site ditemukan
          </div>
          <div className="grid grid-3 card-grid">
            {matchingSites.map((s) => (
              <Link
                key={s.buildingCategory + s.siteName}
                to={`/peralatan/${encodeURIComponent(s.buildingCategory)}/${encodeURIComponent(s.siteName)}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <PhotoCard photoUrl={getSiteBackground(s.siteName, s.buildingCategory)}>
                  <div className="card-title-sm">{s.siteName}</div>
                  <div className="muted">{s.buildingCategory.replace(/^\d+\.\s*/, '')}</div>
                  <div className="badges"><span className="badge">{s.categoryIds.length} kategori</span></div>
                </PhotoCard>
              </Link>
            ))}
            {matchingSites.length === 0 && (
              <div className="muted">Tidak ada site yang cocok. Coba kata kunci lain.</div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="muted" style={{ marginBottom: 10 }}>Atau pilih kategori bangunan:</div>
          <div className="grid grid-3 card-grid">
            {filteredCategories.map((bc) => {
              const count = SITES.filter((s) => s.buildingCategory === bc).length;
              return (
                <Link key={bc} to={`/peralatan/${encodeURIComponent(bc)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <PhotoCard photoUrl={getBuildingBackground(bc)}>
                    <div className="card-title-sm">{bc}</div>
                    <div className="muted">{count} site</div>
                  </PhotoCard>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
