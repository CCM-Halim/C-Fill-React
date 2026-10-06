import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../config/categories';
import { SITES } from '../config/sites';
import { submitChecksheet, checkMonthAlreadyFilled, previewSlot } from '../lib/cfillService';
import { useToast } from '../components/Toast';
import { draftKey, loadDraft, saveDraft, clearDraft, pesanDraf, jumlahTerisi, restoreAnswers, petugasDariDraf } from '../lib/checksheetDraft';
import BatteryTable from '../components/BatteryTable';
import MeasurementInput, { serializeMeasurement } from '../components/MeasurementInput';
import StatusMeasurementInput, { serializeStatusMeasurement } from '../components/StatusMeasurementInput';
import SensorChecklistInput, { serializeSensorChecklist } from '../components/SensorChecklistInput';
import StatusOnlyInput from '../components/StatusOnlyInput';
import PemadamanInput, { serializePemadaman } from '../components/PemadamanInput';
import MeasurementMultiInput, { serializeMeasurementMulti } from '../components/MeasurementMultiInput';
import UnitValueTable, { serializeUnitValueTable } from '../components/UnitValueTable';
import YesNoInput, { serializeYesNo } from '../components/YesNoInput';
import { HeroHeader } from '../components/PhotoCard';
import { getSiteBackground, getEquipmentBackground } from '../config/backgrounds';
import { siapkanItem } from '../lib/itemPeriod';

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
  const [confirmDialog, setConfirmDialog] = useState(null); // { existingValues } kalau perlu tanya Perbaikan/Perawatan Baru
  const [drafInfo, setDrafInfo] = useState(null); // pesan "isian sebelumnya dipulihkan"
  const drafSudahDimuat = useRef(false);

  if (!category) {
    return <div className="muted">Kategori tidak ditemukan.</div>;
  }

  const isMatrix = category.slotMap?.type === 'matrix';
  const site = SITES.find((s) => s.buildingCategory === decodedBc && s.siteName === decodedSite);
  const slotRow = !isMatrix ? previewSlot(category, tanggal, site?.originalFileName) : null;
  const bulanIndex = new Date(tanggal).getMonth();

  // --- Pemulihan draf: sekali saja saat form dibuka -------------------------
  // Kunci draf memakai SITUS + KATEGORI + BULAN (bukan tanggal persis), jadi
  // isian hari ke-1 tetap ketemu saat dilanjutkan hari ke-2 di bulan yang sama.
  // Keduanya menulis ke slot baris yang sama (lihat computeSlotRow), sehingga
  // hasilnya masuk ke SATU file/baris - bukan terbelah dua.
  //
  // Urutan penting: efek ini ditulis SEBELUM efek penyimpan di bawah, karena
  // React menjalankan efek sesuai urutan penulisannya. Kalau dibalik, efek
  // penyimpan akan jalan lebih dulu saat form baru dibuka dengan `answers`
  // masih kosong — dan draf hari kemarin langsung terhapus sebelum sempat
  // dibaca.
  useEffect(() => {
    if (drafSudahDimuat.current || isMatrix) return;
    drafSudahDimuat.current = true;
    const kunci = draftKey({
      buildingCategory: decodedBc, siteName: decodedSite, categoryId: category.id, tanggal,
    });
    const draf = loadDraft(localStorage, kunci);
    if (!draf) return;
    // Dipulihkan lewat restoreAnswers() supaya tipe tiap item dihormati:
    // item teks polos -> { __rawText }, item berpengukur -> id + id__raw.
    setAnswers(restoreAnswers(draf, category.items));
    setDrafInfo(pesanDraf(draf));
    const p = petugasDariDraf(draf);
    if (p) setPetugas(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMatrix]);

  // --- Simpan draf otomatis ------------------------------------------------
  // Ditulis setiap kali isian berubah. Ini yang membuat pekerjaan separuh jalan
  // tidak hilang ketika teknisi menutup app (sinyal hilang, baterai habis,
  // jam kerja usai) dan bisa dilanjutkan besok.
  //
  // Penjaga `localStorage.getItem(kunci) === null` penting: kalau draf untuk
  // slot ini BELUM ADA, efek ini berjalan saat mount dan hanya akan menulis
  // objek kosong — tidak ada gunanya, dan berisiko menghapus draf yang baru
  // saja dipulihkan. Draf baru dibuat begitu teknisi benar-benar mengisi.
  useEffect(() => {
    if (!drafSudahDimuat.current || isMatrix) return;
    const kunci = draftKey({
      buildingCategory: decodedBc, siteName: decodedSite, categoryId: category.id, tanggal,
    });
    const sudahAdaDraf = localStorage.getItem(kunci) !== null;
    const adaIsian = jumlahTerisi(answers) > 0 || !!petugas.trim();
    if (!sudahAdaDraf && !adaIsian) return;
    saveDraft(localStorage, kunci, { ...answers, __petugas: petugas.trim() || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, petugas, tanggal, isMatrix]);

  function setAnswer(itemId, value, noTglPrefix) {
    // Item dengan noTglPrefix (periodenya = grid dasar kategori, misal item
    // 1-bulanan di grid bulanan) ditulis TEKS POLOS, tanpa prefix "Tgl: ..."
    // otomatis - soalnya kolom Tanggal utama sudah cukup mengidentifikasi baris itu.
    if (noTglPrefix) {
      setAnswers((prev) => ({ ...prev, [itemId]: value ? { __rawText: value } : null }));
    } else {
      setAnswers((prev) => ({ ...prev, [itemId]: value }));
    }
  }

  function setMeasurementAnswer(itemId, rawValue, unit) {
    setAnswers((prev) => ({ ...prev, [itemId]: serializeMeasurement(rawValue, unit), [itemId + '__raw']: rawValue }));
  }

  function setStatusMeasurementAnswer(itemId, rawValue, unit) {
    setAnswers((prev) => ({ ...prev, [itemId]: serializeStatusMeasurement(rawValue, unit), [itemId + '__raw']: rawValue }));
  }

  function setSensorChecklistAnswer(itemId, sensors, rawValue) {
    setAnswers((prev) => ({ ...prev, [itemId]: serializeSensorChecklist(sensors, rawValue), [itemId + '__raw']: rawValue }));
  }

  function setPemadamanAnswer(itemId, rawValue) {
    setAnswers((prev) => ({ ...prev, [itemId]: serializePemadaman(rawValue), [itemId + '__raw']: rawValue }));
  }

  function setStatusOnlyAnswer(itemId, value, noTglPrefix) {
    if (noTglPrefix) {
      setAnswers((prev) => ({ ...prev, [itemId]: value ? { __rawText: value } : null, [itemId + '__raw']: value }));
    } else {
      setAnswers((prev) => ({ ...prev, [itemId]: value, [itemId + '__raw']: value }));
    }
  }

  function setMeasurementMultiAnswer(itemId, fields, rawValue) {
    setAnswers((prev) => ({ ...prev, [itemId]: serializeMeasurementMulti(fields, rawValue), [itemId + '__raw']: rawValue }));
  }

  function setUnitValueTableAnswer(itemId, rows, unit) {
    setAnswers((prev) => ({ ...prev, [itemId]: serializeUnitValueTable(rows, unit), [itemId + '__raw']: rows }));
  }

  // Untuk item tabel baterai: simpan sebagai array "V:.. V R:.. mΩ" per baterai
  // (bukan 1 string gabungan) - supaya tiap nilai masuk ke kolomnya sendiri di sheet.
  // Teknisi cuma perlu isi angkanya - satuan (V / mΩ) ditambahkan otomatis di sini.
  function setBatteryAnswer(itemId, rows) {
    const values = rows.map((c) => (c.v || c.r) ? `V:${c.v || '-'} V  R:${c.r || '-'} mΩ` : '');
    setAnswers((prev) => ({ ...prev, [itemId]: values, [itemId + '__raw']: rows }));
  }

  async function handleSubmit() {
    if (!petugas.trim()) {
      showToast('Petugas pemeriksa wajib diisi.', true);
      return;
    }
    setSubmitting(true);
    try {
      // Cek dulu apakah slot BULAN INI untuk kategori ini sudah ada isinya.
      //
      // - Belum pernah diisi  -> langsung simpan, TIDAK perlu tanya apa-apa.
      // - Sudah pernah diisi  -> baru munculkan popup konfirmasi:
      //   "Perbaikan" (timpa) atau "Perawatan Baru" (simpan sebagai riwayat,
      //   isian lama tetap ada).
      //
      // Dicek dari isi sheet-nya langsung, jadi tetap benar walau halaman
      // dibuka ulang atau dari perangkat lain.
      const check = await checkMonthAlreadyFilled({
        buildingCategory: decodedBc, siteName: decodedSite, categoryId: category.id, tanggal
      });
      if (check.hasExisting) {
        setSubmitting(false);
        setConfirmDialog({ existingValues: check.existingValues });
        return;
      }
      await doSubmit('overwrite', {});
    } catch (e) {
      showToast('Gagal menyimpan: ' + e.message, true);
      setSubmitting(false);
    }
  }

  async function doSubmit(writeMode, existingValues) {
    setSubmitting(true);
    try {
      // Serialize answers - khusus untuk inputType yes_no
      const cleanAnswers = {};
      const categoryItemMap = new Map(category.items.map(it => [it.id, it]));
      
      Object.entries(answers).forEach(([key, value]) => {
        // Skip raw storage keys + kunci internal draf (mis. __petugas)
        if (key.endsWith('__raw') || key.startsWith('__')) return;
        
        cleanAnswers[key] = value;
      });
      
      // Process yes_no inputs to serialize into proper text
      category.items.forEach(item => {
        const rawKey = item.id + '__raw';
        const rawValue = answers[rawKey];
        
        if (item.inputType === 'yes_no' && rawValue !== undefined && rawValue !== null) {
          // Serialize using helper function
          const serializedText = serializeYesNo(rawValue, item);
          
          // Format with date prefix as normal text items
          const formattedText = item.noTglPrefix 
            ? serializedText 
            : `Tgl: ${tanggal}\nCatatan:\n${serializedText}`;
          
          cleanAnswers[item.id] = formattedText;
        }
      });

      const res = await submitChecksheet({
        buildingCategory: decodedBc,
        siteName: decodedSite,
        categoryId: category.id,
        tanggal,
        petugas: petugas.trim(),
        answers: cleanAnswers,
        writeMode,
        existingValues
      });
      // Isian sudah masuk sheet -> draf lokal tidak diperlukan lagi. Kalau
      // dibiarkan, besoknya form akan "memulihkan" isian yang sebenarnya sudah
      // tersimpan dan teknisi bisa mengira pekerjaannya belum masuk.
      clearDraft(localStorage, draftKey({
        buildingCategory: decodedBc, siteName: decodedSite, categoryId: category.id, tanggal,
      }));
      setDrafInfo(null);
      showToast(
        `Checksheet "${category.short_name}" tersimpan ke baris bulan ${BULAN[bulanIndex]} di "${res.fileName}" ✅`,
        false,
        res.sheetUrl,
        'Buka & cek di Google Sheets →'
      );
      if (res.duplicateWarning) {
        // Toast kedua, terpisah dari toast sukses di atas - biar keduanya
        // kebaca (showToast biasanya cuma nampilin 1 di satu waktu, jadi kasih
        // jeda dikit sebelum toast peringatan muncul).
        setTimeout(() => showToast('⚠️ ' + res.duplicateWarning, true), 3500);
      }
      navigate(`/peralatan/${buildingCategory}/${siteName}`);
    } catch (e) {
      showToast('Gagal menyimpan: ' + e.message, true);
    } finally {
      setSubmitting(false);
      setConfirmDialog(null);
    }
  }

  return (
    <section>
      <div className="breadcrumb">
        <Link to="/peralatan">Checksheet Peralatan</Link> /{' '}
        <Link to={`/peralatan/${buildingCategory}`}>{decodedBc}</Link> /{' '}
        <Link to={`/peralatan/${buildingCategory}/${siteName}`}>{decodedSite}</Link> / {category.short_name}
      </div>

      <HeroHeader
        photoUrl={getEquipmentBackground(category.id) || getEquipmentBackground(category.short_name) || getSiteBackground(decodedSite, decodedBc)}
        eyebrow={decodedSite}
        title={category.short_name}
      />

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

        {drafInfo && (
          <div className="draft-banner">
            <div className="draft-banner-text">📝 {drafInfo}</div>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => {
                clearDraft(localStorage, draftKey({
                  buildingCategory: decodedBc, siteName: decodedSite, categoryId: category.id, tanggal,
                }));
                setAnswers({});
                setDrafInfo(null);
              }}
            >
              Kosongkan & mulai baru
            </button>
          </div>
        )}

        {!isMatrix && (
          <div className="muted" style={{ marginBottom: 16 }}>
            📍 Data akan ditulis ke slot bulan <strong>{BULAN[bulanIndex]}</strong> (baris {slotRow}) di file asli.
            Kalau slot ini sudah pernah diisi sebelumnya, isinya akan ditimpa dengan data baru.
          </div>
        )}

        {category.items.map((it) => {
          const tampil = siapkanItem(it);
          return (
          <div key={it.id} className="item-block">
            {tampil.periode ? (
              <div className={`item-periode periode-${tampil.periode.warna}`}>
                Periode {tampil.periode.teks}
              </div>
            ) : null}
            <div className="item-label">{tampil.teksItem}</div>
            {it.standar ? <div className="item-standar"><b>Standar:</b> {it.standar}</div> : null}
            {it.inputType === 'battery_table' ? (
              <BatteryTable
                defaultCount={it.defaultBatteryCount || 24}
                value={answers[it.id + '__raw']}
                onChange={(rows) => setBatteryAnswer(it.id, rows)}
              />
            ) : it.inputType === 'measurement_ohm' ? (
              <>
                <div className="tgl-prefix">Tgl: <span className="mono">{formatDateDisplay(tanggal)}</span> Catatan:</div>
                <MeasurementInput
                  unit={it.unit || 'Ω'}
                  value={answers[it.id + '__raw']}
                  onChange={(val) => setMeasurementAnswer(it.id, val, it.unit || 'Ω')}
                />
              </>
            ) : it.inputType === 'status_ohm' ? (
              <>
                <div className="tgl-prefix">Tgl: <span className="mono">{formatDateDisplay(tanggal)}</span> Catatan:</div>
                <StatusMeasurementInput
                  statusOptions={it.statusOptions}
                  unit={it.unit || 'Ω'}
                  value={answers[it.id + '__raw']}
                  onChange={(val) => setStatusMeasurementAnswer(it.id, val, it.unit || 'Ω')}
                />
              </>
            ) : it.inputType === 'measurement_multi' ? (
              <>
                <div className="tgl-prefix">Tgl: <span className="mono">{formatDateDisplay(tanggal)}</span> Catatan:</div>
                <MeasurementMultiInput
                  fields={it.measurementFields}
                  value={answers[it.id + '__raw']}
                  onChange={(val) => setMeasurementMultiAnswer(it.id, it.measurementFields, val)}
                />
              </>
            ) : it.inputType === 'unit_value_table' ? (
              <>
                <div className="tgl-prefix">Tgl: <span className="mono">{formatDateDisplay(tanggal)}</span> Catatan:</div>
                <UnitValueTable
                  unit={it.unit || 'A'}
                  defaultCount={it.defaultUnitCount || 4}
                  value={answers[it.id + '__raw']}
                  onChange={(rows) => setUnitValueTableAnswer(it.id, rows, it.unit || 'A')}
                />
              </>
            ) : it.inputType === 'sensor_checklist' ? (
              <>
                <div className="tgl-prefix">Tgl: <span className="mono">{formatDateDisplay(tanggal)}</span> Catatan:</div>
                <SensorChecklistInput
                  sensors={it.sensors}
                  statusOptions={it.statusOptions}
                  value={answers[it.id + '__raw']}
                  onChange={(val) => setSensorChecklistAnswer(it.id, it.sensors, val)}
                />
              </>
            ) : it.inputType === 'pemadaman' ? (
              <>
                <div className="tgl-prefix">Tgl: <span className="mono">{formatDateDisplay(tanggal)}</span> Catatan:</div>
                <PemadamanInput
                  value={answers[it.id + '__raw']}
                  onChange={(val) => setPemadamanAnswer(it.id, val)}
                />
              </>
            ) : it.inputType === 'status_only' ? (
              <React.Fragment>
                {!it.noTglPrefix && (
                  <div className="tgl-prefix">Tgl: <span className="mono">{formatDateDisplay(tanggal)}</span> Catatan:</div>
                )}
                <StatusOnlyInput
                  options={it.statusOptions}
                  value={answers[it.id + '__raw']}
                  onChange={(val) => setStatusOnlyAnswer(it.id, val, it.noTglPrefix)}
                />
              </React.Fragment>
            ) : it.inputType === 'yes_no' ? (
              <YesNoInput
                itemId={it.id}
                value={answers[it.id + '__raw'] || null}
                onChange={(val) => setAnswers({ ...answers, [it.id + '__raw']: val })}
              />
            ) : (
              <>
                {!it.noTglPrefix && (
                  <div className="tgl-prefix">Tgl: <span className="mono">{formatDateDisplay(tanggal)}</span> Catatan:</div>
                )}
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder={it.noTglPrefix ? 'Isi hasil pemeriksaan...' : 'Isi catatan hasil pemeriksaan...'}
                  value={it.noTglPrefix ? (answers[it.id]?.__rawText || '') : (answers[it.id] || '')}
                  onChange={(e) => setAnswer(it.id, e.target.value, it.noTglPrefix)}
                />
              </>
            )}
          </div>
          );
        })}

        {category.note ? (
          <div className="muted" style={{ marginBottom: 14 }}>ℹ️ {category.note}</div>
        ) : null}

        <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <span className="spinner" /> : null}
          {submitting ? 'Menyimpan...' : 'Simpan Checksheet'}
        </button>
      </div>

      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="card-title">Bulan {BULAN[bulanIndex]} sudah pernah diisi</div>
            <p className="muted" style={{ marginBottom: 16 }}>
              Sudah ada isian untuk kategori ini di bulan {BULAN[bulanIndex]}. Apakah pengisian ini untuk:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => doSubmit('overwrite', {})}
                disabled={submitting}
              >
                Perbaikan — timpa isian sebelumnya
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => doSubmit('append', confirmDialog.existingValues)}
                disabled={submitting}
              >
                Perawatan Baru — simpan sebagai riwayat baru (isian lama tetap ada)
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmDialog(null)} disabled={submitting}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
