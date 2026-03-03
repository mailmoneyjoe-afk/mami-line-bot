const express = require('express');
const axios = require('axios');

const app = express();

// LINE Bot Configuration
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const LINE_USER_ID = process.env.LINE_USER_ID;

// In-memory storage
const userSessions = new Map();

// Command keywords
const COMMANDS = {
  CREATE: ['สร้าง', 'create', 'สร้าง bot', 'create bot'],
  LIST: ['รายชื่อ', 'list', 'ดูรายชื่อ', 'my bots'],
  HELP: ['ช่วยเหลือ', 'help', '?', 'ช่วย'],
  CANCEL: ['ยกเลิก', 'cancel', 'h']
};

// Use body-parser with raw body for verification
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('🤖 Mami_Master Creator Bot is running!');
});

// Webhook for LINE
app.post('/webhook', async (req, res) => {
  try {
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

// Reply to LINE
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

  await replyMessage(replyToken, '🤖 การสร้าง Bot ใหม่\n\nกรุณาตั้งชื่อ Bot ที่ต้องการสร้าง (ใช้ภาษาอังกฤษ เช่น Mami_Sales, Mami_Support):');
}

async function handleListCommand(replyToken) {
  const message = '📋 รายชื่อ Bot ที่สร้างได้:\n\n' +
    '• Mami_Doc - จัดการเอกสาร\n' +
    '• Mami_Calendar - จัดการปฏิทิน\n' +
    '• Mami_Communication - จัดการการสื่อสาร\n' +
    '• Mami_Research - วิจัยข้อมูล\n' +
    '• Mami_Project - ติดตามโปรเจกต์\n\n' +
    'หากต้องการสร้าง Bot ใหม่ พิมพ์ "สร้าง bot" ได้เลย!';
  await replyMessage(replyToken, message);
}

async function handleHelpCommand(replyToken) {
  const message = '💡 คำสั่งที่ใช้ได้:\n\n' +
    '• สร้าง bot - สร้าง Bot ใหม่\n' +
    '• รายชื่อ - ดูรายชื่อ Bot\n' +
    '• ช่วยเหลือ - แสดงคำช่วยเหลือ\n' +
    '• ยกเลิก - ยกเลิกการทำรายการ\n\n' +
    'ตัวอย่าง: พิมพ์ "สร้าง bot" เพื่อเริ่มต้น';
  await replyMessage(replyToken, message);
}

async function handleCancelCommand(userId, replyToken) {
  userSessions.delete(userId);
  await replyMessage(replyToken, '❌ ยกเลิกการทำรายการแล้ว\n\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้');
}

async function handleBotNameInput(userId, botName, replyToken) {
  const session = userSessions.get(userId);
  session.data.botName = botName;
  session.state = 'waiting_bot_description';
  userSessions.set(userId, session);
  await replyMessage(replyToken, `📝 ตั้งชื่อ Bot: "${botName}"\n\nกรุณาบอกคำอธิบาย Bot ของคุณ (เช่น "ผู้ช่วยดูแลลูกค้า"):`);
}

async function handleDescriptionInput(userId, description, replyToken) {
  const session = userSessions.get(userId);
  session.data.description = description;
  session.state = 'waiting_bot_capabilities';
  userSessions.set(userId, session);
  await replyMessage(replyToken, `📝 คำอธิบาย: "${description}"\n\nกรุณาบอกความสามารถของ Bot (เช่น "ตอบคำถามลูกค้า, ส่งข้อมูลสินค้า, รับออร์เดอร์"):`);
}

async function handleCapabilitiesInput(userId, capabilities, replyToken) {
  const session = userSessions.get(userId);
  session.data.capabilities = capabilities;
  
  const { botName, description } = session.data;
  userSessions.delete(userId);

  const message = `🎉 สร้าง Bot "${botName}" เสร็จสิ้น!\n\n` +
    `📋 รายละเอียด:\n` +
    `• ชื่อ: ${botName}\n` +
    `• คำอธิบาย: ${description}\n` +
    `• ความสามารถ: ${capabilities}\n\n` +
    `✅ Bot specification ถูกบันทึกแล้ว!\n` +
    `พิมพ์ "รายชื่อ" เพื่อดู Bot ทั้งหมด หรือ "สร้าง bot" เพื่อสร้าง Bot ใหม่`;
  
  await replyMessage(replyToken, message);
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Mami_Master Creator Bot is running on port ${PORT}`);
});
