import React from 'react';

/**
 * StatusMeasurementInput
 * Dropdown status (mis. "Hasil pemeriksaan baik" / "tidak baik") + 1 nilai
 * angka dengan satuan - hasilnya digabung pakai kata penghubung (default "dan").
 * Dipakai buat item yang standarnya gabungan status kualitatif + nilai ukur,
 * mis. "Hasil pemeriksaan baik dan 0.5Ω".
 */
export default function StatusMeasurementInput({ statusOptions, unit, value, onChange, connector = 'dan hasil pengukuran' }) {
  const current = value || { status: '', nilai: '' };

  function update(field, val) {
    onChange({ ...current, [field]: val });
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>Hasil Pemeriksaan</label>
        <select
          className="input"
          style={{ minWidth: 210 }}
          value={current.status}
          onChange={(e) => update('status', e.target.value)}
        >
          <option value="">-- pilih --</option>
          {statusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-faint)', paddingBottom: 9 }}>{connector}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>Nilai</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            className="input"
            style={{ width: 100, textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace" }}
            placeholder="0"
            value={current.nilai}
            onChange={(e) => update('nilai', e.target.value)}
            inputMode="decimal"
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Gabungkan status + nilai jadi 1 string, format: "Hasil pemeriksaan baik dan
 * hasil pengukuran 0.5Ω" - sesuai pola persis di data historis asli.
 */
export function serializeStatusMeasurement(value, unit, connector = 'dan hasil pengukuran') {
  if (!value) return '';
  const status = value.status || '';
  const nilai = value.nilai || '';
  if (!status && !nilai) return '';
  const unitStr = unit === 'Ω' ? 'Ω' : ' ' + unit;
  return `${status} ${connector} ${nilai}${unitStr}`;
}
