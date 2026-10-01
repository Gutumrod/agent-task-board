/**
 * overflow-audit.mjs — ตรวจ "การล้นที่ถูกซ่อน" (เพราะหน้าเว็บตั้ง overflow-x:hidden ไว้)
 *
 * scrollWidth ของ <html> จะเท่ากับ viewport เสมอเมื่อมี overflow-x:hidden
 * สคริปต์นี้จึงถอดตัวซ่อนออกก่อน แล้ววัดใหม่ + หา element ที่เนื้อในล้นกล่องตัวเอง
 * ใช้งาน: node scripts/overflow-audit.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const PORT = 8792, CDP = 9334;
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome']
  .find((p) => { try { return fs.existsSync(p); } catch { return false; } });
if (!CHROME) { console.error('ไม่พบ Chrome'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const html = fs.readFileSync(path.join(ROOT, 'status.html'));
const server = http.createServer((q, s) => {
  s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); s.end(html);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'oa-chrome-'));
const child = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`,
  '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i++) { await sleep(250);
  try { const r = await fetch(`http://127.0.0.1:${CDP}/json/version`); if (r.ok) wsUrl = (await r.json()).webSocketDebuggerUrl; } catch {} }
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
const send = (method, params = {}, s) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, ...(s ? { sessionId: s } : {}) })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId)).result.value;

const AUDIT = `(() => {
  const de = document.documentElement;
  document.documentElement.style.overflowX = 'visible';
  document.body.style.overflowX = 'visible';
  const vw = de.clientWidth;
  const docW = Math.max(de.scrollWidth, document.body.scrollWidth);
  const clipped = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.right > vw + 1 || r.left < -1) clipped.push({ sel: el.tagName + '.' + String(el.className).slice(0,30), right: Math.round(r.right) });
    if (el.scrollWidth > el.clientWidth + 2 && ['P','TD','DIV','LI','ARTICLE','SPAN','H1','H2','CODE','STRONG'].includes(el.tagName))
      clipped.push({ sel: 'inner:' + el.tagName + '.' + String(el.className).slice(0,26), over: el.scrollWidth - el.clientWidth, txt: (el.textContent||'').trim().slice(0,40) });
  });
  return { vw, docW, overflowAfterUnhide: docW > vw + 1, clipped: clipped.slice(0, 12), clipCount: clipped.length };
})()`;

const out = [];
for (const [w, h, mob, label] of [[375, 812, true, '375'], [360, 800, true, '360'], [1280, 900, false, '1280']]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: mob }, sessionId);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` }, sessionId);
  for (let i = 0; i < 40; i++) { await sleep(120); if (await ev('document.readyState === "complete"')) break; }
  await sleep(250);
  out.push({ label, ...(await ev(AUDIT)) });
}
console.log(JSON.stringify(out, null, 2));
ws.close(); child.kill(); server.close(); await sleep(1200);
try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
const bad = out.filter((r) => r.overflowAfterUnhide || r.clipCount > 0);
process.stderr.write(bad.length ? `❌ ยังมีการล้น/ถูกตัด: ${bad.map((b) => b.label).join(', ')}\n` : '✅ ไม่มีการล้นหรือถูกตัดหลังถอด overflow-x:hidden\n');
process.exit(bad.length ? 1 : 0);
