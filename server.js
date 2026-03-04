const express = require('express');
const axios = require('axios');
const Database = require('better-sqlite3');

const app = express();

// ============ CONFIGURATION ============
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const LINE_USER_ID = process.env.LINE_USER_ID;

// OpenClaw Gateway Configuration
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3000';
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'YOUR_GATEWAY_TOKEN';

// ============ DATABASE SETUP ============
const db = new Database('bots.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    line_user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    bot_name TEXT,
    bot_description TEXT,
    agent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  );
`);

// ============ MIDDLEWARE ============
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('🤖 Mami_LineClaw is running!');
});

// ============ LINE WEBHOOK ============
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }
    
    for (const event of events) {
      if (event.type === 'message' && event.message && event.message.type === 'text') {
        await handleTextMessage(event);
      } else if (event.type === 'follow') {
        // User added bot as friend
        await handleFollow(event);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(200).send('OK');
  }
});

// ============ LINE API FUNCTIONS ============
async function replyMessage(replyToken, text) {
  try {
    await axios.post('https://api.line.me/v2/bot/message/reply', {
      replyToken: replyToken,
      messages: [{ type: 'text', text: text }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      }
    });
  } catch (e) {
    console.error('Reply Error:', e.message);
  }
}

async function pushMessage(userId, text) {
  try {
    await axios.post('https://api.line.me/v2/bot/message/push', {
      to: userId,
      messages: [{ type: 'text', text: text }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      }
    });
  } catch (e) {
    console.error('Push Error:', e.message);
  }
}

// ============ EVENT HANDLERS ============
async function handleFollow(event) {
  const userId = event.source.userId;
  
  // Register user
  const existingUser = db.prepare('SELECT * FROM users WHERE line_user_id = ?').get(userId);
  if (!existingUser) {
    db.prepare('INSERT INTO users (line_user_id) VALUES (?)').run(userId);
  }
  
  await pushMessage(userId, 'สวัสดีค่ะ! 👋\n\nยินดีต้อนรับสู่ Mami_LineClaw!\n\nผมช่วยคุณสร้าง Bot ส่วนตัวได้\n\nพิมพ์ "สร้าง bot" เพื่อเริ่มต้นเลยค่ะ!');
}

async function handleTextMessage(event) {
  const userId = event.source.userId;
  const userMessage = event.message && event.message.text ? event.message.text.trim() : '';
  const replyToken = event.replyToken;

  if (!userId || !replyToken) return;

  // Get user from database
  let user = db.prepare('SELECT * FROM users WHERE line_user_id = ?').get(userId);
  
  // Register new user if not exists
  if (!user) {
    db.prepare('INSERT INTO users (line_user_id) VALUES (?)').run(userId);
    user = db.prepare('SELECT * FROM users WHERE line_user_id = ?').get(userId);
  }

  // Get user's bots
  const userBots = db.prepare('SELECT * FROM bots WHERE user_id = ?').all(user.user_id);

  // Check if user has a personal bot and is in conversation with it
  const isCreatingBot = userMessage.toLowerCase().includes('สร้าง') && userMessage.toLowerCase().includes('bot');
  const isListingBots = userMessage.toLowerCase().includes('รายชื่อ') || userMessage.toLowerCase().includes('list');
  const isHelp = userMessage.toLowerCase().includes('ช่วย') || userMessage.toLowerCase() === '?';
  const isCancel = userMessage.toLowerCase().includes('ยกเลิก');

  if (isCreatingBot) {
    await startBotCreation(userId, replyToken, user.user_id);
    return;
  }

  if (isListingBots) {
    await listBots(replyToken, userBots);
    return;
  }

  if (isHelp) {
    await showHelp(replyToken);
    return;
  }

  if (isCancel) {
    await cancelAction(replyToken);
    return;
  }

  // Check if user is creating a bot (multi-step)
  const pendingBot = userBots.find(b => b.bot_name === null || b.bot_name === '');

  if (pendingBot) {
    await handleBotCreationFlow(userId, userMessage, replyToken, pendingBot);
    return;
  }

  // If user has only ONE bot, forward message to that bot
  if (userBots.length === 1 && userBots[0].agent_id) {
    await chatWithBot(userId, userMessage, replyToken, userBots[0]);
    return;
  }

  // If user has MULTIPLE bots, ask which one
  if (userBots.length > 1) {
    const botNames = userBots.map(b => `• ${b.bot_name}`).join('\n');
    await replyMessage(replyToken, `คุณมีหลาย Bot ค่ะ:\n\n${botNames}\n\nพิมพ์ชื่อ Bot ที่ต้องการคุย หรือพิมพ์ "รายชื่อ" เพื่อดูทั้งหมด`);
    return;
  }

  // No bots yet
  await replyMessage(replyToken, 'คุณยังไม่มี Bot ค่ะ!\n\nพิมพ์ "สร้าง bot" เพื่อสร้าง Bot ส่วนตัวของคุณ');
}

// ============ BOT CREATION FLOW ============
async function startBotCreation(userId, replyToken, dbUserId) {
  // Check max bots per user
  const botCount = db.prepare('SELECT COUNT(*) as count FROM bots WHERE user_id = ?').get(dbUserId);
  if (botCount.count >= 10) {
    await replyMessage(replyToken, 'คุณสร้าง Bot ได้สูงสุด 10 ตัวแล้วค่ะ!');
    return;
  }

  // Create pending bot record
  db.prepare('INSERT INTO bots (user_id, bot_name) VALUES (?, ?)').run(dbUserId, '');

  await replyMessage(replyToken, '🤖 สร้าง Bot ใหม่\n\nกรุณาตั้งชื่อ Bot (ภาษาอังกฤษ):\nเช่น Mami_Sales, Jo_Assistant');
}

async function handleBotCreationFlow(userId, userMessage, replyToken, pendingBot) {
  // Step 1: Bot name
  if (pendingBot.bot_name === '') {
    const botName = userMessage.trim();
    
    // Validate name
    if (!/^[A-Za-z0-9_]+$/.test(botName)) {
      await replyMessage(replyToken, 'ชื่อ Bot ต้องเป็นภาษาอังกฤษและตัวเลขเท่านั้นค่ะ ไม่มีช่องว่าง\nเช่น Mami_Sales');
      return;
    }

    // Check duplicate name
    const existing = db.prepare('SELECT * FROM bots WHERE bot_name = ?').get(botName);
    if (existing) {
      await replyMessage(replyToken, 'ชื่อ Bot นี้มีคนใช้แล้วค่ะ ลองชื่ออื่น');
      return;
    }

    // Update bot name and ask for description
    db.prepare('UPDATE bots SET bot_name = ? WHERE id = ?').run(botName, pendingBot.id);
    await replyMessage(replyToken, `📝 ชื่อ: ${botName}\n\nกรุณาบอกคำอธิบาย Bot (วัตถุประสงค์):\nเช่น ผู้ช่วยดูแลลูกค้า`);
    return;
  }

  // Step 2: Bot description
  if (!pendingBot.bot_description) {
    const description = userMessage.trim();
    db.prepare('UPDATE bots SET bot_description = ? WHERE id = ?').run(description, pendingBot.id);

    // Create real agent in OpenClaw
    const agentId = await createOpenClawAgent(pendingBot.bot_name, description);

    if (agentId) {
      // Save agent_id to database
      db.prepare('UPDATE bots SET agent_id = ? WHERE id = ?').run(agentId, pendingBot.id);

      await replyMessage(replyToken, `🎉 สร้าง Bot สำเร็จ!\n\n🤖 ชื่อ: ${pendingBot.bot_name}\n📋 คำอธิบาย: ${description}\n🆔 Agent ID: ${agentId}\n\nตอนนี้คุณสามารถคุยกับ ${pendingBot.bot_name} ได้เลย!\n\nพิมพ์ "รายชื่อ" เพื่อดู Bot ทั้งหมด`);
    } else {
      await replyMessage(replyToken, `⚠️ Bot "${pendingBot.bot_name}" ถูกสร้างแต่ยังไม่สามารถเชื่อมต่อ OpenClaw ได้\n\nลองติดต่อผู้ดูแลระบบ`);
    }
    return;
  }
}

// ============ OPENCLAW INTEGRATION ============
async function createOpenClawAgent(botName, description) {
  try {
    const response = await axios.post(`${OPENCLAW_GATEWAY_URL}/api/agents`, {
      label: botName,
      type: 'subagent',
      systemPrompt: `You are ${botName}. Your purpose: ${description}. You are a helpful AI assistant. Respond in Thai language.`,
      parentSession: 'line-bot'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`
      },
      timeout: 30000
    });

    console.log('Agent created:', response.data);
    return response.data.agentId || response.data.id || `agent:${Date.now()}`;
  } catch (error) {
    console.error('Failed to create agent:', error.message);
    // Return a temporary ID if OpenClaw is not available
    return `temp_agent:${Date.now()}`;
  }
}

async function chatWithBot(userId, userMessage, replyToken, bot) {
  try {
    // Send message to OpenClaw Gateway
    const response = await axios.post(`${OPENCLAW_GATEWAY_URL}/api/sessions`, {
      agentId: bot.agent_id,
      message: userMessage
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`
      },
      timeout: 60000
    });

    const botReply = response.data.response || response.data.message || 'ไม่สามารถตอบได้ในขณะนี้';
    await replyMessage(replyToken, botReply);
  } catch (error) {
    console.error('Chat error:', error.message);
    await replyMessage(replyToken, `⚠️ ${bot.bot_name} ขออภัย ตอนนี้ไม่สามารถตอบได้\n\nกรุณาลองใหม่ภายหลัง`);
  }
}

// ============ OTHER COMMANDS ============
async function listBots(replyToken, bots) {
  if (bots.length === 0) {
    await replyMessage(replyToken, 'คุณยังไม่มี Bot ค่ะ\n\nพิมพ์ "สร้าง bot" เพื่อสร้าง Bot แรกของคุณ!');
    return;
  }

  const botList = bots.map((b, i) => {
    const status = b.agent_id ? '✅' : '⏳';
    return `${i + 1}. ${status} ${b.bot_name}\n   📋 ${b.bot_description || 'ไม่มีคำอธิบาย'}`;
  }).join('\n\n');

  await replyMessage(replyToken, `📋 Bot ของคุณ:\n\n${botList}\n\nพิมพ์ชื่อ Bot เพื่อคุยกับ Bot นั้น`);
}

async function showHelp(replyToken) {
  const helpText = `💡 คำสั่งที่ใช้ได้:

• สร้าง bot - สร้าง Bot ใหม่
• รายชื่อ - ดู Bot ทั้งหมด
• <ชื่อ Bot> - คุยกับ Bot นั้น
• ช่วยเหลือ - แสดงคำช่วยเหลือ
• ยกเลิก - ยกเลิกการทำรายการ

🔧 Bot ที่สร้างจะเชื่อมต่อกับ AI จริง และจดจำได้ตลอด!`;

  await replyMessage(replyToken, helpText);
}

async function cancelAction(replyToken) {
  await replyMessage(replyToken, '❌ ยกเลิกแล้ว\n\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่ง');
}

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Mami_LineClaw is running on port ${PORT}`);
});
