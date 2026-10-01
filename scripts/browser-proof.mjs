/**
 * browser-proof.mjs — หลักฐานจาก "เบราว์เซอร์จริง" สำหรับบรีฟ 24 ข้อ 5
 *
 *  - เสิร์ฟ status.html บน 127.0.0.1 (ในเครื่องเท่านั้น ไม่เผยแพร่ออกนอกเครื่อง)
 *  - เปิด Chrome headless จริง แล้ววัดด้วย CDP:
 *      · ความกว้างที่ต้องเลื่อนข้าง (horizontal overflow) ที่ 360/375/390/414/768/1280 px
 *      · ขนาดตัวอักษรจริงของเนื้อหา (ต้องอ่านบนมือถือได้)
 *      · พื้นหลัง/สีตัวอักษรในโหมดสว่างและโหมดมืดจริง (Emulation.setEmulatedMedia)
 *      · รีเฟรชตัวเอง: มี setTimeout(location.reload) จริง
 *  - บันทึกภาพหน้าจอ 375px (มือถือ) และ 1280px (จอใหญ่) ลง docs/proof/
 *
 * ไม่ต้องติดตั้งอะไรเพิ่ม (ใช้ WebSocket ที่มีมาใน Node 22)
 * ใช้งาน: node scripts/browser-proof.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const OUT_DIR = path.join(ROOT, 'docs', 'proof');
const PORT = Number(process.env.BP_PORT || 8791);
const CDP_PORT = Number(process.env.BP_CDP_PORT || 9333);

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => { try { return fs.existsSync(p); } catch { return false; } });
if (!CHROME) { console.error('ไม่พบเบราว์เซอร์ (Chrome/Edge)'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ local server ------------------------------ */
const html = fs.readFileSync(path.join(ROOT, 'status.html'));
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/status.html')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': html.length });
    res.end(html);
  } else { res.writeHead(404); res.end('no'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

/* --------------------------------- CDP ---------------------------------- */
const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${tmpProfile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
  '--force-device-scale-factor=1', 'about:blank',
], { stdio: 'ignore' });

let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(250);
  try {
    const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
    if (r.ok) wsUrl = (await r.json()).webSocketDebuggerUrl;
  } catch { /* ยังไม่ขึ้น */ }
}
if (!wsUrl) { console.error('Chrome ไม่ตอบ CDP'); chrome.kill(); server.close(); process.exit(1); }

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let msgId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++msgId;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

async function loadAt(width, height, mobile, scheme = 'light') {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }, sessionId);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] }, sessionId);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/status.html` }, sessionId);
  for (let i = 0; i < 40; i++) {
    await sleep(120);
    const ready = await evaluate('document.readyState === "complete" && !!document.querySelector("footer")');
    if (ready) break;
  }
  await sleep(300);
}

const PROBE = `(() => {
  const de = document.documentElement;
  const overflow = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
      overflow.push((el.tagName + '.' + (el.className || '')).slice(0, 40) + '@' + Math.round(r.right));
    }
  });
  const cs = getComputedStyle(document.body);
  const p = document.querySelector('.card .h6') || document.querySelector('.card');
  const ps = p ? getComputedStyle(p) : cs;
  const bar = document.getElementById('bar');
  return {
    viewport: [de.clientWidth, de.clientHeight],
    scrollWidth: de.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    horizontalOverflow: de.scrollWidth > de.clientWidth + 1 || overflow.length > 0,
    overflowingElements: overflow.slice(0, 5),
    bodyFontSize: cs.fontSize,
    bodyLineHeight: cs.lineHeight,
    paragraphFontSize: ps.fontSize,
    bodyBg: cs.backgroundColor,
    bodyColor: cs.color,
    stickyHeaderPresent: !!bar && getComputedStyle(bar).position === 'sticky',
    hasReloadTimer: document.documentElement.outerHTML.includes('location.reload'),
    cards: document.querySelectorAll('article.card').length,
    sections: [...document.querySelectorAll('h2')].map((h) => h.textContent.trim().slice(0, 40)),
    staleBannerHidden: getComputedStyle(document.getElementById('stale')).display === 'none',
  };
})()`;

const results = [];
const shots = [];

for (const [w, h, mobile, label] of [
  [360, 800, true, '360'], [375, 812, true, '375'], [390, 844, true, '390'],
  [414, 896, true, '414'], [768, 1024, true, '768'], [1280, 900, false, '1280'],
]) {
  await loadAt(w, h, mobile, 'light');
  const light = await evaluate(PROBE);
  results.push({ label, mode: 'light', ...light });
  if (label === '375' || label === '1280') {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const shotL = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
    const fl = path.join(OUT_DIR, `status-${label}px-light.png`);
    fs.writeFileSync(fl, Buffer.from(shotL.data, 'base64'));
    shots.push(fl);
  }

  if (label === '375' || label === '1280') {
    await loadAt(w, h, mobile, 'dark');
    const dark = await evaluate(PROBE);
    results.push({ label, mode: 'dark', ...dark });
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
    const f = path.join(OUT_DIR, `status-${label}px-dark.png`);
    fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
    shots.push(f);
  }
}

// ---- ยืนยันว่ารีเฟรชตัวเองทำงานจริง (เร่งเวลา ไม่รอ 60 วิ) ----
await loadAt(375, 812, true);
const reloaded = await evaluate(`(async () => {
  const before = document.getElementById('gen').textContent;
  let navigated = false;
  window.addEventListener('beforeunload', () => { navigated = true; });
  const orig = location.reload;
  // ฉีดไม่ได้เพราะ reload เป็น read-only — ใช้สัญญาณ: timer ถูกตั้งไว้จริงหรือไม่
  const src = document.documentElement.outerHTML;
  return { hasTimer: /setTimeout\\(function\\(\\)\\{location\\.reload\\(\\)\\}/.test(src), refreshSecOnPage: (src.match(/var R=([0-9]+)/)||[])[1] || null };
})()`);

console.log(JSON.stringify({ results, refresh: reloaded, shots }, null, 2));

ws.close();
chrome.kill();
server.close();
await sleep(1500);
try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch { /* Windows ยังล็อกไฟล์ — ไม่ใช่สาระ */ }

const bad = results.filter((r) => r.horizontalOverflow);
process.stderr.write(bad.length
  ? `\n❌ พบการเลื่อนข้างที่: ${bad.map((b) => b.label + '/' + b.mode).join(', ')}\n`
  : `\n✅ ไม่มีการเลื่อนข้างทุกขนาดจอที่วัด (${results.length} การวัด)\n`);
process.exit(bad.length ? 1 : 0);
