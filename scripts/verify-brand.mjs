/**
 * Verifikasi hasil render logo C-Fill (dijalankan: npm run verify:brand).
 *
 * Aturannya: setiap cacat yang pernah terjadi diperiksa PIKELNYA, bukan
 * markup-nya. Dua cacat nyata yang pernah lolos:
 *   1. stroke-width ikut diskala oleh transform -> bolt jadi blok penuh.
 *      Sekarang diperiksa: di tengah ikon harus ada area LATAR (bukan tinta),
 *      dan jumlah piksel tinta harus dalam rentang wajar.
 *   2. bolt dinilai geser ke kiri ~19 px -> diperiksa keseimbangan kiri/kanan.
 *
 * Tanpa dependensi tambahan: PNG dibaca sendiri (zlib) supaya bisa jalan pakai
 * node biasa, tanpa memasang library gambar.
 */
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const BRAND = path.join(PUB, 'brand');

let gagal = 0;
let lulus = 0;
const cek = (nama, syarat, detail = '') => {
  if (syarat) { lulus += 1; console.log(`  ✔ ${nama}${detail ? ' — ' + detail : ''}`); }
  else { gagal += 1; console.log(`  ✖ ${nama}${detail ? ' — ' + detail : ''}`); }
};

// ------------------------------------------------------------------ baca PNG
function readPng(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('bukan PNG: ' + file);
  let off = 8;
  let width = 0; let height = 0; let bitDepth = 0; let colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('bit depth tidak didukung: ' + bitDepth);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error('color type tidak didukung: ' + colorType);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const px = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const prev = y === 0 ? null : px.subarray((y - 1) * stride, y * stride);
    const cur = px.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = (prev && x >= channels) ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
  }
  const at = (x, y) => {
    const i = y * stride + x * channels;
    const a = channels === 4 ? px[i + 3] : 255;
    // Piksel transparan di PNG hasil render punya RGB 0,0,0 — kalau dibaca apa
    // adanya, area kosong ikut terhitung sebagai "tinta gelap". Jadi
    // dikompositkan ke atas latar putih dulu (seperti dilihat mata).
    const k = a / 255;
    return {
      r: Math.round(px[i] * k + 255 * (1 - k)),
      g: Math.round(px[i + 1] * k + 255 * (1 - k)),
      b: Math.round(px[i + 2] * k + 255 * (1 - k)),
      a,
    };
  };
  return { width, height, channels, at };
}

const lum = ({ r, g, b }) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Hitung statistik tinta (piksel terang & OPAK) di dalam satu kotak. */
function analisa(img, kotak) {
  const { x0, y0, x1, y1 } = kotak;
  let terang = 0; let gelap = 0; let sumX = 0; let sumY = 0;
  let minX = 1e9; let maxX = -1; let minY = 1e9; let maxY = -1;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = img.at(x, y);
      // "Tinta" = terang DAN opak. Tanpa syarat opak, sudut rounded yang
      // transparan (dikomposit jadi putih) ikut terhitung sebagai tinta dan
      // bbox-nya melebar ke seluruh kanvas.
      if (lum(p) > 150 && p.a > 200) {
        terang += 1; sumX += x; sumY += y;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      } else gelap += 1;
    }
  }
  const total = (x1 - x0) * (y1 - y0);
  return {
    terang, gelap, total,
    rasioTerang: terang / total,
    cx: terang ? sumX / terang : 0,
    cy: terang ? sumY / terang : 0,
    bbox: terang ? { minX, maxX, minY, maxY } : null,
  };
}

// --------------------------------------------------------------- pemeriksaan
console.log('IKON PWA');

const ikon = readPng(path.join(PUB, 'icon-512.png'));
cek('icon-512 ukuran 512x512', ikon.width === 512 && ikon.height === 512,
  `${ikon.width}x${ikon.height}`);

const sudut = ikon.at(2, 2);
const tengahIkon = ikon.at(256, 256);
cek('sudut ikon transparan (rounded corner, bukan kotak penuh)', sudut.a < 40, `alpha=${sudut.a}`);

const dalam = analisa(ikon, { x0: 0, y0: 0, x1: 512, y1: 512 });
// Cacat lama (stroke ikut diskala) -> rasio tinta ~0.42. Ukuran benar ~0.16-0.26.
cek('porsi tinta bolt wajar (bukan blok penuh)', dalam.rasioTerang > 0.10 && dalam.rasioTerang < 0.32,
  `tinta=${(dalam.rasioTerang * 100).toFixed(1)}%`);
cek('bolt tidak menutupi seluruh ikon', dalam.rasioTerang < 0.5);

// Lubang di dalam bolt = bukti garisnya tipis, bukan blok.
let adaLubang = 0;
for (let y = 150; y < 350; y++) {
  for (let x = 240; x < 280; x++) {
    const p = ikon.at(x, y);
    if (lum(p) < 110) adaLubang += 1;
  }
}
cek('ada lubang latar di dalam bolt (garis tipis, bukan bidang padat)', adaLubang > 200,
  `${adaLubang} piksel latar di dalam area bolt`);

// Keseimbangan kiri/kanan & atas/bawah.
const b = dalam.bbox;
const selisihH = Math.abs((b.minX + b.maxX) / 2 - 256);
const selisihV = Math.abs((b.minY + b.maxY) / 2 - 256);
cek('bolt seimbang kiri-kanan', selisihH <= 12, `geser ${selisihH.toFixed(1)} px dari titik tengah`);
cek('bolt seimbang atas-bawah', selisihV <= 12, `geser ${selisihV.toFixed(1)} px dari titik tengah`);
cek('bolt tidak menyentuh tepi ikon', b.minX > 8 && b.maxX < 504 && b.minY > 8 && b.maxY < 504,
  `bbox x ${b.minX}-${b.maxX}, y ${b.minY}-${b.maxY}`);

const maskable = readPng(path.join(PUB, 'icon-maskable-512.png'));
const maskAnalisa = analisa(maskable, { x0: 0, y0: 0, x1: 512, y1: 512 });
const mb = maskAnalisa.bbox;
const jariJari = Math.hypot(256, 256);
const sudutTerjauh = Math.max(
  ...[mb.minX, mb.maxX].flatMap((x) => [mb.minY, mb.maxY].map((y) => Math.hypot(x - 256, y - 256))),
);
cek('icon-maskable aman dipotong bundar (isi di dalam 80% jari-jari)',
  sudutTerjauh < jariJari * 0.80, `terjauh ${sudutTerjauh.toFixed(0)} dari ${jariJari.toFixed(0)}`);

console.log('\nFAVICON');

for (const [nama, ukuran] of [['favicon-32.png', 32], ['favicon-16.png', 16], ['apple-touch-icon.png', 180]]) {
  const img = readPng(path.join(PUB, nama));
  cek(`${nama} ukurannya ${ukuran}x${ukuran}`, img.width === ukuran && img.height === ukuran,
    `${img.width}x${img.height}`);
  const a = analisa(img, { x0: 0, y0: 0, x1: ukuran, y1: ukuran });
  cek(`${nama} punya isi (bukan gambar kosong)`, a.rasioTerang > 0.05, `tinta=${(a.rasioTerang * 100).toFixed(1)}%`);
}

console.log('\nWORDMARK (copyright 2026)');

const wm = readPng(path.join(BRAND, 'wordmark.png'));
cek('wordmark.png ukuran 1200x320', wm.width === 1200 && wm.height === 320, `${wm.width}x${wm.height}`);

// Hierarki tipografi diukur dari TINGGI hurufnya, bukan jumlah piksel tinta:
// baris copyright berisi banyak karakter kecil, jadi jumlah pikselnya bisa
// menyaingi judul walau hurufnya jauh lebih kecil.
function bboxGelap(img, kotak, ambang = 170) {
  const { x0, y0, x1, y1 } = kotak;
  let minX = 1e9; let maxX = -1; let minY = 1e9; let maxY = -1; let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = img.at(x, y);
      if (p.a > 50 && lum(p) < ambang) {
        n += 1;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return n ? { minX, maxX, minY, maxY, tinggi: maxY - minY + 1, lebar: maxX - minX + 1, n } : null;
}

// Rentang baris ditentukan dari layout generator (make-brand.py):
// judul baseline 150, tagline baseline 212, garis pemisah y=232, copyright baseline 276.
const kotakJudul = bboxGelap(wm, { x0: 290, y0: 60, x1: 780, y1: 168 });
const kotakSub = bboxGelap(wm, { x0: 290, y0: 178, x1: 780, y1: 226 });
const kotakCopy = bboxGelap(wm, { x0: 290, y0: 252, x1: 1010, y1: 292 });
cek('judul "C-Fill" terbaca', !!kotakJudul && kotakJudul.tinggi > 60,
  kotakJudul ? `tinggi huruf ${kotakJudul.tinggi} px` : 'tidak ada tinta');
cek('tagline "Communication Fillment" terbaca', !!kotakSub && kotakSub.n > 400,
  kotakSub ? `tinggi huruf ${kotakSub.tinggi} px, ${kotakSub.n} piksel` : 'tidak ada tinta');
cek('baris copyright "© 2026 CCM-Halim" terbaca', !!kotakCopy && kotakCopy.n > 300,
  kotakCopy ? `tinggi huruf ${kotakCopy.tinggi} px, ${kotakCopy.n} piksel` : 'tidak ada tinta');
cek('hierarki jelas: judul >= 3x tinggi huruf copyright',
  kotakJudul && kotakCopy && kotakJudul.tinggi >= kotakCopy.tinggi * 3,
  `judul ${kotakJudul?.tinggi} px vs copyright ${kotakCopy?.tinggi} px`);
cek('copyright masih kebaca (tinggi huruf >= 12 px)',
  kotakCopy && kotakCopy.tinggi >= 12, `${kotakCopy?.tinggi} px`);
cek('urutan baris benar: judul di atas tagline di atas copyright',
  kotakJudul && kotakSub && kotakCopy && kotakJudul.maxY < kotakSub.minY && kotakSub.maxY < kotakCopy.minY,
  `y ${kotakJudul?.maxY} < ${kotakSub?.minY}, ${kotakSub?.maxY} < ${kotakCopy?.minY}`);

const tile = analisa(wm, { x0: 56, y0: 66, x1: 260, y1: 270 });
cek('kotak ikon di wordmark terisi', tile.rasioTerang > 0.03, `tinta=${(tile.rasioTerang * 100).toFixed(1)}%`);

// SVG sumber harus ada supaya bisa diubah/di-scale ulang tanpa generator.
for (const nama of ['appicon.svg', 'monogram.svg', 'wordmark.svg', 'lockup-dark.svg']) {
  const teks = readFileSync(path.join(BRAND, nama), 'utf8');
  cek(`${nama} ada & SVG valid`, teks.startsWith('<svg') && teks.includes('</svg>'));
}
const wmSvg = readFileSync(path.join(BRAND, 'wordmark.svg'), 'utf8');
cek('wordmark.svg tidak memakai <text> (huruf sudah jadi path)',
  !wmSvg.includes('<text'), 'aman dimuat walau font tidak terpasang');

console.log(`\n${lulus} pemeriksaan lolos, ${gagal} gagal`);
process.exit(gagal === 0 ? 0 : 1);
