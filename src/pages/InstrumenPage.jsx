import React, { useState } from 'react';
import { INSTRUMENTS, INSTRUMENT_ITEMS, INSTRUMENT_SLOT_MAP } from '../config/instruments';
import { submitInstrumentChecksheet, previewSlot } from '../lib/cfillService';
import { useToast } from '../components/Toast';

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function InstrumenPage() {
  const showToast = useToast();
  const [namaInstrumen, setNamaInstrumen] = useState('');
  const [tanggal, setTanggal] = useState(todayStr());
  const [petugas, setPetugas] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const slotRow = previewSlot(INSTRUMENT_SLOT_MAP, tanggal);
  const bulanIndex = new Date(tanggal).getMonth();

  function setAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit() {
    if (!namaInstrumen || !petugas.trim()) {
      showToast('Nama instrumen dan petugas wajib diisi.', true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitInstrumentChecksheet({ namaInstrumen, tanggal, petugas: petugas.trim(), answers });
      showToast(`Checksheet instrumen "${res.fileName}" tersimpan ke slot bulan ${BULAN[bulanIndex]} ✅`);
      setAnswers({});
    } catch (e) {
      showToast('Gagal menyimpan: ' + e.message, true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="card form-card">
        <div className="card-title">Checksheet Instrumen Telekomunikasi</div>

        <div className="field-grid">
          <div className="field">
            <label>Nama Instrumen</label>
            <input
              className="input"
              list="instrumentList"
              placeholder="Ketik untuk cari instrumen..."
              value={namaInstrumen}
              onChange={(e) => setNamaInstrumen(e.target.value)}
            />
            <datalist id="instrumentList">
              {INSTRUMENTS.map((i) => <option key={i} value={i} />)}
            </datalist>
          </div>
          <div className="field">
            <label>Tanggal Pemeriksaan</label>
            <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="field">
            <label>Petugas Pemeriksa</label>
            <input className="input" value={petugas} onChange={(e) => setPetugas(e.target.value)} />
          </div>
        </div>

        <div className="muted" style={{ marginBottom: 16 }}>
          📍 Data akan ditulis ke slot bulan <strong>{BULAN[bulanIndex]}</strong> (baris {slotRow}) di file asli instrumen ini.
        </div>

        {INSTRUMENT_ITEMS.map((it) => (
          <div key={it.id} className="item-block">
            <div className="item-label">{it.label}</div>
            {it.standar ? <div className="item-standar"><b>Standar:</b> {it.standar}</div> : null}
            <textarea
              className="textarea"
              rows={2}
              value={answers[it.id] || ''}
              onChange={(e) => setAnswer(it.id, e.target.value)}
              placeholder="Hasil pemeriksaan / catatan..."
            />
          </div>
        ))}

        <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner" /> : null}
          {submitting ? 'Menyimpan...' : 'Simpan Checksheet Instrumen'}
        </button>
      </div>
    </section>
  );
}
