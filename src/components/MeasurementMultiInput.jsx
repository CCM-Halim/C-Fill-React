import React, { useState, useEffect, useRef } from 'react';

/**
 * Hitung nilai field 'computed' berdasarkan formula yang dikenal. Saat ini cuma
 * ada 1 formula: 'cb_ge_1_5x' (dipakai buat item "CB/MCB minimal 1,5x arus
 * pengukuran" - bandingkan nilai maksimal CB terhadap 1,5x arus pengukuran).
 */
function computeFieldValue(f, current) {
  if (f.formula === 'cb_ge_1_5x') {
    const [ukurId, maksId] = f.inputs;
    const ukur = parseFloat(String(current[ukurId] || '').replace(',', '.'));
    const maks = parseFloat(String(current[maksId] || '').replace(',', '.'));
    if (isNaN(ukur) || isNaN(maks) || ukur <= 0) return '';
    return maks >= ukur * 1.5 ? 'Sesuai' : 'Tidak sesuai';
  }
  return '';
}

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
      // Field 'computed' otomatis dihitung ulang tiap kali field yg mereka
      // butuhkan (inputs) berubah - biar teknisi langsung lihat hasilnya.
      fields.forEach((f) => {
        if (f.type === 'computed') {
          next[f.id] = computeFieldValue(f, next);
        }
      });
      onChange(next);
      return next;
    });
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {fields.map((f) => {
        if (f.type === 'section') {
          // Label section statis (mis. "Output:") - bukan field isian, cuma
          // penanda visual biar teknisi tau bagian mana yang lagi diisi.
          return (
            <div key={f.id} style={{ alignSelf: 'flex-end', paddingBottom: 9, fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
              {f.label}:
            </div>
          );
        }
        if (f.type === 'computed') {
          const computedVal = local[f.id] || '';
          return (
            <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>{f.label} (otomatis)</label>
              <div
                style={{
                  padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, minWidth: 110, textAlign: 'center',
                  background: computedVal === 'Sesuai' ? '#E4F5E9' : computedVal === 'Tidak sesuai' ? '#FCE4E4' : 'var(--surface-alt)',
                  color: computedVal === 'Sesuai' ? '#1E7A3D' : computedVal === 'Tidak sesuai' ? '#B4302F' : 'var(--ink-faint)'
                }}
              >
                {computedVal || '—'}
              </div>
            </div>
          );
        }
        return (
          <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>{f.label}</label>
            {f.type === 'select' ? (
              <select
                className="input"
                style={{ minWidth: 110 }}
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
        );
      })}
    </div>
  );
}

/**
 * Gabungkan nilai multi-field jadi 1 string buat disimpan ke Google Sheet,
 * dipisah BARIS BARU (bukan spasi) supaya tampil vertikal sesuai pola data
 * lama di template asli, mis:
 *   Status: Normal
 *   Output:
 *   V: 220 V
 *   I: 1,1 A
 * Field bertipe 'section' tampil sebagai baris label saja (tanpa nilai).
 * Field bertipe 'computed' dihitung ulang di sini juga (jaga-jaga kalau value
 * yang masuk belum sempat di-refresh oleh onChange terakhir).
 */
export function serializeMeasurementMulti(fields, value) {
  const current = { ...(value || {}) };
  fields.forEach((f) => {
    if (f.type === 'computed') current[f.id] = computeFieldValue(f, current);
  });
  const hasAny = fields.some((f) => f.type !== 'section' && current[f.id]);
  if (!hasAny) return '';
  return fields
    .map((f) => {
      if (f.type === 'section') return `${f.label}:`;
      const prefix = f.prefix || f.label;
      const val = current[f.id] || '-';
      const unit = f.unit ? ' ' + f.unit : '';
      return `${prefix}: ${val}${unit}`;
    })
    .join('\n');
}
