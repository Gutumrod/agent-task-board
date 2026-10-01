/**
 * เทสต์ parser + หน้าเว็บของ build-status.mjs (บรีฟ 24 ข้อ 5)
 * รัน: npm test   (= node --test test/)
 *
 * ครอบ: parser ต่อรูปแบบจริง (room.md / claims / TASKS.md) + กรณีขอบ
 *  - หัวไม่ครบ 6 บรรทัด · ไม่มี "แปะให้:" · ไฟล์ว่าง · ชื่อไฟล์ claim ผิดรูป
 *  - เนื้อความยาวต้องไม่หลุดเข้าหน้าเว็บ · ตัวกรองความลับต้องปิดค่าคล้ายคีย์
 *  - หน้าเว็บไฟล์เดียว ไม่โหลดอะไรจากภายนอก · รองรับจอเล็ก (viewport/dark mode)
 *
 * fail-before proof: `node scripts/fail-before.mjs` (ยิง mutation ให้เทสต์ชุดนี้ล้มจริง)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseClaims, parseRoom, parseTasks, computePasteCandidates,
  redact, looksLikeSecret, buildModel, renderHtml, parseRoomTs,
} from '../build-status.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FX = path.join(HERE, 'fixtures');
const VAULT = 'D:\\AI-Workspace\\vault';
const BOARD = path.dirname(HERE);

/** F2 (บรีฟ 24b): อ่านไฟล์แล้ว normalize CRLF -> LF ให้เหมือน readTextSafe ของแอป
 *  (พฤติกรรมแอปไม่แก้ — แก้แค่ฝั่งเทสต์ ให้ checkout แบบ CRLF ก็รันผ่าน) */
const readText = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const roomText = readText(path.join(FX, 'room-edge.md'));
const tasksText = readText(path.join(FX, 'TASKS.md'));

/* ============================== claims ================================== */

test('claims: อ่านชื่อไฟล์รูปแบบจริง + คัดไฟล์ผิดรูป/ว่างออกเป็น malformed', () => {
  const r = parseClaims(path.join(FX, 'claims'));
  assert.equal(r.error, null);
  assert.equal(r.items.length, 1, 'ต้องเหลือเฉพาะ claim ที่ถูกรูป');
  assert.equal(r.items[0].task, 'GOOD-TASK');
  assert.equal(r.items[0].agent, 'hermes');
  assert.equal(r.items[0].machine, 'windows');
  assert.equal(r.items[0].valid, true);
  assert.equal(r.items[0].startedMs, Date.UTC(2026, 9, 1, 5, 0, 0));

  const byFile = Object.fromEntries(r.malformed.map((m) => [m.file, m.issues.join(' | ')]));
  assert.equal(r.malformed.length, 3);
  assert.match(byFile['BROKEN-NAME_codex_20261001T050300Z.md'], /ผิดรูป/);
  assert.match(byFile['TRULYEMPTY__qwen__20261001T050500Z.md'], /ว่าง/);
  assert.match(byFile['MISSINGFIELDS__agy__20261001T050400Z.md'], /ไม่มีฟิลด์/);
});

test('claims: โฟลเดอร์ .secrets ถูกปฏิเสธ (ห้ามอ่าน)', () => {
  assert.throws(() => parseClaims(path.join('D:', 'x', '.secrets', 'claims')), /\.secrets/);
});

test('claims: ค่าที่แสดง (work/brief) ต้องผ่านตัวกรองความลับ', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-claims-test-'));
  const SECRET = 'sk_live_FAKE0000000000000001';
  fs.writeFileSync(path.join(tmp, 'LEAKY__hermes__20261001T050700Z.md'), [
    'agent: hermes', 'machine: windows', 'session: s', 'started: 20261001T050700Z',
    'brief: b', `work: ต่อ DB postgres://user:sup3rs3cret@host:5432/db ด้วยคีย์ ${SECRET}`,
  ].join('\n') + '\n');
  const r = parseClaims(tmp);
  fs.rmSync(tmp, { recursive: true, force: true });
  assert.equal(r.items.length, 1);
  const shown = `${r.items[0].work} ${r.items[0].brief}`;
  assert.ok(!shown.includes(SECRET), 'คีย์ต้องถูกปิด');
  assert.ok(!shown.includes('sup3rs3cret'), 'รหัสผ่านใน connection string ต้องถูกปิด');
  assert.equal(looksLikeSecret(shown), false);
});

/* =============================== room =================================== */

test('room: แยกหัวข้อด้วย ## [...] และอ่านเวลา UTC ได้ (ทั้งแบบเป๊ะและแบบกำกวม)', () => {
  const r = parseRoom(roomText);
  assert.equal(r.cards.length, 9);
  assert.equal(r.cards[0].tsRaw, '2026-10-01T05:00:00Z');
  assert.equal(r.cards[0].tsMs, Date.UTC(2026, 9, 1, 5, 0, 0));
  assert.equal(r.cards[0].tsApprox, false);
  assert.equal(r.cards[0].from, 'Hermes');
  assert.equal(r.cards[0].taskTag, 'TEST-FULL');
  assert.equal(r.malformedHeadings, 1, 'หัวข้อที่ไม่มีเวลาต้องถูกนับเป็นกรณีผิดรูป');
});

test('room: กำกับหัว 6 บรรทัด — ครบ 6 / ไม่ครบ ต้องไม่โกหก', () => {
  const r = parseRoom(roomText);
  assert.equal(r.cards[0].headerFound, 6);
  assert.equal(r.cards[0].headerComplete, true);
  assert.equal(r.cards[0].header.length, 6);
  assert.ok(r.cards[0].header.every((h) => h.value !== ''), 'ต้องไม่มีหัวบรรทัดที่ค่าว่าง');

  const short = r.cards.find((c) => c.taskTag === 'TEST-SHORT');
  assert.equal(short.headerComplete, false, 'การ์ดที่มีไม่ครบหกบรรทัดต้องถูกทำเครื่องหมายว่าขาด');
  assert.ok(short.headerFound < 6);
  assert.equal(short.header.length, short.headerFound);
});

test('room: หัวข้อถูกตัดมาแสดงเท่านั้น — เนื้อความยาวต้องไม่หลุดเข้า model/HTML', () => {
  const r = parseRoom(roomText);
  const modelDump = JSON.stringify(r.cards);
  assert.ok(!modelDump.includes('NOSHOW-SENTINEL'), 'ข้อความยาวต้องไม่ถูกเก็บ');
  const html = renderHtml(buildModel({ vault: VAULT, board: BOARD, out: path.join(BOARD, 'tmp.html'),
    intervalSec: 0, maxCards: 10, pull: false, json: false, nowIso: '2026-10-01T05:30:00Z' }));
  assert.ok(!html.includes('NOSHOW-SENTINEL'), 'ข้อความยาวต้องไม่หลุดเข้า HTML');
});

test('room: "แปะให้:" — เก็บผู้รับ, ข้ามผู้คุม, และเตือนเป็น "คาดการณ์"', () => {
  const r = parseRoom(roomText);
  const byTag = Object.fromEntries(r.cards.map((c) => [c.taskTag || '(ไม่มี)', c]));
  assert.ok(byTag['TEST-PASTE'], 'การ์ดที่มีบรรทัดแปะให้ต้องถูกอ่าน');
  assert.equal(byTag['TEST-PASTE'].paste.recipient, 'Hermes');
  assert.ok(byTag['TEST-PASTE-CTRL'].paste, 'การ์ดที่แปะให้ผู้คุมต้องถูกอ่านเช่นกัน');

  const cands = computePasteCandidates(r.cards);
  const pair = Object.fromEntries(cands.map((c) => [c.taskTag || 'n/a', c.recipient]));
  assert.ok(cands.some((c) => /Opencode/.test(c.recipient)), 'แปะให้ Opencode ที่ยังไม่มีใครตอบ → ต้องเตือน');
  assert.ok(cands.some((c) => /Qwen/.test(c.recipient)), 'แปะให้ Qwen แล้ว Qwen ยังไม่ตอบ (โพสต์เก่ากว่า) → ต้องเตือน');
  assert.ok(!cands.some((c) => /Hermes/.test(c.recipient)), 'คนที่ตอบกลับแล้ว (โพสต์ใหม่กว่า) ต้องไม่ถูกเตือนซ้ำ');
  assert.ok(!cands.some((c) => /ผู้คุม/.test(c.recipient)), 'แปะให้ผู้คุมไม่นับเป็นรายการค้าง');
  assert.ok(cands.some((c) => /Qwen/.test(c.recipient)), 'แปะให้ Qwen แล้ว Qwen ยังไม่ตอบ → ต้องเตือน (แม้โพสต์เก่าของ Qwen จะอยู่ท้ายไฟล์)');

  const html = renderHtml(buildModel({ vault: VAULT, board: BOARD, out: path.join(BOARD, 'tmp.html'),
    intervalSec: 0, maxCards: 10, pull: false, json: false, nowIso: '2026-10-01T05:30:00Z' }));
  assert.match(html, /คาดการณ์/, 'รายการเดาต้องมีป้ายกำกับ');
});

test('room: ตัวกรองต้องปิดค่าคล้ายคีย์ที่โผล่ในหัวบรรทัด', () => {
  const r = parseRoom(roomText);
  const card = r.cards.find((c) => c.taskTag === 'TEST-PASTE');
  const gates = card.header.find((h) => h.key === 'GATES');
  assert.ok(gates, 'ต้องอ่านบรรทัด GATES ได้');
  assert.match(gates.value, /\[REDACTED:stripe-key\]/);
  assert.equal(looksLikeSecret(gates.value), false);
});

test('room: parseRoomTs รับรูปแบบเวลาจริงที่เจอในห้อง', () => {
  assert.equal(parseRoomTs('2026-10-01T04:15:00Z').ms, Date.UTC(2026, 9, 1, 4, 15, 0));
  assert.deepEqual(parseRoomTs('2026-10-01T03:4xZ'), { ms: Date.UTC(2026, 9, 1, 3, 40), approx: true });
  assert.deepEqual(parseRoomTs('2026-10-01 UTC'), { ms: Date.UTC(2026, 9, 1), approx: true });
  assert.equal(parseRoomTs('ไม่มีเวลา').ms, null);
});

/* ============================ redaction ================================= */

test('ความลับ: ปิดคีย์/รหัส/connection string จริง — แต่ไม่แตะ commit SHA', () => {
  const cases = [
    ['key sk_live_ABCDEFGH12345678', 'sk_live_ABCDEFGH12345678'],
    ['whsec_abcdEFGH12345678', 'whsec_abcdEFGH12345678'],
    ['sb_secret_abcdEFGH1234', 'sb_secret_abcdEFGH1234'],
    ['token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTYifQ.abcdEFGH', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'],
    ['postgres://hub_web_app:hunter2secret@db.example.com:5432/postgres', 'hunter2secret'],
    ['password: "SuperSecret123"', 'SuperSecret123'],
    ['AKIAIOSFODNN7EXAMPLE', 'AKIAIOSFODNN7EXAMPLE'],
    ['ghp_ABCDEFGHIJ1234567890', 'ghp_ABCDEFGHIJ1234567890'],
  ];
  for (const [input, secret] of cases) {
    const out = redact(input);
    assert.ok(!out.includes(secret), `ต้องปิดค่า: ${secret}`);
    assert.ok(!looksLikeSecret(out), `ต้องไม่เหลือร่องรอยคีย์: ${out}`);
  }
  const sha = 'f97642cc6a8ed950b528ed40d2e498fc8213c48e';
  assert.equal(redact(`SHA: ${sha}`), `SHA: ${sha}`, 'SHA ต้องไม่ถูกปิด (ใช้ตรวจงาน)');
});

/* ============================ redaction (F3) ============================= */

test('ความลับ F3: ปิด Resend / sk-proj- sk-ant- / Discord+Slack webhook — ค่าปลอมประกอบในเทสต์', () => {
  // ประกอบค่าปลอมจากชิ้นส่วน (ไม่ใส่คีย์จริง)
  const P = 'AbCdEf0123456789AbCdEf0123456789';   // ชิ้นส่วนกลาง
  const cases = [
    ['Resend', 're_' + 'aB3dE5f7G9hJ2kL4mN6pQ8rS'],
    ['OpenAI sk-proj', 'sk-proj-' + 'Aa1Bb2Cc3Dd4Ee5Ff6Gg7Hh8'],
    ['Anthropic sk-ant', 'sk-ant-api03-' + 'Zz9Yy8Xx7Ww6Vv5Uu4Tt3'],
    ['sk- ยาว ๆ', 'sk-' + P],
    ['Discord webhook', 'https://discord.com/api/webhooks/123456789012345678/' + P + P],
    ['Discord (discordapp)', 'https://discordapp.com/api/webhooks/987654321098765432/' + P],
    ['Slack webhook', 'https://hooks.slack.com/services/T00000000/B11111111/' + P],
  ];
  for (const [name, secret] of cases) {
    const out = redact(`note: ${secret} end`);
    assert.ok(!out.includes(secret), `${name}: ต้องถูกปิด (ได้: ${out})`);
    assert.match(out, /\[REDACTED:/, `${name}: ต้องเหลือร่องรอย [REDACTED:...]`);
    assert.equal(looksLikeSecret(out), false, `${name}: โพรบต้องไม่เห็นคีย์เหลือ`);
  }
});

test('ความลับ F3: ต้องไม่กินผิด — commit SHA / sha256 / UUID / sb_publishable ไม่ถูกปิด', () => {
  const keep = [
    'f97642cc6a8ed950b528ed40d2e498fc8213c48e',                                  // commit SHA 40 hex
    '4badf98ee3a473c2ab871fa6598e3087c2760631af77c2e8ab190732ed27234e',          // sha256 64 hex
    '123e4567-e89b-12d3-a456-426614174000',                                      // UUID
    'sb_publishable_' + 'AbCdEf0123456789AbCdEf01',                              // public key
  ];
  for (const v of keep) {
    assert.equal(redact(v), v, `ต้องไม่ถูกแตะ: ${v}`);
  }
});

/* =============================== TASKS ================================== */

test('TASKS.md: การ์ด (CEO)/(Owner) ที่ยังไม่เสร็จ = รอ Owner', () => {
  const cards = parseTasks(tasksText);
  const wait = cards.filter((c) => !c.checked && c.ownerTag).map((c) => c.title);
  assert.deepEqual(wait.sort(), ['[TEST-A] งานที่ต้องรอ Owner ตัดสิน (CEO)',
    '[TEST-D] งานรอเจ้าของกิจการ (Owner/Codex)', '[TEST-E] กำลังทำ (CEO)'].sort());
  assert.ok(!wait.some((t) => t.includes('TEST-C')), 'งานที่ปิดแล้วต้องไม่นับ');
  assert.ok(!wait.some((t) => t.includes('TEST-F')), 'งานใน Done ต้องไม่นับ');
  assert.ok(!wait.some((t) => t.includes('งานย่อย')), 'งานย่อยต้องไม่ถูกนับเป็นการ์ดแยก');
});

/* ============================= หน้าเว็บ ================================== */

test('หน้าเว็บ: ไฟล์เดียว ไม่โหลดอะไรจากภายนอก + รองรับจอเล็ก/โหมดมืด', () => {
  const html = renderHtml(buildModel({ vault: VAULT, board: BOARD, out: path.join(BOARD, 'tmp.html'),
    intervalSec: 60, maxCards: 10, pull: false, json: false, nowIso: '2026-10-01T05:30:00Z' }));
  assert.ok(!/src\s*=\s*["']https?:/i.test(html), 'ต้องไม่มี <script src> ภายนอก');
  assert.ok(!/href\s*=\s*["']https?:/i.test(html), 'ต้องไม่มีลิงก์ภายนอก');
  assert.ok(!/\bfetch\s*\(/.test(html), 'ต้องไม่มีการเรียก fetch');
  assert.ok(!/\bXMLHttpRequest\b|\bWebSocket\b/.test(html), 'ต้องไม่มี XHR/WebSocket');
  assert.match(html, /name="viewport"[^>]*width=device-width/);
  assert.match(html, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.match(html, /noindex/);
  assert.match(html, /location\.reload\(\)/, 'ต้องรีเฟรชตัวเองได้');
  assert.match(html, /\.secrets|ห้าม|อ่านเท่านั้น/);
});

test('หน้าเว็บ: จอเล็กมาก (≤430px) ต้องเปลี่ยนตาราง claim เป็นการ์ด พร้อม label', () => {
  const m = buildModel({ vault: VAULT, board: BOARD, out: path.join(BOARD, 'tmp.html'),
    intervalSec: 60, maxCards: 10, pull: false, json: false, nowIso: '2026-10-01T05:30:00Z' });
  const html = renderHtml(m);
  assert.match(html, /@media\s*\(max-width:430px\)/, 'ต้องมี breakpoint สำหรับจอเล็กมาก');
  assert.match(html, /table\.claims thead\{display:none\}/, 'ต้องซ่อนหัวตารางบนจอเล็ก');
  assert.match(html, /td:before\{content:attr\(data-label\)/, 'ต้องแสดง label ให้แต่ละช่อง');
  for (const label of ['งาน', 'ใคร', 'เริ่ม (ICT)', 'งานที่ทำ']) {
    assert.ok(html.includes(`data-label="${label}"`), `ต้องมี data-label="${label}" ในการ์ด claim`);
  }
});

test('หน้าเว็บ: --max-cards ถูกใช้จริง และเวลาเกิด/เก่าแสดงชัด', () => {
  const m = buildModel({ vault: VAULT, board: BOARD, out: path.join(BOARD, 'tmp.html'),
    intervalSec: 60, maxCards: 2, pull: false, json: false, nowIso: '2026-10-01T05:30:00Z' });
  assert.equal(m.stats.cardsShown, 2);
  assert.equal(m.generatedAtICT.includes('ICT'), true);
  const html = renderHtml(m);
  assert.match(html, /id="stale"/, 'ต้องมีป้ายเตือนข้อมูลเก่า');
  assert.match(html, /30/, 'เกณฑ์เตือน 30 นาทีต้องอยู่บนหน้า');
});

/* ================== ข้อมูลจริง (smoke — อ่านอย่างเดียว) ================== */

test('smoke: อ่านต้นทางจริงได้ ไม่ throw และรูปแบบยังตรง', () => {
  const claims = parseClaims(path.join(VAULT, '06-Agent-Logs', '_claims'));
  assert.equal(claims.error, null, `อ่าน _claims จริงไม่ได้: ${claims.error}`);
  for (const c of claims.items) {
    assert.ok(c.agent && c.started && c.work, `claim จริงขาดฟิลด์: ${c.file}`);
  }
  const room = readText(path.join(VAULT, '00-System', '3musketeers', 'room.md'));
  const cards = parseRoom(room);
  assert.ok(cards.cards.length > 0, 'room.md จริงต้องมีหัวข้ออย่างน้อย 1');
  const withHeader = cards.cards.filter((c) => c.headerFound > 0);
  assert.ok(withHeader.length > 0, 'ต้องอ่านหัว 6 บรรทัดจาก room.md จริงได้');
  const tasks = parseTasks(readText(path.join(BOARD, 'TASKS.md')));
  assert.ok(tasks.length > 0, 'TASKS.md จริงต้องมีการ์ด');
  assert.ok(tasks.some((t) => t.ownerTag), 'TASKS.md จริงต้องมีการ์ดที่รอ Owner');
});
