# Task board — หน้า status อ่านอย่างเดียว (บรีฟ 24 · HOUSE-TASKBOARD-AUTOVIEW)

หน้าเดียวสำหรับ Owner (ดูบนมือถือได้) แสดง **ตอนนี้ใครทำอะไร** และ **รออะไรจาก Owner**
สร้างจากไฟล์จริงในเครื่อง อัปเดตอัตโนมัติ · ไม่มี dependency ภายนอก · ไม่โหลดอะไรจากอินเทอร์เน็ต

## ใช้

```bash
node build-status.mjs                      # สร้างครั้งเดียว -> status.html
node build-status.mjs --watch              # วนทุก 60 วิ (เขียนทับเฉพาะเมื่อต้นทางเปลี่ยน)
node build-status.mjs --watch --interval 5 # รอบทดสอบ
node build-status.mjs --no-pull            # ไม่ git pull vault ก่อนอ่าน
node build-status.mjs --json               # พิมพ์ model JSON (ใช้กับเทสต์) ไม่เขียน HTML
```

ตัวเลือกอื่น: `--vault <dir>` `--board <dir>` `--out <file>` `--max-cards N` `--now <iso>`

## ต้นทาง (อ่านอย่างเดียว — ห้ามแก้)

| ส่วน | ไฟล์ |
|---|---|
| ก1 กำลังทำ | `<vault>/06-Agent-Logs/_claims/*.md` |
| ก2 ผลล่าสุด | `<vault>/00-System/3musketeers/room.md` |
| ข1 รอ Owner | `<board>/TASKS.md` (การ์ด `(CEO)` / `(Owner)` ที่ยังไม่เสร็จ) |
| ข2 น่าจะต้องแปะ | heuristic จากบรรทัด `แปะให้:` ใน room.md (ป้าย "คาดการณ์") |

สคริปต์ **ไม่เขียน** ไฟล์ใน vault, `TASKS.md`, `room.md`, `STATUS-HOUSE` — และไม่แตะโฟลเดอร์ `.secrets` (ปฏิเสธ path ทันทีถ้าเจอ)

## ความลับ

- ด่านหลัก: แสดงเฉพาะ **หัวข้อ + หัว 6 บรรทัด + ชื่อไฟล์** — ไม่ดึงเนื้อความยาวของโพสต์มาแสดง
- ด่านเสริม: ตัวกรอง regex (stripe/jwt/webhook/supabase/github/aws/google key, `postgres://user:pass@`, `password=…`, opaque blob) — ตั้งใจ **ไม่ปิด commit SHA** (hex ล้วน) เพราะใช้ตรวจงาน
- `git pull` ก่อนอ่านจะ **ข้าม** ถ้า vault มีไฟล์ค้าง (กันไปทับงานคนอื่น)

## หลักฐาน

```bash
npm test                     # เทสต์ parser/หน้าเว็บ (node --test)
node scripts/fail-before.mjs # พิสูจน์ว่าเทสต์ล้มได้จริง (mutation)
node scripts/browser-proof.mjs   # Chrome จริง: 360–1280px + โหมดมืด + ภาพหน้าจอ
node scripts/overflow-audit.mjs  # ถอด overflow-x:hidden แล้ววัดการล้นจริง
node scripts/watch-proof.mjs     # พิสูจน์ --watch บน "สำเนา" (ไม่แตะ vault จริง)
```

`status.html` และภาพหน้าจอ **ไม่ commit** (generated + มีข้อมูลภายใน) — รันสคริปต์เพื่อสร้างใหม่
