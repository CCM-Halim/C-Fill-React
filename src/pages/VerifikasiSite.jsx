import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getVerificationStatus, submitVerification } from '../lib/cfillService';
import { getActivityForSite } from '../lib/activityLog';
import { useToast } from '../components/Toast';
import SignaturePad from '../components/SignaturePad';

const ROOT_CHECKSHEET_FOLDER_ID = import.meta.env.VITE_ROOT_CHECKSHEET_FOLDER_ID;
const BULAN_LIST = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function VerifikasiSite() {
  const { buildingCategory, siteName } = useParams();
  const decodedBc = decodeURIComponent(buildingCategory);
  const decodedSite = decodeURIComponent(siteName);
  const showToast = useToast();

  const [status, setStatus] = useState(null);
  const [activity, setActivity] = useState(null);
  const [signingMonth, setSigningMonth] = useState(null); // index bulan yang sedang dalam mode tanda tangan
  const [signatureBlob, setSignatureBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadStatus();
    getActivityForSite(ROOT_CHECKSHEET_FOLDER_ID, decodedBc, decodedSite)
      .then(setActivity)
      .catch(() => setActivity([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadStatus() {
    setStatus(null);
    getVerificationStatus(decodedBc, decodedSite)
      .then(setStatus)
      .catch((e) => setStatus({ error: e.message }));
  }

  function openSigningPanel(monthIndex) {
    setSigningMonth(monthIndex);
    setSignatureBlob(null);
  }

  function cancelSigning() {
    setSigningMonth(null);
    setSignatureBlob(null);
  }

  async function confirmVerify() {
    if (!signatureBlob) {
      showToast('Isi tanda tangan/paraf dulu (gambar atau upload foto) sebelum verifikasi.', true);
      return;
    }
    setSubmitting(true);
    try {
      await submitVerification({ buildingCategory: decodedBc, siteName: decodedSite, monthIndex: signingMonth, signatureBlob });
      showToast(`Bulan ${BULAN_LIST[signingMonth]} berhasil diverifikasi ✅`);
      setSigningMonth(null);
      setSignatureBlob(null);
      loadStatus();
    } catch (e) {
      showToast('Gagal verifikasi: ' + e.message, true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="breadcrumb">
        <Link to="/verifikasi">Verifikasi</Link> / {decodedBc.replace(/^\d+\.\s*/, '')} / {decodedSite}
      </div>

      <div className="card form-card">
        <div className="card-title">Status Verifikasi Bulanan</div>
        {status === null ? (
          <div className="muted">Memuat...</div>
        ) : status.error ? (
          <div>
            <div className="muted" style={{ marginBottom: 12 }}>Gagal memuat: {status.error}</div>
            <button className="btn btn-secondary" onClick={loadStatus}>🔄 Coba Lagi</button>
          </div>
        ) : (
          <>
            <a href={status.sheetUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ marginBottom: 16 }}>
              Buka Lembar Verifikasi Pekerjaan di Sheets →
            </a>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {status.months.map((m, i) => {
                const isVerified = !!m.tanggal;
                const isSigning = signingMonth === i;
                return (
                  <div key={i} className="item-block" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div className="item-label">{m.bulan}</div>
                        {isVerified ? (
                          <div className="muted">Diverifikasi {m.tanggal} oleh {m.namaVerifikator}</div>
                        ) : (
                          <div className="muted">Belum diverifikasi</div>
                        )}
                      </div>
                      {!isSigning && (
                        <button className={isVerified ? 'btn btn-ghost' : 'btn btn-primary'} onClick={() => openSigningPanel(i)}>
                          {isVerified ? 'Verifikasi Ulang' : 'Verifikasi ✓'}
                        </button>
                      )}
                    </div>

                    {isSigning && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                        <div className="field-grid" style={{ marginBottom: 12 }}>
                          <div className="field">
                            <label>Tanda Tangan / Paraf — {m.bulan}</label>
                          </div>
                        </div>
                        <SignaturePad onChange={setSignatureBlob} />
                        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                          <button className="btn btn-primary" onClick={confirmVerify} disabled={submitting}>
                            {submitting ? <span className="spinner" /> : null}
                            {submitting ? 'Menyimpan...' : 'Konfirmasi Verifikasi'}
                          </button>
                          <button className="btn btn-ghost" onClick={cancelSigning} disabled={submitting}>Batal</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="card form-card" style={{ marginTop: 20 }}>
        <div className="card-title">Aktivitas Checksheet di Site Ini</div>
        {activity === null ? (
          <div className="muted">Memuat...</div>
        ) : activity.length === 0 ? (
          <div className="muted">Belum ada aktivitas tercatat untuk site ini.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activity.map((a, i) => (
              <a key={i} href={a.sheetUrl} target="_blank" rel="noreferrer" className="doc-file-row" style={{ alignItems: 'center' }}>
                <span>
                  <strong>{a.categoryName}</strong>
                  <span className="muted" style={{ display: 'block', fontSize: 12 }}>{a.petugas} · diperiksa {a.tanggal}</span>
                </span>
                <span className="muted" style={{ fontSize: 12 }}>{new Date(a.timestamp).toLocaleString('id-ID')}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
