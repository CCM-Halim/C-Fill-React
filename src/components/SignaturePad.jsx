import React, { useRef, useState, useEffect } from 'react';

/**
 * SignaturePad
 * Input tanda tangan/paraf - 2 mode: gambar langsung (canvas, mouse/jari) atau
 * upload foto tanda tangan yang sudah ada. Hasil akhir selalu berupa Blob PNG,
 * dikirim lewat onChange(blob | null).
 */
export default function SignaturePad({ onChange }) {
  const [mode, setMode] = useState('draw'); // 'draw' | 'upload'
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a2530';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [mode]);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const point = e.touches ? e.touches[0] : e;
    return { x: (point.clientX - rect.left) * scaleX, y: (point.clientY - rect.top) * scaleY };
  }

  function startDraw(e) {
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawing(true);
  }

  function endDraw() {
    drawingRef.current = false;
    emitDrawBlob();
  }

  function emitDrawBlob() {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => onChange(blob), 'image/png');
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
    onChange(null);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    onChange(file);
  }

  function switchMode(newMode) {
    setMode(newMode);
    setHasDrawing(false);
    setUploadFile(null);
    setUploadPreview(null);
    onChange(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          className={mode === 'draw' ? 'btn btn-secondary' : 'btn btn-ghost'}
          onClick={() => switchMode('draw')}
        >
          ✏️ Gambar Tanda Tangan
        </button>
        <button
          type="button"
          className={mode === 'upload' ? 'btn btn-secondary' : 'btn btn-ghost'}
          onClick={() => switchMode('upload')}
        >
          📤 Upload Foto TTD
        </button>
      </div>

      {mode === 'draw' ? (
        <div>
          <canvas
            ref={canvasRef}
            width={500}
            height={200}
            style={{ width: '100%', maxWidth: 500, height: 160, border: '1px solid var(--border)', borderRadius: 10, background: '#fff', touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={clearCanvas}>Hapus & Ulangi</button>
            {hasDrawing ? <span className="muted">✅ Tanda tangan siap</span> : <span className="muted">Gambar di area putih di atas</span>}
          </div>
        </div>
      ) : (
        <div>
          <input type="file" accept="image/*" className="input" onChange={handleFileUpload} />
          {uploadPreview ? (
            <div style={{ marginTop: 10 }}>
              <img src={uploadPreview} alt="Preview tanda tangan" style={{ maxWidth: 300, maxHeight: 150, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }} />
              <div className="muted" style={{ marginTop: 6 }}>✅ {uploadFile?.name}</div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
