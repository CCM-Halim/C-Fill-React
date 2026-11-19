import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { getJadwalKunjunganBulanIni, getAllLogGangguan } from '../lib/cfillService';
import ProgressKerjaCard from '../components/ProgressKerjaCard';
import TemuanGangguanCard from '../components/TemuanGangguanCard';
import PersonilBertugasCard from '../components/PersonilBertugasCard';
import ErrorBoundary from '../components/ErrorBoundary';
import RencanaKerjaCard from '../components/RencanaKerjaCard';
import TrenTemuanCard from '../components/TrenTemuanCard';
import KelolaDashboardModal from '../components/KelolaDashboardModal';
import { isAdminEmail } from '../config/access';
import { hitungSkala } from '../lib/skalaLayar';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jadwal, setJadwal] = useState(null);
  const [jadwalError, setJadwalError] = useState(null);

  const [log, setLog] = useState(null);
  const [logLoading, setLogLoading] = useState(true);
  const [logError, setLogError] = useState(null);

  const [kelolaOpen, setKelolaOpen] = useState(false);
  const isAdmin = isAdminEmail(user?.email);

  const [periodModal, setPeriodModal] = useState(null); // { label, status, items }
  const [gangguanModal, setGangguanModal] = useState(null); // detail 1 kejadian

  // Monitor lebar: Dashboard memakai lebar penuh (tanpa batas 1180px) dan isinya diperbesar
  // proporsional supaya terbaca dari jauh. Layar penuh (F11-style) menyembunyikan sidebar.
  const bungkus = useRef(null);
  const [skala, setSkala] = useState(1);
  const [layarPenuh, setLayarPenuh] = useState(false);
  const bisaLayarPenuh = typeof document !== 'undefined' && !!document.fullscreenEnabled;

  useEffect(() => {
    document.documentElement.dataset.halaman = 'dashboard';
    return () => { delete document.documentElement.dataset.halaman; };
  }, []);

  useEffect(() => {
    const induk = bungkus.current?.parentElement;
    if (!induk) return undefined;
    const ukur = () => {
      const cs = getComputedStyle(induk);
      const lebar = induk.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
      setSkala(hitungSkala(lebar, window.innerWidth));
    };
    ukur();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ukur) : null;
    if (ro) ro.observe(induk);
    window.addEventListener('resize', ukur);
    return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', ukur); };
  }, []);

  useEffect(() => {
    const ganti = () => {
      const aktif = !!document.fullscreenElement;
      setLayarPenuh(aktif);
      document.documentElement.dataset.layar = aktif ? 'penuh' : '';
    };
    document.addEventListener('fullscreenchange', ganti);
    return () => { document.removeEventListener('fullscreenchange', ganti); document.documentElement.dataset.layar = ''; };
  }, []);

  const alihLayarPenuh = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch { /* browser menolak — abaikan */ }
  };

  const muatJadwal = () => {
    setJadwal(null); setJadwalError(null);
    getJadwalKunjunganBulanIni().then(setJadwal).catch((e) => setJadwalError(e.message));
  };

  useEffect(() => {
    muatJadwal();

    // Semua tab Log Gangguan dibaca sekali, lalu difilter di sisi client -
    // supaya ganti-ganti filter tidak bolak-balik request ke Sheets.
    getAllLogGangguan()
      .then(setLog)
      .catch((e) => setLogError(e.message))
      .finally(() => setLogLoading(false));
  }, []);

  return (
    <>
    <section ref={bungkus} style={skala > 1 ? { zoom: skala } : undefined}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div className="card-title">Halo, {user?.name?.split(' ')[0] || 'Teknisi'} 👋</div>
            <div className="muted" style={{ overflowWrap: 'anywhere' }}>{user?.email}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flex: '0 0 auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {bisaLayarPenuh && (
              <button className="btn btn-secondary btn-small dash-layar-penuh" style={{ whiteSpace: 'nowrap' }} onClick={alihLayarPenuh}
                title="Tampilan layar penuh untuk monitor (tekan Esc untuk keluar)">
                {layarPenuh ? '✕ Keluar layar penuh' : '⛶ Layar penuh'}
              </button>
            )}
            {isAdmin && (
              <button className="btn btn-secondary btn-small" style={{ whiteSpace: 'nowrap' }} onClick={() => setKelolaOpen(true)}>
                ⚙️ Kelola Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Komputer/tablet: biru (progress) | ungu (smartcard) ; merah (grafik gangguan) | kuning (rencana kerja).
          Potret/ponsel: progress, smartcard, rencana kerja, tren, lalu daftar gangguan. */}
      <div className="dash-grid">
        <div className="dash-cell dash-progress">
          {jadwal === null && !jadwalError && (
            <div className="card"><div className="muted">Memuat jadwal kunjungan bulan ini...</div></div>
          )}
          {jadwalError && (
            <div className="card"><div className="notice-box">Gagal memuat jadwal: {jadwalError}</div></div>
          )}
          {jadwal && !jadwal.available && (
            <div className="card"><div className="notice-box">📋 {jadwal.reason}</div></div>
          )}
          {jadwal && jadwal.available && (
            <ProgressKerjaCard jadwal={jadwal} onOpenPeriod={setPeriodModal} />
          )}
        </div>

        <div className="dash-cell dash-personil"><ErrorBoundary kecil nama="Personil bertugas"><PersonilBertugasCard /></ErrorBoundary></div>

        <div className="dash-cell dash-rencana"><ErrorBoundary kecil nama="Rencana kerja"><RencanaKerjaCard log={log} /></ErrorBoundary></div>

        <div className="dash-cell dash-tren"><TrenTemuanCard log={log} /></div>
      </div>

      <TemuanGangguanCard
        log={log}
        loading={logLoading}
        error={logError}
        onOpenItem={setGangguanModal}
      />

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Mulai Cepat</div>
        <div className="quick-actions">
          <button className="btn btn-primary" onClick={() => navigate('/peralatan')}>Isi Checksheet Peralatan</button>
          <button className="btn btn-secondary" onClick={() => navigate('/instrumen')}>Isi Checksheet Instrumen</button>
          <button className="btn btn-secondary" onClick={() => navigate('/dokumentasi')}>Upload Dokumentasi</button>
        </div>
      </div>

    </section>

      {kelolaOpen && <KelolaDashboardModal onClose={() => setKelolaOpen(false)} onSaved={muatJadwal} />}

      {periodModal && (
        <div className="modal-overlay" onClick={() => setPeriodModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="card-title">{periodModal.label} — {periodModal.status} ({periodModal.items.length})</div>
            {periodModal.items.length === 0 ? (
              <div className="muted" style={{ marginTop: 10 }}>Tidak ada data.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {periodModal.items.map((it, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.lokasi}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {it.tanggal} {it.jam && `· ${it.jam}`} {it.pic && `· PIC: ${it.pic}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-ghost" style={{ marginTop: 16, width: '100%' }} onClick={() => setPeriodModal(null)}>Tutup</button>
          </div>
        </div>
      )}

      {gangguanModal && (
        <div className="modal-overlay" onClick={() => setGangguanModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="card-title">{gangguanModal.lokasi}</div>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              {gangguanModal.tab} · baris {gangguanModal.baris} di sheet · status {gangguanModal.statusRaw || '-'}
            </div>
            {[
              ['Tanggal', gangguanModal.tanggalRaw || '(belum diisi)'],
              ['Waktu gangguan', gangguanModal.mulaiRaw || '-'],
              ['Waktu pemulihan', gangguanModal.pulihRaw || '-'],
              ['Durasi (sheet)', gangguanModal.durasi || '-'],
              ['Peralatan / item', gangguanModal.alat || '-'],
              ['Sistem terkait', gangguanModal.sistem || '-'],
              ['Pelapor', gangguanModal.pelapor || '-'],
              ['Fenomena', gangguanModal.fenomena || '-'],
              ['Analisis & penanganan', gangguanModal.analisis || '-'],
              ['Tindakan pencegahan', gangguanModal.pencegahan || '-'],
            ].map(([k, v]) => (
              <div key={k} style={{ fontSize: 12.5, marginTop: 6 }}>
                <span className="muted">{k}: </span>{v}
              </div>
            ))}
            {gangguanModal.tanggalAmbigu && (
              <div className="notice-box" style={{ fontSize: 11.5, marginTop: 10 }}>
                ⚠️ Kolom Tanggal ({gangguanModal.tanggalRaw}) dan Waktu Gangguan ({gangguanModal.mulaiRaw})
                menunjukkan hari/bulan yang tertukar. Filter bulan memakai kolom Tanggal — betulkan di sheet
                kalau perlu.
              </div>
            )}
            <a href={log?.sheetUrl} target="_blank" rel="noreferrer" className="link-like"
              style={{ display: 'inline-block', fontSize: 13, marginTop: 12 }}>
              Buka Log Book di Google Sheets →
            </a>
            <button className="btn btn-ghost" style={{ marginTop: 16, width: '100%' }} onClick={() => setGangguanModal(null)}>Tutup</button>
          </div>
        </div>
      )}
    </>
  );
}
