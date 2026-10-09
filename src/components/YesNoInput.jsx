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
    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px' }}>
        <input
          type="radio"
          name={`yesno-${itemId}`}
          checked={value === 'YA'}
          onChange={() => onChange('YA')}
          style={{ cursor: 'pointer', marginRight: '2px', width: '12px', height: '12px' }}
        />
        <span style={{ fontWeight: 500, fontSize: '13px' }}>✓</span>
      </label>
      
      <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px' }}>
        <input
          type="radio"
          name={`yesno-${itemId}`}
          checked={value === 'TIDAK'}
          onChange={() => onChange('TIDAK')}
          style={{ cursor: 'pointer', marginRight: '2px', width: '12px', height: '12px' }}
        />
        <span style={{ fontWeight: 500, fontSize: '13px' }}>✗</span>
      </label>
    </div>
  );
}

/**
 * Balik kalimat standar (bentuk positif) jadi kalimat NEGATIF untuk jawaban "Tidak".
 * Dibuat per-aturan (bukan sekadar menambah "belum" di depan) karena kalimat
 * standar berbeda-beda: "Sudah dibersihkan" -> "Belum dibersihkan",
 * "Hasil pemeriksaan baik" -> "Hasil pemeriksaan tidak baik",
 * "Tidak ada kerusakan" -> "Ada kerusakan", dst.
 */
export function negasiStandar(standar) {
  let t = String(standar || '').trim();
  if (!t) return '';
  // Kalimat berupa perintah/instruksi, bukan pernyataan kondisi.
  if (/^catat tanggal kadaluarsa/i.test(t)) return 'Tanggal kadaluarsa belum dicatat';
  if (/^pembersihan peralatan dan pemeriksaan status operasi/i.test(t)) {
    return 'Peralatan belum dibersihkan dan status operasi belum diperiksa';
  }
  if (/^belum melewati/i.test(t)) return t.replace(/^belum melewati/i, 'Sudah melewati');
  if (/^bersih tanpa debu$/i.test(t)) return 'Tidak bersih, ada debu';
  // Keterangan dalam kurung adalah petunjuk pengisian, bukan bagian kondisi.
  t = t.replace(/\s*\([^)]*\)/g, '').trim();

  const rules = [
    [/\btidak boleh melebihi\b/gi, 'melebihi'],
    [/\btidak pernah\b/gi, 'pernah'],
    [/\btidak ada\b/gi, 'ada'],
    [/\btidak (rusak|berkarat)\b/gi, '$1'],
    [/\bsama dengan waktu\b/gi, 'tidak sama dengan waktu'],
    [/\bterisi penuh\b/gi, 'tidak terisi penuh'],
    [/\bdi area hijau\b/gi, 'tidak di area hijau'],
    [/\bsudah\b/gi, 'belum'],
    [/\b(\w+) dengan baik\b/gi, (m, kata) => (/^(tidak|belum)$/i.test(kata) ? m : `tidak ${kata.toLowerCase()} dengan baik`)],
    [/(?<!belum |tidak |dengan )\b(baik|bagus|normal|sesuai|kuat|rapi|bersih|benar|jelas|akurat|sensitif|utuh|kokoh)\b/gi, (m, kata) => `tidak ${kata.toLowerCase()}`],
  ];
  let hasil = t;
  for (const [pola, ganti] of rules) hasil = hasil.replace(pola, ganti);
  // Rapikan spasi & koma. PENTING: jangan menambah spasi sesudah koma yang
  // memisahkan DIGIT - "1,5" itu angka desimal (format Indonesia), bukan
  // daftar. Tanpa penjagaan ini "1,5 kali arus" berubah jadi "1, 5 kali arus".
  hasil = hasil
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/(?<!\d),(?=\S)/g, ', ')
    .trim();

  // Tidak ada satu pun aturan yang cocok -> jangan sampai teksnya sama persis
  // dengan jawaban "Ya".
  if (hasil.toLowerCase() === t.toLowerCase()) return `Tidak sesuai standar: ${t}`;
  return hasil.charAt(0).toUpperCase() + hasil.slice(1);
}

/**
 * Serialize jawaban Ya/Tidak menjadi kalimat yang ditulis ke Sheets.
 * YA -> kalimat standar apa adanya; TIDAK -> versi negatifnya (negasiStandar).
 */
export function serializeYesNo(answer, itemConfig) {
  if (!answer || !itemConfig || !itemConfig.standar) return '';
  const standar = itemConfig.standar.trim();
  if (answer === 'YA') return standar;
  return negasiStandar(standar);
}
