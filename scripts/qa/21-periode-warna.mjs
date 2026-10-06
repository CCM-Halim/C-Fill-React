/**
 * QA 21 — UJI TAMPILAN PENANDA PERIODE PADA ITEM PERAWATAN.
 *
 * Menjalankan APLIKASI HASIL BUILD di Chrome headless (lebar 390 px = ukuran HP),
 * membuka satu checksheet, lalu memeriksa sungguhan di layar:
 *
 *   1. penanda "Periode x" muncul, teksnya benar
 *   2. warnanya sesuai: 1 bulan hijau, 3 bulan kuning, 6 bulan oranye, 1 tahun merah
 *   3. penanda periode TIDAK lagi menempel di ujung teks item
 *   4. teks item rata kiri-kanan (justify)
 *   5. kontras warna memenuhi ambang keterbacaan (WCAG AA)
 *
 * Jalankan: node scripts/qa/21-periode-warna.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 9446;
const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173';
const SHOTS = '/tmp/qa21';
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

// ---- sesi sandbox supaya tidak terhalang layar login ----
// Sesi disimpan di localStorage dengan kunci 'cfill_auth_session_v1' dan
// dipulihkan SEKALI saat googleAuth.js dimuat, jadi harus disuntikkan SEBELUM
// skrip halaman berjalan. Bentuknya mengikuti QA 20 yang sudah terbukti.
// Sejak 6 Okt 2026 sesi pindah ke localStorage (fitur "login sekali").
// Email HARUS ada di daftar izin (src/config/access.js) atau sesinya dibuang.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    try {
      localStorage.setItem('cfill_auth_session_v1', JSON.stringify({
        token: { access_token: 'qa-sandbox', expires_at: Date.now() + 3600e3 },
        user: { email: 'ccmhalimonsite@gmail.com', name: 'QA Sandbox', picture: '' }
      }));
      localStorage.setItem('cfill_has_logged_in_before', 'true');
    } catch (e) {}
  `,
});

// Tangkap permintaan jaringan agar halaman tidak menggantung menunggu Drive
await send('Network.enable');

console.log('=== QA 21: UJI TAMPILAN PENANDA PERIODE ===\n');

// Buka halaman checksheet kategori cat01 (AC Distribution Cabinet)
const bc = encodeURIComponent('1. BTS Communication Room');
const site = encodeURIComponent('K10+200 Base Station 2 (HA-KA 2A&2B _ BTS 2)');
await send('Page.navigate', { url: `${BASE}/peralatan/${bc}/${site}/cat01` });
await sleep(6000);

const judul = await evalJs(`document.querySelector('.card-title')?.innerText || ''`);
console.log(`  halaman: ${String(judul).slice(0, 60) || '(tidak terbaca)'}\n`);

// ---- kumpulkan semua penanda periode yang tampil ----
const penanda = await evalJs(`JSON.stringify([...document.querySelectorAll('.item-periode')].map(el => {
  const cs = getComputedStyle(el);
  return { teks: el.innerText.trim(), kelas: el.className, warna: cs.color, latar: cs.backgroundColor, tebal: cs.fontWeight };
}))`);

const daftar = JSON.parse(penanda || '[]');
console.log(`  penanda periode ditemukan: ${daftar.length}`);
for (const p of daftar.slice(0, 8)) console.log(`     ${p.teks}  [${p.warna}]`);

cek('penanda periode muncul di layar', daftar.length > 0, `jumlah: ${daftar.length}`);

// ---- teks & warna sesuai permintaan Jo ----
const warnaDiharapkan = { '1 bulan': 'hijau', '3 bulan': 'kuning', '6 bulan': 'oranye', '1 tahun': 'merah' };
const terlihat = {};
for (const p of daftar) {
  const m = p.teks.match(/^Periode\s+(.+)$/i);
  if (m) terlihat[m[1].trim()] = p;
}

for (const [teks, warna] of Object.entries(warnaDiharapkan)) {
  const p = terlihat[teks];
  if (!p) { cek(`periode "${teks}" punya warna ${warna}`, false, 'penanda tidak ditemukan'); continue; }
  cek(`periode "${teks}" berwarna ${warna}`, p.kelas.includes(`periode-${warna}`), p.kelas);
}

cek('teks penanda dicetak tebal', daftar.every((p) => Number(p.tebal) >= 700),
  `nilai: ${[...new Set(daftar.map((p) => p.tebal))].join(',')}`);

// ---- penanda TIDAK lagi menempel di ujung teks item ----
const teksItem = await evalJs(`JSON.stringify([...document.querySelectorAll('.item-label')].map(e => e.innerText))`);
const items = JSON.parse(teksItem || '[]');
const masihMenempel = items.filter((t) => /\(\s*\d+\s*(bulan|tahun)\s*\)\s*$/i.test(t.trim()));
cek('penanda periode tidak lagi menempel di ujung teks item', masihMenempel.length === 0,
  masihMenempel.slice(0, 2).join(' | '));

// Perubahan yang diminta: "Periode 6 bulan" lalu teksnya bersih
const adaContohJo = await evalJs(
  `[...document.querySelectorAll('.item-label')].some(e => /^Periksa kekuatan koneksi antar komponen, perapian kabel, dan cek labelnya$/.test(e.innerText.trim()))`);
cek('teks item contoh Jo tampil bersih tanpa penanda', adaContohJo === true);

// ---- teks item rata kiri-kanan (justify) ----
const rata = await evalJs(`JSON.stringify([...new Set([...document.querySelectorAll('.item-label')].map(e => getComputedStyle(e).textAlign))])`);
cek('teks item rata kiri-kanan (justify)', rata === '["justify"]', `nilai: ${rata}`);

const rataAkhir = await evalJs(`JSON.stringify([...new Set([...document.querySelectorAll('.item-label')].map(e => getComputedStyle(e).textAlignLast))])`);
cek('baris terakhir tidak ikut dipaksa melebar', rataAkhir === '["left"]', `nilai: ${rataAkhir}`);

// ---- celah antar kata: ukur, jangan kira-kira ----
// Diukur sungguhan: pada baris yang HARUS direntangkan penuh, celah antar kata
// melebar karena kolom HP cuma ~265px sedangkan teksnya panjang.
// Pembanding "normal" = ~3px.
const celah = JSON.parse(await evalJs(`(() => {
  const hasil = [];
  for (const el of document.querySelectorAll('.item-label')) {
    const cs = getComputedStyle(el);
    const kotak = el.getBoundingClientRect();
    const kananIsi = kotak.right - (parseFloat(cs.paddingRight) || 0);
    const r = document.createRange(); const node = el.firstChild;
    const s = el.textContent; const kata = el.innerText.split(/\\s+/).filter(Boolean);
    let cursor = 0; const pos = [];
    for (const k of kata) {
      const i = s.indexOf(k, cursor); if (i < 0) continue;
      r.setStart(node, i); r.setEnd(node, i + k.length);
      const rr = r.getBoundingClientRect();
      pos.push({ kiri: rr.left, kanan: rr.right, y: Math.round(rr.top) });
      cursor = i + k.length;
    }
    const byLine = new Map();
    for (const w of pos) { if (!byLine.has(w.y)) byLine.set(w.y, []); byLine.get(w.y).push(w); }
    const baris = [...byLine.values()];
    let maks = 0;
    baris.forEach((wz, i) => {
      if (i === baris.length - 1 || wz.length < 2) return;   // baris terakhir tak direntangkan
      for (let j = 1; j < wz.length; j++) maks = Math.max(maks, wz[j].kiri - wz[j - 1].kanan);
    });
    if (!baris.some((wz) => wz.length > 1)) return;          // kata tunggal, tak ada celah
    hasil.push({ teks: el.innerText.slice(0, 34), celaMaks: Math.round(maks) });
  }
  return JSON.stringify(hasil);
})()`) || []);

if (celah.length) {
  const maks = Math.max(...celah.map((c) => c.celaMaks));
  const rata = celah.reduce((a, c) => a + c.celaMaks, 0) / celah.length;
  console.log(`\n  celah antar kata (normal ~3px): maks ${maks}px, rata ${rata.toFixed(1)}px`);
  for (const c of celah.slice(0, 4)) console.log(`     ${String(c.celaMaks).padStart(3)}px  "${c.teks}"`);
  // Hanya peringatan, bukan kegagalan: melebar itu memang akibat kolom HP
  // yang sempit. Yang penting terukurnya, bukan disembunyikan.
  if (maks > 20) console.log('     (melebar pada baris yang ditarik penuh - akibat kolom HP sempit)');
}

// ---- kontras warna memenuhi ambang keterbacaan ----
const kontrasInfo = daftar.map((p) => {
  const rgb = (s) => (s.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  const L = (c) => { const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const l1 = L(rgb(p.warna)); const l2 = L(rgb(p.latar));
  const hi = Math.max(l1, l2); const lo = Math.min(l1, l2);
  return { teks: p.teks, rasio: (hi + 0.05) / (lo + 0.05) };
});
const terendah = kontrasInfo.length ? Math.min(...kontrasInfo.map((k) => k.rasio)) : 0;
cek('kontras warna lolos ambang WCAG AA (>= 4,5:1)', terendah >= 4.5, `terendah: ${terendah.toFixed(2)}:1`);

// ---- tidak ada error ----
cek('tidak ada error konsol', konsolError.length === 0, konsolError.slice(0, 1).join(''));
cek('tidak ada exception', exception.length === 0, exception.slice(0, 1).join(''));

const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(`${SHOTS}/periode-warna.png`, Buffer.from(shot.result.data, 'base64'));

console.log(`\nhasil: ${lulus} lulus, ${gagal.length} gagal`);
if (gagal.length) console.log('gagal: ' + gagal.join(', '));
console.log(`screenshot: ${SHOTS}`);

ws.close();
chrome.kill();
process.exit(gagal.length ? 1 : 0);
