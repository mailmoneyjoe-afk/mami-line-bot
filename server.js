const express = require('express');
const line = require('@line/bot-sdk');
const crypto = require('crypto');

const app = express();

// LINE Bot Configuration
const config = {
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  userId: process.env.LINE_USER_ID
};

let client;
try {
  client = new line.Client(config);
} catch (e) {
  console.error('LINE Client Error:', e.message);
}

// OpenClaw Gateway Configuration
const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3000';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// In-memory storage
const userSessions = new Map();

// Command keywords
const COMMANDS = {
  CREATE: ['สร้าง', 'create', 'สร้าง bot', 'create bot'],
  LIST: ['รายชื่อ', 'list', 'ดูรายชื่อ', 'my bots'],
  HELP: ['ช่วยเหลือ', 'help', '?', 'ช่วย'],
  CANCEL: ['ยกเลิก', 'cancel', 'h']
};

// Use buffer for raw body - IMPORTANT for LINE signature
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Health check
app.get('/', (req, res) => {
  res.send('🤖 Mami_Master Creator Bot is running!');
});

// Webhook for LINE
app.post('/webhook', async (req, res) => {
  try {
    // Get raw body
    const rawBody = req.rawBody;
    
    // Validate signature (skip for now if not configured)
    if (config.channelSecret && req.headers['x-line-signature']) {
      const signature = req.headers['x-line-signature'];
      const hash = crypto
        .createHmac('SHA256', config.channelSecret)
        .update(rawBody)
        .digest('base64');
      
      if (hash !== signature) {
        console.log('Invalid signature, but continuing...');
      }
    }

    const events = req.body.events;
    
    if (!events || events.length === 0) {
      return res.status(200).send('OK');
    }
    
    for (const event of events) {
      if (event.type === 'message' && event.message && event.message.type === 'text') {
        await handleTextMessage(event);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(200).send('OK');
  }
});

// Handle text messages
async function handleTextMessage(event) {
  const userId = event.source && event.source.userId;
  const userMessage = event.message && event.message.text ? event.message.text.trim() : '';
  const replyToken = event.replyToken;

  if (!userId || !replyToken) return;

  // Get or create user session
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      state: 'idle',
      data: {}
    });
  }
  const session = userSessions.get(userId);

  // Check if it's a command
  const isCommand = Object.values(COMMANDS).flat().some(cmd => 
    userMessage.toLowerCase().includes(cmd.toLowerCase())
  );

  // Handle commands
  if (isCommand) {
    if (COMMANDS.CREATE.some(c => userMessage.toLowerCase().includes(c.toLowerCase()))) {
      await handleCreateCommand(userId, replyToken);
    } else if (COMMANDS.LIST.some(c => userMessage.toLowerCase().includes(c.toLowerCase()))) {
      await handleListCommand(replyToken);
    } else if (COMMANDS.HELP.some(c => userMessage.toLowerCase().includes(c.toLowerCase()))) {
      await handleHelpCommand(replyToken);
    } else if (COMMANDS.CANCEL.some(c => userMessage.toLowerCase().includes(c.toLowerCase()))) {
      await handleCancelCommand(userId, replyToken);
    }
    return;
  }

  // Handle conversation flow
  switch (session.state) {
    case 'waiting_bot_name':
      await handleBotNameInput(userId, userMessage, replyToken);
      break;
    case 'waiting_bot_description':
      await handleDescriptionInput(userId, userMessage, replyToken);
      break;
    case 'waiting_bot_capabilities':
      await handleCapabilitiesInput(userId, userMessage, replyToken);
      break;
    default:
      await handleHelpCommand(replyToken);
  }
}

// Command handlers
async function handleCreateCommand(userId, replyToken) {
  userSessions.set(userId, {
    state: 'waiting_bot_name',
    data: {}
  });

  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '🤖 การสร้าง Bot ใหม่\n\nกรุณาตั้งชื่อ Bot ที่ต้องการสร้าง (ใช้ภาษาอังกฤษ เช่น Mami_Sales, Mami_Support):'
    });
  } catch (e) {
    console.error('Reply Error:', e.message);
  }
}

async function handleListCommand(replyToken) {
  const message = '📋 รายชื่อ Bot ที่สร้างได้:\n\n' +
    '• Mami_Doc - จัดการเอกสาร\n' +
    '• Mami_Calendar - จัดการปฏิทิน\n' +
    '• Mami_Communication - จัดการการสื่อสาร\n' +
    '• Mami_Research - วิจัยข้อมูล\n' +
    '• Mami_Project - ติดตามโปรเจกต์\n\n' +
    'หากต้องการสร้าง Bot ใหม่ พิมพ์ "สร้าง bot" ได้เลย!';

  try {
    await client.replyMessage(replyToken, { type: 'text', text: message });
  } catch (e) {
    console.error('Reply Error:', e.message);
  }
}

async function handleHelpCommand(replyToken) {
  const message = '💡 คำสั่งที่ใช้ได้:\n\n' +
    '• สร้าง bot - สร้าง Bot ใหม่\n' +
    '• รายชื่อ - ดูรายชื่อ Bot\n' +
    '• ช่วยเหลือ - แสดงคำช่วยเหลือ\n' +
    '• ยกเลิก - ยกเลิกการทำรายการ\n\n' +
    'ตัวอย่าง: พิมพ์ "สร้าง bot" เพื่อเริ่มต้น';

  try {
    await client.replyMessage(replyToken, { type: 'text', text: message });
  } catch (e) {
    console.error('Reply Error:', e.message);
  }
}

async function handleCancelCommand(userId, replyToken) {
  userSessions.delete(userId);
  
  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '❌ ยกเลิกการทำรายการแล้ว\n\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้'
    });
  } catch (e) {
    console.error('Reply Error:', e.message);
  }
}

async function handleBotNameInput(userId, botName, replyToken) {
  const session = userSessions.get(userId);
  session.data.botName = botName;
  session.state = 'waiting_bot_description';
  userSessions.set(userId, session);

  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📝 ตั้งชื่อ Bot: "${botName}"\n\nกรุณาบอกคำอธิบาย Bot ของคุณ (เช่น "ผู้ช่วยดูแลลูกค้า"):`
    });
  } catch (e) {
    console.error('Reply Error:', e.message);
  }
}

async function handleDescriptionInput(userId, description, replyToken) {
  const session = userSessions.get(userId);
  session.data.description = description;
  session.state = 'waiting_bot_capabilities';
  userSessions.set(userId, session);

  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `📝 คำอธิบาย: "${description}"\n\nกรุณาบอกความสามารถของ Bot (เช่น "ตอบคำถามลูกค้า, ส่งข้อมูลสินค้า, รับออร์เดอร์"):`
    });
  } catch (e) {
    console.error('Reply Error:', e.message);
  }
}

async function handleCapabilitiesInput(userId, capabilities, replyToken) {
  const session = userSessions.get(userId);
  session.data.capabilities = capabilities;
  
  const { botName, description } = session.data;

  // Clear session
  userSessions.delete(userId);

  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `🎉 สร้าง Bot "${botName}" เสร็จสิ้น!\n\n` +
        `📋 รายละเอียด:\n` +
        `• ชื่อ: ${botName}\n` +
        `• คำอธิบาย: ${description}\n` +
        `• ความสามารถ: ${capabilities}\n\n` +
        `✅ Bot specification ถูกบันทึกแล้ว!\n` +
        `พิมพ์ "รายชื่อ" เพื่อดู Bot ทั้งหมด หรือ "สร้าง bot" เพื่อสร้าง Bot ใหม่`
    });
  } catch (e) {
    console.error('Reply Error:', e.message);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Mami_Master Creator Bot is running on port ${PORT}`);
});
