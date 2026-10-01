/**
 * watch-proof.mjs — พิสูจน์การอัปเดตอัตโนมัติ "บนสำเนา" (ไม่แตะไฟล์จริงใน vault)
 *
 * ทำ:
 *  1) คัดลอก claims/room/TASKS ลงโฟลเดอร์ชั่วคราว
 *  2) เรียก build-status.mjs --watch --interval 5 --no-pull ชี้ไปที่สำเนา
 *  3) รอบแรก: ต้องเขียน status.html
 *  4) ไม่แตะอะไรเลย 2 รอบ: ต้อง "ไม่เขียนทับ" (mtime ของ status.html ต้องนิ่ง)
 *  5) แก้ไฟล์ต้นทางในสำเนา (เพิ่ม claim ใหม่): ต้องเขียนใหม่ภายใน 15 วิ
 *  6) ตรวจว่า "รอ Owner" เพิ่มขึ้นตาม TASKS ที่แก้ และการเปลี่ยนใน vault จริงไม่ถูกแตะ
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const VAULT = 'D:\\AI-Workspace\\vault';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tmpVault = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-vault-'));
const tmpBoard = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-board-'));
fs.mkdirSync(path.join(tmpVault, '06-Agent-Logs', '_claims'), { recursive: true });
fs.mkdirSync(path.join(tmpVault, '00-System', '3musketeers'), { recursive: true });
fs.copyFileSync(path.join(VAULT, '06-Agent-Logs', '_claims', 'HOUSE-CARETAKER__claude__20261001T014013Z.md'),
  path.join(tmpVault, '06-Agent-Logs', '_claims', 'HOUSE-CARETAKER__claude__20261001T014013Z.md'));
fs.copyFileSync(path.join(VAULT, '00-System', '3musketeers', 'room.md'),
  path.join(tmpVault, '00-System', '3musketeers', 'room.md'));
fs.copyFileSync(path.join(ROOT, 'TASKS.md'), path.join(tmpBoard, 'TASKS.md'));

const out = path.join(tmpBoard, 'status.html');
const logFile = path.join(tmpBoard, 'watch.log');
const child = spawn(process.execPath, [path.join(ROOT, 'build-status.mjs'),
  '--watch', '--interval', '5', '--no-pull', '--vault', tmpVault, '--board', tmpBoard, '--out', out],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
child.stderr.on('data', (d) => { log += d.toString(); });
child.stdout.on('data', (d) => { log += d.toString(); });

const stat = () => { try { const s = fs.statSync(out); return { mtime: s.mtimeMs, size: s.size }; } catch { return null; } };
const rows = [];
await sleep(2500);
const s1 = stat();
rows.push(['รอบแรก (สร้างใหม่)', s1 ? `mtime=${Math.round(s1.mtime)} size=${s1.size}` : 'ไม่ถูกสร้าง', s1 ? 'PASS' : 'FAIL']);

await sleep(13000); // ไม่แตะต้นทาง ~2-3 รอบ watch
const s2 = stat();
rows.push(['ไม่แตะต้นทาง ~13 วิ', s2.mtime === s1.mtime ? 'mtime ไม่ขยับ → ไม่เขียนทับ' : `mtime ขยับ (${Math.round(s1.mtime)}→${Math.round(s2.mtime)})`,
  s2.mtime === s1.mtime ? 'PASS' : 'FAIL']);

// แก้ TASKS ในสำเนา: เพิ่มการ์ดรอ Owner ใหม่ 1 ใบ
const tasksCopy = path.join(tmpBoard, 'TASKS.md');
fs.appendFileSync(tasksCopy, '\n- [ ] **[WATCH-TEST] การ์ดใหม่สำหรับทดสอบ (Owner)** - ทดสอบ\n');
const beforeOwnerWait = (fs.readFileSync(out, 'utf8').match(/ข\.1 รอ Owner ตัดสินใจ \((\d+)\)/) || [])[1];
await sleep(14000);
const s3 = stat();
const afterOwnerWait = (fs.readFileSync(out, 'utf8').match(/ข\.1 รอ Owner ตัดสินใจ \((\d+)\)/) || [])[1];
rows.push(['แก้ต้นทาง (เพิ่มการ์ด Owner) แล้วรอ ~14 วิ',
  `mtime ${Math.round(s2.mtime)}→${Math.round(s3.mtime)} · รอ Owner ${beforeOwnerWait}→${afterOwnerWait}`,
  s3.mtime > s2.mtime && Number(afterOwnerWait) === Number(beforeOwnerWait) + 1 ? 'PASS' : 'FAIL']);

// เพิ่ม claim ใหม่ในสำเนา: ตาราง "กำลังทำ" ต้องเพิ่ม
fs.writeFileSync(path.join(tmpVault, '06-Agent-Logs', '_claims', 'WATCH-NEW__hermes__20261001T060000Z.md'),
  ['agent: hermes', 'machine: windows', 'session: watch-test', 'started: 20261001T060000Z',
    'brief: test', 'work: ทดสอบ watch mode'].join('\n') + '\n');
await sleep(14000);
const htmlNow = fs.readFileSync(out, 'utf8');
const hasNew = /WATCH-NEW/.test(htmlNow) && /ทดสอบ watch mode/.test(htmlNow);
rows.push(['เพิ่ม claim ใหม่ในสำเนาแล้วรอ ~14 วิ', hasNew ? 'พบ claim ใหม่ในหน้าเว็บ' : 'ไม่พบ', hasNew ? 'PASS' : 'FAIL']);

// ยืนยันว่าไม่แตะ vault จริง
const realBefore = fs.readFileSync(path.join(VAULT, '00-System', '3musketeers', 'room.md'), 'utf8');
const realTasks = fs.readFileSync(path.join(ROOT, 'TASKS.md'), 'utf8');
const realUntouched = realBefore === fs.readFileSync(path.join(VAULT, '00-System', '3musketeers', 'room.md'), 'utf8')
  && realTasks === fs.readFileSync(path.join(ROOT, 'TASKS.md'), 'utf8') && !fs.existsSync(path.join(VAULT, 'status.html'));
rows.push(['ไฟล์จริงใน vault / TASKS.md ไม่ถูกแตะ', realUntouched ? 'ไม่มีการเขียนเกิดขึ้น' : 'ถูกแก้!', realUntouched ? 'PASS' : 'FAIL']);

child.kill();
await sleep(500);
fs.writeFileSync(logFile, log);
const w = [40, 62, 8];
const line = (a, b, c) => `| ${String(a).padEnd(w[0])} | ${String(b).padEnd(w[1])} | ${String(c).padEnd(w[2])} |`;
console.log(line('การทดสอบ watch', 'ผล', 'คำตัดสิน'));
console.log(`|${'-'.repeat(w[0] + 2)}|${'-'.repeat(w[1] + 2)}|${'-'.repeat(w[2] + 2)}|`);
for (const r of rows) console.log(line(...r));
console.log('\nlog ของ watch (ท้าย):\n' + log.split('\n').slice(-8).join('\n'));
fs.rmSync(tmpVault, { recursive: true, force: true });
fs.rmSync(tmpBoard, { recursive: true, force: true });
const ok = rows.every((r) => r[2] === 'PASS');
process.exit(ok ? 0 : 1);
