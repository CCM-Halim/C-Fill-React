import React from 'react';

/**
 * MeasurementInput
 * Input angka sederhana dengan satuan otomatis ditambahkan (mis. "Ω" untuk
 * resistansi grounding) - teknisi cuma perlu ketik angkanya saja.
 */
export default function MeasurementInput({ value, onChange, unit = 'Ω', placeholder = '0' }) {
  return (
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
  );
}

/**
 * Gabungkan angka + satuan jadi 1 string buat disimpan ke Google Sheet.
 */
export function serializeMeasurement(rawValue, unit = 'Ω') {
  if (!rawValue) return '';
  return `${rawValue}${unit === 'Ω' ? 'Ω' : ' ' + unit}`;
}
