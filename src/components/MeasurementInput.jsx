import React from 'react';

/**
 * MeasurementInput
 * Input angka sederhana dengan satuan otomatis ditambahkan (mis. "Ω" untuk
 * resistansi grounding) - teknisi cuma perlu ketik angkanya saja.
 *
 * Kalau statusOptions diisi, muncul dropdown status DULU (mis. "Hasil
 * pemeriksaan baik"/"tidak baik"), disambung kata "dan" ke nilai angkanya -
 * dipakai utk item yang butuh status + nilai sekaligus (mis. grounding CCTV).
 */
export default function MeasurementInput({ value, onChange, unit = 'Ω', placeholder = '0', statusOptions, statusValue, onStatusChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {statusOptions ? (
        <>
          <select
            className="input"
            style={{ width: 220 }}
            value={statusValue || ''}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">-- pilih status --</option>
            {statusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>dan</span>
        </>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 220 }}>
        <input
          className="input"
          style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace" }}
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{unit}</span>
      </div>
    </div>
  );
}

/**
 * Gabungkan angka + satuan (+ status kalau ada) jadi 1 string buat disimpan
 * ke Google Sheet. Dengan status: "Hasil pemeriksaan baik dan 0.5Ω".
 * Tanpa status: "0.5Ω" (perilaku lama, tidak berubah).
 */
export function serializeMeasurement(rawValue, unit = 'Ω', statusValue) {
  if (!rawValue) return '';
  const valuePart = `${rawValue}${unit === 'Ω' ? 'Ω' : ' ' + unit}`;
  if (statusValue) return `${statusValue} dan ${valuePart}`;
  return valuePart;
}
