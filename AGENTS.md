# Developer Agent Guidelines

คู่มือและข้อกำหนดการทำงานสำหรับ AI Coding Agent ในโปรเจ็กต์ **Music Quiz Party!** เพื่อให้เข้าใจบริบทเร็วและแก้ไขงานได้ตรงจุดโดยไม่ต้องสแกนไฟล์ทั้งระบบ

---

## ⚡ Core Rules & Workflow

1. **เริ่มต้นจาก `PROJECT_CONTEXT.md` เสมอ (Start Here)**:
   - ทุกครั้งที่เริ่มงานใหม่หรือรับคำสั่งจากผู้ใช้ ให้อ่าน [PROJECT_CONTEXT.md](file:///c:/Users/notz/Desktop/new-my-game/PROJECT_CONTEXT.md) เป็นอันดับแรก เพื่อทราบสถานะล่าสุดและไฟล์ที่เกี่ยวข้อง
   - ห้ามอ่านหรือสแกนทุกไฟล์ในโปรเจ็กต์ ให้ค้นหา (`grep` / `Select-String`) และเปิดเฉพาะไฟล์ที่เกี่ยวกับงานที่กำลังทำเท่านั้น

2. **ตรวจ Git Status และ Git Diff เมื่อเริ่มงาน**:
   - รัน `git status` และ `git diff` เพื่อดูสถานะการแก้ไขล่าสุดของโค้ดก่อนเริ่มลงมือ

3. **ยึดโค้ดปัจจุบันเป็นความจริงสูงสุด (Code is Source of Truth)**:
   - หากข้อมูลใน `PROJECT_CONTEXT.md` ไม่ตรงกับโค้ดจริงในโปรเจ็กต์ ให้ยึดโค้ดปัจจุบันเป็นหลักเสมอ และอัปเดตข้อมูลใน `PROJECT_CONTEXT.md` ให้ถูกต้อง

4. **อ่านไฟล์เพิ่มเฉพาะที่จำเป็น**:
   - เปิดไฟล์อื่นเพิ่มเฉพาะเมื่อจำเป็นต่อความถูกต้องทางตรรกะ การเชื่อมโยงข้อมูล หรือการทดสอบเท่านั้น เพื่อประหยัด Token และทำงานได้รวดเร็ว

5. **อัปเดต `PROJECT_CONTEXT.md` ทุกครั้งหลังแก้งานเสร็จ**:
   - เมื่อแก้ไขโค้ดและทดสอบเสร็จเรียบร้อยแล้ว ให้อัปเดต `PROJECT_CONTEXT.md` แบบกระชับเสมอ โดยระบุ:
     - ไฟล์ที่แก้ไข
     - พฤติกรรม/ค่าล่าสุดที่เปลี่ยน
     - เหตุผลในการแก้ไข
     - งานที่ยังค้างหรือขั้นตอนถัดไป

---

## 🗺️ Key Project Architecture

- **Backend (`server/`)**:
  - [server/index.js](file:///c:/Users/notz/Desktop/new-my-game/server/index.js): Socket.io events, game loop, room state, score calculation, round transitions.
  - [server/musicService.js](file:///c:/Users/notz/Desktop/new-my-game/server/musicService.js): Apple iTunes Search API, song caching, quiz question generation, category definitions.
  - [server/seedData.json](file:///c:/Users/notz/Desktop/new-my-game/server/seedData.json): Seed songs with 30s audio previews for fallback & strict genre isolation.
  - [server/gameModesService.js](file:///c:/Users/notz/Desktop/new-my-game/server/gameModesService.js): Artist metadata and game mode helper logic.

- **Frontend (`public/`)**:
  - [public/index.html](file:///c:/Users/notz/Desktop/new-my-game/public/index.html): SPA layouts (Lobby, Room, Quiz screens for Choices, Typing, Heardle, Songdle, MV, Reveal, Podium).
  - [public/css/style.css](file:///c:/Users/notz/Desktop/new-my-game/public/css/style.css): Obsidian-Gold theme, responsive layout, glassmorphism panels (`.glass-panel`), typography, game mode containers.
  - [public/js/client.js](file:///c:/Users/notz/Desktop/new-my-game/public/js/client.js): Socket.io client handlers, UI updates, audio player management, inputs, timer, and score rendering.

