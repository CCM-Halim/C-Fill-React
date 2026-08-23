import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCategoriesForSite, checkEntryExitFilledThisMonth } from '../lib/cfillService';
import EntryExitForm from '../components/EntryExitForm';

export default function SiteCategoryList() {
  const { buildingCategory, siteName } = useParams();
  const decodedBc = decodeURIComponent(buildingCategory);
  const decodedSite = decodeURIComponent(siteName);
  const categories = getCategoriesForSite(decodedSite);

  const [entryExitStatus, setEntryExitStatus] = useState(null); // null = loading, {filled, sheetUrl}, atau {error}

  useEffect(() => {
    setEntryExitStatus(null);
    checkEntryExitFilledThisMonth(decodedBc, decodedSite)
      .then(setEntryExitStatus)
      .catch((e) => setEntryExitStatus({ error: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedBc, decodedSite]);

  const breadcrumb = (
    <div className="breadcrumb">
      <Link to="/peralatan">Checksheet Peralatan</Link> /{' '}
      <Link to={`/peralatan/${buildingCategory}`}>{decodedBc}</Link> / {decodedSite}
    </div>
  );

  if (entryExitStatus === null) {
    return (
      <section>
        {breadcrumb}
        <div className="muted">Memeriksa status Entry/Exit Registration bulan ini...</div>
      </section>
    );
  }

  if (entryExitStatus.error) {
    // Gagal cek status - jangan blokir user, langsung tampilkan checksheet
    // seperti biasa (fail-open), tapi kasih tau ada masalah di background.
    console.warn('Gagal cek status Entry/Exit:', entryExitStatus.error);
  }

  if (!entryExitStatus.error && !entryExitStatus.filled) {
    return (
      <section>
        {breadcrumb}
        <EntryExitForm
          site={{ buildingCategory: decodedBc, siteName: decodedSite }}
          mandatory
          onSuccess={() => setEntryExitStatus({ filled: true, sheetUrl: entryExitStatus.sheetUrl })}
        />
      </section>
    );
  }

  return (
    <section>
      {breadcrumb}
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
