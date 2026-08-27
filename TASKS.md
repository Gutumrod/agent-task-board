# Tasks

## To Do
- [ ] **[SaaS Product Hub] CEO §10 — เหลือ HC01 scope ข้อเดียว (CEO)** - 🟡 **D1–D8 ตัดสินแล้ว 2026-08-27** (hostname=code host / HMAC แยก product / billing DB=schema ใน Project A / PawSpace ingress=narrow / casing=lowercase / CM01=template only / SLO 99% RTO 4h RPO 24h billing ≤1h / **PawSpace→Pawstia** — PawSpace ชน US trademark, Pawstia เช็ค collision ผ่าน, PS01+product_id ไม่เปลี่ยน). **ยังค้าง:** HC01 (Headless Commerce) scope — CEO จะเพิ่มเอกสาร ยังไม่เริ่ม DB/API. ดู `docs/platform/PORTFOLIO_PRODUCTION_MASTER_PLAN.md` §10
- [ ] **[SaaS Product Hub] Pawstia rename residual (Codex/AGY)** - หลัง P0a: internal rename `pawspace`→`pawstia` (slug, UI copy, docs — ไม่แตะ product_id/PS01/repo), claim `@pawstia` IG/FB/X, formal TH trademark search จาก attorney ก่อน public launch. Gate PS-F
- [ ] **[SaaS Product Hub] P0a portfolio foundation (Codex)** - repo map + CI definition (พิสูจน์บน hub-web + 1 product) + runtime matrix + evidence template + reconcile 5 เอกสารที่ขัดกับ code (BK01 "Done", PS01 COMMERCIAL_READINESS, HC01 phantom server, CM01 §A1, DC01 registry) — block ทุก product จนกว่าจะปิด P0a-C1
- [x] **[SaaS Product Hub] Commander Final Review Gate — 2 production plans (Claude)** - ✅ REMEDIATE → CEO สั่งรับเป็นเส้นทางโปรเจกต์ → master plan revision 3: เพิ่ม §0 ตัด usage/demand ออกจาก planning input ตามกฎเหล็ก 2026-08-27, แยก P0a/P0b, focus gate แบบ binding, L0–L5 ladder ของขายขาด, fulfillment เป็น P1 deliverable, R13/R14. VOID 3 ส่วนในแผน Mac session ที่ใช้ demand จัดลำดับ
- [ ] **[Bike Booking SaaS] Stage 4 — Phase 0 baseline (booking)** - 🔴 **PRIORITY** saas-product-hub — investigation-first (migration drift + E3.3 RLS gap + git status disposition + reconciliation plan). AGY investigation running (t_09f7a27e) → Codex reconciliation plan (t_b88aa6dd, scheduled). ห้ามแก้ migration/รัน repair จนกว่าจะ confirm แยก. Repo: D:\AI-Workspace\projects\saas-product-hub\products\booking
- [ ] **[Module Hub] Approve + merge PR #3 (v0.3.0 Enterprise) + PR #4 (LINE OA Module #21)** - High, CI ผ่านทั้งคู่, mergeStateStatus CLEAN — main เป็น protected ต้อง CEO approve ผ่าน GitHub
- [ ] **[Weekly Vault Digest] AGY — สรุป vault รายสัปดาห์ ลง 90-Inbox/2026-07-28-AGY-weekly-digest.md (AGY)** - ทุกอังคาร 18:00 ICT ตาม WEEKLY-VAULT-DIGEST.md — Hermes ✅, Codex ✅, **รอ AGY** — CEO/Claude สะกิดให้ AGY ทำ
- [ ] **[Subtitle Aligner] ทำ demo 3 สไตล์ + แจกฟรี 5 ครีเอเตอร์แรก (AGY)** - Day 1-3
- [ ] **[Subtitle Aligner] ลง Fastwork + DM ตรงครีเอเตอร์ 15 ราย (Codex/AGY)** - Day 4-7
- [ ] **[Friday] Review/merge draft PR #1 Hermes shadow safety gates (CEO/Codex)** - High, PR: https://github.com/Gutumrod/friday/pull/1, branch `codex/hermes-shadow-targeted-tests`
- [ ] **[Friday] หลัง merge PR #1 ให้ rerun stable gate บน master (Codex)** - High, `py_compile`, `src/test_api.py`, `src/test_hermes_shadow.py`, `src/test_tools.py non_live`
- [ ] **[Friday] เก็บ spoken Hermes shadow evidence 5-10 turns (CEO/Codex)** - High, ต้องใช้เสียงจริง; เปิดเฉพาะ `FRIDAY_FOR_HERMES_MODE=shadow` แล้วตรวจ `vault/hermes_shadow` + `vault/latency`
- [ ] **[Friday] สรุป shadow evidence report ก่อนคิด sync mode (Codex)** - High, รวม success/error count, median/p95 latency เท่าที่มี, redaction scan, และ recommendation
- [ ] **[Friday] ตัดสินใจขอบเขต speak-only sync mode (CEO/Codex)** - Pending, ทำหลัง PR #1 merge + spoken shadow evidence ผ่านเท่านั้น
- [ ] **[AI Ops Quick Win Pack] เริ่ม outreach ตาม timeline (Codex)** - Day 1-18
- [ ] **[Document Studio] ทำตัวอย่างเอกสารชุดแรกจากเคส CraftBikeLab (Claude)** - Day 1-3
- [ ] **[KMO Landing Page] Confirm products-proxy + admin-products.html write path** - High, เช็คว่า edge function/admin page ใช้งานจริงกับ Supabase project ybyseaenceyswjnwdmdf ได้หรือยัง
- [ ] **[KMO Landing Page] เติมข้อมูลสินค้า/รูปจริงที่เหลือ** - High, CSV 195 รายการยังใช้รูป placeholder ซ้ำ 5 รูป ต้องอัปรูปจริงผ่าน admin write path (มีรูป staging รอแล้วใน product-photos-staging/)
- [ ] **[KMO Landing Page] Mark สินค้าขายดี (featured)** - High, frontend พร้อมแล้ว แต่ทุกแถวยังเป็น featured=FALSE ต้อง owner เลือกแล้ว flip ใน Supabase
- [ ] **[KMO Landing Page] ตรวจ UX มือถือหลังสินค้าครบ 195 รายการ** - Medium, ดู spacing/card density จริงบนมือถือ
- [ ] **[KMO Landing Page] Server-side slip/upload validation** - Medium, scope อยู่ที่ production repo
- [ ] **[KMO Landing Page] Deploy custom domain** - Pending, รอสินค้า/รูป/โดเมนพร้อมก่อน
- [ ] **[Bike Booking SaaS] ตัดสินใจแถวลูกค้าชื่อผิด (customer 13b12ed6)** - High, เบอร์ทดสอบทับชื่อแถวเก่าจริง ต้องเลือกลบหรือปล่อยไว้ก่อนไปต่อ
- [ ] **[Bike Booking SaaS] ทดสอบ admin app ผ่านเบราว์เซอร์จริง** - High, เฟส 3.5/3.6 เช็คแค่ diff+build ยังไม่ click-through เพราะไม่มี credentials
- [ ] **[Bike Booking SaaS] ตัดสินใจ apply migration booking_conflict_error_code เข้า Supabase** - Medium, รอ CEO อนุมัติก่อน deploy
- [ ] **[Bike Booking SaaS] เริ่มเฟส 4 เตรียมขายจริง** - Medium, แก้ signup 404/clean billing ทดสอบ KMO/refactor PlatformAdminConsole/ย้าย audit log ฝั่ง server
- [ ] **[CraftBikeLab] Wire /shop เข้า data layer จริง (Codex)** - High, ยังเป็น iframe เดิม gap เล็กสุดคุณค่าสูงสุด ไม่ต้องรอ Day 1
- [ ] **[CraftBikeLab] ตั้ง VOTE_HASH_SALT_CBL ใน Vercel env + redeploy (CEO)** - High, ค่ามีอยู่แล้วใน .secrets/keys.txt
- [ ] **[CraftBikeLab] ยืนยัน R2_ACCESS_KEY_CBL/R2_SECRET_KEY_CBL ใช้งานได้จริง (Claude)** - High

## In Progress

## Done
- [x] **[Ops] C:\ data-loss recovery + AGY IDE data-dir fix + cross-agent charter rollout (Claude)** - ✅ Rebuilt wiped auto-memory (13 files), synced 9arm-skills/ponytail/agent-relay-dispatch into vault (unsynced before, commits `124134a`/`22a7612`), reinstalled `agy` CLI binary, found+fixed AGY IDE app was still on C:\ (GEMINI_DIR only ever covered the CLI — found `ANTIGRAVITY_EXECUTABLE_DATA_DIR` via string search in `language_server.exe`, set it, closed IDE pending CEO restart), verified 2026-08-23 crash timeline via Event Log (6 bugchecks, matches CEO's account), corrected two of my own wrong guesses on the record, rolled the CEO's working-relationship charter out to Claude/Codex/AGY. Full log: `06-Agent-Logs/2026-08-24-claude-commander-session-log.md`
- [x] **[saas-product-hub] Stage 1 — booking quota/staff/top-up enforcement** - ✅ commit `ed06fa2` + `2472e12` — migration 547 บรรทัด + TOCTOU patch (pg_advisory_xact_lock) + QA PASS=6/FAIL=0
- [x] **[saas-product-hub] Stage 2 — headless_commerce Stripe webhook signature** - ✅ commit `79c1d7c` — ก็อป webhook-receiver module + verify signature ก่อน + malformed JSON → 401, full suite 14/14
- [x] **[saas-product-hub] Stage 3 — multi_tenant_ai middleware order + handleBillingEvent** - ✅ commit `92139cf` — ย้าย webhook route ก่อน express.json() + wire handleBillingEvent + replay fix (200 duplicate), full suite 13/13
- [x] **[Deep Verify 2026-08-18] ตรวจ code-level readiness ก่อนซื้อโดเมน (Hermes/AGY/Qwen/Codex)** - ✅ 2 รอบ verification ครบ 4 ส่วน (booking/line_oa_ai/headless-commerce/multi-tenant-ai) + Part 5 consolidated verdict ที่ `D:\AI-Workspace\runtime\hermes-native\workspace\deep-verify-2026-08-18\part5-consolidated-verdict.md` — สรุป: ยังไม่มี product ไหนพร้อมเปิดขาย 100%; ตัวบล็อกหลัก = booking quota ไม่ enforce, headless-commerce Stripe webhook ไม่ verify signature, multi-tenant-ai middleware ordering bug (webhook reject ทุก request), line_oa_ai ยัง Pilot ไม่มีราคาอนุมัติ
- [x] **[riak-chang-mvp] Import 1,157 ร้านใหม่ลง Sheet หลัก (Hermes)** - ✅ เขียนครบ 1,157 แถว (912→2,069 data rows), backup ก่อนเขียน `research/pre_import_1157_backup_2026-08-10.json`, batch 200/รอบ 6 รอบ append-only, canary check ผ่าน (ร้านใหม่โผล่อันดับ 1 distance 0), diff verify ผ่าน (912 เดิมไม่เปลี่ยน, id ตรง CSV ครบ), commit `8da64f6` push `codex/natural-line-ai`
- [x] **[riak-chang-mvp] เพิ่มร้าน Zontes ภูเก็ต 2 ราย ลง production (Hermes)** - ✅ เขียนแถว 892-893: Zontes Phuket Experience Center By Lifestyle Auto (076-390-320, 7.8872324,98.3904662) + Zontes GPX Phuket Service Center (076-530-359, 7.9035923,98.3880099) — resolve short-link → canonical URL + pin จริง, verify เบอร์/ที่อยู่ตรง 100%, ตรวจซ้ำซ้อนเป็น NEW, backup ก่อนเขียน, verify อ่านกลับมาครบ 29 คอลัมน์
- [x] **[Ops] Weekly Vault Digest: Codex runner + digest (Codex)** - ✅ เพิ่ม prompt/runner สำหรับ Hermes trigger และสร้าง `90-Inbox/2026-07-28-codex-weekly-digest.md`; ไม่ตั้ง cron ฝั่ง Codex
- [x] **[Friday] เพิ่ม Hermes shadow targeted non-live safety gate (Codex)** - ✅ สร้าง `src/test_hermes_shadow.py`, ผ่าน 7/7, ครอบคลุม default-off, exact shadow mode, fire-and-forget, daemon thread, metadata-only log, token/Bearer redaction
- [x] **[Friday] เพิ่ม stable test gate และ testing guide (Codex)** - ✅ `src/test_tools.py non_live` ผ่าน 55/55, เพิ่ม `docs/FRIDAY_TESTING.md`, no-arg full suite เดิมยังอยู่
- [x] **[Friday] แก้ Hermes probe CLI + redaction hardening (Codex)** - ✅ `src/friday/hermes_client.py --probe` รันจาก repo root ได้, query token/Bearer token ไม่หลุดใน error string
- [x] **[Friday] Live Hermes dashboard probe + WebSocket smoke (Codex)** - ✅ start dashboard เอง, probe สำเร็จ, `/api/ws` smoke ตอบ `พร้อมครับ`, บันทึก drift: OpenAPI `3.1.0`, API `0.19.0`, path count `242`, `/api/health` 404, `/api/status` และ `/api/model/info` timeout ที่ 5s
- [x] **[Friday] เปิด draft PR สำหรับ Hermes shadow safety gates (Codex)** - ✅ PR #1 https://github.com/Gutumrod/friday/pull/1, branch `codex/hermes-shadow-targeted-tests`, ยังไม่ merge เข้า master
- [x] **[Subtitle Aligner] เปลี่ยน default model large-v2 → large-v3 (Codex)** - ✅ Codex แก้ aligner.py บรรทัด 263 + 831 เรียบร้อย
- [x] **[Ops] ระบบ room/open/closed + ย้าย claude-hermes.md (Hermes)** - ✅ ระบบ room/{open,closed} พร้อมแล้ว, claude-hermes.md ถูกย้ายไป projects/task-board/room/ แล้ว, แก้ cron watcher ให้ชี้ path ใหม่, mailbox/room/ ถูกลบแล้ว
- [x] **[Ops] Docker system prune บน C:\\ (Hermes)** - ❌ ทำไม่ได้ image/container ทั้งหมดใช้งานอยู่จริง ปิดงานนี้ไว้แบบไม่ได้ prune
- [x] **[Ops] ล้าง CapCut cache บน C:\\ (Hermes)** - ❌ ทำไม่ได้ ทุกไฟล์ใน cache ใช้งานอยู่จริง (โปรเจกต์ค้างทั้งหมด) ปิดงานนี้ไว้แบบไม่ได้ล้าง
- [x] **[riak-chang-mvp] หาข้อมูลร้านรถยกมอไซค์ candidate list (Hermes)** - ✅ 10 รายการ CSV ที่ `D:\AI-Workspace\projects\riak-chang-mvp\research\tow_trucks_candidates.csv` — Slide Car Center, SUMO Roadside, รุ่งเรือง, Por Slide Car, 24Carfix และอื่นๆ พร้อมเบอร์+พื้นที่บริการ
- [x] **[riak-chang-mvp] ตั้ง Google service account secret ให้ Worker (Hermes)** - ✅ GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY ตั้งใน Cloudflare แล้ว — client_email: `craftbikebot@craftbikebot.iam.gserviceaccount.com`
- [x] **[riak-chang-mvp] เขียนเบอร์โทร 24 ร้านลง Google Sheet (Hermes)** - ✅ เขียนคอลัมน์ phone 24 แถวใน Sheet "ฐานร้านมอไซค์" — verify 24/24 ตรงทุกค่า
- [x] **[riak-chang-mvp] เติมร้านซ่อม 47 จังหวัด 141 รายการ + geocode (Hermes)** - ✅ รวมไฟล์ 47 จังหวัด + 8 fixes → 141 แถว → geocode lat/long 141/141 → ลบ Chira Motorcycles — รอ AGY TASK-02 verify เบอร์กิจเจริญยโสธร (Row 245)
- [x] **[Subtitle Aligner] Benchmark VRAM คลิปยาว-สั้น (Hermes)** - Day 1-3 ✅ วิเคราะห์จาก model size + VRAM จริง (RTX 2080 Ti 11GB) + cache ที่มี
  - [x] ~~ทดสอบคลิป 5 นาที~~ → **วิเคราะห์จาก data** (ไม่มีไฟล์ทดสอบยาว) — large-v3 ใช้ ~7-8 GB ✅
  - [x] ~~ทดสอบคลิป 15 นาที~~ → **วิเคราะห์จาก data** — medium ปลอดภัย ~5.5-6.5 GB, large-v3 เสี่ยง ~8-9 GB
  - [x] ~~ทดสอบคลิป 30 นาที~~ → **วิเคราะห์จาก data** — medium ~7-8 GB, large-v3 ❌ เสี่ยง OOM
