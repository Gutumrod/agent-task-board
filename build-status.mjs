#!/usr/bin/env node
/**
 * build-status.mjs — บรีฟ 24 (HOUSE-TASKBOARD-AUTOVIEW)
 *
 * หน้า status อ่านอย่างเดียวสำหรับ Owner: (ก) ตอนนี้ใครทำอะไร + ผลล่าสุด
 * (ข) รออะไรจาก Owner — อัปเดตอัตโนมัติ รองรับมือถือ ไม่โหลดอะไรจากภายนอก
 *
 * หลักการบังคับ (บรีฟ 24):
 *  - อ่านเท่านั้น: ไม่เขียน/แก้ไฟล์ใด ๆ ใน vault, TASKS.md, room.md, STATUS-HOUSE
 *  - stdlib เท่านั้น (ไม่เพิ่ม dependency)
 *  - ไม่เผยแพร่ออกนอกเครื่อง: HTML ไฟล์เดียว CSS/JS ฝังใน ไม่มี fetch/XHR/ลิงก์ภายนอก
 *  - ความลับ: แสดงเฉพาะ หัวข้อ + หัว 6 บรรทัด + ชื่อไฟล์ (ไม่แสดงเนื้อความยาว)
 *    + ตัวกรอง redaction (ด่านเสริม ไม่ใช่ด่านเดียว) + ไม่แตะโฟลเดอร์ .secrets
 *  - git pull ทำงานได้แต่ปิดได้ด้วย --no-pull และจะข้ามถ้า vault มีไฟล์ค้าง (กันไปทับงานคนอื่น)
 *
 * ใช้งาน:
 *   node build-status.mjs                     สร้างครั้งเดียว -> status.html
 *   node build-status.mjs --watch             วนทุก 60 วิ (เขียนทับเฉพาะเมื่อต้นทางเปลี่ยน)
 *   node build-status.mjs --no-pull           ไม่ pull vault ก่อนอ่าน
 *   node build-status.mjs --json              พิมพ์ model JSON (สำหรับเทสต์) ไม่เขียน HTML
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MUTATE = process.env.BS_MUTATE || '';

const DEFAULTS = {
  vault: 'D:\\AI-Workspace\\vault',
  board: HERE,
  out: path.join(HERE, 'status.html'),
  intervalSec: 60,
  maxCards: 10,
  pull: true,
  watch: false,
  json: false,
  nowIso: null,
};

/* ------------------------------- utilities ------------------------------- */

function parseArgs(argv) {
  const o = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--vault') o.vault = next();
    else if (a === '--board') o.board = next();
    else if (a === '--out') o.out = next();
    else if (a === '--interval') o.intervalSec = Number(next());
    else if (a === '--max-cards') o.maxCards = Number(next());
    else if (a === '--now') o.nowIso = next();
    else if (a === '--pull') o.pull = true;
    else if (a === '--no-pull') o.pull = false;
    else if (a === '--watch') o.watch = true;
    else if (a === '--json') o.json = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else throw new Error(`ไม่รู้จัก argument: ${a}`);
  }
  return o;
}

function printHelp() {
  process.stdout.write(
    'node build-status.mjs [--vault <dir>] [--board <dir>] [--out <file>] [--watch]\n' +
    '                      [--interval 60] [--max-cards 10] [--pull|--no-pull] [--json] [--now <iso>]\n'
  );
}

/** กันการอ่านโฟลเดอร์ความลับเด็ดขาด (บรีฟ 24 ข้อ 4) */
function assertSafePath(p) {
  const segs = path.resolve(p).split(path.sep).map((s) => s.toLowerCase());
  if (segs.includes('.secrets')) throw new Error(`ปฏิเสธการอ่าน path ที่อยู่ใน .secrets: ${p}`);
}

function readTextSafe(p) {
  assertSafePath(p);
  try {
    const st = fs.statSync(p);
    return { text: fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), mtimeMs: st.mtimeMs, error: null };
  } catch (err) {
    return { text: '', mtimeMs: 0, error: err.code || String(err) };
  }
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function truncate(s, n) {
  const t = String(s == null ? '' : s).trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/* ----------------------------- secret redaction ---------------------------- */
/* ด่านเสริมเท่านั้น — ด่านหลักคือ "แสดงเฉพาะหัวข้อ + หัว 6 บรรทัด + ชื่อไฟล์" */

const REDACTION_RULES = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED:private-key]'],
  [/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/g, '[REDACTED:stripe-key]'],
  [/\bwhsec_[A-Za-z0-9]{8,}/g, '[REDACTED:webhook-secret]'],
  [/\bsb_secret_[A-Za-z0-9_-]{8,}/g, '[REDACTED:supabase-secret]'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g, '[REDACTED:jwt]'],
  [/\b(?:ghp|gho|ghs|ghu|ghr)_[A-Za-z0-9]{10,}/g, '[REDACTED:github-token]'],
  [/\bgithub_pat_[A-Za-z0-9_]{10,}/g, '[REDACTED:github-token]'],
  [/\bxox[baprs]-[A-Za-z0-9-]{8,}/g, '[REDACTED:slack-token]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED:aws-key]'],
  [/\bAIza[0-9A-Za-z_-]{30,}/g, '[REDACTED:google-key]'],
  // ── F3 (บรีฟ 24b): ช่องว่างที่ผู้คุมเจอ — ใช้ตัวคั่นได้ทั้ง '_' และ '-' จึงไม่ต้องลอก pattern เดิมมาซ้ำ ──
  [/\bre_[A-Za-z0-9]{20,}/g, '[REDACTED:resend-key]'],                          // Resend (บ้านนี้ใช้อยู่)
  [/\bsk-(?:proj|ant|svcacct|admin)-[A-Za-z0-9_-]{16,}/g, '[REDACTED:api-key]'],  // OpenAI / Anthropic / GCP
  [/\bsk-[A-Za-z0-9]{20,}/g, '[REDACTED:api-key]'],                              // sk-<ยาว> แบบไม่มีคำนำหน้า
  [/https?:\/\/(?:[A-Za-z0-9.-]*\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9._-]{20,}/g, '[REDACTED:webhook-url]'],
  [/https?:\/\/hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9._\/-]{16,}/g, '[REDACTED:webhook-url]'],
  [/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s/]+(@)/gi, '$1[REDACTED]$2'],
  [/((?:password|passwd|pwd|secret|token|api[_-]?key|apikey|authorization|bearer|credential)s?"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;"']{5,})/gi,
    '$1[REDACTED]'],
];

/** ปิดค่าที่ "คล้าย" คีย์/รหัส/connection string — แต่ไม่แตะ commit SHA (hex ล้วน) */
export function redact(input) {
  let s = String(input == null ? '' : input);
  if (MUTATE === 'redact') return s; // mutation สำหรับพิสูจน์ fail-before ของเทสต์เท่านั้น
  for (const [re, rep] of REDACTION_RULES) s = s.replace(re, rep);
  // opaque blob (base64 ยาว) — ยกเว้นสิ่งที่ต้องอ่านได้: hex ล้วน (commit SHA / sha256) และ public key
  s = s.replace(/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, (m) => {
    if (/^[0-9a-f]+$/i.test(m)) return m;                 // commit SHA 40 hex / sha256 64 hex
    if (/^sb_publishable_/i.test(m)) return m;            // public key ใช้เปิดเผยได้
    return '[REDACTED:opaque]';
  });
  return s;
}

/** ตรวจว่า "ค่าที่จะแสดง" มีอะไรที่ยังดูเหมือนคีย์หลงเหลือไหม (ใช้ในเทสต์/เตือนตัวเอง) */
export function looksLikeSecret(s) {
  // ที่ถูกปิดไปแล้วด้วย [REDACTED:...] ไม่นับเป็นร่องรอย
  const cleaned = String(s || '').replace(/\[REDACTED[^\]]*\]/g, '');
  const probes = [
    /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/, /\bwhsec_[A-Za-z0-9]{8,}/,
    /\bsb_secret_[A-Za-z0-9_-]{8,}/, /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./,
    /postgres(?:ql)?:\/\/[^:\s/@]+:[^@\s/]+@/, /\bAKIA[0-9A-Z]{16}\b/, /\bghp_[A-Za-z0-9]{10,}/,
    /\bre_[A-Za-z0-9]{20,}/, /\bsk-(?:proj|ant|svcacct|admin)-[A-Za-z0-9_-]{16,}/, /\bsk-[A-Za-z0-9]{20,}/,
    /discord(?:app)?\.com\/api\/webhooks\/\d+\//, /hooks\.slack\.com\/(?:services|workflows|triggers)\//,
  ];
  return probes.some((re) => re.test(cleaned));
}

/* ----------------------------- time formatting ---------------------------- */

const ICT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' });

function fmtICT(ms) {
  if (!Number.isFinite(ms)) return '';
  return `${ICT.format(new Date(ms))} ICT`;
}

/** แปลง timestamp ในหัวข้อ room (หลายรูปแบบจริง) -> { ms, approx } */
export function parseRoomTs(raw) {
  const s = String(raw || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z$/);
  if (m) return { ms: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)), approx: false };
  // 2026-10-01T03:4xZ (มีตัวอักษรในนาที) — จริงในห้องนี้
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d)([A-Za-z])Z$/);
  if (m) return { ms: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5] * 10), approx: true };
  // 2026-10-01 UTC / 2026-10-01
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) return { ms: Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)), approx: true };
  return { ms: null, approx: true };
}

/** แปลง started ของ claim (yyyyMMddTHHmmssZ) */
function parseClaimTs(raw) {
  const m = String(raw || '').trim().match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

/* --------------------------------- claims -------------------------------- */

const CLAIM_FILE_RE = /^([A-Za-z0-9][A-Za-z0-9._-]*)__([a-z]+)__(\d{8}T\d{6}Z)\.md$/;
const CLAIM_FIELDS = ['agent', 'machine', 'session', 'started', 'brief', 'work'];

export function parseClaims(dir) {
  const out = { dir, files: [], items: [], malformed: [], newestMtimeMs: 0, error: null };
  assertSafePath(dir);
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md') && f.toLowerCase() !== 'readme.md');
  } catch (err) {
    out.error = err.code || String(err);
    return out;
  }
  for (const f of names.sort()) {
    const full = path.join(dir, f);
    const { text, mtimeMs, error } = readTextSafe(full);
    out.newestMtimeMs = Math.max(out.newestMtimeMs, mtimeMs);
    const m = f.match(CLAIM_FILE_RE);
    const fields = {};
    const extra = [];
    for (const line of text.split('\n')) {
      const mm = line.match(/^([a-z_]+)\s*:\s*(.*)$/i);
      if (mm && CLAIM_FIELDS.includes(mm[1].toLowerCase())) fields[mm[1].toLowerCase()] = mm[2].trim();
      else if (line.trim() && !mm) extra.push(line.trim());
    }
    const issues = [];
    if (error) issues.push(`อ่านไฟล์ไม่ได้ (${error})`);
    if (!m) issues.push('ชื่อไฟล์ผิดรูป (ต้องเป็น <TASK-ID>__<agent>__<UTC>.md)');
    if (!text.trim()) issues.push('ไฟล์ว่าง');
    for (const k of CLAIM_FIELDS) if (!fields[k]) issues.push(`ไม่มีฟิลด์ ${k}`);

    const rec = {
      file: f,
      path: full,
      task: m ? m[1] : (f.split('__')[0] || f),
      agent: fields.agent || (m ? m[2] : '?'),
      machine: fields.machine || '?',
      session: fields.session || '',
      started: fields.started || (m ? m[3] : ''),
      startedMs: parseClaimTs(fields.started || (m ? m[3] : '')),
      brief: redact(fields.brief || ''),
      work: redact(fields.work || ''),
      issues,
      valid: !!m && issues.length === 0,
    };
    if (MUTATE === 'claims-name' && !m) { rec.valid = true; rec.issues = rec.issues.filter((x) => !x.includes('ผิดรูป')); }
    (rec.valid ? out.items : out.malformed).push(rec);
  }
  out.items.sort((a, b) => (b.startedMs || 0) - (a.startedMs || 0));
  return out;
}

/* ---------------------------------- room --------------------------------- */

const HEADER_KEYS = ['VERDICT', 'STATUS', 'SHA', 'BRANCH-SHA', 'GATES', 'MATCHES_CLAIM', 'SECRETS', 'ISSUES'];
const CANON_6 = ['VERDICT', 'SHA', 'GATES', 'MATCHES_CLAIM', 'SECRETS', 'ISSUES'];
const FILE_LINE_RE = /^(รายงานฉบับเต็ม|รายงาน|หลักฐานดิบ|REPORT|report)\s*[:：]/;

function headerKeyOf(line) {
  const mm = line.match(/^\s*(?:[-*]\s*)?([A-Za-z_][A-Za-z0-9_+\-/ ]{1,24})\s*[:：]\s*(.*)$/);
  if (!mm) return null;
  const key = mm[1].trim().toUpperCase();
  const tokens = key.split('/').map((t) => t.trim());
  const hit = tokens.find((t) => HEADER_KEYS.includes(t));
  return hit ? { key: hit, label: key, value: mm[2].trim() } : null;
}

export function parseRoom(text) {
  const lines = String(text || '').split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    if (/^##\s+\[/.test(line)) {
      if (cur) sections.push(cur);
      cur = { headingRaw: line.replace(/^##\s+/, '').trim(), body: [] };
    } else if (cur) cur.body.push(line);
  }
  if (cur) sections.push(cur);

  const cards = sections.map((s, idx) => {
    const head = s.headingRaw;
    const tsRaw = (head.match(/^\[([^\]]+)\]/) || [])[1] || '';
    const { ms, approx } = parseRoomTs(tsRaw);
    const rest = head.replace(/^\[[^\]]*\]\s*/, '');
    const fromM = rest.match(/จาก\s+(.+?)(?:\s+[—–]\s+|\s+-\s+|$)/) || rest.match(/^([^\s—–-]+)/);
    const fromRaw = fromM ? fromM[1].trim() : '?';
    // "Hermes (HOUSE-BK01-NOTIFY)" -> agent=Hermes, taskTag=HOUSE-BK01-NOTIFY
    const tagM = fromRaw.match(/^([^(]+?)\s*\(([^)]+)\)\s*$/);
    const from = (tagM ? tagM[1] : fromRaw).trim();
    const taskTag = tagM ? tagM[2].trim() : '';
    const toM = rest.match(/(?:ถึง|→)\s*(.+)$/);
    const to = toM ? toM[1].trim() : '';

    const header = [];
    let canonCount = 0;
    const files = new Set();
    let paste = null;
    for (const raw of s.body) {
      const line = raw.replace(/^\s*[-*]\s*/, (m) => m).trimEnd();
      if (/^#{1,6}\s*แปะให้\s*[:：]/.test(line.trim()) || /^แปะให้\s*[:：]/.test(line.trim())) {
        const txt = line.trim().replace(/^#{1,6}\s*/, '').replace(/^แปะให้\s*[:：]\s*/, '').trim();
        paste = { raw: txt, recipient: recipientOf(txt) };
        continue;
      }
      const hk = headerKeyOf(line);
      if (hk) {
        if (header.length < 8) header.push(hk);
        if (CANON_6.includes(hk.key)) canonCount++;
        for (const f of extractFileNames(hk.value)) files.add(f);
      }
      if (FILE_LINE_RE.test(line.trim())) for (const f of extractFileNames(line)) files.add(f);
    }
    const headerShown = header.slice(0, 6);
    const rec = {
      index: idx,
      heading: redact(head),
      rawHeading: head,
      tsRaw,
      tsMs: ms,
      tsApprox: approx,
      tsText: ms == null ? '' : fmtICT(ms),
      from,
      taskTag,
      to,
      header: headerShown.map((h) => ({ key: h.key, label: h.label, value: redact(truncate(h.value, 300)) })),
      headerFound: canonCount,
      headerComplete: canonCount >= 6,
      verdict: (headerShown.find((h) => h.key === 'VERDICT') || {}).value
        ? redact(truncate((headerShown.find((h) => h.key === 'VERDICT') || {}).value, 40))
        : '',
      paste,
      files: [...files].map((f) => redact(f)).slice(0, 6),
    };
    if (MUTATE === 'room-header') rec.headerComplete = true;
    if (MUTATE === 'paste') rec.paste = null;
    return rec;
  });

  return { cards, malformedHeadings: cards.filter((c) => c.tsMs == null).length };
}

function recipientOf(txt) {
  return String(txt || '').split(/—|–|\s-\s|,/)[0].trim().replace(/\(.*?\)\s*$/, '').trim();
}

function extractFileNames(s) {
  const out = [];
  const re = /[A-Za-z0-9_./\\-]+\.(?:md|json|log|mjs|js|ps1|sql|html)/g;
  let m;
  while ((m = re.exec(String(s || '')))) out.push(m[0].replace(/\\/g, '/').split('/').pop());
  return out;
}

function isController(recipient) {
  return /ผู้คุม|controller/i.test(String(recipient || ''));
}

/** heuristic: ต้องแปะให้คนอื่น + ยังไม่มีโพสต์ใหม่กว่า (ตามเวลา) จากคนนั้น */
export function computePasteCandidates(cards) {
  const out = [];
  cards.forEach((c) => {
    if (!c.paste || !c.paste.recipient || isController(c.paste.recipient)) return;
    const who = c.paste.recipient.split(/\s+/)[0].toLowerCase();
    const replied = cards.some((o) => {
      if (o === c) return false;
      if (!o.from.toLowerCase().startsWith(who)) return false;
      if (o.tsMs != null && c.tsMs != null) return o.tsMs > c.tsMs; // ใช้เวลาจริง ไม่ใช้ลำดับในไฟล์
      return false; // เวลาไม่ครบ → ไม่นับเป็นการตอบกลับ (เตือนเกินดีกว่าเตือนตก)
    });
    if (!replied) {
      out.push({ index: c.index, heading: c.heading, recipient: c.paste.recipient, tsMs: c.tsMs, tsText: c.tsText,
        reason: 'บรรทัด "แปะให้:" ชี้คนอื่น และยังไม่พบโพสต์ใหม่กว่าจากคนนั้นในห้อง' });
    }
  });
  return out;
}

/* --------------------------------- TASKS --------------------------------- */

export function parseTasks(text) {
  const lines = String(text || '').split('\n');
  const cards = [];
  let section = '';
  for (const line of lines) {
    const sec = line.match(/^##\s+(.*)$/);
    if (sec) { section = sec[1].trim(); continue; }
    const m = line.match(/^(\s*)- \[( |x|X)\]\s+(.*)$/);
    if (!m) continue;
    const indent = m[1].length;
    if (indent > 0) continue; // งานย่อยของ card
    const rest = m[3];
    const titleM = rest.match(/^\*\*(.+?)\*\*/);
    const title = titleM ? titleM[1] : truncate(rest, 90);
    const summary = titleM ? rest.slice(titleM[0].length).replace(/^\s*[-–]\s*/, '') : '';
    const ownerTag = /\((?:[^)]*\bCEO\b[^)]*|[^)]*\bOwner\b[^)]*)\)/.test(title);
    cards.push({
      section,
      checked: m[2].toLowerCase() === 'x',
      title: redact(truncate(title, 200)),
      summary: redact(truncate(summary, 220)),
      ownerTag,
    });
  }
  return cards;
}

/* --------------------------------- model --------------------------------- */

const SOURCE_FILES = (o) => ({
  claims: path.join(o.vault, '06-Agent-Logs', '_claims'),
  room: path.join(o.vault, '00-System', '3musketeers', 'room.md'),
  tasks: path.join(o.board, 'TASKS.md'),
});

export function buildModel(o) {
  const src = SOURCE_FILES(o);
  const nowMs = o.nowIso ? new Date(o.nowIso).getTime() : Date.now();
  const claims = parseClaims(src.claims);
  const roomFile = readTextSafe(src.room);
  const room = parseRoom(roomFile.text);
  const tasksFile = readTextSafe(src.tasks);
  const tasks = parseTasks(tasksFile.text);

  const newestSrcMs = Math.max(claims.newestMtimeMs, roomFile.mtimeMs, tasksFile.mtimeMs);
  const cards = [...room.cards].sort((a, b) => (b.tsMs ?? -1) - (a.tsMs ?? -1) || a.index - b.index);

  return {
    generatedAt: nowMs,
    generatedAtIso: new Date(nowMs).toISOString(),
    generatedAtICT: fmtICT(nowMs),
    refreshSec: o.intervalSec,
    maxCards: o.maxCards,
    sources: {
      claims: { path: src.claims, mtimeMs: claims.newestMtimeMs, mtimeICT: fmtICT(claims.newestMtimeMs), error: claims.error },
      room: { path: src.room, mtimeMs: roomFile.mtimeMs, mtimeICT: fmtICT(roomFile.mtimeMs), error: roomFile.error },
      tasks: { path: src.tasks, mtimeMs: tasksFile.mtimeMs, mtimeICT: fmtICT(tasksFile.mtimeMs), error: tasksFile.error },
    },
    newestSourceMs: newestSrcMs,
    claims: claims.items,
    claimsMalformed: claims.malformed,
    cards,
    cardsMalformedHeadings: room.malformedHeadings,
    ownerWait: tasks.filter((c) => !c.checked && c.ownerTag),
    pasteCandidates: computePasteCandidates(room.cards),
    stats: {
      claimsActive: claims.items.length,
      claimsMalformed: claims.malformed.length,
      roomSections: room.cards.length,
      cardsShown: Math.min(cards.length, o.maxCards),
      ownerWait: tasks.filter((c) => !c.checked && c.ownerTag).length,
      pasteCandidates: computePasteCandidates(room.cards).length,
    },
    mutationsActive: MUTATE || null,
  };
}

/* --------------------------------- render -------------------------------- */

function verdictClass(v) {
  const s = String(v || '').toUpperCase();
  if (s.startsWith('PASS_WITH_NOTES') || s.startsWith('PASS WITH NOTES')) return 'passnotes';
  if (s.startsWith('PASS')) return 'pass';
  if (s.startsWith('FAIL')) return 'fail';
  if (s.startsWith('NEEDS_DECISION') || s.startsWith('HOLD') || s.startsWith('BLOCKED')) return 'decision';
  return 'other';
}

function claimRow(c) {
  const started = c.startedMs ? fmtICT(c.startedMs) : c.started;
  return `<tr>
    <td data-label="งาน"><strong>${escapeHtml(c.task)}</strong><br><span class="muted">${escapeHtml(c.file)}</span></td>
    <td data-label="ใคร">${escapeHtml(c.agent)}<br><span class="muted">${escapeHtml(c.machine)}</span></td>
    <td data-label="เริ่ม (ICT)">${escapeHtml(started)}</td>
    <td data-label="งานที่ทำ">${escapeHtml(truncate(c.work, 160) || '—')}${c.issues.length ? `<br><span class="warn">⚠ ${escapeHtml(c.issues.join(' · '))}</span>` : ''}</td>
  </tr>`;
}

function cardBlock(c, kind) {
  const badge = c.verdict
    ? `<span class="badge ${verdictClass(c.verdict)}">${escapeHtml(truncate(c.verdict, 28))}</span>`
    : `<span class="badge other">ไม่มี VERDICT</span>`;
  const head6 = c.header.map((h) => `<div class="h6"><span class="k">${escapeHtml(h.label)}</span>: ${escapeHtml(h.value)}</div>`).join('');
  const files = c.files.length
    ? `<div class="muted small">ไฟล์: ${c.files.map((f) => escapeHtml(f)).join(' · ')}</div>` : '';
  const paste = c.paste
    ? `<div class="paste">${kind === 'candidate' ? '<span class="badge heuristic">คาดการณ์</span> ' : ''}แปะให้: ${escapeHtml(c.paste.recipient)}</div>` : '';
  return `<article class="card">
    <div class="row"><span class="when">${escapeHtml(c.tsText || c.tsRaw || 'ไม่ทราบเวลา')}${c.tsApprox ? ' <span class="muted small">(เวลาไม่ชัด)</span>' : ''}</span> ${badge}</div>
    <div class="from">จาก <strong>${escapeHtml(c.from)}</strong>${c.taskTag ? ` <span class="badge">${escapeHtml(c.taskTag)}</span>` : ''}${c.to ? ` → ${escapeHtml(truncate(c.to, 60))}` : ''}</div>
    <div class="small muted">หัว ${c.headerFound}/6 ${c.headerComplete ? '✓' : '⚠ ไม่ครบ'}</div>
    <div class="h6box">${head6 || '<div class="muted small">ไม่มีหัว 6 บรรทัด</div>'}</div>
    ${paste}${files}
  </article>`;
}

export function renderHtml(model) {
  const claimsRows = model.claims.map(claimRow).join('\n');
  const cardsShown = model.cards.slice(0, model.maxCards || 10).map((c) => cardBlock(c, 'result')).join('\n');
  const ownerRows = model.ownerWait.map((c) => `<li><strong>${escapeHtml(c.title)}</strong>
      <div class="muted small">${escapeHtml(c.section || '—')}${c.summary ? ' · ' + escapeHtml(truncate(c.summary, 200)) : ''}</div></li>`).join('\n');
  const candidateRows = model.pasteCandidates.map((p) => `<li>${cardBlock({ ...p, header: [], files: [], headerFound: 0, headerComplete: true }, 'candidate')}</li>`).join('\n');
  const malformed = model.claimsMalformed.length
    ? `<div class="card warnbox"><strong>claim ที่ต้องตรวจ (${model.claimsMalformed.length})</strong><ul>${model.claimsMalformed
      .map((c) => `<li>${escapeHtml(c.file)} — ${escapeHtml(c.issues.join(' · '))}</li>`).join('')}</ul></div>` : '';

  const externalProbe = MUTATE === 'external' ? '<script src="https://example.com/telemetry.js"></script>' : '';
  const viewportMeta = MUTATE === 'viewport' ? '' : '<meta name="viewport" content="width=device-width, initial-scale=1">';
  const darkBlock = MUTATE === 'css' ? '' : `@media (prefers-color-scheme:dark){:root{--bg:#0e1116;--card:#161b22;--fg:#e8edf3;--muted:#9aa5b2;--line:#29313b;--badge:#1e2631;
--pass:#4ade80;--passnotes:#fbbf24;--fail:#f87171;--decision:#fb923c;--accent:#6cb2ff;--warnbg:#2a2113}}`;

  return `<!doctype html>
<html lang="th"><head>
<meta charset="utf-8">
${viewportMeta}
<meta name="robots" content="noindex,nofollow,noarchive">
<title>WSTERA House — ใครทำอะไร · รออะไรจาก Owner</title>
<style>
:root{--bg:#f5f6f8;--card:#ffffff;--fg:#141a21;--muted:#5c6675;--line:#dde2e9;--badge:#eef2f7;
--pass:#0f7b52;--passnotes:#8a6a00;--fail:#b3261e;--decision:#9a4d00;--accent:#0b5fbe;--warnbg:#fff4e5}
${darkBlock}
*{box-sizing:border-box}
html,body{margin:0;padding:0;overflow-x:hidden}
body{background:var(--bg);color:var(--fg);font-size:17px;line-height:1.5;
font-family:"Segoe UI",system-ui,-apple-system,"Noto Sans Thai",Tahoma,sans-serif;-webkit-text-size-adjust:100%}
.wrap{max-width:920px;margin:0 auto;padding:12px 12px 40px}
h1{font-size:1.3rem;margin:6px 0 4px}
h2{font-size:1.12rem;margin:22px 0 8px;border-bottom:2px solid var(--line);padding-bottom:6px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0;overflow-wrap:anywhere;word-break:break-word}
.muted{color:var(--muted)}.small{font-size:.85rem}
.warn{color:var(--fail);font-size:.85rem}
.badge{display:inline-block;padding:2px 9px;border-radius:999px;font-size:.8rem;font-weight:700;background:var(--badge);border:1px solid var(--line)}
.badge.pass{color:var(--pass)}.badge.passnotes{color:var(--passnotes)}.badge.fail{color:var(--fail)}
.badge.decision{color:var(--decision)}.badge.other{color:var(--muted)}
.badge.heuristic{border-style:dashed;color:var(--decision)}
table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.92rem}
th,td{padding:9px 7px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;overflow-wrap:anywhere;word-break:break-word}
th{font-size:.82rem;color:var(--muted);text-transform:none}
.h6box{margin-top:8px;border-left:3px solid var(--line);padding-left:9px;font-size:1rem}
.h6{margin:3px 0}
.h6 .k{color:var(--muted);font-weight:600}
.paste{margin-top:8px;font-size:1rem;background:var(--badge);border:1px dashed var(--line);border-radius:8px;padding:6px 9px}
.from{margin:4px 0}
.when{font-weight:600}
#bar{position:sticky;top:0;z-index:5;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px}
#stale{display:none;background:var(--fail);color:#fff;border-radius:10px;padding:10px 12px;margin:8px 0;font-weight:600}
#stale.show{display:block}
ul{padding-left:20px;margin:6px 0}
li{margin:8px 0}
.warnbox{border-color:var(--decision);background:var(--warnbg)}
button{font-size:1rem;padding:8px 14px;border-radius:10px;border:1px solid var(--line);background:var(--badge);color:var(--fg);min-height:44px}
footer{margin-top:26px;color:var(--muted);font-size:.85rem}
@media (max-width:420px){body{font-size:18px}th,td{font-size:.95rem}table.claims col.c1{width:40%}table.claims col.c2{width:16%}}
/* จอเล็กมาก: เปลี่ยนตาราง claim เป็นการ์ดอ่านง่าย (label + ค่า) กันการล้นและอ่านยาก */
@media (max-width:430px){
  table.claims thead{display:none}
  table.claims,table.claims tbody,table.claims tr,table.claims td{display:block;width:100%}
  table.claims colgroup{display:none}
  table.claims tr{border:1px solid var(--line);border-radius:10px;padding:8px;margin:0 0 10px}
  table.claims td{border-bottom:0;padding:3px 0;font-size:1rem}
  table.claims td:before{content:attr(data-label) ": ";color:var(--muted);font-weight:600}
}
</style></head>
<body><div class="wrap">
<div id="bar">
  <h1>WSTERA House — ใครทำอะไร · รออะไรจาก Owner</h1>
  <div>สร้างเมื่อ <strong id="gen">${escapeHtml(model.generatedAtICT)}</strong>
    <span class="muted small" id="age">—</span></div>
  <div class="muted small">ข้อมูลต้นทางใหม่สุด: ${escapeHtml(fmtICT(model.newestSourceMs))} ${model.newestSourceMs ? `(<span id="srcage">—</span>)` : ''}
    · รีเฟรชตัวเองทุก ${model.refreshSec} วิ · <button onclick="location.reload()">รีเฟรชทันที</button></div>
</div>
<div id="stale" role="alert">⚠ หน้านี้อัปเดตล่าสุดเกิน 30 นาที — ตรวจว่า <code>node build-status.mjs --watch</code> ยังทำงานอยู่</div>
${malformed}

<h2>ก.1 กำลังทำอยู่ตอนนี้ (claim)</h2>
${model.claims.length ? `<div class="card"><table class="claims">
<colgroup><col class="c1"><col class="c2" style="width:18%"><col class="c3" style="width:22%"><col class="c4"></colgroup>
<thead><tr><th>งาน</th><th>ใคร</th><th>เริ่ม (ICT)</th><th>งานที่ทำ</th></tr></thead>
<tbody>${claimsRows}</tbody></table></div>` : '<p class="muted">ยังไม่มี claim</p>'}

<h2>ก.2 ผลล่าสุด (${model.stats.cardsShown} ใบใหม่สุด)</h2>
${cardsShown || '<p class="muted">ยังไม่มีผลในห้อง</p>'}

<h2>ข.1 รอ Owner ตัดสินใจ (${model.stats.ownerWait})</h2>
${model.ownerWait.length ? `<ul>${ownerRows}</ul>` : '<p class="muted">ว่าง</p>'}

<h2>ข.2 น่าจะต้องแปะ (${model.stats.pasteCandidates}) <span class="badge heuristic">คาดการณ์</span></h2>
<p class="muted small">รายการนี้เป็น <strong>การคาดเดาจากบรรทัด "แปะให้:"</strong> ในห้อง ไม่ใช่ข้อเท็จจริง — ใช้เป็นตัวช่วยเตือนความจำเท่านั้น</p>
${model.pasteCandidates.length ? `<ul>${candidateRows}</ul>` : '<p class="muted">ไม่มีรายการค้าง</p>'}

<footer>
หน้าเว็บอ่านอย่างเดียว · ไฟล์เดียว ไม่โหลดอะไรจากภายนอก · ไม่แสดงเนื้อความยาว (เฉพาะหัวข้อ + หัว 6 บรรทัด + ชื่อไฟล์) · ตัวกรองความลับทำงานแบบด่านเสริม<br>
แหล่งข้อมูล: <code>_claims/*.md</code> · <code>room.md</code> · <code>TASKS.md</code> (อ่านเท่านั้น ไม่แก้)
</footer>
</div>
<script>
(function(){
  var G=${JSON.stringify(model.generatedAt)}, S=${JSON.stringify(model.newestSourceMs)}, R=${JSON.stringify(model.refreshSec)};
  function mins(ms){var m=Math.floor((Date.now()-ms)/60000);return m<0?0:m}
  function tick(){
    var pg=mins(G), src=mins(S);
    document.getElementById('age').textContent='('+(pg<1?'เมื่อสักครู่':pg+' นาทีที่แล้ว')+')';
    var sa=document.getElementById('srcage'); if(sa) sa.textContent=src<1?'เมื่อสักครู่':src+' นาทีที่แล้ว';
    document.getElementById('stale').className = pg>30 ? 'show' : '';
  }
  tick(); setInterval(tick,1000);
  if(R>0) setTimeout(function(){location.reload()}, R*1000);
})();
</script>
${externalProbe}
</body></html>
`;
}

/* ---------------------------------- main --------------------------------- */

function gitPull(vault) {
  try {
    const dirty = execFileSync('git', ['-C', vault, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
    if (dirty) return { ok: false, skipped: true, msg: 'ข้าม pull: vault มีไฟล์ค้าง (กันไปทับงานคนอื่น)' };
    execFileSync('git', ['-C', vault, 'pull', '--rebase', '--autostash'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, skipped: false, msg: 'pull แล้ว' };
  } catch (err) {
    return { ok: false, skipped: false, msg: `pull ไม่สำเร็จ (${String(err.message || err).split('\n')[0]})` };
  }
}

function sourceSignature(o) {
  const src = SOURCE_FILES(o);
  const parts = [];
  for (const [k, p] of Object.entries(src)) {
    try { const st = fs.statSync(p); parts.push(`${k}:${st.mtimeMs}:${st.size}`); }
    catch { parts.push(`${k}:missing`); }
    if (k === 'claims') {
      try {
        for (const f of fs.readdirSync(p).sort()) {
          const st = fs.statSync(path.join(p, f));
          parts.push(`c:${f}:${st.mtimeMs}:${st.size}`);
        }
      } catch { /* ignore */ }
    }
  }
  return parts.join('|');
}

function buildOnce(o, prevSig) {
  if (o.pull) {
    const r = gitPull(o.vault);
    process.stderr.write(`[build-status] ${r.msg}\n`);
  }
  const model = buildModel(o);
  if (o.json) { process.stdout.write(JSON.stringify(model, null, 2)); return { model, wrote: false }; }
  const html = renderHtml(model);
  let wrote = false;
  let old = '';
  try { old = fs.readFileSync(o.out, 'utf8'); } catch { /* new file */ }
  if (prevSig != null && old === html) wrote = false;
  else if (old !== html) {
    fs.writeFileSync(o.out, html, 'utf8');
    wrote = true;
  }
  process.stderr.write(`[build-status] ${new Date().toISOString()} claims=${model.stats.claimsActive} cards=${model.stats.cardsShown} ownerWait=${model.stats.ownerWait} paste=${model.stats.pasteCandidates} ${wrote ? `เขียน ${path.basename(o.out)}` : 'ไม่เปลี่ยน ไม่เขียนทับ'}\n`);
  return { model, wrote };
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.json) { buildOnce(o, null); return; }
  if (!o.watch) { buildOnce(o, null); return; }
  let sig = sourceSignature(o);
  buildOnce(o, null);
  process.stderr.write(`[build-status] watch mode: ทุก ${o.intervalSec} วิ (Ctrl+C เพื่อหยุด)\n`);
  setInterval(() => {
    const s2 = sourceSignature(o);
    if (s2 === sig) { if (o.pull) gitPull(o.vault); return; }
    sig = s2;
    buildOnce(o, s2);
  }, Math.max(5, o.intervalSec) * 1000);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try { main(); } catch (err) { process.stderr.write(`[build-status] ERROR: ${err && err.stack || err}\n`); process.exit(1); }
}
