# PROJECT_CONTEXT

> **สถานะโปรเจ็กต์ล่าสุด**: เวอร์ชันพัฒนาล่าสุดทำงานสมบูรณ์ เซิร์ฟเวอร์ทำงานที่พอร์ต 3000 (`http://localhost:3000`)

---

## 📌 สรุปการแก้ไขล่าสุด (Latest Changes)

### 1. ปรับความกว้าง Glass-Panel & สไตล์ตาราง Songdle และตัวอักษร
- **ไฟล์ที่เกี่ยวข้อง**:
  - [public/css/style.css](file:///c:/Users/notz/Desktop/new-my-game/public/css/style.css)
  - [public/index.html](file:///c:/Users/notz/Desktop/new-my-game/public/index.html)
  - [public/js/client.js](file:///c:/Users/notz/Desktop/new-my-game/public/js/client.js)
- **ค่าและพฤติกรรมล่าสุด**:
  - `.game-main-area`: ขยาย `max-width` จาก 850px เป็น **1180px** (และ **1280px** สำหรับจอ 1440px+), เพิ่ม padding เป็น `1.75rem 2.25rem`
  - `.glass-panel`: เพิ่ม padding เป็น `2.25rem 2.5rem`
  - ตาราง Songdle: กำหนด `min-width: 820px`, คอลัมน์เพลงกว้าง 28%, กระเบื้องเซลล์ปรับเป็น `min-height: 72px; height: auto;` และแสดงรูปปกคู่กับชื่อเพลงแนวนอน (`flex-direction: row`)
  - Typography: ปรับ `line-height: 1.45 - 1.55` และ `letter-spacing: 0.25px` เพื่อไม่ให้สระและวรรณยุกต์ภาษาไทยซ้อนทับหรือเบียดกัน
- **เหตุผลที่แก้**: ภาพจากผู้ใช้พบว่าตัวหนังสือในตาราง Songdle ล้นและหลุดออกจากช่องสี่เหลี่ยม และตัวอักษรเบียดกันอ่านยาก

### 2. เพิ่มหมวดหมู่ "แร็ป & ฮิปฮอปไทย" (Thai Rap & Hip-Hop)
- **ไฟล์ที่เกี่ยวข้อง**:
  - [server/musicService.js](file:///c:/Users/notz/Desktop/new-my-game/server/musicService.js)
  - [server/seedData.json](file:///c:/Users/notz/Desktop/new-my-game/server/seedData.json)
  - [server/gameModesService.js](file:///c:/Users/notz/Desktop/new-my-game/server/gameModesService.js)
- **ค่าและพฤติกรรมล่าสุด**: เพิ่มหมวดหมู่ `thai_rap` พร้อม Seed เพลงฮิต 79+ เพลง (YOUNGOHM, F.HERO, SARAN, SPRITE, 1MILL, URBOYTJ, ILLSLICK ฯลฯ) มีเสียงพรีวิวครบ และล็อกหมวดหมู่ไม่ให้เพลงอื่นปน
- **เหตุผลที่แก้**: ผู้ใช้ต้องการให้มีหมวดเพลงแร็ปเปอร์ไทยโดยเฉพาะ

### 3. ปุ่มจบเกมทันทีของหัวหน้าห้อง (Host End Game)
- **ไฟล์ที่เกี่ยวข้อง**:
  - [server/index.js](file:///c:/Users/notz/Desktop/new-my-game/server/index.js)
  - [public/index.html](file:///c:/Users/notz/Desktop/new-my-game/public/index.html)
  - [public/js/client.js](file:///c:/Users/notz/Desktop/new-my-game/public/js/client.js)
  - [public/css/style.css](file:///c:/Users/notz/Desktop/new-my-game/public/css/style.css)
- **ค่าและพฤติกรรมล่าสุด**: ปุ่ม `🛑 จบเกม (สรุปคะแนน)` แสดงในแถบควบคุมข้อและหน้าเฉลย เมื่อกดจะยืนยันและคำนวณคะแนนรวมข้อล่าสุดทันที แล้วพาไปหน้าโพเดียมสรุปคะแนน
- **เหตุผลที่แก้**: ผู้ใช้ต้องการจบเกมก่อนครบจำนวนข้อที่ตั้งไว้ และต้องการให้นับคะแนนข้อล่าสุดที่เพิ่งเล่นจบด้วย

### 4. แก้ปัญหาเพลงไม่ตรงหมวดลูกทุ่ง (Strict Category Isolation)
- **ไฟล์ที่เกี่ยวข้อง**:
  - [server/musicService.js](file:///c:/Users/notz/Desktop/new-my-game/server/musicService.js)
  - [server/seedData.json](file:///c:/Users/notz/Desktop/new-my-game/server/seedData.json)
- **ค่าและพฤติกรรมล่าสุด**: ล็อกทั้งคำถามและตัวเลือกช้อยส์หลอกให้ดึงเฉพาะ Seed ลูกทุ่ง & เพื่อชีวิต 100% ไม่มีเพลงร็อก/สตริงหลุดมา
- **เหตุผลที่แก้**: มีเพลงสตริงอย่าง Cocktail และ KLEAR หลุดมาในหมวดลูกทุ่ง

### 5. แก้บั๊กเพลงไม่ตรงกับหน้าเฉลย (Song Desync)
- **ไฟล์ที่เกี่ยวข้อง**:
  - [server/index.js](file:///c:/Users/notz/Desktop/new-my-game/server/index.js)
- **ค่าและพฤติกรรมล่าสุด**: ซิงค์ `room.questions[room.currentQuestionIndex]` ให้ตรงกับเพลงที่สุ่มใหม่ใน Songdle / MV เสมอ หน้าเฉลยแสดงเพลงถูกต้อง 100% และบันทึกคำตอบพิมพ์จริง
- **เหตุผลที่แก้**: ผู้เล่นทายเพลง NewJeans ในโหมด MV แต่หน้าเฉลยกลับแสดงเป็นเพลง Charlie Puth

---

## ⏳ งานที่ยังค้าง / ขั้นตอนถัดไป (Pending & Next Tasks)
1. **Push โค้ดขึ้น GitHub เพื่อ Deploy Render**: รัน `git push origin main` เมื่อพร้อม เพื่อให้ Render ทำการ Auto-Deploy เวอร์ชันใหม่
2. **ทดสอบการเล่นหลายอุปกรณ์ (Multiplayer Verification)**: หากมีการเพิ่มฟีเจอร์ใหม่ ให้ทดสอบความเข้ากันได้ของหน้าจอมือถือและเดสก์ท็อป
