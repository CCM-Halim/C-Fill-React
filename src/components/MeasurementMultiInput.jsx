import React from 'react';

/**
 * MeasurementMultiInput
 * Input beberapa angka sekaligus dalam 1 item (mis. Tegangan + Arus, atau
 * Tegangan + Arus + Frekuensi) - tiap kolom punya satuan otomatis, teknisi
 * cuma perlu ketik angkanya.
 *
 * fields = [{ id: 'v', label: 'Tegangan', unit: 'V' }, { id: 'i', label: 'Arus', unit: 'A' }]
 * value  = { v: '', i: '' }
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
        </div>
      ))}
    </div>
  );
}

/**
 * Gabungkan nilai multi-field jadi 1 string buat disimpan ke Google Sheet,
 * format: "V: 53.8 V  I: 19 A" (masing-masing field di baris/segmen sendiri).
 */
export function serializeMeasurementMulti(fields, value) {
  const current = value || {};
  const hasAny = fields.some((f) => current[f.id]);
  if (!hasAny) return '';
  return fields.map((f) => `${f.label.charAt(0)}: ${current[f.id] || '-'} ${f.unit}`).join('  ');
}
