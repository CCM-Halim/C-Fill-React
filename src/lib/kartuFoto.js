/**
 * kartuFoto.js — foto latar kartu (kategori bangunan / site / kategori peralatan)
 * yang diunggah admin lewat menu "Kelola Kartu".
 *
 * Penyimpanan di Google Drive (bukan di repo), jadi ganti foto TIDAK perlu deploy:
 *   <folder>/_Foto Kartu/kartu-foto.json   -> { "b:<kategori bangunan>": "<fileId>", "s:<site>": ..., "e:<catId>": ... }
 *   <folder>/_Foto Kartu/<file jpg>        -> foto (diperkecil ke ±900px)
 * Foto TIDAK dibuat publik: dibaca pakai token akun yang login (lihat ambilFotoUrl).
 * <folder> = VITE_FOTO_KARTU_FOLDER_ID kalau diisi, kalau tidak subfolder di
 * VITE_ROOT_CHECKSHEET_FOLDER_ID.
 */
import {
  getOrCreateSubfolder, listFilesInFolder, uploadFileToFolder, replaceFileContent,
  readFileContentAsText, writeFileContentAsText, trashFile
} from './driveApi';
import { getValidAccessToken } from './googleAuth';

const FOTO_FOLDER_ENV = import.meta.env.VITE_FOTO_KARTU_FOLDER_ID;
const ROOT_ENV = import.meta.env.VITE_ROOT_CHECKSHEET_FOLDER_ID;
const NAMA_FOLDER = '_Foto Kartu';
const NAMA_CONFIG = 'kartu-foto.json';
const MAX_SISI = 900;

let folderIdCache = null;
let configIdCache = null;

async function getFolderId(buat) {
  if (FOTO_FOLDER_ENV) return FOTO_FOLDER_ENV;
  if (folderIdCache) return folderIdCache;
  if (!ROOT_ENV) throw new Error('VITE_ROOT_CHECKSHEET_FOLDER_ID (atau VITE_FOTO_KARTU_FOLDER_ID) belum diatur.');
  if (!buat) {
    const list = await listFilesInFolder(ROOT_ENV);
    const ada = list.find((f) => f.name === NAMA_FOLDER && f.mimeType === 'application/vnd.google-apps.folder');
    if (!ada) return null;
    folderIdCache = ada.id;
    return ada.id;
  }
  folderIdCache = await getOrCreateSubfolder(ROOT_ENV, NAMA_FOLDER);
  return folderIdCache;
}

async function getConfigId(buat) {
  if (configIdCache) return configIdCache;
  const folderId = await getFolderId(buat);
  if (!folderId) return null;
  const files = await listFilesInFolder(folderId);
  const ada = files.find((f) => f.name === NAMA_CONFIG);
  if (ada) { configIdCache = ada.id; return ada.id; }
  if (!buat) return null;
  const file = new File([new Blob(['{}'], { type: 'application/json' })], NAMA_CONFIG, { type: 'application/json' });
  const dibuat = await uploadFileToFolder(folderId, file);
  configIdCache = dibuat.id;
  return dibuat.id;
}

/** Baca peta { key: fileId }. {} kalau belum ada / gagal. */
export async function bacaKartuFotoConfig() {
  try {
    const id = await getConfigId(false);
    if (!id) return {};
    const parsed = JSON.parse((await readFileContentAsText(id)) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function tulisConfig(config) {
  const id = await getConfigId(true);
  await writeFileContentAsText(id, JSON.stringify(config, null, 1));
}

/** Perkecil foto (sisi terpanjang ≤ 900px) jadi JPEG ±70-120 KB. */
export function perkecilFoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('File harus berupa gambar (JPG/PNG).')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const skala = Math.min(1, MAX_SISI / Math.max(img.width, img.height));
      const w = Math.round(img.width * skala), h = Math.round(img.height * skala);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal memproses gambar.'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibuka (format tidak didukung).')); };
    img.src = url;
  });
}

function namaFile(key) {
  return 'kartu-' + key.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '').slice(0, 60) + '.jpg';
}

/** Upload/ganti foto untuk 1 key. Return config terbaru. */
export async function simpanKartuFoto(key, file, configSekarang) {
  const blob = await perkecilFoto(file);
  const folderId = await getFolderId(true);
  const jpg = new File([blob], namaFile(key), { type: 'image/jpeg' });
  const config = { ...configSekarang };
  if (config[key]) {
    await replaceFileContent(config[key], jpg);   // ID tetap, isi diganti
  } else {
    const dibuat = await uploadFileToFolder(folderId, jpg, 'Foto kartu C-Fill: ' + key);
    config[key] = dibuat.id;
    await tulisConfig(config);
  }
  fotoCache.delete(config[key]);
  return config;
}

export async function hapusKartuFoto(key, configSekarang) {
  const config = { ...configSekarang };
  const id = config[key];
  if (!id) return config;
  delete config[key];
  await tulisConfig(config);
  fotoCache.delete(id);
  try { await trashFile(id); } catch { /* file sudah hilang - abaikan */ }
  return config;
}

// ---- Ambil gambar sebagai blob URL (pakai token, tanpa membuka akses publik) ----
const fotoCache = new Map(); // fileId -> Promise<string|null>

export function ambilFotoUrl(fileId) {
  if (!fileId) return Promise.resolve(null);
  if (!fotoCache.has(fileId)) {
    fotoCache.set(fileId, (async () => {
      try {
        const token = await getValidAccessToken();
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) return null;
        return URL.createObjectURL(await res.blob());
      } catch { return null; }
    })());
  }
  return fotoCache.get(fileId);
}
