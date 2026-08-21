import React, { useState } from 'react';

/**
 * UnitValueTable
 * Tabel 1 baris nilai per unit bernomor (mis. Arus tiap modul rectifier) -
 * mirip BatteryTable tapi cuma 1 baris pengukuran (bukan V+R), dan jumlah
 * unit BISA BEDA per lokasi (teknisi yang atur sendiri, bukan tetap).
 */
export default function UnitValueTable({ value, onChange, unit = 'A', defaultCount = 4 }) {
  const [count, setCount] = useState((value && value.length) || defaultCount);

  const rows = value && value.length === count ? value : Array.from({ length: count }, (_, i) => (value && value[i]) || '');

  function updateCell(idx, val) {
    const next = rows.slice();
    next[idx] = val;
    onChange(next);
  }

  function handleCountChange(newCount) {
    newCount = Math.max(1, Math.min(20, newCount));
    setCount(newCount);
    const next = Array.from({ length: newCount }, (_, i) => rows[i] || '');
    onChange(next);
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
