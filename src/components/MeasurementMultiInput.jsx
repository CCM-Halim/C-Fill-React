import React, { useState, useEffect, useRef } from 'react';

/**
 * MeasurementMultiInput
 * Input beberapa nilai sekaligus dalam 1 item (mis. Tegangan + Arus, Tegangan +
 * Arus + Frekuensi, atau Kelas + Suhu + Kelembaban).
 *
 * PENTING: state nilai disimpan LOKAL di komponen ini (useState), bukan cuma
 * dibaca ulang dari prop `value` tiap kali user ngetik. Kalau baca dari prop
 * setiap keystroke, ada risiko race condition - user ngetik cepat pindah field
 * (mis. Tegangan lalu buru-buru pindah ke Arus) bisa bikin nilai field pertama
 * KETIMPA/HILANG kalau re-render dari parent belum sempat kejadian di antara
 * 2 keystroke itu. State lokal + functional setState menghindari ini.
 */
export default function MeasurementMultiInput({ fields, value, onChange }) {
  const [local, setLocal] = useState(() => value || {});
  const didInit = useRef(false);

  // Sinkronisasi kalau parent reset value dari luar (misal ganti kategori/pindah halaman)
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      return;
    }
    if (!value || Object.keys(value).length === 0) {
      setLocal({});
    }
  }, [value]);

  function updateField(id, val) {
    setLocal((prev) => {
      const next = { ...prev, [id]: val };
      onChange(next);
      return next;
    });
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
              value={local[f.id] || ''}
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
                value={local[f.id] || ''}
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
