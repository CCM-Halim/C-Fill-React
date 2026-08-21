import React from 'react';

/**
 * LocationNoteInput
 * Buat item yang formatnya "Lokasi Uji Fungsi: ... Catatan: ..." (BEDA dari
 * mayoritas item lain yang otomatis "Tgl: <tanggal> Catatan: ..."). Lokasi
 * sudah pre-fill dengan default (sesuai histori data selalu sama), tapi tetap
 * bisa diedit kalau suatu saat lokasinya beda.
 */
export default function LocationNoteInput({ defaultLocation, value, onChange }) {
  const current = value || { lokasi: defaultLocation || '', catatan: '' };

  function update(field, val) {
    onChange({ ...current, [field]: val });
  }

  return (
    <div>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Lokasi Uji Fungsi</label>
        <input
          className="input"
          value={current.lokasi}
          onChange={(e) => update('lokasi', e.target.value)}
          placeholder="mis. Gudang CCM Halim"
        />
      </div>
      <div className="field">
        <label>Catatan</label>
        <textarea
          className="textarea"
          rows={2}
          value={current.catatan}
          onChange={(e) => update('catatan', e.target.value)}
          placeholder="Isi catatan hasil pengujian..."
        />
      </div>
    </div>
  );
}

/**
 * Gabungkan jadi 1 string format "Lokasi Uji Fungsi: X Catatan: Y" - dikirim
 * sebagai objek { __rawText } supaya writeMonthlySlot TIDAK membungkusnya lagi
 * dengan prefix "Tgl: ..." otomatis (item ini punya format sendiri).
 */
export function serializeLocationNote(value) {
  if (!value) return null;
  const lokasi = value.lokasi || '';
  const catatan = value.catatan || '';
  if (!lokasi && !catatan) return null;
  return { __rawText: `Lokasi Uji Fungsi: ${lokasi}\nCatatan: ${catatan}` };
}
