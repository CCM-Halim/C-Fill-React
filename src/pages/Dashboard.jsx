import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { getJadwalKunjunganBulanIni, getAllLogGangguan } from '../lib/cfillService';
import ProgressKerjaCard from '../components/ProgressKerjaCard';
import TemuanGangguanCard from '../components/TemuanGangguanCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jadwal, setJadwal] = useState(null);
  const [jadwalError, setJadwalError] = useState(null);

  const [log, setLog] = useState(null);
  const [logLoading, setLogLoading] = useState(true);
  const [logError, setLogError] = useState(null);

  const [periodModal, setPeriodModal] = useState(null); // { label, status, items }
  const [gangguanModal, setGangguanModal] = useState(null); // detail 1 kejadian

  useEffect(() => {
    getJadwalKunjunganBulanIni().then(setJadwal).catch((e) => setJadwalError(e.message));

    // Semua tab Log Gangguan dibaca sekali, lalu difilter di sisi client -
    // supaya ganti-ganti filter tidak bolak-balik request ke Sheets.
    getAllLogGangguan()
      .then(setLog)
      .catch((e) => setLogError(e.message))
      .finally(() => setLogLoading(false));
  }, []);

  return (
    <section>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Halo, {user?.name?.split(' ')[0] || 'Teknisi'} 👋</div>
        <div className="muted">{user?.email}</div>
      </div>

      {jadwal === null && !jadwalError && (
        <div className="card" style={{ marginBottom: 16 }}><div className="muted">Memuat jadwal kunjungan bulan ini...</div></div>
      )}
      {jadwalError && (
        <div className="card" style={{ marginBottom: 16 }}><div className="notice-box">Gagal memuat jadwal: {jadwalError}</div></div>
      )}
      {jadwal && !jadwal.available && (
        <div className="card" style={{ marginBottom: 16 }}><div className="notice-box">📋 {jadwal.reason}</div></div>
      )}

      {jadwal && jadwal.available && (
        <ProgressKerjaCard jadwal={jadwal} onOpenPeriod={setPeriodModal} />
      )}

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
    </section>
  );
}
