import React from 'react';

/**
 * YesNoInput - Input sederhana untuk item checksheet yang hanya perlu status YA/TIDAK
 * 
 * Item dengan field ini TIDAK memerlukan input angka/tanggal manual. Teknisi tinggal
 * pilih YA (berarti sudah dilakukan/stabil) atau TIDAK (belum dilakukan/gangguan).
 * 
 * Sistem otomatis generate kalimat sesuai "standar" dari kategori:
 * - YA → [Kata Kerja] + sudah/sudiah (positif): "Sudah dibersihkan", "Hasil pemeriksaan baik"
 * - TIDAK → belum (negatif): "Belum dibersihkan", "Tidak ada hasil pemeriksaan"
 */

export default function YesNoInput({ itemId, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="radio"
          name={`yesno-${itemId}`}
          checked={value === 'YA'}
          onChange={() => onChange('YA')}
          style={{ cursor: 'pointer' }}
        />
        <span style={{ fontWeight: 500 }}>✅ YA</span>
      </label>
      
      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="radio"
          name={`yesno-${itemId}`}
          checked={value === 'TIDAK'}
          onChange={() => onChange('TIDAK')}
          style={{ cursor: 'pointer' }}
        />
        <span style={{ fontWeight: 500 }}>❌ TIDAK</span>
      </label>
    </div>
  );
}

/**
 * Serialize jawaban Ya/Tidak menjadi format yang bisa disimpan ke Sheets.
 * Mengubah YA/TIDAK menjadi kalimat standar sesuai konfigurasi item.
 */
export function serializeYesNo(answer, itemConfig) {
  if (!answer || answer === '' || !itemConfig || !itemConfig.standar) {
    return '';
  }
  
  // Format: Ya = [Kalimat Positif], Tidak = [Kata Negatif]
  if (answer === 'YA') {
    // Jika standar sudah "Sudah..." / "Hasil..." / "Tidak ada...", gunakan langsung
    // Tapi kalau standar "Tidak ada...", buat jadi "Ada" untuk YA? Tidak, tetap gunakan standar
    
    // Normalisasi: pastikan kalimat selalu dalam bentuk POSITIF (sudah/ada/baik)
    const standar = itemConfig.standar.trim();
    
    // Cek apakah standar sudah berbentuk negatif ("belum"/"tidak")
    // Kalau ya, ganti jadi positif
    if (/^belum\s+/i.test(standar)) {
      // Ganti "belum" dengan "sudah"
      return standar.replace(/^belum\s+/i, 'sudah ');
    }
    if (/^tidak\s+/i.test(standar)) {
      // Untuk kasus seperti "tidak ada kerusakan" -> "ada kerusakan" mungkin tidak benar
      // Lebih baik biarkan standar asli jika sudah deskriptif positif
      return standar;
    }
    
    return standar;
  }
  
  // Jawaban TIDAK
  const standar = itemConfig.standar.trim();
  
  // Tambahkan "belum" di awal jika belum ada
  if (/^belum\s+/i.test(standar) || /^tidak\s+/i.test(standar)) {
    // Sudah negatif, biarkan
    return standar;
  }
  
  // Tambahkan prefix negatif
  return 'belum ' + standar;
}
