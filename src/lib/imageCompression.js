/**
 * imageCompression.js
 * Kompresi gambar di sisi browser (pakai Canvas) sebelum upload ke Drive -
 * target ukuran maksimal tertentu, dengan penurunan kualitas seminimal
 * mungkin: turunkan dulu kualitas JPEG secara bertahap (resolusi tetap),
 * baru kalau masih kebesaran, turunkan resolusi (foto HP modern biasanya
 * 12MP+ - jauh lebih besar dari kebutuhan tampil di Drive/Sheets, jadi
 * penurunan resolusi bertahap biasanya nggak kelihatan bedanya).
 */

const MAX_SIZE_BYTES = 800 * 1024; // 800 KB
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4];
const MAX_DIMENSION_STEPS = [2560, 2048, 1600, 1280, 1024];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

/**
 * Kompres 1 file gambar sampai di bawah target ukuran. Return Blob (JPEG)
 * kalau kompresi berhasil & lebih kecil dari file asli, atau file ASLI kalau
 * ternyata sudah di bawah target atau bukan file gambar (tidak ada ruginya
 * coba kompres, hasil terbaik yang dipakai).
 */
export async function compressImageIfNeeded(file, maxSizeBytes = MAX_SIZE_BYTES) {
  if (!file.type || !file.type.startsWith('image/')) {
    return file; // bukan gambar (mis. PDF) - lewati apa adanya
  }
  if (file.size <= maxSizeBytes) {
    return file; // sudah cukup kecil, tidak perlu dikompres
  }

  let img;
  try {
    img = await loadImage(file);
  } catch {
    return file; // gagal baca sbg gambar - upload apa adanya, lebih aman drpd gagal total
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let bestBlob = null;

  for (const maxDim of MAX_DIMENSION_STEPS) {
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    } else if (maxDim !== MAX_DIMENSION_STEPS[0] && bestBlob) {
      // resolusi asli sudah <= step ini dan kita sudah punya hasil dari step
      // sebelumnya (resolusi sama) - skip, tidak ada gunanya diulang
      continue;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    for (const q of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, q);
      if (!blob) continue;
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (blob.size <= maxSizeBytes) {
        URL.revokeObjectURL(img.src);
        return blob; // ketemu kombinasi resolusi+kualitas yang pas, langsung pakai
      }
    }
  }

  URL.revokeObjectURL(img.src);
  // Tidak ada kombinasi yang berhasil di bawah target (gambar ekstrem besar/detail)
  // - pakai hasil terkecil yang berhasil didapat, tetap lebih kecil dari file asli.
  return (bestBlob && bestBlob.size < file.size) ? bestBlob : file;
}

/**
 * Bikin File baru dari Blob hasil kompresi, pertahankan nama file asli
 * (ganti ekstensi ke .jpg kalau berubah format).
 */
export function blobToFile(blob, originalName) {
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const newName = blob.type === 'image/jpeg' ? `${baseName}.jpg` : originalName;
  return new File([blob], newName, { type: blob.type, lastModified: Date.now() });
}
