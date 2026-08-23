import React from 'react';

/**
 * StatusOnlyInput
 * Dropdown status sederhana tanpa nilai tambahan (mis. "Normal" / "Tidak Normal").
 */
export default function StatusOnlyInput({ options, value, onChange }) {
  return (
    <select className="input" style={{ minWidth: 220 }} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">-- pilih --</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}
