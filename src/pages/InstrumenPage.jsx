import React, { useState } from 'react';
import { INSTRUMENTS, INSTRUMENT_ITEMS, INSTRUMENT_SLOT_MAP, INSTRUMENT_ALIASES } from '../config/instruments';
import { submitInstrumentChecksheet, previewSlot } from '../lib/cfillService';
import { useToast } from '../components/Toast';
import LocationNoteInput, { serializeLocationNote } from '../components/LocationNoteInput';

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
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
    // Item instrumen (selain "Lokasi Uji Fungsi") formatnya teks polos langsung,
    // TIDAK pakai prefix "Tgl: ..." otomatis (beda dari checksheet Peralatan) -
    // dikirim sebagai __rawText supaya writeMonthlySlot tidak membungkusnya.
    setAnswers((prev) => ({ ...prev, [id]: value ? { __rawText: value } : null, [id + '__raw']: value }));
  }

  function setLocationNoteAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: serializeLocationNote(value), [id + '__raw']: value }));
  }

  async function handleSubmit() {
    if (!namaInstrumen || !petugas.trim()) {
      showToast('Nama instrumen dan petugas wajib diisi.', true);
      return;
    }
    setSubmitting(true);
    try {
      const cleanAnswers = {};
      Object.entries(answers).forEach(([k, v]) => { if (!k.endsWith('__raw')) cleanAnswers[k] = v; });

      const res = await submitInstrumentChecksheet({ namaInstrumen, tanggal, petugas: petugas.trim(), answers: cleanAnswers });
      showToast(
        `Checksheet instrumen "${res.fileName}" tersimpan ke baris bulan ${BULAN[bulanIndex]} ✅`,
        false,
        res.sheetUrl,
        'Buka & cek di Google Sheets →'
      );
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
              {/* Yang DITAMPILKAN nama asli dari dokumen (mis. "Power Meter /
                  Dynamometer"), tetapi yang DIKIRIM nama file Drive-nya (pakai
                  "_") - Drive tidak mengizinkan "/" di nama file. Pemetaannya
                  ada di config/instruments.js (INSTRUMENT_ALIASES). */}
              {INSTRUMENTS.map((kanonik) => {
                const alias = Object.keys(INSTRUMENT_ALIASES).find((a) => INSTRUMENT_ALIASES[a] === kanonik);
                return <option key={kanonik} value={alias || kanonik} />;
              })}
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
            {it.inputType === 'location_note' ? (
              <LocationNoteInput
                defaultLocation={it.defaultLocation}
                value={answers[it.id + '__raw']}
                onChange={(val) => setLocationNoteAnswer(it.id, val)}
              />
            ) : (
              <textarea
                className="textarea"
                rows={2}
                value={answers[it.id + '__raw'] || ''}
                onChange={(e) => setAnswer(it.id, e.target.value)}
                placeholder="Isi hasil pemeriksaan..."
              />
            )}
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
