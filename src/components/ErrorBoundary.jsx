import React from 'react';

/**
 * Pengaman layar putih: kalau ada komponen yang error saat tampil, React membuang SELURUH
 * halaman (layar putih tanpa pesan, terutama membingungkan di Safari). Dengan ini hanya
 * bagian yang error yang diganti pesan; `kecil` = untuk satu kartu, tanpa kartu = seluruh app.
 */
async function bersihkanDanMuatUlang() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* abaikan */ }
  window.location.reload();
}

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[C-Fill] komponen error:', error, info?.componentStack); }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const pesan = String(error?.message || error);
    if (this.props.kecil) {
      return (
        <div className="card">
          <div className="notice-box">⚠️ {this.props.nama || 'Bagian ini'} gagal ditampilkan: {pesan}</div>
        </div>
      );
    }
    return (
      <div style={{ maxWidth: 480, margin: '12vh auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ marginTop: 0 }}>C-Fill mengalami kendala</h2>
        <p>Halaman gagal ditampilkan. Coba muat ulang; kalau tetap begini, pakai "Bersihkan cache".</p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f3f1ea', padding: 10, borderRadius: 8 }}>{pesan}</pre>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 14px', marginRight: 8 }}>Muat ulang</button>
        <button onClick={bersihkanDanMuatUlang} style={{ padding: '10px 14px' }}>Bersihkan cache &amp; muat ulang</button>
      </div>
    );
  }
}
