import React, { useEffect, useState } from 'react';
import { BUILDING_CATEGORIES } from '../config/sites';
import { getSitesForBuildingCategory, uploadDocumentation, listDocumentationFiles } from '../lib/cfillService';
import { useToast } from '../components/Toast';
import { compressImageIfNeeded, blobToFile } from '../lib/imageCompression';

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
    const rows = files.map((f) => ({ name: f.name, status: 'Mengupload...' }));
    setUploadRows(rows);

    for (let i = 0; i < files.length; i++) {
      try {
        const original = files[i];
        rows[i] = { name: original.name, status: 'Mengompres...' };
        setUploadRows([...rows]);

        const compressedBlob = await compressImageIfNeeded(original);
        const fileToUpload = compressedBlob === original ? original : blobToFile(compressedBlob, original.name);
        const savedInfo = compressedBlob !== original
          ? ` (${formatSize(original.size)} → ${formatSize(fileToUpload.size)})`
          : '';

        rows[i] = { name: original.name, status: 'Mengupload...' + savedInfo };
        setUploadRows([...rows]);

        await uploadDocumentation({ buildingCategory, siteName, file: fileToUpload });
        rows[i] = { name: original.name, status: '✅ berhasil' + savedInfo };
      } catch (e) {
        rows[i] = { name: files[i].name, status: '❌ gagal: ' + e.message };
      }
      setUploadRows([...rows]);
    }

    setUploading(false);
    setFiles([]);
    showToast('Proses upload selesai.');
    refreshHistory();
  }

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
            type="file"
            className="input"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
          />
        </div>

        <button className="btn btn-primary btn-block" onClick={handleUpload} disabled={uploading}>
          {uploading ? <span className="spinner" /> : null}
          {uploading ? 'Mengupload...' : 'Upload Dokumentasi'}
        </button>

        {uploadRows.length > 0 && (
          <div className="upload-progress">
            {uploadRows.map((r, i) => <div key={i}>{r.name} — {r.status}</div>)}
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
