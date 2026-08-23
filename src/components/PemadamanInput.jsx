import React, { useState, useEffect, useRef } from 'react';

/**
 * PemadamanInput
 * Item "Pengujian alarm pemadaman" punya 2 skenario pengisian berbeda
 * tergantung siapa yang melakukan pemadaman:
 * - Tim Electrical Powerline: pilih jenis pemadaman (First/Integrated load) +
 *   tanggal pemadaman -> hasil otomatis digabung jadi kalimat lengkap.
 * - Tim Communication: cuma pilih hasil pengujian baik/tidak baik.
 */
export default function PemadamanInput({ value, onChange }) {
  const [local, setLocal] = useState(() => value || {});
  const didInit = useRef(false);

  useEffect(() => {
    if (!didInit.current) { didInit.current = true; return; }
    if (!value || Object.keys(value).length === 0) setLocal({});
  }, [value]);

  function update(field, val) {
    setLocal((prev) => {
      const next = { ...prev, [field]: val };
      onChange(next);
      return next;
    });
  }

  return (
    <div>
      <div className="field" style={{ marginBottom: 12, maxWidth: 320 }}>
        <label>Pemadaman dilakukan oleh</label>
        <select className="input" value={local.tim || ''} onChange={(e) => update('tim', e.target.value)}>
          <option value="">-- pilih --</option>
          <option value="electrical">Tim Electrical Powerline</option>
          <option value="communication">Tim Communication</option>
        </select>
      </div>

      {local.tim === 'electrical' && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="field">
            <label>Jenis Pemadaman</label>
            <select className="input" style={{ minWidth: 180 }} value={local.jenisPemadaman || ''} onChange={(e) => update('jenisPemadaman', e.target.value)}>
              <option value="">-- pilih --</option>
              <option value="First load">First load</option>
              <option value="Integrated load">Integrated load</option>
            </select>
          </div>
          <div className="field">
            <label>Tanggal Pemadaman</label>
            <input type="date" className="input" value={local.tanggalPemadaman || ''} onChange={(e) => update('tanggalPemadaman', e.target.value)} />
          </div>
        </div>
      )}

      {local.tim === 'communication' && (
        <div className="field" style={{ maxWidth: 280 }}>
          <label>Hasil Pengujian</label>
          <select className="input" value={local.hasilPengujian || ''} onChange={(e) => update('hasilPengujian', e.target.value)}>
            <option value="">-- pilih --</option>
            <option value="Hasil pengujian baik">Hasil pengujian baik</option>
            <option value="Hasil pengujian tidak baik">Hasil pengujian tidak baik</option>
          </select>
        </div>
      )}
    </div>
  );
}

function formatDateID(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Serialize sesuai skenario yang dipilih:
 * - Electrical: "Pemadaman First load dari tim electrical powerline pada
 *   tanggal 21/08/2026. Hasil pengujian baik"
 * - Communication: cuma "Hasil pengujian baik" / "Hasil pengujian tidak baik"
 */
export function serializePemadaman(value) {
  if (!value || !value.tim) return '';
  if (value.tim === 'electrical') {
    if (!value.jenisPemadaman || !value.tanggalPemadaman) return '';
    return `Pemadaman ${value.jenisPemadaman} dari tim electrical powerline pada tanggal ${formatDateID(value.tanggalPemadaman)}. Hasil pengujian baik`;
  }
  if (value.tim === 'communication') {
    return value.hasilPengujian || '';
  }
  return '';
}
