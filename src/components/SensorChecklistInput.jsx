import React, { useState, useEffect, useRef } from 'react';

/**
 * SensorChecklistInput
 * Daftar sensor (nama tetap), tiap sensor punya dropdown status sendiri,
 * ditampilkan vertikal - dipakai buat item yang mencakup banyak sensor
 * sekaligus (mis. RTU: Smoke Sensor, Water immersion, dst).
 *
 * State disimpan LOKAL (useState + functional update) - sama seperti
 * komponen multi-input lain (hindari race condition kehilangan input saat
 * pindah field cepat).
 */
export default function SensorChecklistInput({ sensors, statusOptions, value, onChange }) {
  const [local, setLocal] = useState(() => value || {});
  const didInit = useRef(false);

  useEffect(() => {
    if (!didInit.current) { didInit.current = true; return; }
    if (!value || Object.keys(value).length === 0) setLocal({});
  }, [value]);

  function updateSensor(sensorName, status) {
    setLocal((prev) => {
      const next = { ...prev, [sensorName]: status };
      onChange(next);
      return next;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sensors.map((sensorName) => (
        <div key={sensorName} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', minWidth: 170 }}>{sensorName}:</label>
          <select
            className="input"
            style={{ minWidth: 220 }}
            value={local[sensorName] || ''}
            onChange={(e) => updateSensor(sensorName, e.target.value)}
          >
            <option value="">-- pilih --</option>
            {statusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

/**
 * Serialize status tiap sensor jadi 1 string vertikal (baris baru per sensor),
 * format: "Smoke Sensor: Hasil pemeriksaan baik dan koneksi kuat\nWater immersion: ..."
 * Sensor yang belum diisi tetap ditampilkan (kosong setelah ":"), sesuai pola data asli.
 */
export function serializeSensorChecklist(sensors, value) {
  const current = value || {};
  const hasAny = sensors.some((s) => current[s]);
  if (!hasAny) return '';
  return sensors.map((s) => `${s}: ${current[s] || ''}`).join('\n');
}
