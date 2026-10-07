import React, { useState } from 'react';
import { submitEntryExit } from '../lib/cfillService';
import { useToast } from './Toast';
import SignaturePad from './SignaturePad';

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTimeStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * EntryExitForm
 * Form isi "Entry and exit registration" - dipakai baik sebagai halaman
 * mandiri (EntryExitPage.jsx, site dipilih manual) maupun tersisip otomatis
 * di alur Checksheet Peralatan (SiteCategoryList.jsx, site sudah ditentukan
 * dari URL, wajib diisi dulu sebelum lanjut ke item perawatan kalau bulan
 * ini belum ada catatan).
 */
export default function EntryExitForm({ site, onSuccess, mandatory, cekGagal = false }) {
  const showToast = useToast();
  const [tanggal, setTanggal] = useState(todayStr());
  const [waktuMasuk, setWaktuMasuk] = useState(nowTimeStr());
  const [nama, setNama] = useState('');
  const [namaUnit, setNamaUnit] = useState('Telco Halim On-Site');
  const [nomorKontak, setNomorKontak] = useState('');
  const [kegiatan, setKegiatan] = useState('');
  const [waktuKeluar, setWaktuKeluar] = useState('');
  const [signatureBlob, setSignatureBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!nama.trim() || !waktuMasuk) {
      showToast('Nama dan waktu masuk wajib diisi.', true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitEntryExit({
        buildingCategory: site.buildingCategory,
        siteName: site.siteName,
        tanggal, waktuMasuk, nama: nama.trim(), namaUnit: namaUnit.trim(),
        nomorKontak: nomorKontak.trim(), kegiatan: kegiatan.trim(), waktuKeluar,
        signatureBlob
      });
      showToast(`Entry/Exit tersimpan di baris ${res.row} ✅`, false, res.sheetUrl, 'Buka di Google Sheets →');
      if (onSuccess) onSuccess(res);
    } catch (e) {
      showToast('Gagal menyimpan: ' + e.message, true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card form-card">
      <div className="card-title">Formulir Keluar-Masuk — {site.siteName}</div>
      {mandatory && (
        <div className="notice-box" style={{ marginBottom: 16 }}>
          {cekGagal ? (
            <>
              ⚠️ Catatan Entry/Exit bulan ini <strong>tidak bisa diperiksa</strong> sekarang (koneksi atau
              akses ke Google Sheets sedang bermasalah). Kalau kemarin sudah mengisi, <strong>tidak perlu
              mengisi lagi</strong> — coba muat ulang halaman ini. Pengisian ulang akan menambah baris baru
              untuk bulan yang sama.
            </>
          ) : (
            <>
              📋 Entry/Exit Registration bulan ini belum diisi untuk site ini — cukup diisi sekali per bulan,
              lalu checksheet bisa diisi/direvisi berkali-kali tanpa diminta isi lagi.
            </>
          )}
        </div>
      )}

      <div className="field-grid">
        <div className="field">
          <label>Tanggal</label>
          <input type="date" className="input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div className="field">
          <label>Waktu Masuk</label>
          <input type="time" className="input" value={waktuMasuk} onChange={(e) => setWaktuMasuk(e.target.value)} />
        </div>
        <div className="field">
          <label>Nama (petugas, pisahkan koma kalau lebih dari 1)</label>
          <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Ari, Iqbal, Gilang" />
        </div>
        <div className="field">
          <label>Nama Unit</label>
          <input className="input" value={namaUnit} onChange={(e) => setNamaUnit(e.target.value)} />
        </div>
        <div className="field">
          <label>Nomor Kontak</label>
          <input className="input" value={nomorKontak} onChange={(e) => setNomorKontak(e.target.value)} placeholder="mis. 0812xxxxxxx" />
        </div>
        <div className="field">
          <label>Kegiatan</label>
          <input className="input" value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} placeholder="mis. Riksawat 1M dan 3M" />
        </div>
        <div className="field">
          <label>Waktu Keluar (isi setelah selesai kerja, boleh dikosongkan dulu)</label>
          <input type="time" className="input" value={waktuKeluar} onChange={(e) => setWaktuKeluar(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Tanda Tangan (TTD)</label>
        <SignaturePad onChange={setSignatureBlob} />
      </div>

      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleSubmit} disabled={submitting}>
        {submitting ? <span className="spinner" /> : null}
        {submitting ? 'Menyimpan...' : mandatory ? 'Simpan & Lanjut ke Checksheet' : 'Simpan Entry/Exit'}
      </button>
    </div>
  );
}
