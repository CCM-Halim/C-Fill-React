import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../config/categories';
import { SITES } from '../config/sites';
import { submitChecksheet, previewSlot } from '../lib/cfillService';
import { useToast } from '../components/Toast';
import BatteryTable from '../components/BatteryTable';

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ChecksheetForm() {
  const { buildingCategory, siteName, categoryId } = useParams();
  const decodedBc = decodeURIComponent(buildingCategory);
  const decodedSite = decodeURIComponent(siteName);
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const navigate = useNavigate();
  const showToast = useToast();

  const [tanggal, setTanggal] = useState(todayStr());
  const [petugas, setPetugas] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!category) {
    return <div className="muted">Kategori tidak ditemukan.</div>;
  }

  const isMatrix = category.slotMap?.type === 'matrix';
  const site = SITES.find((s) => s.buildingCategory === decodedBc && s.siteName === decodedSite);
  const slotRow = !isMatrix ? previewSlot(category, tanggal, site?.originalFileName) : null;
  const bulanIndex = new Date(tanggal).getMonth();

  function setAnswer(itemId, value) {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  }

  // Untuk item tabel baterai: simpan sebagai array "V:.. R:.." per baterai
  // (bukan 1 string gabungan) - supaya tiap nilai masuk ke kolomnya sendiri di sheet.
  function setBatteryAnswer(itemId, rows) {
    const values = rows.map((c) => (c.v || c.r) ? `V:${c.v || '-'} R:${c.r || '-'}` : '');
    setAnswers((prev) => ({ ...prev, [itemId]: values, [itemId + '__raw']: rows }));
  }

  async function handleSubmit() {
    if (!petugas.trim()) {
      showToast('Petugas pemeriksa wajib diisi.', true);
      return;
    }
    setSubmitting(true);
    try {
      // buang key bantu "__raw" sebelum dikirim
      const cleanAnswers = {};
      Object.entries(answers).forEach(([k, v]) => { if (!k.endsWith('__raw')) cleanAnswers[k] = v; });

      const res = await submitChecksheet({
        buildingCategory: decodedBc,
        siteName: decodedSite,
        categoryId: category.id,
        tanggal,
        petugas: petugas.trim(),
        answers: cleanAnswers
      });
      showToast(
        `Checksheet "${category.short_name}" tersimpan ke baris bulan ${BULAN[bulanIndex]} di "${res.fileName}" ✅`,
        false,
        res.sheetUrl,
        'Buka & cek di Google Sheets →'
      );
      navigate(`/peralatan/${buildingCategory}/${siteName}`);
    } catch (e) {
      showToast('Gagal menyimpan: ' + e.message, true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="breadcrumb">
        <Link to="/peralatan">Checksheet Peralatan</Link> /{' '}
        <Link to={`/peralatan/${buildingCategory}`}>{decodedBc}</Link> /{' '}
        <Link to={`/peralatan/${buildingCategory}/${siteName}`}>{decodedSite}</Link> / {category.short_name}
      </div>

      <div className="card form-card">
        <div className="card-title">{category.short_name}</div>
        <div className="muted" style={{ marginBottom: 16 }}>{category.title}</div>

        <div className="field-grid">
          <div className="field">
            <label>Tanggal Pemeriksaan</label>
            <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="field">
            <label>Petugas Pemeriksa</label>
            <input className="input" placeholder="Nama petugas" value={petugas} onChange={(e) => setPetugas(e.target.value)} />
          </div>
        </div>

        {!isMatrix && (
          <div className="muted" style={{ marginBottom: 16 }}>
            📍 Data akan ditulis ke slot bulan <strong>{BULAN[bulanIndex]}</strong> (baris {slotRow}) di file asli.
            Kalau slot ini sudah pernah diisi sebelumnya, isinya akan ditimpa dengan data baru.
          </div>
        )}

        {category.items.map((it) => (
          <div key={it.id} className="item-block">
            <div className="item-label">{it.label}</div>
            {it.standar ? <div className="item-standar"><b>Standar:</b> {it.standar}</div> : null}
            {it.inputType === 'battery_table' ? (
              <BatteryTable
                defaultCount={it.defaultBatteryCount || 24}
                value={answers[it.id + '__raw']}
                onChange={(rows) => setBatteryAnswer(it.id, rows)}
              />
            ) : (
              <textarea
                className="textarea"
                rows={2}
                placeholder="Hasil pemeriksaan / catatan..."
                value={answers[it.id] || ''}
                onChange={(e) => setAnswer(it.id, e.target.value)}
              />
            )}
          </div>
        ))}

        {category.note ? (
          <div className="muted" style={{ marginBottom: 14 }}>ℹ️ {category.note}</div>
        ) : null}

        <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner" /> : null}
          {submitting ? 'Menyimpan...' : 'Simpan Checksheet'}
        </button>
      </div>
    </section>
  );
}
