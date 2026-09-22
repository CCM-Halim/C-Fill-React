import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { getJadwalKunjunganBulanIni, getLogGangguanTabs, getLogGangguanData } from '../lib/cfillService';

const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Donut kecil per periode (1M/3M/6M/1Y) - pakai CSS conic-gradient, tanpa library.
 * Bagian "Selesai" dan "Belum" masing-masing bisa diklik terpisah buat buka
 * pop-up daftar lokasinya (lihat onClickFinished/onClickNotYet). */
function PeriodDonut({ label, total, finished, onClickFinished, onClickNotYet }) {
  const notYet = total - finished;
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
  const bg = total > 0
    ? `conic-gradient(var(--accent) ${pct}%, #F0DCCB ${pct}% 100%)`
    : '#EDEAE0';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 74, height: 74, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%', background: 'var(--surface)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15 }}>{finished}/{total}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, fontSize: 10.5 }}>
        <span className="link-like" onClick={onClickFinished} style={{ color: 'var(--accent-strong)' }}>
          {finished} selesai
        </span>
        <span className="link-like" onClick={onClickNotYet} style={{ color: '#B4302F' }}>
          {notYet} belum
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jadwal, setJadwal] = useState(null);
  const [jadwalError, setJadwalError] = useState(null);
  const [gangguanTabs, setGangguanTabs] = useState(null);
  const [selectedTab, setSelectedTab] = useState('');
  const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth());
  const [gangguanItems, setGangguanItems] = useState(null);
  const [gangguanLoading, setGangguanLoading] = useState(false);
  const [gangguanError, setGangguanError] = useState(null);
  const [periodModal, setPeriodModal] = useState(null); // { label, status, items } kalau lagi buka pop-up


  useEffect(() => {
    getJadwalKunjunganBulanIni().then(setJadwal).catch((e) => setJadwalError(e.message));
    getLogGangguanTabs().then((res) => {
      setGangguanTabs(res);
      if (res.available && res.tabs.length > 0) setSelectedTab(res.tabs[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedTab) return;
    setGangguanLoading(true);
    setGangguanError(null);
    getLogGangguanData(selectedTab)
      .then((res) => setGangguanItems(res.available ? res.items : []))
      .catch((e) => setGangguanError(e.message))
      .finally(() => setGangguanLoading(false));
  }, [selectedTab]);

  // Filter client-side per bulan yang dipilih - tanggal alarm formatnya kadang
  // beda urutan (DD/MM/YYYY vs kadang tertulis lain), jadi dicek fleksibel:
  // ambil semua angka di string tanggalnya, cek apakah nomor bulan yang dipilih
  // ada di situ (di posisi manapun, bukan asumsi posisi tetap).
  const filteredGangguan = (gangguanItems || []).filter((it) => {
    const numbers = (it.tanggalAlarm || '').match(/\d+/g);
    if (!numbers) return false;
    return numbers.some((n) => parseInt(n, 10) === selectedBulan + 1 && parseInt(n, 10) <= 12);
  });

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
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Progress Kerja {jadwal.bulan} {jadwal.tahun}</div>
          <div className="muted" style={{ marginBottom: 14 }}>Dari: {jadwal.fileName}</div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 6 }}>
            {['1M', '3M', '6M', '1Y'].map((p) => (
              <PeriodDonut
                key={p}
                label={p}
                total={jadwal.periodBreakdown[p].total}
                finished={jadwal.periodBreakdown[p].finished}
                onClickFinished={() => setPeriodModal({ label: p, status: 'Selesai', items: jadwal.periodBreakdown[p].finishedItems })}
                onClickNotYet={() => setPeriodModal({ label: p, status: 'Belum Selesai', items: jadwal.periodBreakdown[p].notYetItems })}
              />
            ))}
          </div>

          <a href={jadwal.sheetUrl} target="_blank" rel="noreferrer" className="link-like" style={{ display: 'inline-block', marginTop: 14, fontSize: 13 }}>
            Buka jadwal lengkap di Google Sheets →
          </a>

          {jadwal.total > 0 && jadwal.periodBreakdown['1M'].total === 0 && jadwal.periodBreakdown['3M'].total === 0 && (
            <div className="notice-box" style={{ marginTop: 14, fontSize: 11.5 }}>
              🔧 Diagnostik sementara — {jadwal.total} baris kebaca tapi periode semuanya 0. Sample data mentah:
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 6, fontSize: 10.5 }}>
                {JSON.stringify(jadwal.debugSample, null, 1)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-title">Temuan & Gangguan</div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <select className="input" style={{ maxWidth: 160 }} value={selectedBulan} onChange={(e) => setSelectedBulan(Number(e.target.value))}>
            {BULAN_ID.map((b, i) => <option key={b} value={i}>{b}</option>)}
          </select>
          {gangguanTabs && gangguanTabs.available && (
            <select className="input" style={{ maxWidth: 200 }} value={selectedTab} onChange={(e) => setSelectedTab(e.target.value)}>
              {gangguanTabs.tabs.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {gangguanTabs && !gangguanTabs.available && (
          <div className="notice-box">📋 {gangguanTabs.reason}</div>
        )}
        {gangguanLoading && <div className="muted">Memuat data gangguan...</div>}
        {gangguanError && <div className="notice-box">Gagal memuat: {gangguanError}</div>}

        {gangguanItems && !gangguanLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredGangguan.length === 0 && <div className="muted">Tidak ada temuan/gangguan di {BULAN_ID[selectedBulan]}.</div>}
            {filteredGangguan.map((it, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.lokasi}</div>
                  <span className="badge" style={{
                    background: it.status.toLowerCase().startsWith('close') ? 'var(--accent-soft)' : '#FCE4E4',
                    color: it.status.toLowerCase().startsWith('close') ? 'var(--accent-strong)' : '#B4302F'
                  }}>{it.status}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{it.kategori}</div>
                <div style={{ fontSize: 12, marginTop: 3 }}>
                  Alarm: {it.tanggalAlarm || '-'} {it.tanggalPulih && `· Pulih: ${it.tanggalPulih}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </section>
  );
}
