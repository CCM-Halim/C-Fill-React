import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCategoriesForSite } from '../lib/cfillService';
import EntryExitForm from '../components/EntryExitForm';
import { HeroHeader, PhotoCard } from '../components/PhotoCard';
import { getSiteBackground, getEquipmentBackground } from '../config/backgrounds';

/**
 * Entry/Exit Registration WAJIB diisi tiap kali site ini dibuka - bukan cuma
 * sekali per bulan. Ini sengaja begini karena Entry/Exit itu LOG KUNJUNGAN,
 * bukan checklist bulanan - tiap kunjungan (kapanpun tanggalnya, walau di
 * bulan yang sama dengan kunjungan sebelumnya) dicatat sendiri-sendiri.
 * State `entrySubmitted` cuma hidup selama sesi ini (reset kalau halaman
 * di-refresh/dibuka ulang) - begitu diisi 1x, baru lanjut ke daftar kategori.
 */
export default function SiteCategoryList() {
  const { buildingCategory, siteName } = useParams();
  const decodedBc = decodeURIComponent(buildingCategory);
  const decodedSite = decodeURIComponent(siteName);
  const categories = getCategoriesForSite(decodedSite);
  const heroPhoto = getSiteBackground(decodedSite, decodedBc);

  const [entrySubmitted, setEntrySubmitted] = useState(false);

  const breadcrumb = (
    <div className="breadcrumb">
      <Link to="/peralatan">Checksheet Peralatan</Link> /{' '}
      <Link to={`/peralatan/${buildingCategory}`}>{decodedBc}</Link> / {decodedSite}
    </div>
  );

  if (!entrySubmitted) {
    return (
      <section>
        {breadcrumb}
        <HeroHeader photoUrl={heroPhoto} eyebrow="Checksheet Peralatan" title={decodedSite} />
        <EntryExitForm
          site={{ buildingCategory: decodedBc, siteName: decodedSite }}
          mandatory
          onSuccess={() => setEntrySubmitted(true)}
        />
      </section>
    );
  }

  return (
    <section>
      {breadcrumb}
      <HeroHeader photoUrl={heroPhoto} eyebrow="Checksheet Peralatan" title={decodedSite} />
      <div className="grid grid-3 card-grid">
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/peralatan/${buildingCategory}/${siteName}/${c.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <PhotoCard photoUrl={getEquipmentBackground(c.id) || getEquipmentBackground(c.short_name)}>
              <div className="card-title-sm">{c.short_name}</div>
              <div className="muted">{c.items.length} item pemeriksaan</div>
              <div className="badges">
                {(c.periods || []).map((p) => <span key={p} className="badge">{p}</span>)}
              </div>
            </PhotoCard>
          </Link>
        ))}
        {categories.length === 0 && <div className="muted">Tidak ada kategori terdaftar untuk site ini.</div>}
      </div>
    </section>
  );
}
