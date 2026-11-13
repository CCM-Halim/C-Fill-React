import React, { useEffect, useState } from 'react';
import {
  listJadwalKunjunganOverrides,
  setJadwalKunjunganOverride,
  removeJadwalKunjunganOverride
} from '../lib/cfillService';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/**
 * Menu "Kelola Dashboard" (khusus admin): tempel link Google Sheets
 * "Jadwal Kunjungan MR" untuk bulan tertentu. Dashboard bulan itu langsung
 * memakai file tersebut. `onSaved` dipanggil supaya Dashboard memuat ulang.
 */
export default function KelolaDashboardModal({ onClose, onSaved }) {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth());
  const [tahun, setTahun] = useState(now.getFullYear());
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const [daftar, setDaftar] = useState(null);

  const muat = () => listJadwalKunjunganOverrides().then(setDaftar).catch(() => setDaftar([]));
  useEffect(() => { muat(); }, []);

  async function simpan() {
    setBusy(true); setError(null); setOk(null);
    try {
      await setJadwalKunjunganOverride(bulan, tahun, link);
      setOk(`Link jadwal ${BULAN[bulan]} ${tahun} tersimpan.`);
      setLink('');
      await muat();
      onSaved && onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function hapus(o) {
    if (!window.confirm(`Hapus link manual ${BULAN[o.bulanIndex]} ${o.tahun}?`)) return;
    setBusy(true); setError(null); setOk(null);
    try {
      await removeJadwalKunjunganOverride(o.bulanIndex, o.tahun);
      await muat();
      onSaved && onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const tahunList = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="card-title">Kelola Dashboard</div>
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
          Tempel link Google Sheets “Jadwal Kunjungan MR” untuk bulan yang dipilih. Progress Perawatan di Dashboard akan membaca file ini.
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))} style={{ flex: 1 }}>
            {BULAN.map((b, i) => <option key={b} value={i}>{b}</option>)}
          </select>
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
            {tahunList.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <input
          type="text"
          placeholder="https://docs.google.com/spreadsheets/d/…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />

        {error && <div className="notice-box" style={{ marginTop: 10, fontSize: 12 }}>{error}</div>}
        {ok && <div className="muted" style={{ marginTop: 10, fontSize: 12.5, color: 'var(--accent-strong)' }}>✓ {ok}</div>}

        <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={busy || !link.trim()} onClick={simpan}>
          {busy ? 'Memproses…' : 'Simpan Link'}
        </button>

        <div style={{ marginTop: 18, fontWeight: 700, fontSize: 13 }}>Link yang tersimpan</div>
        {daftar === null && <div className="muted" style={{ fontSize: 12 }}>Memuat…</div>}
        {daftar && daftar.length === 0 && <div className="muted" style={{ fontSize: 12 }}>Belum ada. Dashboard mencari file di folder Jadwal Kunjungan.</div>}
        {daftar && daftar.map((o) => (
          <div key={`${o.tahun}-${o.bulanIndex}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ flex: 1, fontSize: 13 }}>
              {BULAN[o.bulanIndex]} {o.tahun}
              <div>
                <a href={`https://docs.google.com/spreadsheets/d/${o.fileId}`} target="_blank" rel="noreferrer" style={{ fontSize: 11.5 }}>Buka spreadsheet</a>
              </div>
            </div>
            <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => hapus(o)}>Hapus</button>
          </div>
        ))}

        <button className="btn btn-ghost" style={{ marginTop: 16, width: '100%' }} onClick={onClose}>Tutup</button>
      </div>
    </div>
  );
}
