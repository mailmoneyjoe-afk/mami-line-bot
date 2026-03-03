# Setup Guide - Mami_Master Creator LINE Bot

## Overview

This guide explains how to set up the Mami_Master Creator LINE Bot, connect it to OpenClaw, and configure it for automatic agent creation.

---

## Prerequisites

1. **LINE Developers Account** - https://developers.line.biz/
2. **OpenClaw Gateway** - Running on your server (localhost or public)
3. **Server/Hosting** - To run the bot webhook receiver (can be local with ngrok)
4. **Node.js** - v18 or higher

---

## Part 1: Create LINE Bot

### Step 1: Create Provider

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Log in with your LINE account
3. Click "Create Provider"
4. Enter provider name (e.g., "Mami_Master")
5. Click "Confirm"

### Step 2: Create Messaging API Channel

1. In your provider, click "Create Channel"
2. Select "Messaging API"
3. Fill in the details:

| Field | Value |
|-------|-------|
| Channel Type | Messaging API |
| Company/Personal Name | Your name or company |
| Channel Name | Mami_Master Creator |
| Channel Description | Bot creation assistant |
| Category | Entertainment |
| Subcategory | Chatbot |

4. Accept the Terms of Use
5. Click "Confirm"
6. Click "Create"

### Step 3: Get Credentials

1. Go to the **Channel settings** tab
2. Copy the following credentials:

```
Channel ID:     [YOUR_CHANNEL_ID]
Channel Secret: [YOUR_CHANNEL_SECRET]
```

3. Go to the **Messaging API** tab
4. Issue a new access token:
   - Click "Issue" next to Access token
   - Copy the access token: [YOUR_ACCESS_TOKEN]
5. **Important**: Set webhook URL later (after deploying server)

### Step 4: Configure Bot Settings

1. In **Messaging API** tab:
   - Enable "Use webhook"
   - Disable "Auto-reply messages" (we'll handle this ourselves)
   - Disable "Greeting message" (optional)

---

## Part 2: Configure OpenClaw

### Step 1: Ensure Gateway is Running

```bash
# Check gateway status
openclaw gateway status

# If not running, start it
openclaw gateway start
```

### Step 2: Get Gateway Token

The gateway token is typically set in your OpenClaw configuration. Check `access_config.json`:

```bash
# View current config
cat access_config.json
```

Look for the gateway token or create one if needed.

---

## Part 3: Configure Bot Files

### Step 1: Update config.json

Edit `line_bot/config.json` with your actual credentials:

```json
{
  "line": {
    "channel_id": "1234567890",
    "channel_secret": "your_channel_secret_here",
    "access_token": "your_access_token_here",
    "webhook_url": "https://your-domain.com/webhook"
  },
  "openclaw": {
    "gateway_url": "http://localhost:3000",
    "gateway_token": "your_gateway_token",
    "default_model": "minimax-portal/MiniMax-M2.5"
  },
  "bot": {
    "name": "Mami_Master Creator",
    "language": "th"
  }
}
```

---

## Part 4: Deploy Bot Server

### Option A: Local Development (with ngrok)

1. **Install dependencies:**

```bash
cd line_bot
npm init -y
npm install express @line/bot-sdk axios dotenv
```

2. **Create server.js:**

```javascript
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const config = require('./config.json');

const app = express();

// LINE client
const lineClient = new line.Client({
  channelAccessToken: config.line.access_token
});

// User sessions (in-memory, use database for production)
const sessions = new Map();

// Bot database (in-memory)
const bots = new Map();

// Webhook
app.post('/webhook', line.middleware({
  channelSecret: config.line.channel_secret
}), async (req, res) => {
  try {
    const events = req.body.events;
    await Promise.all(events.map(handleEvent));
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }

  const userId = event.source.userId;
  const text = event.message.text.trim().toLowerCase();
  const session = sessions.get(userId) || { state: 'idle', step: 0, temp: {} };

  // Commands
  if (text === 'สร้าง bot' || text === 'create bot' || text === 'สร้าง') {
    session.state = 'creating';
    session.step = 1;
    session.temp = {};
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: 'มาเริ่มสร้าง bot กันเลย! 🤖\n\n1️⃣ ชื่อ bot (ตั้งชื่อที่จำง่าย):'
    });
  } else if (session.state === 'creating') {
    // Creation flow handling
    await handleCreationFlow(event, session);
  } else if (text === 'รายชื่อ' || text === 'list') {
    await handleListBots(event);
  } else if (text.startsWith('details ') || text.startsWith('รายละเอียด ')) {
    const name = text.replace(/^(details |รายละเอียด )/, '');
    await handleBotDetails(event, name);
  } else if (text === 'ช่วยเหลือ' || text === 'help' || text === '?') {
    await handleHelp(event);
  } else {
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ไม่เข้าใจค่ะ 😅\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้'
    });
  }

  sessions.set(userId, session);
}

async function handleCreationFlow(event, session) {
  const reply = event.replyToken;
  const input = event.message.text;

  switch (session.step) {
    case 1: // Name
      session.temp.name = input;
      session.step = 2;
      await lineClient.replyMessage(reply, {
        type: 'text',
        text: '2️⃣ วัตถุประสงค์ของ bot (เช่น จัดการปฏิทิน):'
      });
      break;

    case 2: // Purpose
      session.temp.purpose = input;
      session.step = 3;
      await lineClient.replyMessage(reply, {
        type: 'text',
        text: '3️⃣ เลือกความสามารถ:\n1) จัดการปฏิทิน\n2) แจ้งเตือน\n3) วิเคราะห์ข้อมูล\n(เช่น: 1,2)'
      });
      break;

    case 3: // Capabilities
      session.temp.capabilities = input;
      session.step = 4;
      await lineClient.replyMessage(reply, {
        type: 'text',
        text: '4️⃣ ระบบที่เข้าถึงได้:\n1) Google Calendar\n2) Email\n3) Database\n(เลือกหรือพิมพ�เอง):'
      });
      break;

    case 4: // Systems
      session.temp.systems = input;
      session.step = 5;
      await lineClient.replyMessage(reply, {
        type: 'text',
        text: '5️⃣ ลักษณะนิสัย:\n1) เป็นทางการ\n2) ไม่เป็นทางการ\n3) ตรงไปตรงมา\n(เลือก):'
      });
      break;

    case 5: // Confirm
      session.temp.behavior = input;
      session.state = 'idle';
      session.step = 0;

      // Create bot in OpenClaw
      const agentId = await spawnAgent(session.temp);

      // Save bot
      bots.set(session.temp.name, {
        ...session.temp,
        agentId,
        createdAt: new Date().toISOString()
      });

      await lineClient.replyMessage(reply, {
        type: 'text',
        text: `✅ สร้างสำเร็จ!\n\n🤖 ${session.temp.name}\n📋 ${session.temp.purpose}\n🆔 Agent ID: ${agentId}`
      });
      break;
  }
}

async function spawnAgent(botConfig) {
  try {
    const response = await axios.post(`${config.openclaw.gateway_url}/api/agents`, {
      type: 'subagent',
      label: botConfig.name,
      systemPrompt: `You are ${botConfig.name}. Purpose: ${botConfig.purpose}. Capabilities: ${botConfig.capabilities}`,
      skills: botConfig.systems.split(',').map(s => s.trim()),
      parentSession: 'line-bot'
    }, {
      headers: {
        'Authorization': `Bearer ${config.openclaw.gateway_token}`
      }
    });
    return response.data.agentId || `agent:${Date.now()}`;
  } catch (err) {
    console.error('Failed to spawn agent:', err.message);
    return `agent:${Date.now()}`;
  }
}

async function handleListBots(event) {
  const list = Array.from(bots.values()).map((b, i) =>
    `${i + 1}. 🤖 ${b.name}\n   📋 ${b.purpose}\n   🆔 ${b.agentId}`
  ).join('\n\n');

  await lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: list || 'ยังไม่มี bot ที่สร้างไว้ค่ะ'
  });
}

async function handleBotDetails(event, name) {
  const bot = Array.from(bots.values()).find(b => b.name.toLowerCase() === name.toLowerCase());

  if (!bot) {
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: `❌ ไม่พบ bot ชื่อ "${name}"`
    });
    return;
  }

  await lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: `🤖 ${bot.name}\n📋 ${bot.purpose}\n💪 ${bot.capabilities}\n🔗 ${bot.systems}\n🆔 ${bot.agentId}`
  });
}

async function handleHelp(event) {
  await lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: `📖 คู่มือ\n━━━━━━━━━━━━━\nสร้าง bot → สร้าง bot ใหม่\nรายชื่อ → ดู bot ที่มี\ndetails <ชื่อ> → ดูรายละเอียด\nช่วยเหลือ → คู่มือนี้`
  });
}

app.listen(3000, () => {
  console.log('LINE Bot server running on port 3000');
});
```

3. **Run the server:**

```bash
node server.js
```

4. **Expose with ngrok:**

```bash
ngrok http 3000
```

5. Copy the ngrok URL and set it as your LINE Webhook URL in the LINE Developers Console.

### Option B: Production Deployment

1. Deploy to a cloud provider (Vercel, Render, Railway, etc.)
2. Set environment variables:
   ```
   LINE_CHANNEL_ID=...
   LINE_CHANNEL_SECRET=...
   LINE_ACCESS_TOKEN=...
   OPENCLAW_GATEWAY_URL=...
   OPENCLAW_GATEWAY_TOKEN=...
   ```
3. Set the webhook URL in LINE Developers Console

---

## Part 5: Set Webhook URL

1. Go to LINE Developers Console → Your Channel → Messaging API
2. Set **Webhook URL** to your server URL:
   - Local: `https://your-ngrok-url.ngrok.io/webhook`
   - Production: `https://your-domain.com/webhook`
3. Click "Verify"
4. Enable "Use webhook"

---

## Part 6: Test the Bot

1. Add your bot as a friend in LINE
2. Send a test message:

```
สร้าง bot
```

3. Follow the creation flow
4. Check that the agent was created in OpenClaw

---

## Part 7: (Optional) Rich Menu Setup

You can create a rich menu for quick access to commands:

```bash
# Using LINE CLI or manually in console
# Go to LINE Developers Console → Messaging API → Rich menu
```

Create a rich menu with buttons:
- "สร้าง bot"
- "รายชื่อ"
- "ช่วยเหลือ"

---

## File Structure

```
line_bot/
├── SPEC.md          # Detailed specification
├── config.json      # Configuration (credentials)
├── behavior.md     # Bot behavior rules
├── user-flow.md    # User interaction flows
├── SETUP.md        # This file
└── server.js       # Bot server code
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook not verified | Check server is running, URL is correct, ngrok is active |
| 401 Error | Check access token is correct and not expired |
| Bot not responding | Check "Use webhook" is enabled in console |
| Agent not created | Check OpenClaw Gateway is running and token is correct |
| Port in use | Change port in server.js or kill conflicting process |

---

## Security Notes

1. **Never commit credentials** - Use environment variables
2. **Rotate access tokens** - Regularly in LINE Console
3. **Secure gateway token** - Don't expose publicly
4. **Validate input** - Sanitize user inputs before processing

---

## Next Steps

After setup, you can:
- Add more sophisticated AI parsing
- Implement persistent storage (database)
- Add rich messages with bubbles/cards
- Integrate more OpenClaw features
- Add analytics and logging
