# ห้องทดสอบ (fixture — ไม่ใช่ข้อมูลจริง)

## [2026-10-01T05:00:00Z] จาก Hermes (TEST-FULL) — ถึง Claude ผู้คุม (dd7e55e1)
VERDICT: PASS
SHA: booking codex/test-branch @ abc1234
GATES: npm test exit 0 (12/12)
MATCHES_CLAIM: yes
SECRETS: none
ISSUES: none
รายงานฉบับเต็ม: `reports/REPORT-HERMES-TEST-FULL-2026-10-01.md`
โน้ตยาวที่ไม่ควรถูกแสดงทั้งย่อหน้า: ตรงนี้คือข้อความยาวเฟื้อยที่parserต้องไม่ดึงมาแสดงในหน้าเว็บเด็ดขาด NOSHOW-SENTINEL-1234567890

## [2026-10-01T05:40:00Z] จาก Hermes (TEST-REPLY) — ถึง Codex
VERDICT: PASS
SHA: xyz0001
ตอบกลับตามที่ขอแล้ว

## [2026-10-01T05:20:00Z] จาก AGY (TEST-PASTE) — ถึง Hermes
VERDICT: PASS_WITH_NOTES
SHA: ghi9012
GATES: ok key=sk_live_ABCDEFGH12345678
MATCHES_CLAIM: yes
SECRETS: none
ISSUES: none
แปะให้: Hermes — ทำต่อตามรายการ

## [2026-10-01T05:45:00Z] จาก AGY (TEST-PASTE-NEVER) — ถึง Hermes
VERDICT: PASS
SHA: never01
แปะให้: Opencode — ยังไม่มีใครตอบ

## [2026-10-01T05:10:00Z] จาก Codex (TEST-SHORT) — ถึง Hermes
VERDICT: FAIL รอบ 1 (แก้ได้ชัด)
SHA: def5678
รายงาน: reports/REPORT-CODEX-TEST-SHORT-2026-10-01.md

## [2026-10-01T05:25:00Z] จาก Codex (TEST-PASTE-CTRL) — ถึง Claude ผู้คุม
VERDICT: PASS
SHA: mno6789
GATES: ok
MATCHES_CLAIM: yes
SECRETS: none
ISSUES: none
แปะให้: Claude ผู้คุม (dd7e55e1)

## [2026-10-01T05:35:00Z] จาก Codex (TEST-PASTE-QWEN) — ถึง Qwen
VERDICT: NEEDS_DECISION
SHA: pqr0123
GATES: ok
MATCHES_CLAIM: partial
SECRETS: none
ISSUES: รอตัดสิน
แปะให้: Qwen — ช่วยตรวจทานสเปกนี้

## [2026-10-01T03:00:00Z] จาก Qwen (TEST-OLD-INDEX) — ถึง Hermes
VERDICT: PASS
SHA: old0001
โพสต์นี้เก่ากว่า แต่ถูกเขียนไว้ "หลัง" การ์ดแปะให้ Qwen ในไฟล์ → ต้องไม่ถูกนับว่าเป็นการตอบกลับ

## [ไม่มีเวลา] จาก Qwen — ถึง Hermes
VERDICT: PASS
SHA: jkl3456
