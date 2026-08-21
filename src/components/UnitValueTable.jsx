import React, { useState, useEffect, useRef } from 'react';

/**
 * UnitValueTable
 * Tabel 1 baris nilai per unit bernomor (mis. Arus tiap modul rectifier).
 * State disimpan LOKAL (useState) - lihat catatan di MeasurementMultiInput.jsx
 * soal kenapa ini penting (hindari race condition kehilangan input saat
 * ngetik cepat pindah-pindah antar kolom).
 */
export default function UnitValueTable({ value, onChange, unit = 'A', defaultCount = 4 }) {
  const [count, setCount] = useState((value && value.length) || defaultCount);
  const [rows, setRows] = useState(() => {
    if (value && value.length) return value;
    return Array.from({ length: defaultCount }, () => '');
  });
  const didInit = useRef(false);

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      return;
    }
    if (!value || value.length === 0) {
      setRows(Array.from({ length: count }, () => ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function updateCell(idx, val) {
    setRows((prev) => {
      const next = prev.slice();
      next[idx] = val;
      onChange(next);
      return next;
    });
  }

  function handleCountChange(newCount) {
    newCount = Math.max(1, Math.min(20, newCount));
    setCount(newCount);
    setRows((prev) => {
      const next = Array.from({ length: newCount }, (_, i) => prev[i] || '');
      onChange(next);
      return next;
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <label className="muted" style={{ fontSize: 12.5 }}>Jumlah modul/unit di lokasi ini:</label>
        <input
          type="number"
          className="input"
          style={{ width: 80, padding: '6px 8px' }}
          value={count}
          min={1}
          max={20}
          onChange={(e) => handleCountChange(parseInt(e.target.value, 10) || 1)}
        />
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Unit #</th>
              {rows.map((_, i) => <th key={i} style={thStyle}>{i + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdLabelStyle}>Nilai ({unit})</td>
              {rows.map((val, i) => (
                <td key={i} style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                    <input
                      style={inputStyle}
                      placeholder="0"
                      value={val}
                      onChange={(e) => updateCell(i, e.target.value)}
                    />
                    <span style={{ fontSize: 10.5, color: 'var(--ink-faint)', fontWeight: 600 }}>{unit}</span>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  position: 'sticky', top: 0, background: 'var(--surface-alt)', color: 'var(--ink-soft)',
  fontSize: 11.5, fontWeight: 700, padding: '8px 6px', borderBottom: '1px solid var(--border)',
  minWidth: 56, textAlign: 'center'
};
const tdLabelStyle = {
  padding: '8px 10px', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)',
  background: 'var(--surface-alt)', position: 'sticky', left: 0, borderRight: '1px solid var(--border)', whiteSpace: 'nowrap'
};
const tdStyle = { padding: '4px', borderBottom: '1px solid var(--border-soft)', textAlign: 'center' };
const inputStyle = {
  width: 44, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--ink)', fontSize: 12, padding: '5px 3px', textAlign: 'center', outline: 'none', fontFamily: "'IBM Plex Mono',monospace"
};

/**
 * Serialize array nilai per unit jadi 1 string ringkas, format:
 * "1: 4.9 A  2: 5.0 A  3: 4.3 A  4: 4.8 A"
 */
export function serializeUnitValueTable(rows, unit) {
  if (!rows || !rows.some((v) => v)) return '';
  return rows.map((v, i) => `${i + 1}: ${v || '-'} ${unit}`).join('  ');
}
