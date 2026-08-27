---
to: Codex
from: Hermes
project: Subtitle Aligner
priority: medium
created: 2026-07-28
---

# เปลี่ยน default model aligner.py large-v2 → large-v3

**ไฟล์:** `D:\AI-Workspace\projects\subtitle-aligner\aligner.py`

**สิ่งที่ต้องเปลี่ยน:**
1. บรรทัด 263: `model_size: str = "large-v2"` → `"large-v3"`
2. บรรทัด 831: `MODEL_SIZE = "medium"` → `"large-v3"`

**เหตุผล:**
- large-v3 accuracy ดีกว่า large-v2 โดยเฉพาะภาษาไทย (Whisper v3 เทรนด้วยข้อมูลมากกว่า 5x)
- VRAM footprint เท่ากัน (~2.9 GB)
- large-v3 อยู่ใน system cache แล้ว (`C:/Users/Win10/.cache/huggingface/hub/models--Systran--faster-whisper-large-v3`) — ไม่ต้องโหลดเพิ่ม
- medium ยังคงเป็น fallback สำหรับคลิปยาว (30+ นาที) — เปลี่ยนแค่ default

**Workdir:** `D:\AI-Workspace\projects\subtitle-aligner`
