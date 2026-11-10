# PROJECT_CONTEXT

> **สถานะโปรเจ็กต์ล่าสุด**: เวอร์ชันพัฒนาล่าสุดทำงานสมบูรณ์ เซิร์ฟเวอร์ทำงานที่พอร์ต 3000 (`http://localhost:3000`)

---

## 📌 สรุปการแก้ไขล่าสุด (Latest Changes)

### 1. ลบรูปปกไมโครโฟนเก่าทั้งหมด & ดึงรูปปกอัลบั้มจริง 100% (Real Album Artwork Overhaul)
- **ไฟล์ที่เกี่ยวข้อง**:
  - [server/comprehensiveCatalog.json](file:///c:/Users/notz/Desktop/new-my-game/server/comprehensiveCatalog.json)
  - [server/index.js](file:///c:/Users/notz/Desktop/new-my-game/server/index.js)
  - [server/gameModesService.js](file:///c:/Users/notz/Desktop/new-my-game/server/gameModesService.js)
  - [server/searchService.js](file:///c:/Users/notz/Desktop/new-my-game/server/searchService.js)
  - [server/musicService.js](file:///c:/Users/notz/Desktop/new-my-game/server/musicService.js)
  - [public/js/client.js](file:///c:/Users/notz/Desktop/new-my-game/public/js/client.js)
  - [public/images/default_cover.svg](file:///c:/Users/notz/Desktop/new-my-game/public/images/default_cover.svg)
- **ค่าและพฤติกรรมล่าสุด**:
  - อัปเดตเพลงทั้ง 150 เพลงใน `comprehensiveCatalog.json` ให้มีรูปปกอัลบั้มจริงระดับ HD (จาก Apple Music mzstatic และ Deezer cdn-images) ไม่มีรูป Unsplash ไมโครโฟนหลงเหลืออีกต่อไป (0/150)
  - ในระบบ Songdle เมื่อผู้เล่นพิมพ์ทายเพลง ระบบจะตรวจสอบและดึงรูปปกเพลงจริงมาแสดงให้อัตโนมัติทันที
  - สร้างไฟล์เวกเตอร์ `public/images/default_cover.svg` (แผ่นเสียงสีทอง Obsidian-Gold) เพื่อใช้เป็น Fallback สำรองแบบโมเดิร์น สวยงาม แทนที่รูปไมโครโฟนสต็อกเก่า
- **เหตุผลที่แก้**: ผู้ใช้แจ้งให้แก้ไขเพลงทั้งหมดที่มีรูปปกไมโครโฟนสต็อก ให้แสดงรูปปกอัลบั้มจริงที่ถูกต้อง

### 2. ปรับความกว้าง Glass-Panel & สไตล์ตาราง Songdle และตัวอักษร
- **ไฟล์ที่เกี่ยวข้อง**: [public/css/style.css](file:///c:/Users/notz/Desktop/new-my-game/public/css/style.css), [public/index.html](file:///c:/Users/notz/Desktop/new-my-game/public/index.html), [public/js/client.js](file:///c:/Users/notz/Desktop/new-my-game/public/js/client.js)
- **ค่าและพฤติกรรมล่าสุด**: `.game-main-area` max-width 1180px - 1280px, ตาราง Songdle min-width 820px คอลัมน์เพลง 28%, min-height 72px แบบ row layout, line-height 1.45 - 1.55
- **เหตุผลที่แก้**: ฟอนต์ล้นหลุดกระเบื้องและตัวอักษรเบียดกัน

### 3. เพิ่มหมวดหมู่ "แร็ป & ฮิปฮอปไทย" (Thai Rap & Hip-Hop)
- **ไฟล์ที่เกี่ยวข้อง**: [server/musicService.js](file:///c:/Users/notz/Desktop/new-my-game/server/musicService.js), [server/seedData.json](file:///c:/Users/notz/Desktop/new-my-game/server/seedData.json), [server/gameModesService.js](file:///c:/Users/notz/Desktop/new-my-game/server/gameModesService.js)
- **ค่าและพฤติกรรมล่าสุด**: เพิ่มหมวดหมู่ `thai_rap` พร้อม 79+ เพลงฮิตและเสียงพรีวิว

### 4. ปุ่มจบเกมทันทีของหัวหน้าห้อง (Host End Game)
- **ไฟล์ที่เกี่ยวข้อง**: [server/index.js](file:///c:/Users/notz/Desktop/new-my-game/server/index.js), [public/index.html](file:///c:/Users/notz/Desktop/new-my-game/public/index.html), [public/js/client.js](file:///c:/Users/notz/Desktop/new-my-game/public/js/client.js)
- **ค่าและพฤติกรรมล่าสุด**: สรุปคะแนนข้อล่าสุดและพาไปโพเดียมทันที

### 5. ล็อกหมวดหมู่ลูกทุ่ง & แก้เพลงไม่ตรงกับหน้าเฉลย
- **ไฟล์ที่เกี่ยวข้อง**: [server/musicService.js](file:///c:/Users/notz/Desktop/new-my-game/server/musicService.js), [server/index.js](file:///c:/Users/notz/Desktop/new-my-game/server/index.js)
- **ค่าและพฤติกรรมล่าสุด**: แยก Seed ลูกทุ่ง & เพื่อชีวิต 100% และซิงค์เป้าหมายเพลงให้ตรงกับหน้าเฉลย

### 6. ปรับข้อความหัวเรื่อง & แก้ไขบัคทายเพลงไม่ตรงเฉลย & แยกหมวดหมู่ช้อยส์ 100%
- **ไฟล์ที่เกี่ยวข้อง**:
  - [public/index.html](file:///c:/Users/notz/Desktop/new-my-game/public/index.html)
  - [public/js/client.js](file:///c:/Users/notz/Desktop/new-my-game/public/js/client.js)
  - [server/index.js](file:///c:/Users/notz/Desktop/new-my-game/server/index.js)
  - [server/musicService.js](file:///c:/Users/notz/Desktop/new-my-game/server/musicService.js)
  - [server/gameModesService.js](file:///c:/Users/notz/Desktop/new-my-game/server/gameModesService.js)
- **ค่าและพฤติกรรมล่าสุด**:
  - เปลี่ยน Subtitle ในหน้าหลักเป็น: `"ปาร์ตี้เกมทายเพลงสด เล่นเพลงพร้อมกันกับเพื่อนได้เลย!"`
  - แก้ไขระบบตรวจคำตอบในโหมด MV และ Typing: หากผู้เล่นเลือกคำตอบรูปแบบ `"ชื่อเพลง - ศิลปิน"` ตัวชื่อเพลงต้องตรงกับเพลงเฉลยจริงเท่านั้น (ป้องกันเคสทาย `"Ditto - NewJeans"` แล้วระบบให้คะแนนถูกในคลิปเพลง `"Bubble Gum"`)
  - แก้ไขหน้าเฉลยที่ขึ้นข้อความ `"คำตอบที่คุณเลือก"`: ส่งและเก็บ `answerText` ของช้อยส์หรือข้อความที่ผู้เล่นเลือกจริงไปแสดงผลในหน้าเฉลยเสมอ
  - ล็อกช้อยส์หลอก (Distractors) ในหมวดหมู่ `"ลูกทุ่ง & เพื่อชีวิต"` ให้ดึงเฉพาะเพลงลูกทุ่ง/เพื่อชีวิต 100% ไม่มีเพลงร็อก/ป๊อป (เช่น Cocktail หรือ KLEAR) หลุดเข้ามาปะปนอีกต่อไป
- **เหตุผลที่แก้**: ตามที่ผู้ใช้แจ้งปัญหาจากภาพหน้าจอผลการเล่นจริงในเกม

### 7. ปรับไอคอนมิกซ์/ผสมผสานต่อท้ายหัวข้อ (Trailing Mix Badge) & ติ๊กถูกทุกช่องอัตโนมัติ
- **ไฟล์ที่เกี่ยวข้อง**:
  - [public/index.html](file:///c:/Users/notz/Desktop/new-my-game/public/index.html)
  - [public/css/style.css](file:///c:/Users/notz/Desktop/new-my-game/public/css/style.css)
  - [public/js/client.js](file:///c:/Users/notz/Desktop/new-my-game/public/js/client.js)
  - [server/musicService.js](file:///c:/Users/notz/Desktop/new-my-game/server/musicService.js)
- **ค่าและพฤติกรรมล่าสุด**:
  - ย้ายตัวเลือก `"โหมดผสมผสาน"` และ `"มิกซ์รวมทุกหมวด"` ออกจากตารางการ์ด ไปเป็นปุ่มไอคอน Badge ต่อท้ายชื่อหัวข้อ (`.badge-mix-btn`) สวยงาม สมมาตร
  - เมื่อคลิกปุ่ม Badge `🔀 โหมดผสมผสาน`: ระบบจะทำการติ๊กเครื่องหมายถูก (`✓`) ครบทุกช่องของโหมดการเล่นทันที และสลับโหมดคำถามครบทุกรูปแบบ (ช้อยส์, พิมพ์ตอบ, Heardle, Songdle, MV)
  - เมื่อคลิกปุ่ม Badge `🔀 มิกซ์รวมทุกหมวด`: ระบบจะทำการติ๊กเครื่องหมายถูก (`✓`) ครบทุกช่องของหมวดหมู่หลักทันที เพื่อสุ่มเพลงจากทุกแนวเพลง
  - เมื่อคลิกเลือกช่องใดช่องหนึ่งเป็นรายตัว ระบบจะสลับไปติ๊กเฉพาะช่องที่เลือกนั้นทันที
- **เหตุผลที่แก้**: ตามคำขอของผู้ใช้ที่ต้องการให้ทำเป็นไอคอนต่อท้ายชื่อหมวดที่กดแล้วติ๊กทุกช่อง

---

## ⏳ งานที่ยังค้าง / ขั้นตอนถัดไป (Pending & Next Tasks)
1. **Push โค้ดขึ้น GitHub เพื่อ Deploy Render**: รัน `git push origin main` เมื่อพร้อม เพื่อให้ Render ทำการ Auto-Deploy เวอร์ชันใหม่
2. **ทดสอบการเล่นหลายอุปกรณ์ (Multiplayer Verification)**: ทดสอบการเล่นในห้องรวม
