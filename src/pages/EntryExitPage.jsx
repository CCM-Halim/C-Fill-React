import React, { useState } from 'react';
import { SITES } from '../config/sites';
import { submitEntryExit } from '../lib/cfillService';
import { useToast } from '../components/Toast';
import SignaturePad from '../components/SignaturePad';

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTimeStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EntryExitPage() {
  const showToast = useToast();
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);

  const [tanggal, setTanggal] = useState(todayStr());
  const [waktuMasuk, setWaktuMasuk] = useState(nowTimeStr());
  const [nama, setNama] = useState('');
  const [namaUnit, setNamaUnit] = useState('Telco Halim On-Site');
  const [nomorKontak, setNomorKontak] = useState('');
  const [kegiatan, setKegiatan] = useState('');
  const [waktuKeluar, setWaktuKeluar] = useState('');
  const [signatureBlob, setSignatureBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const q = search.trim().toLowerCase();
  const matchingSites = q ? SITES.filter((s) => s.siteName.toLowerCase().includes(q)) : [];

  async function handleSubmit() {
    if (!selectedSite) {
      showToast('Pilih site dulu.', true);
      return;
    }
    if (!nama.trim() || !waktuMasuk) {
      showToast('Nama dan waktu masuk wajib diisi.', true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitEntryExit({
        buildingCategory: selectedSite.buildingCategory,
        siteName: selectedSite.siteName,
        tanggal, waktuMasuk, nama: nama.trim(), namaUnit: namaUnit.trim(),
        nomorKontak: nomorKontak.trim(), kegiatan: kegiatan.trim(), waktuKeluar,
        signatureBlob
      });
      showToast(`Entry/Exit tersimpan di baris ${res.row} ✅`, false, res.sheetUrl, 'Buka di Google Sheets →');
      // reset sebagian field, biarkan site & tanggal tetap (biar gampang isi berturut2)
      setNama(''); setNomorKontak(''); setKegiatan(''); setWaktuKeluar(''); setSignatureBlob(null);
      setWaktuMasuk(nowTimeStr());
    } catch (e) {
      showToast('Gagal menyimpan: ' + e.message, true);
    } finally {
      setSubmitting(false);
    }
  }

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

      <div className="card form-card">
        <div className="card-title">Formulir Keluar-Masuk — {selectedSite.siteName}</div>

        <div className="field-grid">
          <div className="field">
            <label>Tanggal</label>
            <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="field">
            <label>Waktu Masuk</label>
            <input type="time" className="input" value={waktuMasuk} onChange={(e) => setWaktuMasuk(e.target.value)} />
          </div>
          <div className="field">
            <label>Nama (petugas, pisahkan koma kalau lebih dari 1)</label>
            <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Ari, Iqbal, Gilang" />
          </div>
          <div className="field">
            <label>Nama Unit</label>
            <input className="input" value={namaUnit} onChange={(e) => setNamaUnit(e.target.value)} />
          </div>
          <div className="field">
            <label>Nomor Kontak</label>
            <input className="input" value={nomorKontak} onChange={(e) => setNomorKontak(e.target.value)} placeholder="mis. 0812xxxxxxx" />
          </div>
          <div className="field">
            <label>Kegiatan</label>
            <input className="input" value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} placeholder="mis. Riksawat 1M dan 3M" />
          </div>
          <div className="field">
            <label>Waktu Keluar (isi setelah selesai kerja)</label>
            <input type="time" className="input" value={waktuKeluar} onChange={(e) => setWaktuKeluar(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Tanda Tangan (TTD)</label>
          <SignaturePad onChange={setSignatureBlob} />
        </div>

        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner" /> : null}
          {submitting ? 'Menyimpan...' : 'Simpan Entry/Exit'}
        </button>
      </div>
    </section>
  );
}
