import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCategoriesForSite } from '../lib/cfillService';
import EntryExitForm from '../components/EntryExitForm';
import { HeroHeader, PhotoCard } from '../components/PhotoCard';
import { getSiteBackground, getEquipmentBackground } from '../config/backgrounds';

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Entry/Exit Registration WAJIB diisi tiap kunjungan (per site per hari) -
 * bukan cuma sekali per bulan, karena ini LOG KUNJUNGAN bukan checklist
 * bulanan.
 *
 * PENTING: status "sudah diisi hari ini" disimpan di sessionStorage (bukan
 * cuma React state biasa) supaya BERTAHAN walau teknisi pindah ke halaman
 * checksheet lain terus balik lagi ke sini (component ini remount tiap
 * navigasi - kalau statusnya cuma React state lokal, dia reset ke false lagi
 * dan minta isi Entry/Exit ULANG padahal baru aja diisi di kunjungan yang
 * sama). sessionStorage bertahan selama tab browser masih terbuka, otomatis
 * "reset" sendiri kalau tab ditutup/besok dibuka lagi (kunjungan baru).
 */
function entryExitSessionKey(siteName) {
  return `cfill_entryexit_${siteName}_${todayStr()}`;
}

export default function SiteCategoryList() {
  const { buildingCategory, siteName } = useParams();
  const decodedBc = decodeURIComponent(buildingCategory);
  const decodedSite = decodeURIComponent(siteName);
  const categories = getCategoriesForSite(decodedSite);
  const heroPhoto = getSiteBackground(decodedSite, decodedBc);

  const [entrySubmitted, setEntrySubmitted] = useState(
    () => sessionStorage.getItem(entryExitSessionKey(decodedSite)) === 'true'
  );

  function handleEntryExitSuccess() {
    sessionStorage.setItem(entryExitSessionKey(decodedSite), 'true');
    setEntrySubmitted(true);
  }

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
          onSuccess={handleEntryExitSuccess}
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
