import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { getJadwalKunjunganBulanIni } from '../lib/cfillService';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jadwal, setJadwal] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    getJadwalKunjunganBulanIni()
      .then(setJadwal)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <section>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Halo, {user?.name?.split(' ')[0] || 'Teknisi'} 👋</div>
        <div className="muted">{user?.email}</div>
      </div>

      {jadwal === null && !error && (
        <div className="card"><div className="muted">Memuat jadwal kunjungan bulan ini...</div></div>
      )}

      {error && (
        <div className="card"><div className="notice-box">Gagal memuat jadwal: {error}</div></div>
      )}

      {jadwal && !jadwal.available && (
        <div className="card">
          <div className="notice-box">📋 {jadwal.reason}</div>
        </div>
      )}

      {jadwal && jadwal.available && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Rencana Kerja {jadwal.bulan} {jadwal.tahun}</div>
            <div className="muted" style={{ marginBottom: 12 }}>Dari: {jadwal.fileName}</div>

            <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, color: 'var(--accent-strong)' }}>
                  {jadwal.finishedCount}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>Selesai</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, color: '#B4302F' }}>
                  {jadwal.notYetCount}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>Belum Selesai</div>
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, color: 'var(--ink-soft)' }}>
                  {jadwal.total}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>Total Kunjungan</div>
              </div>
            </div>

            <div style={{ height: 8, background: 'var(--border-soft)', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
              <div style={{
                height: '100%', background: 'var(--accent)',
                width: jadwal.total ? `${(jadwal.finishedCount / jadwal.total) * 100}%` : '0%'
              }} />
            </div>

            <a href={jadwal.sheetUrl} target="_blank" rel="noreferrer" className="link-like" style={{ display: 'inline-block', marginTop: 12, fontSize: 13 }}>
              Buka jadwal lengkap di Google Sheets →
            </a>
          </div>

          <div className="card">
            <div className="card-title">Belum Selesai ({jadwal.notYetCount})</div>
            {jadwal.notYetItems.length === 0 ? (
              <div className="muted">🎉 Semua kunjungan bulan ini sudah selesai.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {jadwal.notYetItems.map((it, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.lokasi}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {it.tanggal} {it.jam && `· ${it.jam}`} {it.kegiatan && `· ${it.kegiatan}`} {it.pic && `· PIC: ${it.pic}`}
                    </div>
                    {it.temuan && <div style={{ fontSize: 12.5, color: '#B4302F', marginTop: 3 }}>⚠️ {it.temuan}</div>}
                    {it.keterangan && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3 }}>{it.keterangan}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Mulai Cepat</div>
        <div className="quick-actions">
          <button className="btn btn-primary" onClick={() => navigate('/peralatan')}>Isi Checksheet Peralatan</button>
          <button className="btn btn-secondary" onClick={() => navigate('/instrumen')}>Isi Checksheet Instrumen</button>
          <button className="btn btn-secondary" onClick={() => navigate('/dokumentasi')}>Upload Dokumentasi</button>
        </div>
      </div>
    </section>
  );
}
