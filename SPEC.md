# LINE Bot Specification - Mami_Master Creator

## Project Overview

**Bot Name:** Mami_Master Creator  
**Purpose:** A LINE Bot that accepts user requests to create new bots/assistants, parses requirements, and coordinates with OpenClaw to spawn sub-agents based on user specifications.  
**Platform:** LINE Messaging API + OpenClaw Gateway

---

## 1. Core Features

### 1.1 Bot Creation Request
- Accept natural language requests to create new bots/assistants
- Parse user requirements into structured task descriptions
- Generate appropriate sub-agent configurations

### 1.2 Capability Definition
- Allow users to specify capabilities for each bot:
  - **Purpose** (e.g., calendar management, data analysis, customer support)
  - **Skills** (specific tools/APIs the bot can use)
  - **Behavior** (personality, tone, response style)
  - **Access Level** (what data/systems the bot can access)

### 1.3 OpenClaw Integration
- Spawn new sub-agents via OpenClaw API
- Track created bots and their configurations
- Provide status updates to users

### 1.4 Bot Management
- List all created bots
- View bot details and capabilities
- Update bot configurations
- Delete/terminate bots

---

## 2. User Interactions

### 2.1 Command Structure

| Command | Description |
|---------|-------------|
| `สร้าง bot` / `create bot` | Start bot creation flow |
| `list` / `รายชื่อ` | List all created bots |
| `details <bot_name>` | Show bot details |
| `update <bot_name>` | Update bot configuration |
| `delete <bot_name>` | Delete a bot |
| `help` / `ช่วยเหลือ` | Show help message |

### 2.2 Creation Flow

```
User: "สร้าง bot"
Bot: "แนะนำตัวก่อนนะ! คุณต้องการสร้าง bot แบบไหน?"
User: "อยากได้ bot ช่วยจัดการปฏิทิน"
Bot: "เข้าใจค่ะ! มากำหนดรายละเอียดกันเลย\n\n1. ชื่อ bot (ใส่ชื่อที่ต้องการ):"
User: "Calendar Assistant"
Bot: "2. ความสามารถหลัก:\n- จัดการ event\n- แจ้งเตือน\n- ตรวจสอบความว่าง\nเลือกหรือพิมพ์เพิ่มเติม:"
User: "จัดการ event, แจ้งเตือน"
Bot: "3. ระบบที่เข้าถึงได้:\n- Calendar API\n- Notification\nเลือกหรือพิมพ์เพิ่ม:"
User: "Calendar API, Notification"
Bot: "กำลังสร้าง bot..."

[OpenClaw spawns sub-agent]
Bot: "✅ สร้างสำเร็จ!\n\n🤖 Calendar Assistant\n📋 ความสามารถ: จัดการ event, แจ้งเตือน\n🔗 ระบบ: Calendar API, Notification\n🆔 Agent ID: agent:calendar:001"
```

---

## 3. Data Structures

### 3.1 Bot Configuration

```json
{
  "name": "string",
  "description": "string",
  "purpose": "string",
  "capabilities": ["string"],
  "systems_access": ["string"],
  "behavior": {
    "personality": "string",
    "tone": "string",
    "language": "th|en"
  },
  "openclaw_config": {
    "agent_type": "subagent",
    "model": "string",
    "skills": ["string"]
  }
}
```

### 3.2 User Session

```json
{
  "user_id": "string",
  "state": "idle|creating|updating|deleting",
  "current_bot": "string",
  "step": 0,
  "temp_config": {}
}
```

---

## 4. OpenClaw Integration

### 4.1 Sub-agent Spawn

The bot communicates with OpenClaw Gateway to spawn sub-agents:

```javascript
// Via OpenClaw message API
await message.send({
  target: "openclaw-gateway",
  action: "spawn",
  config: {
    type: "subagent",
    label: botName,
    systemPrompt: generateSystemPrompt(botConfig),
    skills: botConfig.skills,
    parentSession: userId
  }
});
```

### 4.2 Response Handling

- Receive confirmation with agent ID
- Store mapping of user → bots
- Provide feedback to user

---

## 5. Response Templates

### 5.1 Welcome Message
```
สวัสดีค่ะ! 👋
น้องมี่คือ Mami_Master Creator

ช่วยคุณสร้างและจัดการ bot ได้ตามต้องการ

📋 คำสั่งที่ใช้ได้:
- สร้าง bot / create bot → สร้าง bot ใหม่
- list / รายชื่อ → ดู bot ที่สร้างไว้
- details <ชื่อ> → ดูรายละเอียด
- delete <ชื่อ> → ลบ bot
- help / ช่วยเหลือ → ดูวิธีใช้
```

### 5.2 Error Messages

| Error | Response |
|-------|----------|
| Bot not found | "ไม่พบ bot ชื่อ {name} ลองตรวจสอบด้วยคำสั่ง 'list' ดูนะคะ" |
| Creation failed | "เกิดข้อผิดพลาดในการสร้าง bot 😢\nกรุณาลองใหม่อีกครั้ง" |
| Invalid command | "ไม่เข้าใจค่ะ พิมพ์ 'help' เพื่อดูคำสั่งที่ใช้ได้" |

---

## 6. Configuration Files

### Required Files

| File | Purpose |
|------|---------|
| `config.json` | LINE credentials & bot settings |
| `behavior.md` | Bot personality & response rules |
| `user-flow.md` | Detailed interaction flows |
| `SETUP.md` | Installation & configuration guide |

---

## 7. Technical Notes

- Use LINE Messaging API (Webhook)
- Store user sessions in memory or database
- OpenClaw Gateway communication via message API
- Support both Thai and English languages
- Implement rich menu for quick actions
