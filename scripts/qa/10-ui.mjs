/**
 * QA UI — jalankan halaman produksi di Chrome headless, tangkap:
 *   - error konsol & exception yang tidak tertangkap
 *   - permintaan jaringan yang gagal (4xx/5xx)
 *   - isi DOM yang benar-benar ter-render
 *   - navigasi antar rute (termasuk rute yang butuh login)
 *
 * Pakai CDP lewat WebSocket bawaan Node (tanpa dependensi tambahan).
 *
 * Jalankan: node scripts/qa/10-ui.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HS = path.join(os.homedir(), '.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell');
const PORT = 9333;
const BASE = 'https://c-fill.vercel.app';

const chrome = spawn(HS, [
  '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, '--headless=new', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// tunggu CDP siap
let target = null;
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const list = await r.json();
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
const konsol = [];
const gagalJaringan = [];
const exception = [];

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
    konsol.push(`[${m.params.type}] ${m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ')}`);
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    exception.push(`${d.text} ${d.exception?.description || ''}`.trim().slice(0, 300));
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    konsol.push(`[log] ${m.params.entry.text} ${m.params.entry.url || ''}`.slice(0, 300));
  }
  if (m.method === 'Network.loadingFailed') {
    gagalJaringan.push(`${m.params.type} ${m.params.errorText}`);
  }
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
    gagalJaringan.push(`${m.params.response.status} ${m.params.response.url}`);
  }
};

const send = (method, params = {}) => new Promise((res) => {
  const id = ++msgId;
  pending.set(id, res);
  ws.send(JSON.stringify({ id, method, params }));
});

const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return `EXCEPTION: ${r.result.exceptionDetails.text}`;
  return r.result?.result?.value;
};

await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Page.enable');

async function buka(url, tunggu = 4000) {
  konsol.length = 0; gagalJaringan.length = 0; exception.length = 0;
  await send('Page.navigate', { url });
  await sleep(tunggu);
  return {
    judul: await evalJs('document.title'),
    url: await evalJs('location.href'),
    teks: (await evalJs('document.body.innerText')) || '',
    konsol: [...konsol], gagal: [...gagalJaringan], exception: [...exception],
  };
}

const hasil = {};
console.log('=== UJI UI PRODUKSI ===\n');

// 1. Halaman login
const login = await buka(BASE);
console.log('--- 1. HALAMAN LOGIN ---');
console.log(`  judul : ${login.judul}`);
console.log(`  url   : ${login.url}`);
console.log(`  teks ter-render (${login.teks.length} char):`);
console.log(login.teks.split('\n').filter(Boolean).map((l) => '     ' + l).join('\n'));
console.log(`  error konsol : ${login.konsol.length ? login.konsol.join(' || ') : '(bersih)'}`);
console.log(`  exception    : ${login.exception.length ? login.exception.join(' || ') : '(tidak ada)'}`);
console.log(`  permintaan gagal: ${login.gagal.length ? login.gagal.join(' | ') : '(tidak ada)'}`);
hasil.login = login;

// 2. Elemen penting di halaman login
console.log('\n--- 2. ELEMEN & ASET ---');
console.log(`  tombol login : ${await evalJs("JSON.stringify([...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean))")}`);
console.log(`  input        : ${await evalJs("JSON.stringify([...document.querySelectorAll('input')].map(i=>[i.type,i.placeholder||i.name]))")}`);
console.log(`  manifest     : ${await evalJs("document.querySelector('link[rel=manifest]')?.href || '(tidak ada)'")}`);
console.log(`  ikon         : ${await evalJs("JSON.stringify([...document.querySelectorAll('link[rel*=icon]')].map(l=>l.getAttribute('href')))")}`);
console.log(`  meta theme   : ${await evalJs("document.querySelector('meta[name=theme-color]')?.content")}`);
console.log(`  versi tampil : ${await evalJs("(document.body.innerText.match(/C-Fill[^\\n]*/g)||[]).join(' | ')")}`);
console.log(`  copyright    : ${await evalJs("(document.body.innerText.match(/©[^\\n]*/g)||[]).join(' | ')")}`);

// 3. Aset yang dimuat + status
console.log('\n--- 3. ASET YANG DIMUAT ---');
const aset = await evalJs(`JSON.stringify(performance.getEntriesByType('resource').map(r=>({n:r.name.split('/').pop(), t:r.initiatorType, s:Math.round(r.transferSize||0)})))`);
try {
  const a = JSON.parse(aset);
  console.log(`  jumlah aset: ${a.length}`);
  for (const x of a.slice(0, 18)) console.log(`     ${x.t.padEnd(10)} ${String(x.s).padStart(7)} B  ${x.n}`);
} catch { console.log('  ' + aset); }

// 4. Rute yang butuh login (harus kembali ke login, tidak boleh blank/error)
for (const rute of ['/panduan', '/dashboard', '/verifikasi']) {
  const r = await buka(BASE + rute, 3500);
  const balikKeLogin = r.teks.toLowerCase().includes('login') || r.teks.toLowerCase().includes('masuk') || r.teks.includes('Google');
  console.log(`\n--- 4. RUTE ${rute} (tanpa login) ---`);
  console.log(`  url akhir   : ${r.url}`);
  console.log(`  teks pertama: ${JSON.stringify(r.teks.split('\n').filter(Boolean).slice(0, 4).join(' / '))}`);
  console.log(`  konsol      : ${r.konsol.length ? r.konsol.join(' || ').slice(0, 200) : '(bersih)'}`);
  console.log(`  exception   : ${r.exception.length ? r.exception.join(' || ').slice(0, 200) : '(tidak ada)'}`);
  hasil[rute] = r;
}

// 5. Rute tidak dikenal -> 404 SPA
const nf = await buka(BASE + '/halaman-tidak-ada', 3000);
console.log('\n--- 5. RUTE TIDAK DIKENAL ---');
console.log(`  url    : ${nf.url}`);
console.log(`  teks   : ${JSON.stringify(nf.teks.split('\n').filter(Boolean).slice(0, 4).join(' / '))}`);
console.log(`  konsol : ${nf.konsol.length ? nf.konsol.join(' || ').slice(0, 200) : '(bersih)'}`);
hasil.notfound = nf;

// 6. Manifest & service worker
console.log('\n--- 6. PWA ---');
await buka(BASE, 4000);
console.log(`  service worker terdaftar: ${await evalJs("navigator.serviceWorker.getRegistrations().then(r=>r.length)")}`);
const mf = await fetch(BASE + '/manifest.webmanifest').then((r) => r.json()).catch(() => null);
if (mf) {
  console.log(`  nama     : ${mf.name}`);
  console.log(`  short    : ${mf.short_name}`);
  console.log(`  theme    : ${mf.theme_color}`);
  console.log(`  ikon     : ${JSON.stringify(mf.icons?.map((i) => `${i.sizes} ${i.src.split('/').pop()}`))}`);
} else console.log('  manifest tidak terbaca');

fs.writeFileSync('/tmp/qa-ui.json', JSON.stringify(hasil, null, 1));
ws.close(); chrome.kill();
console.log('\n(ditulis /tmp/qa-ui.json)');
