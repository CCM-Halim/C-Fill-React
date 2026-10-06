import React, { useEffect, useState } from 'react';
import { BUILDING_CATEGORIES } from '../config/sites';
import { getSitesForBuildingCategory, uploadDocumentation, listDocumentationFiles } from '../lib/cfillService';
import { useToast } from '../components/Toast';
import { compressImageIfNeeded, blobToFile } from '../lib/imageCompression';
import { withRetry, pesanGagal, isTransientError } from '../lib/uploadRetry';

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function DokumentasiPage() {
  const showToast = useToast();
  const [buildingCategory, setBuildingCategory] = useState('');
  const [siteName, setSiteName] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadRows, setUploadRows] = useState([]);
  const [docHistory, setDocHistory] = useState(null);
  const [uploading, setUploading] = useState(false);
  // Revisi form input file - dipakai utk MENGHAPUS pilihan lama dari kotak
  // input setelah upload (biar user tidak tidak sengaja mengunggah ulang).
  const [fileInputKey, setFileInputKey] = useState(0);

  const sites = buildingCategory ? getSitesForBuildingCategory(buildingCategory) : [];

  useEffect(() => {
    setSiteName('');
    setDocHistory(null);
  }, [buildingCategory]);

  useEffect(() => {
    if (!buildingCategory || !siteName) {
      setDocHistory(null);
      return;
    }
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteName]);

  async function refreshHistory() {
    setDocHistory('loading');
    try {
      const result = await listDocumentationFiles({ buildingCategory, siteName });
      setDocHistory(result);
    } catch (e) {
      setDocHistory({ error: e.message });
    }
  }

  /**
   * Unggah SATU file: kompres -> unggah, dengan percobaan ulang otomatis kalau
   * jaringannya kedip. Dipakai bersama oleh proses borongan (tombol Upload)
   * maupun tombol "Ulangi" per baris - supaya jalur kodenya cuma satu.
   */
  async function uploadSatu(file, laporStatus) {
    laporStatus('Mengompres...');

    const blob = await compressImageIfNeeded(file);
    const fileToUpload = blob === file ? file : blobToFile(blob, file.name);
    const savedInfo = blob !== file
      ? ` (${formatSize(file.size)} → ${formatSize(fileToUpload.size)})`
      : '';

    await withRetry(
      () => uploadDocumentation({ buildingCategory, siteName, file: fileToUpload }),
      {
        attempts: 3,
        baseDelayMs: 800,
        onRetry: (n, total) => laporStatus(`Mengupload${savedInfo} — koneksi terputus, percobaan ${n}/${total}...`)
      }
    );

    return { savedInfo };
  }

  async function handleUpload() {
    if (!buildingCategory || !siteName) {
      showToast('Pilih Kategori Bangunan dan Site terlebih dahulu.', true);
      return;
    }
    if (files.length === 0) {
      showToast('Pilih minimal 1 file untuk diupload.', true);
      return;
    }
    setUploading(true);

    const rows = files.map((f) => ({ name: f.name, status: 'Menunggu...', _file: f }));
    setUploadRows(rows);
    const ubah = (i, status) => {
      rows[i] = { ...rows[i], status };
      setUploadRows([...rows]);
    };

    let gagal = 0;
    for (let i = 0; i < rows.length; i++) {
      try {
        const { savedInfo } = await uploadSatu(rows[i]._file, (s) => ubah(i, s));
        rows[i] = { ...rows[i], status: '✅ berhasil' + savedInfo, _file: null };
      } catch (e) {
        gagal++;
        rows[i] = { ...rows[i], status: '❌ gagal: ' + pesanGagal(e) };
      }
      setUploadRows([...rows]);
    }

    setUploading(false);
    setFiles([]);
    setFileInputKey((k) => k + 1); // bersihkan kotak input file
    showToast(gagal === 0
      ? 'Proses upload selesai.'
      : `Selesai — ${rows.length - gagal} berhasil, ${gagal} gagal. Tekan "Ulangi" pada file yang gagal.`, gagal > 0);
    refreshHistory();
  }

  /**
   * Unggah ulang file yang gagal, tanpa perlu memilih lagi dari penyimpanan HP.
   * File-nya masih dipegang di memori (rows._file), jadi tidak perlu akses galeri.
   * Bisa dipakai berulang sampai berhasil.
   */
  async function handleRetry(i) {
    const row = uploadRows[i];
    if (!row?._file) {
      showToast('File ini tidak lagi bisa diulang - silakan pilih ulang dari penyimpanan.', true);
      return;
    }
    setUploading(true);
    const rows = [...uploadRows];
    rows[i] = { ...rows[i], status: 'Mengompres...' };
    setUploadRows(rows);

    try {
      const { savedInfo } = await uploadSatu(row._file, (s) => {
        rows[i] = { ...rows[i], status: s };
        setUploadRows([...rows]);
      });
      rows[i] = { ...rows[i], status: '✅ berhasil' + savedInfo, _file: null };
      setUploadRows([...rows]);
      showToast('Berhasil diunggah pada percobaan ulang.');
      refreshHistory();
    } catch (e) {
      rows[i] = { ...rows[i], status: '❌ gagal: ' + pesanGagal(e) };
      setUploadRows([...rows]);
      showToast('Masih gagal — cek sinyal lalu tekan Ulangi lagi.', true);
    } finally {
      setUploading(false);
    }
  }

  async function handleRetrySemua() {
    const gagalIdx = uploadRows.map((r, i) => (r._file ? i : -1)).filter((i) => i >= 0);
    if (gagalIdx.length === 0) {
      showToast('Tidak ada file gagal yang bisa diulang.', true);
      return;
    }
    setUploading(true);
    let masihGagal = 0;
    for (const i of gagalIdx) {
      const rows = [...uploadRows];
      try {
        rows[i] = { ...rows[i], status: 'Mengompres...' };
        setUploadRows(rows);
        const { savedInfo } = await uploadSatu(rows[i]._file, (s) => {
          const r2 = [...uploadRows];
          r2[i] = { ...r2[i], status: s };
          setUploadRows(r2);
        });
        rows[i] = { ...rows[i], status: '✅ berhasil' + savedInfo, _file: null };
      } catch (e) {
        masihGagal++;
        rows[i] = { ...rows[i], status: '❌ gagal: ' + pesanGagal(e) };
      }
      setUploadRows([...rows]);
    }
    setUploading(false);
    showToast(masihGagal === 0
      ? `Semua file berhasil diunggah (${gagalIdx.length} file).`
      : `Masih ada ${masihGagal} file gagal — coba lagi saat sinyal lebih baik.`, masihGagal > 0);
    refreshHistory();
  }

  const jumlahGagal = uploadRows.filter((r) => r._file).length;
  const adaHasil = uploadRows.length > 0;

  return (
    <section>
      <div className="card form-card">
        <div className="card-title">Upload Dokumentasi Pekerjaan</div>
        <p className="muted">
          File akan tersimpan otomatis di folder <strong>Dokumentasi Kegiatan</strong>,
          mengikuti struktur <strong>Bulan &gt; Nama Site (tanggal)</strong>. Kalau folder
          site untuk bulan ini sudah ada, file akan ditambahkan ke situ (bukan bikin folder baru).
          Foto otomatis dikompres kalau ukurannya lebih dari 800 KB (kualitas & resolusi
          diturunkan bertahap seminimal mungkin, bukan dokumen/PDF - itu diupload apa adanya).
          Kalau koneksi sempat putus, file dicoba ulang 3x sendiri; kalau tetap gagal, tekan
          tombol <strong>Ulangi</strong> tanpa perlu memilih lagi dari penyimpanan.
        </p>

        <div className="field-grid">
          <div className="field">
            <label>Kategori Bangunan</label>
            <select className="input" value={buildingCategory} onChange={(e) => setBuildingCategory(e.target.value)}>
              <option value="">-- pilih kategori --</option>
              {BUILDING_CATEGORIES.map((bc) => <option key={bc} value={bc}>{bc}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Site</label>
            <select className="input" value={siteName} onChange={(e) => setSiteName(e.target.value)} disabled={!buildingCategory}>
              <option value="">-- pilih site --</option>
              {sites.map((s) => <option key={s.siteName} value={s.siteName}>{s.siteName}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Pilih File (foto / dokumen, bisa lebih dari 1)</label>
          <input
            key={fileInputKey}
            type="file"
            className="input"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
          />
          {files.length > 0 && <div className="muted" style={{ marginTop: 6 }}>{files.length} file dipilih.</div>}
        </div>

        <button className="btn btn-primary btn-block" onClick={handleUpload} disabled={uploading}>
          {uploading ? <span className="spinner" /> : null}
          {uploading ? 'Mengupload...' : 'Upload Dokumentasi'}
        </button>

        {adaHasil && (
          <div className="upload-progress">
            {jumlahGagal > 0 && (
              <button className="btn btn-outline btn-block" onClick={handleRetrySemua} disabled={uploading} style={{ marginBottom: 10 }}>
                {uploading ? 'Mengulang...' : `Ulangi ${jumlahGagal} file yang gagal`}
              </button>
            )}
            {uploadRows.map((r, i) => (
              <div key={i} className="upload-row">
                <span className="upload-row-nama">{r.name} — {r.status}</span>
                {r._file && (
                  <button className="btn-ulangi" onClick={() => handleRetry(i)} disabled={uploading}>
                    Ulangi
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card form-card" style={{ marginTop: 20 }}>
        <div className="card-title">Riwayat Upload di Folder Ini</div>
        {!buildingCategory || !siteName ? (
          <div className="muted">Pilih Kategori Bangunan &amp; Site untuk melihat riwayat.</div>
        ) : docHistory === 'loading' ? (
          <div className="muted">Memuat...</div>
        ) : docHistory?.error ? (
          <div className="muted">Gagal memuat: {docHistory.error}</div>
        ) : Array.isArray(docHistory) && docHistory.length === 0 ? (
          <div className="muted">Belum ada file di folder ini.</div>
        ) : Array.isArray(docHistory) ? (
          docHistory.map((f) => (
            <div key={f.id} className="doc-file-row">
              <a href={f.webViewLink} target="_blank" rel="noreferrer">{f.name}</a>
              <span className="muted">{new Date(f.modifiedTime).toLocaleString('id-ID')}</span>
            </div>
          ))
        ) : null}
      </div>
    </section>
  );
}
