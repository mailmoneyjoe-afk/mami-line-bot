# User Interaction Flow - Mami_Master Creator

## Overview

This document describes the detailed user interaction flows for the LINE Bot.

---

## 1. First Time User Flow

```
User → Opens LINE → Adds Bot as Friend
Bot → [Webhook triggered: follow] → Welcome Message
User → Reads welcome → Understands commands
```

### Welcome Message
```
👋 สวัสดีค่ะ!

น้องมี่คือ Mami_Master Creator 🤖
ช่วยคุณสร้างและจัดการ bot ได้ตามต้องการ

📋 คำสั่งที่ใช้ได้:
- สร้าง bot → สร้าง bot ใหม่
- รายชื่อ → ดู bot ที่สร้างไว้
- ช่วยเหลือ → ดูวิธีใช้

━━━━━━━━━━━━━━━━━━━━━
💡 เริ่มต้น: พิมพ์ 'สร้าง bot' เลย!
```

---

## 2. Bot Creation Flow

### Complete Flow Diagram

```
User: "สร้าง bot"
    ↓
Bot: Ask for bot name
    ↓
User: Enter name
    ↓
Bot: Ask for purpose
    ↓
User: Enter purpose
    ↓
Bot: Ask for capabilities (select or custom)
    ↓
User: Select/Enter capabilities
    ↓
Bot: Ask for system access
    ↓
User: Select/Enter systems
    ↓
Bot: Ask for behavior/tone
    ↓
User: Select/Enter behavior
    ↓
Bot: Show summary & confirm
    ↓
User: Confirm (✅) or Cancel (❌)
    ↓ [Confirm]
Bot: Call OpenClaw to spawn agent
    ↓
Bot: Receive agent ID
    ↓
Bot: Save bot config to database
    ↓
Bot: Send success message with details
    ↓
[End - Back to idle]
```

### Detailed Steps

#### Step 1: Initiate Creation
```
User: "สร้าง bot"
     or "create bot"
     or "สร้าง"

Bot: "มาเริ่มสร้าง bot กันเลย! 🤖\n\n
     1️⃣ ชื่อ bot (ตั้งชื่อที่จำง่าย):"
```

#### Step 2: Bot Name
```
User: "Calendar Bot"
     (or any name 2-30 chars)

Bot: "2️⃣ วัตถุประสงค์ของ bot\n
     (เช่น จัดการปฏิทิน, วิเคราะห์ข้อมูล, ตอบคำถาม):"
```

#### Step 3: Purpose
```
User: "อยากได้ bot ช่วยจัดการ Google Calendar
     - เพิ่ม/ลบ event
     - แจ้งเตือนก่อน meeting
     - เช็คว่าว่างเมื่อไหร่"

Bot: "3️⃣ เลือกความสามารถ (พิมพ์เลขหรือเพิ่มเอง):\n
     1) 📅 จัดการปฏิทิน\n
     2) 🔔 แจ้งเตือน\n
     3) 📊 วิเคราะห์ข้อมูล\n
     4) 💬 ตอบข้อความ\n
     5) 📁 จัดการไฟล์\n
     6) 🌐 เรียกใช้ API\n
     (เช่น: 1,2 หรือ 1,2,6)"
```

#### Step 4: Capabilities
```
User: "1, 2"
     (or "1,2,6" or custom)

Bot: "4️⃣ เลือกระบบที่เข้าถึงได้:\n
     1) 📆 Google Calendar\n
     2) 📧 Email/Gmail\n
     3) 💾 Database\n
     4) 📂 File Storage\n
     5) 🔗 External API\n
     (เช่น: 1,2)"
```

#### Step 5: Systems Access
```
User: "1"
     (Google Calendar)

Bot: "5️⃣ เลือกลักษณะนิสัย:\n
     1) เป็นทางการ - กระชับ เข้าใจง่าย\n
     2) ไม่เป็นทางการ - เป็นกันเอง อบอุ่น\n
     3) ตรงไปตรงมา - ไม่อ้อมค้อม\n
     4) ละเอียด - อธิบายทุกขั้นตอน"
```

#### Step 6: Behavior
```
User: "1, 3"
     (เป็นทางการ + ตรงไปตรงมา)

Bot: "📝 ยืนยันการสร้าง:\n\n
     ━━━━━━━━━━━━━━━━━━━\n
     🤖 ชื่อ: Calendar Bot\n
     📌 วัตถุประสงค์: จัดการ Google Calendar\n
     💪 ความสามารถ:\n
        - จัดการปฏิทิน\n
        - แจ้งเตือน\n
     🔗 ระบบ: Google Calendar\n
     🎭 นิสัย: เป็นทางการ, ตรงไปตรงมา\n
     ━━━━━━━━━━━━━━━━━━━\n\n
     ✅ ยืนยัน    ❌ ยกเลิก"
```

#### Step 7: Confirmation
```
User: "✅"

Bot: "⏳ กำลังสร้าง bot..."

[Internal: Call OpenClaw API]
[Internal: Receive agent_id: "agent:calendar:001"]

Bot: "✅ สร้างสำเร็จ!\n\n
     🤖 Calendar Bot\n
     📋 วัตถุประสงค์: จัดการ Google Calendar\n
     💪 2 ความสามารถ\n
     🔗 1 ระบบ\n
     🆔 Agent ID: agent:calendar:001\n
     ━━━━━━━━━━━━━━━━━━━\n\n
     📌 คำสั่ง:\n
     - ดูรายละเอียด: details Calendar Bot\n
     - ลบ bot: delete Calendar Bot\n
     - สร้างใหม่: สร้าง bot"
```

---

## 3. List Bots Flow

```
User: "รายชื่อ"
     or "list"
     or "ดู bot"

Bot: "📋 Bot ที่คุณสร้างไว้:\n\n
     ━━━━━━━━━━━━━━━━━━━\n
     1. 🤖 Calendar Bot\n
        📌 จัดการ Google Calendar\n
        🆔 agent:calendar:001\n
     ━━━━━━━━━━━━━━━━━━━\n
     2. 🤖 Data Analyzer\n
        📌 วิเคราะห์ข้อมูล Excel\n
        🆔 agent:data:002\n
     ━━━━━━━━━━━━━━━━━━━\n\n
     📌 พิมพ์ 'details <ชื่อ>' เพื่อดูรายละเอียด"
```

---

## 4. Bot Details Flow

```
User: "details Calendar Bot"
     or "รายละเอียด Calendar Bot"

Bot: "🤖 Calendar Bot\n
     ═══════════════════\n
     📋 วัตถุประสงค์: จัดการ Google Calendar\n
     
     💪 ความสามารถ:\n
     • จัดการปฏิทิน (เพิ่ม/ลบ/แก้ไข event)\n     • แจ้งเตือน (ก่อน meeting 15 นาที)\n     
     🔗 ระบบที่เข้าถึง:\n     • Google Calendar API\n     • Notification System\n     
     🎭 นิสัย: เป็นทางการ, ตรงไปตรงมา\n
     
     🆔 Agent ID: agent:calendar:001\n
     📅 สร้างเมื่อ: 3 มี.ค. 2026\n
     
     ═══════════════════\n\n
     📌 คำสั่ง:\n
     • อัปเดต: update Calendar Bot\n
     • ลบ: delete Calendar Bot\n
     • สร้างใหม่: สร้าง bot"
```

---

## 5. Delete Bot Flow

```
User: "delete Calendar Bot"
     or "ลบ Calendar Bot"

Bot: "⚠️ ยืนยันการลบ\n\n
     🤖 Calendar Bot จะถูกลบถาวร\n
     🆔 agent:calendar:001 จะหยุดทำงาน\n\n
     ✅ ยืนยันลบ    ❌ ยกเลิก"

User: "✅"

Bot: "⏳ กำลังลบ bot..."

[Internal: Terminate OpenClaw agent]
[Internal: Remove from database]

Bot: "🗑️ ลบสำเร็จ!\n\n
     🤖 Calendar Bot ถูกลบแล้ว\n
     ━━━━━━━━━━━━━━━━━━━\n\n
     📌 พิมพ์ 'สร้าง bot' เพื่อสร้างใหม่"
```

---

## 6. Update Bot Flow

```
User: "update Calendar Bot"
     or "อัปเดต Calendar Bot"

Bot: "✏️ อัปเดต Calendar Bot\n\n
     เลือกส่วนที่ต้องการแก้ไข:\n
     1) ชื่อ\n
     2) วัตถุประสงค์\n
     3) ความสามารถ\n
     4) ระบบ\n
     5) นิสัย\n
     (พิมพ์เลข หรือ 'ทั้งหมด' เพื่อแก้ไขทั้งหมด)"

User: "3" (capabilities)

Bot: "ความสามารถปัจจุบัน:\n• จัดการปฏิทิน\n• แจ้งเตือน\n\nเพิ่มหรือลบ (เช่น +API, -แจ้งเตือน):"

User: "+Google Drive, -แจ้งเตือน"

Bot: "📝 ยืนยันการเปลี่ยนแปลง:\n\n
     ก่อน: จัดการปฏิทิน, แจ้งเตือน\n
     หลัง: จัดการปฏิทิน, Google Drive\n\n
     ✅ ยืนยัน    ❌ ยกเลิก"

User: "✅"

Bot: "✅ อัปเดตสำเร็จ!\n\n
     🤖 Calendar Bot\n
     💪 ความสามารถ: จัดการปฏิทิน, Google Drive"
```

---

## 7. Help Flow

```
User: "ช่วยเหลือ"
     or "help"
     or "?"

Bot: "📖 คู่มือการใช้งาน\n\n
     ━━━━━━━━━━━━━━━━━━━\n
     🤖 Mami_Master Creator\n
     ━━━━━━━━━━━━━━━━━━━\n\n
     📝 คำสั่งหลัก:\n
     สร้าง bot / create bot\n     → สร้าง bot ใหม่\n\n
     รายชื่อ / list\n     → ดู bot ที่สร้างไว้\n\n
     รายละเอียด <ชื่อ> / details\n     → ดูรายละเอียด bot\n\n
     อัปเดต <ชื่อ> / update\n     → แก้ไข bot\n\n
     ลบ <ชื่อ> / delete\n     → ลบ bot\n\n
     ช่วยเหลือ / help\n     → แสดงคู่มือนี้\n\n
     ━━━━━━━━━━━━━━━━━━━\n\n
     💡 เคล็ดลับ:\n
     • พิมพ์ 'สร้าง bot' เพื่อเริ่มต้น\n
     • ใช้ภาษาไทยหรืออังกฤษก็ได้\n
     • ยกเลิกระหว่างทำ: พิมพ์ 'ยกเลิก'"
```

---

## 8. Error Flows

### Bot Not Found
```
User: "details MyBot"

Bot: "❌ ไม่พบ bot ชื่อ 'MyBot'\n\n
     📋 Bot ที่คุณมี:\n     - Calendar Bot\n     - Data Analyzer\n\n
     📌 พิมพ์ 'รายชื่อ' เพื่อดูทั้งหมด"
```

### Session Timeout
```
[After 30 min of inactivity during creation flow]

Bot: "⏰ หมดเวลาแล้วค่ะ (30 นาที)\n\n
     การสร้าง bot ถูกยกเลิก\n
     พิมพ์ 'สร้าง bot' เมื่อพร้อมใหม่นะคะ 💪"
```

---

## 9. Quick Reference Card

```
╔══════════════════════════════════════╗
║     Mami_Master Creator Commands     ║
╠══════════════════════════════════════╣
║  สร้าง bot    → สร้าง bot ใหม่       ║
║  รายชื่อ     → ดู bot ที่มี         ║
║  details     → ดูรายละเอียด         ║
║  update      → แก้ไข bot             ║
║  delete      → ลบ bot                ║
║  ช่วยเหลือ    → คู่มือการใช้          ║
╚══════════════════════════════════════╝
```
