import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCategoriesForSite, checkEntryExitFilledThisMonth } from '../lib/cfillService';
import EntryExitForm from '../components/EntryExitForm';
import { HeroHeader, PhotoCard } from '../components/PhotoCard';
import { getSiteBackground, getEquipmentBackground } from '../config/backgrounds';

/**
 * Entry/Exit Registration WAJIB diisi SEKALI per site per BULAN - bukan tiap
 * kunjungan. Kalau di bulan berjalan sudah ada catatan Entry/Exit untuk site
 * ini, kunjungan berikutnya (tanggal berapa pun di bulan yang sama) langsung
 * masuk ke daftar kategori tanpa ditanya lagi - biasanya teknisi cuma
 * merevisi/melengkapi isian checksheet, bukan kunjungan baru.
 *
 * Yang dicek adalah isi Google Sheets-nya (checkEntryExitFilledThisMonth),
 * BUKAN status di memori browser - supaya konsisten walau teknisi ganti HP,
 * buka dari laptop, atau menutup tab.
 */
export default function SiteCategoryList() {
  const { buildingCategory, siteName } = useParams();
  const decodedBc = decodeURIComponent(buildingCategory);
  const decodedSite = decodeURIComponent(siteName);
  const categories = getCategoriesForSite(decodedSite);
  const heroPhoto = getSiteBackground(decodedSite, decodedBc);

  // null = sedang mengecek ke Sheets, true/false = hasil cek.
  const [entryFilled, setEntryFilled] = useState(null);
  // true kalau pemeriksaan ke Sheets GAGAL (bukan "memang belum diisi").
  // Dipakai supaya pesan ke teknisi jujur - lihat EntryExitForm.
  const [cekGagal, setCekGagal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEntryFilled(null);
    setCekGagal(false);
    checkEntryExitFilledThisMonth(decodedBc, decodedSite)
      .then((res) => {
        if (cancelled) return;
        setEntryFilled(!!res.filled);
        setCekGagal(!!res.cekGagal);
      })
      .catch(() => {
        // Melempar error di sini artinya pemeriksaan gagal, bukan "belum
        // diisi". Tetap tampilkan form (jangan kunci akses teknisi), tapi
        // tandai supaya pesannya tidak menuduh.
        if (!cancelled) { setEntryFilled(false); setCekGagal(true); }
      });
    return () => { cancelled = true; };
  }, [decodedBc, decodedSite]);

  const breadcrumb = (
    <div className="breadcrumb">
      <Link to="/peralatan">Checksheet Peralatan</Link> /{' '}
      <Link to={`/peralatan/${buildingCategory}`}>{decodedBc}</Link> / {decodedSite}
    </div>
  );

  if (entryFilled === null) {
    return (
      <section>
        {breadcrumb}
        <HeroHeader photoUrl={heroPhoto} eyebrow="Checksheet Peralatan" title={decodedSite} />
        <div className="muted">Memeriksa catatan Entry/Exit bulan ini…</div>
      </section>
    );
  }

  if (!entryFilled) {
    return (
      <section>
        {breadcrumb}
        <HeroHeader photoUrl={heroPhoto} eyebrow="Checksheet Peralatan" title={decodedSite} />
        <EntryExitForm
          site={{ buildingCategory: decodedBc, siteName: decodedSite }}
          mandatory
          cekGagal={cekGagal}
          onSuccess={() => { setEntryFilled(true); setCekGagal(false); }}
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
