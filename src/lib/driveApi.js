/**
 * driveApi.js
 * Wrapper tipis di atas Google Drive API v3, dipanggil langsung dari browser
 * pakai access token OAuth (lihat googleAuth.js).
 *
 * PENTING: semua request menyertakan supportsAllDrives=true &
 * includeItemsFromAllDrives=true. Tanpa ini, folder/file yang ada di dalam
 * SHARED DRIVE (Drive Bersama) tidak akan pernah muncul di hasil pencarian
 * sama sekali (bukan error - hasilnya cuma selalu kosong), meskipun copy/create
 * filenya sendiri tetap berhasil. Ini penyebab paling umum kenapa aplikasi
 * "selalu bikin file baru" - pencarian file yang sudah ada selalu gagal
 * (dianggap tidak ada) padahal filenya betul-betul ada.
 */
import { getValidAccessToken } from './googleAuth';
import { nameVariants } from './tabNames';

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_SUPPORT_PARAMS = 'supportsAllDrives=true&includeItemsFromAllDrives=true';

async function authHeaders() {
  const token = await getValidAccessToken();
  return { Authorization: 'Bearer ' + token };
}

function withDriveParams(path) {
  const sep = path.includes('?') ? '&' : '?';
  return path + sep + DRIVE_SUPPORT_PARAMS;
}

async function driveFetch(path, options = {}) {
  const MAX_ATTEMPTS = 6;
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const headers = { ...(options.headers || {}), ...(await authHeaders()) };
    const res = await fetch(DRIVE_BASE + withDriveParams(path), { ...options, headers });
    if (res.ok) return res.json();

    const body = await res.text();
    lastError = new Error('Drive API error ' + res.status + ': ' + body);

    // Retry utk error server (5xx) ATAU rate-limit (429/403) - keduanya biasanya
    // gangguan sementara, bukan error dari kode kita. Error 4xx lain (permission,
    // not found, dsb) langsung dilempar tanpa retry karena percobaan ulang tidak
    // akan beda.
    const isRetryable = res.status >= 500 || res.status === 429 || res.status === 403;
    if (!isRetryable || attempt === MAX_ATTEMPTS) throw lastError;

    const delay = Math.min(2000 * Math.pow(2, attempt - 1), 32000) + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw lastError;
}

/**
 * Cari folder dengan nama tertentu di dalam parentId. Buat baru kalau belum ada.
 */
export async function getOrCreateSubfolder(parentId, name) {
  const q = encodeURIComponent(
    `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const list = await driveFetch(`/files?q=${q}&fields=files(id,name)&corpora=allDrives`);
  if (list.files && list.files.length > 0) {
    return list.files[0].id;
  }
  const created = await driveFetch('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  });
  return created.id;
}

/**
 * Cari semua file dengan nama tertentu di dalam folder (tipe apapun kalau
 * mimeType tidak diisi). Return array (bisa lebih dari 1 kalau ada duplikat
 * lama) - dipakai untuk deteksi & pembersihan duplikat.
 */
export async function findAllFilesByName(folderId, name, mimeType) {
  const mimeFilter = mimeType ? ` and mimeType = '${mimeType}'` : '';
  const q = encodeURIComponent(
    `'${folderId}' in parents and name = '${name.replace(/'/g, "\\'")}'${mimeFilter} and trashed = false`
  );
  const list = await driveFetch(`/files?q=${q}&fields=files(id,name,mimeType,createdTime,modifiedTime)&corpora=allDrives&orderBy=createdTime`);
  return list.files || [];
}

/**
 * Cari file dengan nama tertentu (tipe apapun) di dalam folder. Kalau ada
 * lebih dari 1 (duplikat lama), ambil yang PALING LAMA dibuat (dianggap
 * yang "asli"/pertama) supaya konsisten dipakai terus.
 */
export async function findFileByExactName(folderId, name, mimeType) {
  const files = await findAllFilesByName(folderId, name, mimeType);
  return files.length > 0 ? files[0] : null;
}

/**
 * PENTING - INI PENYEBAB UTAMA FILE MENUMPUK DI DRIVE:
 * Google Drive MEMBUANG ekstensi ".xlsx" saat file .xlsx dikonversi jadi
 * Google Sheets. File "K10+200 Base Station 2.xlsx" hasil konversinya bernama
 * "K10+200 Base Station 2" (TANPA .xlsx). Kalau pencariannya memakai nama
 * ".xlsx" apa adanya, file hasil konversi TIDAK PERNAH ketemu - jadi aplikasi
 * menganggap "belum pernah dibuat", lalu meng-KONVERSI ULANG dan lahirlah
 * file baru, berulang setiap kali checksheet diisi.
 *
 * Fungsi ini mencari KEDUA varian nama sekaligus (dengan & tanpa .xlsx),
 * digabung lalu diurutkan dari yang paling lama dibuat - supaya file yang
 * sudah ada selalu ketemu.
 */
export async function findAllSheetsForName(folderId, originalFileName) {
  const SHEETS_MIME = 'application/vnd.google-apps.spreadsheet';

  // nameVariants mencakup 4 bentuk sekaligus: nama apa adanya, tanpa ".xlsx",
  // versi '/' -> '_' (aturan Drive), dan versi itu tanpa ".xlsx". Untuk nama
  // file biasa (tanpa '/') hasilnya cuma 2 varian - sama seperti sebelumnya,
  // jadi tidak ada tambahan permintaan API di kasus normal.
  const names = nameVariants(originalFileName);

  const results = await Promise.all(
    names.map((n) => findAllFilesByName(folderId, n, SHEETS_MIME))
  );

  // Gabung + buang duplikat id (kalau ada file yang cocok di kedua varian)
  const merged = [];
  const seen = new Set();
  for (const list of results) {
    for (const f of list) {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        merged.push(f);
      }
    }
  }
  // Paling lama dibuat di urutan pertama - konsisten dipakai terus
  merged.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));

  // -----------------------------------------------------------------------
  // CADANGAN (perbaikan 8 Okt 2026 — K59+662 kembar lagi padahal 19 Sep sudah
  // ada filenya). Kalau pencarian `name = '...'` di atas mengembalikan KOSONG,
  // jangan langsung percaya: daftar ulang SELURUH spreadsheet di folder itu
  // (tanpa filter nama, tanpa orderBy) lalu cocokkan namanya di sisi klien.
  // Ini bentuk query yang sama sekali berbeda, jadi kegagalan halus pada
  // query nama (index Drive, penamaan, orderBy) tidak ikut menjatuhkannya.
  // Tanpa cadangan ini, app menyimpulkan "belum pernah dibuat" lalu meng-
  // KONVERSI ULANG -> file kembar yang riwayatnya (mis. 18/09) hilang.
  // -----------------------------------------------------------------------
  if (merged.length === 0) {
    const semua = await listAllSpreadsheetsInFolder(folderId);
    const target = new Set(names.map(normalizeUntukCocok));
    for (const f of semua) {
      if (target.has(normalizeUntukCocok(f.name)) && !seen.has(f.id)) {
        seen.add(f.id);
        merged.push(f);
      }
    }
    merged.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
  }

  return merged;
}

/** Nama dinormalkan untuk perbandingan: buang ".xlsx", buang semua spasi, lowercase. */
function normalizeUntukCocok(s) {
  return String(s || '')
    .replace(/\.xlsx$/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * Daftar SEMUA Google Sheets di dalam sebuah folder, tanpa filter nama.
 * Dipakai sebagai cadangan pencarian kalau query `name = '...'` mengembalikan
 * kosong padahal filenya ada.
 */
async function listAllSpreadsheetsInFolder(folderId) {
  const SHEETS_MIME = 'application/vnd.google-apps.spreadsheet';
  const q = encodeURIComponent(
    `'${folderId}' in parents and mimeType = '${SHEETS_MIME}' and trashed = false`
  );
  const list = await driveFetch(
    `/files?q=${q}&fields=files(id,name,mimeType,createdTime,modifiedTime)&corpora=allDrives`
  );
  return list.files || [];
}

/**
 * Pindahkan file ke Trash (bisa dipulihkan dari Drive selama ~30 hari).
 * Dipakai HANYA untuk membuang salinan Google Sheets yang baru saja dibuat
 * sendiri saat ternyata perangkat lain sudah lebih dulu membuatnya - jadi
 * yang dibuang pasti file tanpa data (baru dibuat beberapa detik lalu).
 * File lain tidak pernah dihapus otomatis oleh aplikasi.
 */
export async function trashFile(fileId) {
  const token = await getValidAccessToken();
  const res = await fetch(`${DRIVE_BASE}/files/${fileId}?${DRIVE_SUPPORT_PARAMS}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Gagal memindahkan file ke Trash (' + res.status + '): ' + body);
  }
  return res.json();
}

/**
 * Konversi file .xlsx yang sudah ada jadi Google Sheets (copy dengan mimeType baru),
 * supaya bisa ditulisi lewat Sheets API sambil TETAP mempertahankan layout/format
 * aslinya (baris "Tgl", kolom per item, dst - tidak dibuat dari nol).
 *
 * File asal (.xlsx) TIDAK dihapus/diubah - tetap ada sebagai arsip. Hasil konversi
 * disimpan sebagai file baru bertipe Google Sheets, di folder yang sama, dengan nama
 * yang sama persis (supaya gampang dicari lagi lain kali tanpa perlu convert ulang).
 */
/**
 * Waktu dibuat sebuah file dalam milidetik.
 *
 * WAJIB mengembalikan angka yang SAH. Kalau createdTime kosong/NaN, semua
 * perbandingan `new Date(f.createdTime).getTime() < createdAt` bernilai false
 * - dan file kembar TIDAK PERNAH dibuang. Itu yang terjadi pada 8 Okt 2026:
 * K59+662 punya 2 file lagi setelah perbaikan 6 Okt, karena `/copy` dipanggil
 * tanpa meminta createdTime sehingga createdAt = NaN.
 */
async function waktuDibuatMs(file) {
  const t = new Date((file && file.createdTime) || 0).getTime();
  if (Number.isFinite(t) && t > 0) return t;
  try {
    const meta = await driveFetch(`/files/${file.id}?fields=id,createdTime`);
    const t2 = new Date((meta && meta.createdTime) || 0).getTime();
    if (Number.isFinite(t2) && t2 > 0) return t2;
  } catch {
    // jatuh ke nilai cadangan di bawah
  }
  return Date.now();
}

export async function convertXlsxToSheets(xlsxFileId, folderId, targetName) {
  const token = await getValidAccessToken();

  // Retry otomatis untuk error 5xx. Backoff EXPONENSIAL (2s, 4s, 8s, 16s, 32s)
  // bukan cuma linear - soalnya error "Internal Error" pada operasi copy sering
  // sebenarnya rate-limit dari Google (terutama kalau banyak file DIBEDA-beda
  // dikonversi cepat berturut-turut, mis. waktu testing banyak site sekaligus).
  // Rate-limit butuh jeda lebih lama utk reda, bukan cuma retry cepat berkali-kali.
  const MAX_ATTEMPTS = 6;
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(
      `${DRIVE_BASE}/files/${xlsxFileId}/copy?fields=id,name,mimeType,createdTime&${DRIVE_SUPPORT_PARAMS}`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetName,
          mimeType: 'application/vnd.google-apps.spreadsheet',
          parents: [folderId]
        })
      }
    );
    if (res.ok) return res.json();

    const body = await res.text();
    lastError = new Error('Gagal konversi xlsx ke Sheets (' + res.status + '): ' + body);

    const isRetryable = res.status >= 500 || res.status === 429 || res.status === 403;
    if (!isRetryable || attempt === MAX_ATTEMPTS) throw lastError;

    const delay = Math.min(2000 * Math.pow(2, attempt - 1), 32000) + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw lastError;
}

/**
 * Cari/siapkan versi Google Sheets dari sebuah site: kalau sudah pernah dikonversi
 * sebelumnya (ada file Sheets dengan nama tsb di folder), pakai itu. Kalau belum,
 * cari file .xlsx aslinya (originalFileName), konversi sekali, lalu pakai hasilnya.
 *
 * Di-cache di localStorage (BUKAN cuma memori JS) supaya bertahan walaupun
 * halaman di-refresh / navigasi antar halaman - jadi submit berikutnya untuk
 * site yang sama TIDAK cari ulang lewat Drive Search API (yang punya jeda
 * index setelah file baru dibuat, sumber utama bug "selalu bikin file baru").
 */
const CACHE_KEY = 'cfill_spreadsheet_cache_v1';

/**
 * Kunci anti-balapan (race) antar-panggilan yang jalan BARENGAN di tab yang
 * sama. Beberapa bagian UI bisa minta spreadsheet site yang sama dalam waktu
 * hampir bersamaan (daftar kategori + form checksheet). Tanpa ini, dua
 * panggilan yang start bersamaan sama-sama TIDAK menemukan file (yang pertama
 * belum selesai membuat) lalu sama-sama meng-KONVERSI - hasilnya langsung 2
 * file Google Sheets dengan nama sama di folder yang sama.
 */
const IN_FLIGHT = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCacheEntry(key, spreadsheetId) {
  try {
    const cache = loadCache();
    cache[key] = spreadsheetId;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage penuh/diblokir - abaikan, tidak kritikal (cuma optimisasi)
  }
}

/** Buang 1 entri cache (dipakai kalau file yang ditunjuk ternyata sudah hilang). */
function hapusCacheEntry(key) {
  try {
    const cache = loadCache();
    if (key in cache) {
      delete cache[key];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch {
    /* abaikan */
  }
}

/**
 * Pastikan file yang ditunjuk cache masih benar-benar ADA dan bisa dibuka.
 *
 * KENAPA INI PENTING (kasus nyata K10+200, 7 Okt 2026):
 * Cache di localStorage menyimpan id spreadsheet per site supaya tidak perlu
 * mencari ulang ke Drive tiap kali. Tapi kalau file itu kemudian dipindah,
 * dibuang ke Trash, atau aksesnya dicabut, cache tetap menunjuk ke sana.
 * Pemanggil berikutnya langsung memakai id mati itu -> Google mengembalikan
 * 404 -> fungsi pemanggil menangkap error dan menyimpulkan "belum diisi".
 *
 * Akibatnya: site yang cache-nya basi akan SELALU diminta mengisi Entry/Exit
 * ulang, berkali-kali, walau isinya sudah ada. Cache jadi tidak bisa
 * menyembuhkan diri sendiri karena isinya tidak pernah diverifikasi.
 *
 * Sekarang: dicek dulu (~1 permintaan API ringan), dan kalau file-nya sudah
 * tidak ada, entri cache dibuang lalu dicari ulang seperti biasa.
 */
async function cacheMasihHidup(spreadsheetId) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=id,trashed&supportsAllDrives=true`,
      { headers: await authHeaders() }
    );
    return res.ok;
  } catch {
    // Kegagalan jaringan BUKAN bukti file hilang - jangan buang cache karena
    // ini, nanti malah memicu pencarian ulang yang tidak perlu.
    return true;
  }
}

/**
 * Ringkas daftar salinan Google Sheets dengan nama sama supaya bisa
 * DITAMPILKAN ke user (id + tanggal), bukan cuma disebut jumlahnya. Tanpa
 * id, teknisi/admin tidak bisa membuka salinan mana yang mau digabung/dihapus
 * - dan itulah satu-satunya tindakan yang benar untuk masalah ini.
 */
function ringkasDuplikat(files) {
  return files.map((f, i) => ({
    urutan: i + 1,
    id: f.id,
    nama: f.name,
    dipakai: i === 0,
    dibuat: (f.createdTime || '').slice(0, 10),
    diubah: (f.modifiedTime || '').slice(0, 10),
    url: `https://docs.google.com/spreadsheets/d/${f.id}/edit`
  }));
}

/**
 * Peringatan duplikat yang BISA DITINDAKLANJUTI: menyebut file mana yang
 * dipakai (dengan tanggal) dan salinan mana saja yang diabaikan.
 *
 * Catatan: aplikasi TIDAK pernah menghapus file berisi data - salinan hanya
 * dihapus otomatis kalau baru saja dibuat sendiri (lihat resolveSiteSpreadsheet),
 * jadi penggabungan & penghapusan salinan lama tetap keputusan manual admin.
 */
function peringatanDuplikat(jumlah, namaDipakai, duplikat) {
  if (jumlah <= 1) return null;
  const lain = (duplikat || []).filter((d) => !d.dipakai);
  const daftar = lain.map((d) => `${d.urutan}. dibuat ${d.dibuat}, terakhir diubah ${d.diubah}`).join('; ');
  return `Ditemukan ${jumlah} file Google Sheets bernama sama di folder ini. Aplikasi memakai yang PALING LAMA dibuat ("${namaDipakai}"). ` +
    `Salinan yang diabaikan - ${daftar}. ` +
    `Kalau ada isian di salinan lain, gabungkan dulu ke file yang dipakai, lalu hapus salinan sisanya.`;
}

export async function getOrConvertSiteSpreadsheet(folderId, originalFileName) {
  const cacheKey = folderId + '|' + originalFileName;
  const cache = loadCache();
  if (cache[cacheKey]) {
    // Cache dipakai HANYA kalau file yang ditunjuk masih hidup. Kalau sudah
    // dibuang/dipindah, entri basi itu dibuang dan pencarian diulang - kalau
    // tidak, site ini akan selamanya dianggap "belum punya file" (dan terus
    // diminta mengisi Entry/Exit ulang) sampai teknisi membersihkan cache
    // sendiri lewat DevTools, yang jelas tidak realistis.
    if (await cacheMasihHidup(cache[cacheKey])) {
      return { spreadsheetId: cache[cacheKey], duplicateWarning: null, duplicates: null, usedName: null };
    }
    hapusCacheEntry(cacheKey);
  }

  // Kalau ada panggilan lain (tab yang sama) yang sedang menyiapkan spreadsheet
  // yang SAMA PERSIS, tunggu hasilnya - jangan jalan sendiri dan ikut bikin
  // salinan baru. Ini yang mencegah 2 file tercipta berbarengan.
  if (IN_FLIGHT.has(cacheKey)) {
    return IN_FLIGHT.get(cacheKey);
  }

  const task = resolveSiteSpreadsheet(folderId, originalFileName, cacheKey)
    .finally(() => IN_FLIGHT.delete(cacheKey));
  IN_FLIGHT.set(cacheKey, task);
  return task;
}

async function resolveSiteSpreadsheet(folderId, originalFileName, cacheKey) {
  const sheetsMime = 'application/vnd.google-apps.spreadsheet';
  const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // Berapa kali pencarian diulang. Percobaan PERTAMA tidak diulang-ulang -
  // kalau memang sudah ada (kasus normal) hasilnya langsung ketemu, jadi tidak
  // perlu nunggu. Pengulangan cuma dipakai untuk kasus langka "file baru saja
  // dibuat perangkat lain, index Drive belum keburu update" yang tidak bisa
  // dibedakan dari "memang belum pernah dibuat" pada pencarian pertama.
  const MAX_SEARCH_ROUNDS = 3;

  for (let round = 1; round <= MAX_SEARCH_ROUNDS; round++) {
    // findAllSheetsForName mencari nama DENGAN dan TANPA ".xlsx" sekaligus -
    // Drive membuang ekstensi itu saat konversi, itu sebabnya file hasil
    // konversi sebelumnya selalu dianggap "tidak ada".
    const allSheets = await findAllSheetsForName(folderId, originalFileName);
    if (allSheets.length > 0) {
      // findAllSheetsForName sudah mengurutkan dari yang PALING LAMA dibuat,
      // jadi salinan pertama (yang dipakai terus oleh semua perangkat) selalu
      // terpilih - bukan hasil acak.
      const chosen = allSheets[0];
      saveCacheEntry(cacheKey, chosen.id);
      const duplikat = allSheets.length > 1 ? ringkasDuplikat(allSheets) : null;
      return {
        spreadsheetId: chosen.id,
        usedName: chosen.name,
        duplicates: duplikat,
        duplicateWarning: peringatanDuplikat(allSheets.length, chosen.name, duplikat)
      };
    }

    // Belum ketemu. Kalau file .xlsx aslinya JUGA belum ada, berarti ini
    // memang site yang belum pernah dikonversi sama sekali -> langsung
    // konversi, tidak perlu ngulang-ngulang pencarian (hemat waktu ~4,5 detik
    // per site baru).
    // .xlsx aslinya juga dicari dengan varian nama (nama file di Drive tidak
    // boleh memuat '/', jadi "Power Meter / Dynamometer" tersimpan sebagai
    // "Power Meter _ Dynamometer").
    let xlsx = await findFileByExactName(folderId, originalFileName, xlsxMime);
    if (!xlsx) {
      for (const v of nameVariants(originalFileName)) {
        xlsx = await findFileByExactName(folderId, v, xlsxMime);
        if (xlsx) break;
      }
    }
    if (!xlsx) {
      throw new Error(
        `File asli "${originalFileName}" tidak ditemukan di folder site ini. ` +
        `Pastikan file .xlsx checksheet asli sudah ada di folder Drive site tersebut.`
      );
    }

    // ---------------------------------------------------------------------
    // PENTING (perbaikan 6 Okt 2026 — "file baru lagi"):
    //
    // Sebelumnya, kalau pencarian di atas gagal, app LANGSUNG meng-KONVERSI
    // tanpa memakai `round`. Akibatnya jeda bertingkat (sleep) dan pengecekan
    // ulang yang sudah ditulis di bawah tidak pernah jalan — padahal itulah
    // satu-satunya pengaman untuk kasus "perangkat lain baru saja membuat
    // file, tapi indeks Drive belum sempat memperlihatkannya". Karena jeda
    // tidak pernah dijalankan, percobaan VERIFIKASI sesudah konversi pun
    // sering sudah berakhir sebelum file lama muncul -> app mengira salinan
    // miliknya yang paling tua -> tersimpan sebagai file baru di samping file
    // lama yang berisi data. Itulah asal 13 pasang file kembar di Drive.
    //
    // Sekarang: tunggu sebentar lalu CARI ULANG sebelum memutuskan mengonversi.
    // Hanya perangkat yang benar-benar kalah balapan cepat (indeks Drive belum
    // update setelah ~3,5 detik) yang akan mengonversi — dan itu tetap
    // tertangkap oleh pengecekan pasca-konversi di bawah.
    // ---------------------------------------------------------------------
    if (round < MAX_SEARCH_ROUNDS) {
      await sleep(round * 1500);
      continue;
    }

    // Pencarian diulang tetap kosong, padahal .xlsx aslinya ada -> kemungkinan
    // besar perangkat lain sedang/baru saja membuatnya. Jeda sebentar, lalu
    // cek di luar cache: kalau ternyata perangkat lain sudah membuatnya, pakai
    // file ITU (app tidak pernah membuat salinan kedua).
    await sleep(1200);
    const afterWait = await findAllSheetsForName(folderId, originalFileName);
    if (afterWait.length > 0) {
      const chosen = afterWait[0];
      saveCacheEntry(cacheKey, chosen.id);
      const duplikat = afterWait.length > 1 ? ringkasDuplikat(afterWait) : null;
      return {
        spreadsheetId: chosen.id,
        usedName: chosen.name,
        duplicates: duplikat,
        duplicateWarning: peringatanDuplikat(afterWait.length, chosen.name, duplikat)
      };
    }

    // Benar-benar tidak ada -> konversi. SETELAH konversi selesai, pastikan
    // dulu file kita benar-benar sudah MUNCUL di hasil pencarian (index Drive
    // tidak langsung update) - kalau belum, salinan perangkat lain yang dibuat
    // lebih dulu juga belum terlihat, jadi keputusannya bisa salah. Baru
    // setelah kelihatan, bandingkan: kalau ada salinan yang dibuat LEBIH DULU,
    // punya kitalah yang berlebih dan dibuang (yang dibuang selalu salinan
    // yang baru saja kita buat sendiri barusan - tidak pernah file berisi data).
    const converted = await convertXlsxToSheets(xlsx.id, folderId, originalFileName);

    // Tunggu file kita muncul, DAN setelah itu masih cari di luar file kita
    // sendiri beberapa putaran lagi — supaya salinan yang dibuat perangkat
    // lain (indeks Drive-nya bisa telat) tetap sempat terlihat. Sebelumnya
    // loop ini berhenti di putaran pertama begitu file kita terlihat, jadi
    // salinan lama sering belum keburu muncul.
    let verify = [];
    for (let wait = 1; wait <= 8; wait++) {
      await sleep(wait * 1200);
      verify = await findAllSheetsForName(folderId, originalFileName);
      // Syarat lanjut: file kita sudah terlihat DAN sudah ada putaran
      // pengecekan lagi setelah itu untuk mengintip salinan yang lebih tua.
      const terlihat = verify.some((f) => f.id === converted.id);
      if (terlihat && wait >= 2) break;
    }

    const createdAt = await waktuDibuatMs(converted);
    const olderThanMine = verify
      .filter((f) => f.id !== converted.id)
      .filter((f) => new Date(f.createdTime).getTime() < createdAt);

    if (olderThanMine.length > 0) {
      const winner = olderThanMine[0]; // paling lama dibuat
      try {
        await trashFile(converted.id);
      } catch {
        // Gagal buang salinan berlebih jangan sampai menggagalkan penyimpanan
        // teknisi - yang penting datanya masuk ke file yang benar.
      }
      saveCacheEntry(cacheKey, winner.id);
      return {
        spreadsheetId: winner.id,
        usedName: winner.name,
        duplicates: null,
        duplicateWarning: 'Ada perangkat lain yang lebih dulu membuat file ini. Salinan kosong yang baru dibuat otomatis dibuang; yang dipakai adalah file yang lebih dulu ada.'
      };
    }

    // Pengecekan terakhir SEBELUM memakai file sendiri: kalau ternyata file
    // yang lebih tua baru muncul belakangan, pakai itu dan buang punya kita.
    // Satu putaran lagi dengan jeda lebih panjang — ini murah (~1,5 detik)
    // dibanding risiko membuat file kembar yang isinya terpisah.
    await sleep(1500);
    const finalCheck = await findAllSheetsForName(folderId, originalFileName);
    const lebihTua = finalCheck
      .filter((f) => f.id !== converted.id)
      .filter((f) => new Date(f.createdTime).getTime() < createdAt);
    if (lebihTua.length > 0) {
      try {
        await trashFile(converted.id);
      } catch {
        /* abaikan — data tetap masuk ke file yang benar */
      }
      saveCacheEntry(cacheKey, lebihTua[0].id);
      return {
        spreadsheetId: lebihTua[0].id,
        usedName: lebihTua[0].name,
        duplicates: null,
        duplicateWarning: 'Ada perangkat lain yang lebih dulu membuat file ini. Salinan kosong yang baru dibuat otomatis dibuang; yang dipakai adalah file yang lebih dulu ada.'
      };
    }

    // ---------------------------------------------------------------------
    // PENYAPU TERAKHIR (perbaikan 8 Okt 2026 — K59+662 kembar lagi).
    //
    // Dua pengecekan di atas hanya jalan kalau `createdAt` valid. Kalau
    // createdAt keliru/NaN, keduanya diam-diam lolos dan file kembar tetap
    // lahir. Jadi sebelum memakai file sendiri, CARI ULANG sekali lagi dan
    // pilih yang PALING LAMA secara langsung — tidak bergantung pada
    // createdAt punya kita sama sekali. Kalau yang paling lama ternyata bukan
    // file kita, file kita yang dibuang.
    // ---------------------------------------------------------------------
    await sleep(1200);
    const sapu = await findAllSheetsForName(folderId, originalFileName);
    const milikOrangLain = sapu.filter((f) => f.id !== converted.id);
    if (milikOrangLain.length > 0) {
      const tertua = milikOrangLain[0]; // findAllSheetsForName sudah urut tertua
      try {
        await trashFile(converted.id);
      } catch {
        /* abaikan — data tetap masuk ke file yang benar */
      }
      saveCacheEntry(cacheKey, tertua.id);
      return {
        spreadsheetId: tertua.id,
        usedName: tertua.name,
        duplicates: null,
        duplicateWarning:
          'Sudah ada file untuk site ini; salinan kosong yang baru dibuat otomatis dibuang dan yang dipakai adalah file yang lebih dulu ada.'
      };
    }

    saveCacheEntry(cacheKey, converted.id);
    return { spreadsheetId: converted.id, usedName: converted.name, duplicates: null, duplicateWarning: null };
  }
}

/**
 * Hapus cache lokal (dipakai kalau perlu paksa aplikasi cari ulang dari Drive -
 * misalnya setelah kamu menghapus manual file duplikat lewat Drive). Bisa
 * dipanggil dari browser console: import('./lib/driveApi').then(m => m.clearSpreadsheetCache())
 * - atau lebih gampang, cukup buka DevTools Console dan jalankan:
 *   localStorage.removeItem('cfill_spreadsheet_cache_v1')
 */
export function clearSpreadsheetCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // abaikan
  }
}

/**
 * Upload gambar tanda tangan (Blob/File) ke folder tertentu, lalu set izin
 * "siapapun yang punya link bisa lihat" - supaya bisa dirender lewat formula
 * =IMAGE(...) di Google Sheets (butuh URL yang bisa diakses tanpa login).
 * Return URL langsung yang kompatibel dipakai di =IMAGE().
 */
export async function uploadPublicImage(folderId, blob, fileName) {
  const token = await getValidAccessToken();
  const metadata = { name: fileName, parents: [folderId] };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch(
    `${UPLOAD_BASE}/files?uploadType=multipart&fields=id&${DRIVE_SUPPORT_PARAMS}`,
    { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Upload tanda tangan gagal (' + res.status + '): ' + body);
  }
  const file = await res.json();

  // Set permission publik (link-only, cuma viewer) supaya =IMAGE() bisa mengambilnya
  await fetch(`${DRIVE_BASE}/files/${file.id}/permissions?${DRIVE_SUPPORT_PARAMS}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  });

  return { fileId: file.id, imageUrl: `https://lh3.googleusercontent.com/d/${file.id}` };
}

/**
 * Cari folder di dalam parent yang NAMANYA MENGANDUNG teks tertentu (bukan
 * harus persis sama) - dipakai buat cocokkan folder site di "Dokumentasi
 * Kegiatan" yang formatnya nggak seragam (kadang "K21+020 (6 Agustus 2026)",
 * kadang "K 21 + 020 ( 6 agustus 2026 )" dst). Perbandingan dilakukan setelah
 * SEMUA SPASI dihapus dari kedua sisi, biar variasi spasi nggak masalah.
 */
export async function findFolderContaining(parentId, searchTerm) {
  const list = await driveFetch(`/files?q=${encodeURIComponent(`'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)}&fields=files(id,name)&corpora=allDrives`);
  const normalizedSearch = searchTerm.replace(/\s+/g, '').toLowerCase();
  const found = (list.files || []).find((f) => f.name.replace(/\s+/g, '').toLowerCase().includes(normalizedSearch));
  return found ? found.id : null;
}

/**
 * Upload 1 file (blob/File dari <input type="file">) ke folder tertentu.
 */
export async function uploadFileToFolder(folderId, file, description) {
  const token = await getValidAccessToken();
  const metadata = { name: file.name, parents: [folderId] };
  if (description) metadata.description = description;

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch(
    `${UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,webViewLink&${DRIVE_SUPPORT_PARAMS}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: form
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Upload gagal (' + res.status + '): ' + body);
  }
  return res.json();
}

/**
 * List file di dalam sebuah folder (dipakai untuk riwayat dokumentasi).
 */
export async function listFilesInFolder(folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const list = await driveFetch(
    `/files?q=${q}&fields=files(id,name,webViewLink,modifiedTime,size)&orderBy=modifiedTime desc&corpora=allDrives`
  );
  return list.files || [];
}

/**
 * Timpa ISI file yang SUDAH ADA (media re-upload) - ID & link publik file itu
 * TIDAK BERUBAH walau isinya diganti. Dipakai buat fitur "Ganti Foto Header
 * Login" (admin) - foto baru langsung tampil ke semua orang tanpa perlu
 * update konfigurasi/link apapun, karena ID file-nya tetap sama.
 */
export async function replaceFileContent(fileId, file) {
  const token = await getValidAccessToken();
  const res = await fetch(
    `${UPLOAD_BASE}/files/${fileId}?uploadType=media&${DRIVE_SUPPORT_PARAMS}`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': file.type },
      body: file
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Gagal mengganti isi file (' + res.status + '): ' + body);
  }
  return res.json();
}

/**
 * Pastikan sebuah file bisa diakses PUBLIK (anyone with link, view only) -
 * dipakai supaya foto header login bisa ditampilkan di halaman login TANPA
 * perlu login dulu (halaman login itu sendiri belum ada akses token Google).
 */
export async function makeFilePublic(fileId) {
  const token = await getValidAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?${DRIVE_SUPPORT_PARAMS}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  });
}

/**
 * Baca ISI MENTAH (teks) 1 file Drive biasa (bukan Google Sheets) - dipakai
 * buat baca file config kecil (mis. JSON penyimpan link override jadwal
 * bulanan yang diatur admin).
 */
export async function readFileContentAsText(fileId) {
  const token = await getValidAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&${DRIVE_SUPPORT_PARAMS}`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!res.ok) {
    throw new Error('Gagal membaca file (' + res.status + ')');
  }
  return res.text();
}

/**
 * Timpa isi file teks/JSON biasa dengan konten baru (string).
 */
export async function writeFileContentAsText(fileId, content, mimeType = 'application/json') {
  const token = await getValidAccessToken();
  const res = await fetch(`${UPLOAD_BASE}/files/${fileId}?uploadType=media&${DRIVE_SUPPORT_PARAMS}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': mimeType },
    body: content
  });
  if (!res.ok) {
    throw new Error('Gagal menulis file (' + res.status + ')');
  }
  return res.json();
}

/**
 * Ekstrak file ID dari berbagai bentuk URL Google Sheets/Drive, atau kalau
 * inputnya udah berupa ID polos (bukan URL), pakai apa adanya.
 */
export function extractDriveFileId(urlOrId) {
  const trimmed = (urlOrId || '').trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]{15,})/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) return trimmed; // sudah berupa ID polos
  return null;
}

