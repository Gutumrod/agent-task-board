/**
 * fail-before proof (บรีฟ 24 ข้อ 5 · W-3 non-vacuity)
 *
 * พิสูจน์ว่าเทสต์ชุดนี้ "ล้มได้จริง" ไม่ใช่ผ่านเพราะว่างเปล่า:
 *   1) เทสต์ชุดหลักต้องผ่านก่อน (baseline)
 *   2) ยิง mutation ทีละตัวผ่าน env BS_MUTATE แล้วรันเทสต์ชุดเดิม -> ต้อง "ล้ม" ทุกตัว
 *   3) ยิง secret ปลอม "บนสำเนา checkout" (fixture) ไม่ใช่ฐานจริง -> ต้องถูกปิดและเทสต์ผ่าน
 *
 * ไม่แตะข้อมูลจริง: mutation ทั้งหมดเป็น in-memory (env) + fixture ใน test/
 * ใช้งาน: node scripts/fail-before.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const TEST = path.join(ROOT, 'test', 'parser.test.mjs');

/** mutation -> เทสต์ที่จะต้องล้ม (อ้างจากชื่อ subtest) */
const MUTATIONS = [
  { name: 'redact', expect: /ความลับ/, why: 'ปิดตัวกรองความลับ -> เทสต์ความลับต้องล้ม' },
  { name: 'claims-name', expect: /claims/, why: 'ยอมรับชื่อไฟล์ claim ผิดรูป -> เทสต์ claims ต้องล้ม' },
  { name: 'room-header', expect: /หัว 6 บรรทัด/, why: 'โกหกว่าหัวครบ 6 -> เทสต์หัว 6 บรรทัดต้องล้ม' },
  { name: 'paste', expect: /แปะให้/, why: 'อ่านบรรทัด "แปะให้:" ไม่ได้ -> เทสต์แปะให้ต้องล้ม' },
  { name: 'external', expect: /ภายนอก/, why: 'ใส่ <script src> ภายนอก -> เทสต์หน้าเว็บต้องล้ม' },
  { name: 'viewport', expect: /หน้าเว็บ/, why: 'ตัด viewport meta -> เทสต์จอมือถือต้องล้ม' },
  { name: 'css', expect: /หน้าเว็บ/, why: 'ตัดโหมดมืด -> เทสต์โหมดมืดต้องล้ม' },
];

function runTests(mutate) {
  const env = { ...process.env };
  if (mutate) env.BS_MUTATE = mutate; else delete env.BS_MUTATE;
  const r = spawnSync(process.execPath, ['--test', TEST], { cwd: ROOT, env, encoding: 'utf8' });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const pass = (out.match(/^# pass (\d+)/m) || [])[1];
  const fail = (out.match(/^# fail (\d+)/m) || [])[1];
  const failedNames = [...out.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1]);
  return { code: r.status, out, pass: Number(pass || 0), fail: Number(fail || 0), failedNames };
}

const rows = [];
let ok = true;

const base = runTests(null);
rows.push(['baseline (ไม่มี mutation)', `pass ${base.pass} / fail ${base.fail}`, base.code === 0 && base.fail === 0 ? 'PASS' : 'FAIL']);
if (!(base.code === 0 && base.fail === 0)) ok = false;

for (const m of MUTATIONS) {
  const r = runTests(m.name);
  const failedAsExpected = r.code !== 0 && r.failedNames.some((n) => m.expect.test(n));
  rows.push([`mutation:${m.name}`, `pass ${r.pass} / fail ${r.fail} → ${r.failedNames.map((n) => n.slice(0, 46)).join(' • ') || '(ไม่มี)'}`,
    failedAsExpected ? 'PASS (ล้มจริงตามคาด)' : 'FAIL (ไม่ล้ม!)']);
  if (!failedAsExpected) ok = false;
}

/* ---- secret ปลอมบนสำเนา checkout: ต้องถูกปิด + พิสูจน์ว่าโพรบไวจริง (ปิดตัวกรองแล้วต้องเห็น) ---- */
const SECRET = 'sk_live_FAKE0000000000000001';
const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-secret-probe-'));
fs.writeFileSync(path.join(probeDir, 'SECRET-TEST__hermes__20261001T050600Z.md'), [
  'agent: hermes', 'machine: windows', 'session: fake', 'started: 20261001T050600Z',
  `brief: fixtures (ปลอม — ลบทิ้งหลังเทสต์)`, `work: ทดสอบตัวกรอง ${SECRET}`,
].join('\n') + '\n');

const probeScript = `
import { parseClaims, redact, renderHtml, buildModel } from ${JSON.stringify('file:///' + path.join(ROOT, 'build-status.mjs').replace(/\\/g, '/'))};
const dir = ${JSON.stringify(probeDir)};
const c = parseClaims(dir);
const txt = JSON.stringify(c) + JSON.stringify(c.items.map(i => renderHtml(buildModel({
  vault: 'D:\\\\AI-Workspace\\\\vault', board: ${JSON.stringify(ROOT)}, out: 'x',
  intervalSec: 0, maxCards: 10, pull: false, json: true, nowIso: '2026-10-01T06:00:00Z' }))));
process.stdout.write(new RegExp(${JSON.stringify(SECRET)}).test(txt) ? 'LEAK' : 'CLEAN');
`;
const probe = (mutate) => {
  const env = { ...process.env };
  if (mutate) env.BS_MUTATE = mutate; else delete env.BS_MUTATE;
  return spawnSync(process.execPath, ['--input-type=module', '-e', probeScript], { cwd: ROOT, env, encoding: 'utf8' }).stdout.trim();
};
const normalRun = probe(null);
const mutantRun = probe('redact');
fs.rmSync(probeDir, { recursive: true, force: true });

const secretOk = normalRun === 'CLEAN' && mutantRun === 'LEAK';
rows.push([`secret ปลอม ${SECRET} (ไฟล์ claim ชั่วคราว)`,
  `ตัวกรองเปิด: ${normalRun} · ปิดตัวกรอง (mutation): ${mutantRun}`,
  secretOk ? 'PASS (ปิดครบ + โพรบไวจริง)' : 'FAIL']);
if (!secretOk) ok = false;

const w = [34, 74, 24];
const line = (a, b, c) => `| ${String(a).padEnd(w[0])} | ${String(b).padEnd(w[1])} | ${String(c).padEnd(w[2])} |`;
console.log(line('การทดสอบ', 'ผล', 'คำตัดสิน'));
console.log(`|${'-'.repeat(w[0] + 2)}|${'-'.repeat(w[1] + 2)}|${'-'.repeat(w[2] + 2)}|`);
for (const r of rows) console.log(line(...r));
console.log(`\nสรุป: ${ok ? 'PASS — ทุก mutation ทำให้เทสต์ล้มจริง (gate ไม่ใช่ของปลอม)' : 'FAIL — มี mutation ที่ไม่ทำให้เทสต์ล้ม'}`);
process.exit(ok ? 0 : 1);
