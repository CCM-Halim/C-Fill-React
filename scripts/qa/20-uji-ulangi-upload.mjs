/**
 * QA 20 — UJI NYATA TOMBOL "ULANGI" DI HALAMAN DOKUMENTASI.
 *
 * Menjalankan APLIKASI PRODUKSI (hasil `npm run build`, disajikan vite preview)
 * di Chrome headless, memakai CDP lewat WebSocket bawaan Node (tanpa dependensi
 * tambahan, sama seperti QA 10). Yang diuji:
 *
 *   1. halaman Dokumentasi terbuka
 *   2. jaringan upload diputus -> unggahan GAGAL (meniru "Failed to fetch",
 *      kejadian 5 Okt 2026)
 *   3. tombol "Ulangi" muncul di baris yang gagal
 *   4. jaringan dihidupkan, tombol "Ulangi" diklik -> file terunggah
 *      TANPA memilih ulang dari penyimpanan HP
 *   5. file uji dibersihkan dari Drive
 *
 * Jalankan: node scripts/qa/20-uji-ulangi-upload.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TOKEN = fs.readFileSync('/tmp/cfill_access_token.txt', 'utf8').trim();
const PORT = 9444;
const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173';
// Aplikasi memakai BrowserRouter (bukan hash) - rutenya /dokumentasi, bukan #/dokumentasi.
const SHOTS = '/tmp/qa20';
fs.mkdirSync(SHOTS, { recursive: true });

let lulus = 0; const gagal = [];
const cek = (nama, ok, detail = '') => {
  if (ok) { lulus++; console.log(`  \u2714 ${nama}`); }
  else { gagal.push(nama); console.log(`  \u2716 ${nama}${detail ? ' \u2014 ' + detail : ''}`); }
};

const HS = path.join(os.homedir(), '.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell');

const chrome = spawn(HS, [
  '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, '--headless=new', '--window-size=390,844', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target = null;
for (let i = 0; i < 40; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
    if (target) break;
  } catch { /* belum siap */ }
  await sleep(250);
}
if (!target) { chrome.kill(); throw new Error('CDP tidak siap'); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const exception = [];
const konsolError = [];

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    exception.push(`${d.text} ${d.exception?.description || ''}`.trim().slice(0, 200));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    konsolError.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160));
  }
};

const send = (method, params = {}) => new Promise((res) => {
  const id = ++msgId;
  pending.set(id, res);
  ws.send(JSON.stringify({ id, method, params }));
});

const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return 'EXCEPTION: ' + r.result.exceptionDetails.text;
  return r.result?.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('DOM.enable');

console.log('=== QA 20: UJI TOMBOL ULANGI (aplikasi produksi) ===\n');

// ---- isi sesi sandbox SEBELUM skrip halaman jalan ----
// Sesi disimpan di sessionStorage dengan kunci 'cfill_auth_session_v1' dan
// dipulihkan SEKALI saat modul googleAuth.js dimuat (lihat src/lib/googleAuth.js).
// Karena itu harus disuntikkan sebelum skrip halaman berjalan - bukan sesudah,
// sebab kalau sesudah, restore-nya sudah terlanjur kosong.
//
// CATATAN: email di bawah HARUS ada di daftar izin (src/config/access.js),
// kalau tidak AuthProvider akan menganggapnya tidak berhak lalu menghapus sesi.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    try {
      sessionStorage.setItem('cfill_auth_session_v1', JSON.stringify({
        token: { access_token: ${JSON.stringify(TOKEN)}, expires_at: Date.now() + 3600e3 },
        user: { email: 'ccmhalimonsite@gmail.com', name: 'QA Sandbox', picture: '' }
      }));
      localStorage.setItem('cfill_has_logged_in_before', 'true');
    } catch (e) {}
  `,
});

await send('Page.navigate', { url: BASE + '/dokumentasi' });
await sleep(4000);

const adaJudul = await evalJs(`document.body.innerText.includes('Upload Dokumentasi Pekerjaan')`);
console.log(`  halaman Dokumentasi terbuka: ${adaJudul ? 'ya' : 'TIDAK (mungkin terhalang login)'}`);

if (!adaJudul) {
  const teks = await evalJs(`document.body.innerText.slice(0,300)`);
  console.log('  isi halaman: ' + String(teks).replace(/\n/g, ' / ').slice(0, 200));
  console.log('\n  Halaman ini di balik login Google - tidak bisa diklik tanpa login.');
  const shot0 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${SHOTS}/0-terhalang-login.png`, Buffer.from(shot0.result.data, 'base64'));
  chrome.kill();
  process.exit(0);
}

// ---- pilih kategori & site ----
await evalJs(`(() => {
  const s = document.querySelectorAll('select');
  if (s[0]) { s[0].selectedIndex = 1; s[0].dispatchEvent(new Event('change', { bubbles: true })); }
  return s.length;
})()`);
await sleep(800);
await evalJs(`(() => {
  const s = document.querySelectorAll('select');
  if (s[1]) { s[1].selectedIndex = 1; s[1].dispatchEvent(new Event('change', { bubbles: true })); }
  return true;
})()`);
await sleep(1200);

const site = await evalJs(`document.querySelectorAll('select')[1]?.value || ''`);
console.log(`  site terpilih: ${site || '(tidak ada)'}`);

// ---- sisipkan file uji langsung ke input (tanpa dialog HP) ----
const NAMA_UJI = 'uji-ulangi-qa.png';
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAKklEQVR42u3OMQEAAAgDoC251a3gLwSgOXLVkiRJkiRJkiRJkiRJkiRJ0iN6AF0pF3Fxj2NqAAAAAElFTkSuQmCC';

const nodeFile = await send('DOM.getDocument', { depth: -1 });
const inputNode = await send('DOM.querySelector', { nodeId: nodeFile.result.root.nodeId, selector: 'input[type=file]' });

await send('DOM.setFileInputFiles', {
  nodeId: inputNode.result.nodeId,
  files: [], // akan diganti di bawah
}).catch(() => { /* diabaikan */ });

// Chrome headless butuh file NYATA di disk - buat dulu
const filePath = path.join(SHOTS, NAMA_UJI);
fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));

const nodeFile2 = await send('DOM.getDocument', { depth: -1 });
const inputNode2 = await send('DOM.querySelector', { nodeId: nodeFile2.result.root.nodeId, selector: 'input[type=file]' });
const r21 = await send('DOM.setFileInputFiles', { nodeId: inputNode2.result.nodeId, files: [filePath] });
console.log(`  file disisipkan ke input: ${r21.result ? 'ya' : JSON.stringify(r21.error || {})}`);

await evalJs(`(() => { const i=document.querySelector('input[type=file]'); i.dispatchEvent(new Event('change',{bubbles:true})); return i.files.length; })()`);
await sleep(1000);
const jml = await evalJs(`document.querySelector('input[type=file]').files.length`);
console.log(`  input memuat ${jml} file`);

// ---- Putuskan jaringan ke Drive, lalu klik Upload ----
await send('Network.enable');
await send('Network.setBlockedURLs', { urls: ['*googleapis.com/upload/*'] });

console.log('\n  --- jaringan upload DIPUTUS, klik Upload ---');
await evalJs(`(() => { [...document.querySelectorAll('button')].find(b=>/Upload Dokumentasi/.test(b.textContent)).click(); return true; })()`);
await sleep(12000); // 3 percobaan ulang x jeda

const teksGagal = await evalJs(`document.querySelector('.upload-progress')?.innerText || '(tidak ada)'`);
console.log(teksGagal.split('\n').map((l) => '     ' + l).join('\n'));

cek('unggahan gagal saat jaringan diputus', /gagal/i.test(teksGagal), teksGagal.slice(0, 120));
cek('pesan tidak lagi "Failed to fetch" mentah', !/Failed to fetch/i.test(teksGagal), teksGagal.slice(0, 140));
cek('pesan menjelaskan koneksi terputus', /koneksi terputus/i.test(teksGagal), teksGagal.slice(0, 160));
cek('menyebut jumlah percobaan otomatis (3x)', /3x/i.test(teksGagal));

const adaTombol = await evalJs(`document.querySelectorAll('button.btn-ulangi').length`);
cek('tombol "Ulangi" muncul di baris yang gagal', adaTombol > 0, `jumlah: ${adaTombol}`);
const adaTombolSemua = await evalJs(`[...document.querySelectorAll('button')].some(b=>/Ulangi \\d+ file/.test(b.textContent))`);
cek('tombol "Ulangi semua" muncul', adaTombolSemua === true);

const shot1 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(`${SHOTS}/1-setelah-gagal.png`, Buffer.from(shot1.result.data, 'base64'));

// ---- Hidupkan jaringan, klik Ulangi ----
await send('Network.setBlockedURLs', { urls: [] });
console.log('\n  --- jaringan DINYALAKAN, klik "Ulangi" ---');
await evalJs(`(() => { document.querySelector('button.btn-ulangi').click(); return true; })()`);
await sleep(12000);

const teksSukses = await evalJs(`document.querySelector('.upload-progress')?.innerText || '(tidak ada)'`);
console.log(teksSukses.split('\n').map((l) => '     ' + l).join('\n'));

cek('berhasil diunggah pada percobaan ulang', /berhasil/i.test(teksSukses), teksSukses.slice(0, 140));
const tombolSisa = await evalJs(`document.querySelectorAll('button.btn-ulangi').length`);
cek('tombol "Ulangi" hilang setelah berhasil', tombolSisa === 0, `sisa: ${tombolSisa}`);

const shot2 = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(`${SHOTS}/2-setelah-ulangi.png`, Buffer.from(shot2.result.data, 'base64'));

// ---- verifikasi file benar-benar ada di Drive, lalu hapus ----
console.log('\n  --- cek & bersihkan file uji di Drive ---');
const q = encodeURIComponent(`name='${NAMA_UJI}' and trashed=false`);
const cari = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime)`,
  { headers: { Authorization: 'Bearer ' + TOKEN } }).then((r) => r.json());

const ketemu = (cari.files || []).length;
console.log(`  file uji di Drive: ${ketemu}`);
cek('file uji nyata terunggah ke Drive', ketemu > 0);

for (const f of cari.files || []) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + TOKEN }
  });
}
const sisa = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
  { headers: { Authorization: 'Bearer ' + TOKEN } }).then((r) => r.json());
console.log(`  setelah dibersihkan: ${(sisa.files || []).length}`);

cek('tidak ada error konsol', konsolError.length === 0, konsolError.slice(0, 2).join(' | '));
cek('tidak ada exception', exception.length === 0, exception.slice(0, 2).join(' | '));

console.log(`\nhasil: ${lulus} lulus, ${gagal.length} gagal`);
if (gagal.length) console.log('gagal: ' + gagal.join(', '));
console.log('screenshot: ' + SHOTS);

ws.close();
chrome.kill();
process.exit(gagal.length ? 1 : 0);
