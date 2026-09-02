import React, { useState, useRef } from 'react';

/**
 * VoiceRecorder
 * Input rekaman suara - 2 mode: rekam langsung di aplikasi (pakai mikrofon
 * HP lewat browser) atau upload file suara yang sudah direkam pakai aplikasi
 * rekam suara bawaan HP. Hasil akhir selalu berupa Blob/File audio, dikirim
 * lewat onChange(file | null).
 */
export default function VoiceRecorder({ onChange }) {
  const [mode, setMode] = useState('record'); // 'record' | 'upload'
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [uploadName, setUploadName] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        const ext = mimeType === 'audio/webm' ? 'webm' : 'm4a';
        const file = new File([blob], `voice-note.${ext}`, { type: mimeType });
        onChange(file);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError('Gagal akses mikrofon: ' + e.message + '. Coba pakai mode Upload File.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  }

  function resetRecording() {
    setRecordedUrl(null);
    setSeconds(0);
    onChange(null);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadName(file.name);
    onChange(file);
  }

  function switchMode(newMode) {
    if (recording) stopRecording();
    setMode(newMode);
    setRecordedUrl(null);
    setUploadName(null);
    setSeconds(0);
    onChange(null);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button type="button" className={mode === 'record' ? 'btn btn-secondary' : 'btn btn-ghost'} onClick={() => switchMode('record')}>
          🎙️ Rekam di Aplikasi
        </button>
        <button type="button" className={mode === 'upload' ? 'btn btn-secondary' : 'btn btn-ghost'} onClick={() => switchMode('upload')}>
          📤 Upload File Suara
        </button>
      </div>

      {mode === 'record' ? (
        <div>
          {error && <div className="notice-box" style={{ marginBottom: 10 }}>{error}</div>}
          {!recordedUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                type="button"
                className={recording ? 'btn btn-danger' : 'btn btn-primary'}
                onClick={recording ? stopRecording : startRecording}
              >
                {recording ? '⏹ Berhenti Rekam' : '⏺ Mulai Rekam'}
              </button>
              {recording && <span className="mono" style={{ color: 'var(--accent-strong)', fontWeight: 700 }}>{formatTime(seconds)}</span>}
            </div>
          ) : (
            <div>
              <audio controls src={recordedUrl} style={{ width: '100%', maxWidth: 320 }} />
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={resetRecording}>Hapus & Rekam Ulang</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input type="file" accept="audio/*" className="input" onChange={handleFileUpload} />
          {uploadName && <div className="muted" style={{ marginTop: 8 }}>✅ {uploadName}</div>}
        </div>
      )}
    </div>
  );
}
