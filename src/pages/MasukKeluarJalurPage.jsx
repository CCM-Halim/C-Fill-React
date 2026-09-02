import React, { useState } from 'react';
import { SITES } from '../config/sites';
import { submitMasukJalur, submitKeluarJalur } from '../lib/cfillService';
import { useToast } from '../components/Toast';
import VoiceRecorder from '../components/VoiceRecorder';

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

function formatDateID(dateStr) {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function MasukKeluarJalurPage() {
  const showToast = useToast();
  const [arah, setArah] = useState('masuk'); // 'masuk' | 'keluar'
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);

  const [tanggal, setTanggal] = useState(todayStr());
  const [waktu, setWaktu] = useState(nowTimeStr());
  const [nama, setNama] = useState('');
  const [catatan, setCatatan] = useState('');
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [suaraFile, setSuaraFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const q = search.trim().toLowerCase();
  const matchingSites = q ? SITES.filter((s) => s.siteName.toLowerCase().includes(q)) : [];

  function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  function resetForm() {
    setNama(''); setCatatan(''); setFotoFile(null); setFotoPreview(null); setSuaraFile(null);
    setWaktu(nowTimeStr());
  }

  async function handleSubmit() {
    if (!selectedSite) { showToast('Pilih site dulu.', true); return; }
    if (!nama.trim()) { showToast('Nama petugas wajib diisi.', true); return; }
    if (!fotoFile) { showToast('Foto wajib diupload.', true); return; }

    setSubmitting(true);
    try {
      const submitFn = arah === 'masuk' ? submitMasukJalur : submitKeluarJalur;
      const res = await submitFn({
        siteName: selectedSite.siteName,
        tanggal: formatDateID(tanggal),
        waktu,
        nama: nama.trim(),
        catatan: catatan.trim(),
        fotoFile,
        suaraFile
      });
      showToast(
        `${arah === 'masuk' ? 'Masuk' : 'Keluar'} Jalur tersimpan ✅${suaraFile ? '' : ' (tanpa rekaman suara)'}`,
        false,
        res.fotoUrl,
        'Buka foto di Drive →'
      );
      resetForm();
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
          <div className="card-title">Masuk / Keluar Jalur</div>
          <p className="muted" style={{ marginBottom: 14 }}>
            Foto & rekaman suara konfirmasi personil dan peralatan pas masuk/keluar restricted area,
            supaya tetap dalam pengawasan dan nggak ada yang ketinggalan.
          </p>
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
        <span className="link-like" onClick={() => setSelectedSite(null)}>Masuk/Keluar Jalur</span> / {selectedSite.siteName}
      </div>

      <div className="card form-card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button className={arah === 'masuk' ? 'btn btn-primary' : 'btn btn-ghost'} style={{ flex: 1 }} onClick={() => setArah('masuk')}>
            ➡️ Masuk Jalur
          </button>
          <button className={arah === 'keluar' ? 'btn btn-primary' : 'btn btn-ghost'} style={{ flex: 1 }} onClick={() => setArah('keluar')}>
            ⬅️ Keluar Jalur
          </button>
        </div>

        <div className="card-title">{arah === 'masuk' ? 'Konfirmasi Masuk Jalur' : 'Konfirmasi Keluar Jalur'} — {selectedSite.siteName}</div>

        <div className="field-grid">
          <div className="field">
            <label>Tanggal</label>
            <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="field">
            <label>Waktu</label>
            <input type="time" className="input" value={waktu} onChange={(e) => setWaktu(e.target.value)} />
          </div>
          <div className="field">
            <label>Nama Petugas (pisahkan koma kalau lebih dari 1)</label>
            <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Ari, Iqbal, Gilang" />
          </div>
          <div className="field">
            <label>Catatan (jumlah personil, peralatan yang dibawa, dll)</label>
            <textarea className="textarea" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. 3 personil, bawa tang ampere & tespen" />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
            Foto {arah === 'masuk' ? 'Masuk' : 'Keluar'} Jalur <span style={{ color: 'var(--danger, #B4302F)' }}>*wajib</span>
          </label>
          <input type="file" accept="image/*" capture="environment" className="input" onChange={handleFotoChange} />
          {fotoPreview && (
            <img src={fotoPreview} alt="Preview foto" style={{ marginTop: 10, maxWidth: 260, maxHeight: 200, borderRadius: 10, border: '1px solid var(--border)' }} />
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
            Rekaman Suara (opsional, double-check tambahan)
          </label>
          <VoiceRecorder onChange={setSuaraFile} />
        </div>

        <button className="btn btn-primary" style={{ marginTop: 22 }} onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner" /> : null}
          {submitting ? 'Menyimpan...' : `Simpan ${arah === 'masuk' ? 'Masuk' : 'Keluar'} Jalur`}
        </button>
      </div>
    </section>
  );
}
