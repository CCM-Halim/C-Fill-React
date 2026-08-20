import React, { useState } from 'react';

/**
 * BatteryTable
 * Dipakai untuk item checksheet baterai (UPS/HFSPS periode 1M,3M) yang butuh
 * pengukuran Tegangan (V) & Resistansi (R) per unit baterai — mengikuti layout
 * Excel asli (1 kolom = 1 baterai). Default 24 baterai (bisa dikurangi/ditambah
 * kalau lokasi punya jumlah baterai berbeda).
 *
 * Output disimpan sebagai 1 string terstruktur di jawaban item tsb (dipisah "; "),
 * supaya tetap kompatibel dengan skema 1-kolom-per-item di Google Sheet.
 */
export default function BatteryTable({ value, onChange, defaultCount = 24 }) {
  const [count, setCount] = useState(defaultCount);

  // value = array of { v: '', r: '' }, panjang = count
  const rows = value && value.length === count ? value : Array.from({ length: count }, (_, i) => (value && value[i]) || { v: '', r: '' });

  function updateCell(idx, field, val) {
    const next = rows.slice();
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  }

  function handleCountChange(newCount) {
    newCount = Math.max(1, Math.min(60, newCount));
    setCount(newCount);
    const next = Array.from({ length: newCount }, (_, i) => rows[i] || { v: '', r: '' });
    onChange(next);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <label className="muted" style={{ fontSize: 12.5 }}>Jumlah baterai di lokasi ini:</label>
        <input
          type="number"
          className="input"
          style={{ width: 80, padding: '6px 8px' }}
          value={count}
          min={1}
          max={60}
          onChange={(e) => handleCountChange(parseInt(e.target.value, 10) || 1)}
        />
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Baterai #</th>
              {rows.map((_, i) => (
                <th key={i} style={thStyle}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdLabelStyle}>Tegangan (V)</td>
              {rows.map((cell, i) => (
                <td key={i} style={tdStyle}>
                  <div style={inputWithUnitStyle}>
                    <input
                      className="battery-cell-input"
                      style={cellInputStyle}
                      placeholder="0"
                      value={cell.v}
                      onChange={(e) => updateCell(i, 'v', e.target.value)}
                    />
                    <span style={unitStyle}>V</span>
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td style={tdLabelStyle}>Resistansi (R)</td>
              {rows.map((cell, i) => (
                <td key={i} style={tdStyle}>
                  <div style={inputWithUnitStyle}>
                    <input
                      className="battery-cell-input"
                      style={cellInputStyle}
                      placeholder="0"
                      value={cell.r}
                      onChange={(e) => updateCell(i, 'r', e.target.value)}
                    />
                    <span style={unitStyle}>mΩ</span>
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
const cellInputStyle = {
  width: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--ink)', fontSize: 12, padding: '5px 3px', textAlign: 'center', outline: 'none', fontFamily: "'IBM Plex Mono',monospace"
};
const inputWithUnitStyle = { display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' };
const unitStyle = { fontSize: 10.5, color: 'var(--ink-faint)', fontWeight: 600 };

/**
 * Serialize array data baterai jadi 1 string ringkas untuk disimpan ke Google Sheet
 * (1 kolom per item, format: "1:V=2.248 V,R=0.404 mΩ | 2:V=2.273 V,R=0.440 mΩ | ...")
 * Catatan: fungsi ini tidak dipakai langsung oleh ChecksheetForm.jsx (yang punya
 * logic serialize sendiri), disediakan untuk pemakaian lain kalau diperlukan.
 */
export function serializeBatteryTable(rows) {
  return rows
    .map((c, i) => `${i + 1}:V=${c.v || '-'} V,R=${c.r || '-'} mΩ`)
    .join(' | ');
}
