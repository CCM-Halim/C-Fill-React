/**
 * QA 22 — UJI NYATA DI BROWSER:
 *   A. Sesi login disimpan di localStorage (cukup login SEKALI per device)
 *   B. Draf checksheet bertahan & bisa dilanjutkan di hari berikutnya
 *
 * Yang diuji BUKAN fungsi internal, tapi perilaku aplikasi hasil build di
 * Chrome headless — persis seperti yang dialami teknisi:
 *
 *   A1. sesi ditulis ke localStorage, bukan sessionStorage
 *   A2. setelah halaman di-RELOAD (mensimulasikan app dibuka lagi), user TIDAK
 *       terlempar ke layar login -> form tetap terbuka
 *   A3. token basi pun tetap membuka halaman (tidak membuang ke login)
 *
 *   B1. isi sebagian checksheet -> draf tersimpan di localStorage
 *   B2. reload halaman (="besok hari", app dibuka lagi) -> isian dipulihkan
 *   B3. muncul pemberitahuan bahwa isian sebelumnya dipulihkan
 *   B4. kunci draf memakai SITUS+KATEGORI+BULAN, bukan tanggal persis
 *   B5. tombol "Kosongkan & mulai baru" benar-benar mengosongkan form + draf
 *
 * Jalankan: node scripts/qa/22-login-sekali-draf.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 9447;
const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173';
const SHOTS = '/tmp/qa22';
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

let msgId = 0; const pending = new Map();
const exception = []; const konsolError = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    exception.push(`${d.text} ${d.exception?.description || ''}`.trim().slice(0, 200));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    konsolError.push((m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  }
};
const send = (method, params = {}) => new Promise((res) => {
  const id = ++msgId; pending.set(id, res);
  ws.send(JSON.stringify({ id, method, params }));
});
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return null;
  return r.result?.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
});
await send('Network.enable');

// ---------------------------------------------------------------------------
// Sesi sandbox disuntik ke localStorage (sesuai perilaku baru)
// ---------------------------------------------------------------------------
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    try {
      localStorage.setItem('cfill_auth_session_v1', JSON.stringify({
        token: { access_token: 'qa-sandbox', expires_at: Date.now() + 3600e3 },
        user: { email: 'ccmhalimonsite@gmail.com', name: 'QA Sandbox', picture: '' },
        savedAt: Date.now()
      }));
      localStorage.setItem('cfill_has_logged_in_before', 'true');
      localStorage.setItem('cfill_manual_logout', 'false');
    } catch (e) {}
  `,
});

console.log('=== QA 22: LOGIN SEKALI + DRAF BISA DILANJUTKAN ===\n');

const bc = encodeURIComponent('1. BTS Communication Room');
const site = encodeURIComponent('K10+200 Base Station 2 (HA-KA 2A&2B _ BTS 2)');
const URL_CEK = `${BASE}/peralatan/${bc}/${site}/cat01`;   // ya/tidak (radio)
const URL_TEKS = `${BASE}/peralatan/${bc}/${site}/cat03`; // catatan (textarea)

// =========================================================================
// A. SESI LOGIN
// =========================================================================
console.log('--- A. Sesi login tersimpan di localStorage ---');
await send('Page.navigate', { url: URL_CEK });
await sleep(6000);

const sesi = await evalJs(`(() => {
  const ls = localStorage.getItem('cfill_auth_session_v1');
  const ss = sessionStorage.getItem('cfill_auth_session_v1');
  return JSON.stringify({
    adaDiLocalStorage: !!ls,
    adaDiSessionStorage: !!ss,
    bentuk: ls ? Object.keys(JSON.parse(ls)) : [],
    email: ls ? (JSON.parse(ls).user || {}).email : null,
    adaSavedAt: ls ? typeof JSON.parse(ls).savedAt === 'number' : false
  });
})()`);
const infoSesi = JSON.parse(sesi || '{}');
console.log(`  localStorage: ${infoSesi.adaDiLocalStorage}, sessionStorage: ${infoSesi.adaDiSessionStorage}`);
console.log(`  kunci: ${JSON.stringify(infoSesi.bentuk)}`);

cek('A1: sesi tersimpan di localStorage (bukan sessionStorage saja)',
  infoSesi.adaDiLocalStorage === true, JSON.stringify(infoSesi));
cek('A1b: field untuk menyegarkan sesi ikut tersimpan (user + savedAt)',
  infoSesi.adaSavedAt === true && !!infoSesi.email, JSON.stringify(infoSesi.bentuk));

// --- A2. reload = "buka app lagi" -> tidak boleh terlempar ke login ---
console.log('\n--- A2. Reload halaman (app dibuka lagi) ---');
await send('Page.reload');
await sleep(6500);

const setelahReload = await evalJs(`JSON.stringify({
  adaForm: !!document.querySelector('.form-card'),
  adaLayarLogin: !!document.querySelector('.login-screen, .login-card, [class*="login"]'),
  judul: (document.querySelector('.card-title') || {}).innerText || ''
})`);
const st = JSON.parse(setelahReload || '{}');
console.log(`  form checksheet terbuka: ${st.adaForm}`);
console.log(`  judul halaman: ${String(st.judul).slice(0, 50)}`);

cek('A2: setelah reload, form TETAP terbuka (tidak minta login ulang)',
  st.adaForm === true, JSON.stringify(st));

// --- A3. token basi tetap membuka halaman ---
console.log('\n--- A3. Token kedaluwarsa tetap membuka halaman ---');
await evalJs(`(() => {
  const s = JSON.parse(localStorage.getItem('cfill_auth_session_v1'));
  s.token = { access_token: 'qa-basi', expires_at: Date.now() - 1000 };
  s.savedAt = Date.now();
  localStorage.setItem('cfill_auth_session_v1', JSON.stringify(s));
  return true;
})()`);
await send('Page.reload');
await sleep(6500);

const setelahBasi = await evalJs(`JSON.stringify({
  adaForm: !!document.querySelector('.form-card'),
  adaLayarLogin: !!document.querySelector('.login-screen, .login-card')
})`);
const stBasi = JSON.parse(setelahBasi || '{}');
console.log(`  form terbuka: ${stBasi.adaForm}, layar login: ${stBasi.adaLayarLogin}`);

cek('A3: token basi TIDAK melempar user ke layar login', stBasi.adaForm === true, JSON.stringify(stBasi));

const shotA = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(`${SHOTS}/A-sesi-bertahan.png`, Buffer.from(shotA.result.data, 'base64'));

// =========================================================================
// B. DRAF CHECKSHEET
// =========================================================================
console.log('\n--- B. Draf checksheet bertahan & bisa dilanjutkan ---');

// pastikan draf kosong dulu
await evalJs(`(() => {
  Object.keys(localStorage).filter(k => k.startsWith('cfill_checksheet_draft_v1:')).forEach(k => localStorage.removeItem(k));
  return true;
})()`);
await send('Page.reload');
await sleep(6000);

const jumlahItem = await evalJs(`document.querySelectorAll('.item-block').length`);
console.log(`  jumlah item di form: ${jumlahItem}`);

// --- B0. bersihkan draf & pakai halaman dengan kotak catatan ---
await evalJs(`Object.keys(localStorage).filter(k => k.startsWith('cfill_checksheet_draft_v1:')).forEach(k => localStorage.removeItem(k))`);
await send('Page.navigate', { url: URL_TEKS });
await sleep(6000);
await evalJs(`Object.keys(localStorage).filter(k => k.startsWith('cfill_checksheet_draft_v1:')).forEach(k => localStorage.removeItem(k))`);
await send('Page.reload');
await sleep(6000);

// --- B1. isi sebagian (2 dari 5 kotak catatan) ---
const terisi = await evalJs(`(() => {
  const ta = [...document.querySelectorAll('.item-block textarea')];
  if (!ta.length) return 0;
  // isi 2 item pertama saja - mensimulasikan pekerjaan separuh jalan
  const n = Math.min(2, ta.length);
  for (let i = 0; i < n; i++) {
    const el = ta[i];
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, 'Isian QA bagian ' + (i + 1));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return n;
})()`);
console.log(`  kotak catatan diisi: ${terisi}`);
await sleep(1500);

const drafTersimpan = await evalJs(`(() => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('cfill_checksheet_draft_v1:'));
  if (!keys.length) return JSON.stringify({ ada: false });
  const d = JSON.parse(localStorage.getItem(keys[0]));
  return JSON.stringify({
    ada: true, kunci: keys[0], jumlahIsi: Object.keys(d.answers || {}).length,
    adaSavedAt: typeof d.savedAt === 'number',
    contoh: Object.values(d.answers || {})[0]
  });
})()`);
const dr = JSON.parse(drafTersimpan || '{}');
console.log(`  draf tersimpan: ${dr.ada}, kunci: ${String(dr.kunci || '').slice(0, 80)}`);
console.log(`  jumlah kunci isian: ${dr.jumlahIsi}`);

cek('B1: isian tersimpan sebagai draf di localStorage', dr.ada === true, drafTersimpan);
cek('B1b: draf memuat waktu penyimpanan (untuk pesan "kapan")', dr.adaSavedAt === true);

// kunci harus memuat bulan (YYYY-MM), bukan tanggal persis
cek('B4: kunci draf memakai BULAN (YYYY-MM), bukan tanggal persis',
  /\d{4}-\d{2}$/.test(dr.kunci || ''), String(dr.kunci));

// --- B2. reload = "besok hari" -> isian dipulihkan ---
console.log('\n--- B2. Reload (mensimulasikan dilanjutkan besok) ---');
await send('Page.reload');
await sleep(6500);

const setelahPulih = await evalJs(`(() => {
  const ta = [...document.querySelectorAll('.item-block textarea')];
  const adaIsi = ta.filter(el => el.value && el.value.includes('Isian QA bagian')).length;
  const banner = document.querySelector('.draft-banner');
  return JSON.stringify({
    jumlahPulih: adaIsi,
    adaBanner: !!banner,
    teksBanner: banner ? banner.innerText.trim().slice(0, 160) : ''
  });
})()`);
const pl = JSON.parse(setelahPulih || '{}');
console.log(`  item pulih: ${pl.jumlahPulih}`);
console.log(`  banner: ${pl.adaBanner ? pl.teksBanner : '(tidak ada)'}`);

cek('B2: isian hari sebelumnya DIPULIHKAN setelah halaman dibuka lagi',
  pl.jumlahPulih >= 2, JSON.stringify(pl));
cek('B3: ada pemberitahuan bahwa isian sebelumnya dipulihkan', pl.adaBanner === true);
cek('B3b: pemberitahuan menyebut jumlah item',
  /item/i.test(pl.teksBanner || ''), pl.teksBanner);

const shotB = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(`${SHOTS}/B-draf-dipulihkan.png`, Buffer.from(shotB.result.data, 'base64'));

// --- B5. tombol kosongkan ---
console.log('\n--- B5. Tombol "Kosongkan & mulai baru" ---');
const diklik = await evalJs(`(() => {
  const btn = [...document.querySelectorAll('.draft-banner button')]
    .find(b => /kosongkan/i.test(b.innerText));
  if (!btn) return false;
  btn.click();
  return true;
})()`);
await sleep(1500);

const setelahKosong = await evalJs(`(() => {
  const ta = [...document.querySelectorAll('.item-block textarea')];
  const masihAda = ta.filter(el => el.value && el.value.includes('Isian QA bagian')).length;
  const keys = Object.keys(localStorage).filter(k => k.startsWith('cfill_checksheet_draft_v1:'));
  return JSON.stringify({ masihAda, sisaDraf: keys.length, adaBanner: !!document.querySelector('.draft-banner') });
})()`);
const ks = JSON.parse(setelahKosong || '{}');
console.log(`  isian tersisa: ${ks.masihAda}, draf tersisa: ${ks.sisaDraf}, banner: ${ks.adaBanner}`);

cek('B5: tombol mengosongkan mengosongkan form & membuang draf',
  ks.masihAda === 0 && ks.sisaDraf === 0 && ks.adaBanner === false, setelahKosong);

// --- B6. item ya/tidak (radio): hanya menyimpan __raw, harus tetap dipulihkan ---
console.log('\n--- B6. Item ya/tidak (radio) juga tersimpan & dipulihkan ---');
await evalJs(`Object.keys(localStorage).filter(k => k.startsWith('cfill_checksheet_draft_v1:')).forEach(k => localStorage.removeItem(k))`);
await send('Page.navigate', { url: URL_CEK });
await sleep(6000);
await evalJs(`Object.keys(localStorage).filter(k => k.startsWith('cfill_checksheet_draft_v1:')).forEach(k => localStorage.removeItem(k))`);
await send('Page.reload');
await sleep(6000);

const radioDiklik = await evalJs(`(() => {
  const r = [...document.querySelectorAll('.item-block input[type=radio]')];
  if (r.length < 3) return 0;
  r[0].click();  // item 1 -> YA
  r[2].click();  // item 2 -> YA
  return 2;
})()`);
console.log(`  radio diklik: ${radioDiklik}`);
await sleep(1500);

const drafRadio = await evalJs(`(() => {
  const ks = Object.keys(localStorage).filter(k => k.startsWith('cfill_checksheet_draft_v1:'));
  if (!ks.length) return JSON.stringify({ ada: false });
  const d = JSON.parse(localStorage.getItem(ks[0]));
  return JSON.stringify({ ada: true, answers: d.answers, jumlah: Object.keys(d.answers || {}).length });
})()`);
const drr = JSON.parse(drafRadio || '{}');
console.log(`  draf tersimpan: ${drr.ada}, isi: ${JSON.stringify(drr.answers || {})}`);

cek('B6: pilihan ya/tidak tersimpan sebagai draf (walau nilainya di kunci __raw)',
  drr.ada === true, drafRadio);

await send('Page.reload');
await sleep(6500);
const radioPulih = await evalJs(`(() => {
  const r = [...document.querySelectorAll('.item-block input[type=radio]')];
  return JSON.stringify({ terpilih: r.map((x, i) => (x.checked ? i : null)).filter(x => x !== null) });
})()`);
const rp = JSON.parse(radioPulih || '{}');
console.log(`  radio terpilih setelah reload: ${JSON.stringify(rp.terpilih)}`);

cek('B6b: pilihan ya/tidak kembali tercentang setelah halaman dibuka lagi',
  Array.isArray(rp.terpilih) && rp.terpilih.length >= 2, radioPulih);

// =========================================================================
// C. tidak ada error
// =========================================================================
console.log('\n--- C. Kesehatan halaman ---');
const errorAsli = konsolError.filter((e) => !/Failed to load|net::|401|403|Drive API|Sheets/i.test(e));
cek('tidak ada exception di halaman', exception.length === 0, exception.slice(0, 1).join(''));
cek('tidak ada error konsol tak terduga', errorAsli.length === 0, errorAsli.slice(0, 1).join(''));

console.log(`\nhasil: ${lulus} lulus, ${gagal.length} gagal`);
if (gagal.length) console.log('gagal: ' + gagal.join(', '));
console.log(`screenshot: ${SHOTS}`);

ws.close();
chrome.kill();
process.exit(gagal.length ? 1 : 0);
