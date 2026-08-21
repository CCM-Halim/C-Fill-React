import React from 'react';

/**
 * MeasurementMultiInput
 * Input beberapa nilai sekaligus dalam 1 item (mis. Tegangan + Arus, Tegangan +
 * Arus + Frekuensi, atau Kelas + Suhu + Kelembaban) - tiap kolom bisa berupa
 * angka+satuan otomatis, atau dropdown pilihan - teknisi cuma perlu isi nilainya.
 *
 * fields = [
 *   { id: 'v', label: 'Tegangan', prefix: 'V', unit: 'V' },              // angka + satuan
 *   { id: 'kelas', label: 'MR Kelas', prefix: 'MR Kelas', type: 'select', options: ['II','III'] }
 * ]
 * value = { v: '', kelas: '' }
 */
export default function MeasurementMultiInput({ fields, value, onChange }) {
  const current = value || {};

  function updateField(id, val) {
    onChange({ ...current, [id]: val });
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {fields.map((f) => (
        <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>{f.label}</label>
          {f.type === 'select' ? (
            <select
              className="input"
              style={{ width: 110 }}
              value={current[f.id] || ''}
              onChange={(e) => updateField(f.id, e.target.value)}
            >
              <option value="">-- pilih --</option>
              {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                className="input"
                style={{ width: 100, textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace" }}
                placeholder="0"
                value={current[f.id] || ''}
                onChange={(e) => updateField(f.id, e.target.value)}
                inputMode="decimal"
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{f.unit}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Gabungkan nilai multi-field jadi 1 string buat disimpan ke Google Sheet,
 * format: "V: 53.8 V  I: 19 A" atau "MR Kelas: II  C: 22 ºC  RH: 55 %".
 * Pakai field.prefix (bukan cuma huruf pertama dari label) supaya presisi.
 */
export function serializeMeasurementMulti(fields, value) {
  const current = value || {};
  const hasAny = fields.some((f) => current[f.id]);
  if (!hasAny) return '';
  return fields
    .map((f) => {
      const prefix = f.prefix || f.label;
      const val = current[f.id] || '-';
      const unit = f.unit ? ' ' + f.unit : '';
      return `${prefix}: ${val}${unit}`;
    })
    .join('  ');
}
