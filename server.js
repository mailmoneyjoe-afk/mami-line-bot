require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const config = {
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
};

const client = new line.Client(config);

// 📦 Database Setup (sql.js - pure JS)
let db;
const DB_FILE = path.join(__dirname, 'data', 'orders.db');

async function initDatabase() {
  try {
    // Create data directory if not exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(DB_FILE)) {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('✅ Database loaded:', DB_FILE);
    } else {
      db = new SQL.Database();
      console.log('✅ New database created');
    }
    
    // Create table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        user_name TEXT,
        drink TEXT,
        price INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    saveDatabase();
    console.log('✅ Database initialized');
  } catch(e) {
    console.log('❌ Database error:', e.message);
  }
}

function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch(e) {
    console.log('❌ Save DB error:', e.message);
  }
}

// Admin User IDs
const ADMIN_USER_IDS = ['U6642e63a6f7d367f029fbcaaeb9c1382'];

// เมนูแบบตัวเลข
const menu = [
  { num: 1, name: 'เอสเปรสโซ', price: 40 },
  { num: 2, name: 'อเมริกาโซ', price: 45 },
  { num: 3, name: 'คาปูชิโน', price: 50 },
  { num: 4, name: 'ลาเต้', price: 50 },
  { num: 5, name: 'มอคชา', price: 55 },
  { num: 6, name: 'ชาเขียว', price: 45 },
  { num: 7, name: 'ชานม', price: 45 },
  { num: 8, name: 'ชาไทย', price: 40 },
  { num: 9, name: 'ลาเต้เย็น', price: 55 },
  { num: 10, name: 'อเมริกาโซเย็น', price: 50 },
  { num: 11, name: 'มอคชาเย็น', price: 60 },
  { num: 12, name: 'ชาเขียวเย็น', price: 50 },
  { num: 13, name: 'มิลค์เชค', price: 65 },
  { num: 14, name: 'ฟรัปปูชิโน', price: 70 }
];

// สถานะของผู้ใช้
var userState = {};

// ตรวจสอบว่าเป็น admin หรือไม่
function isAdmin(userId) {
  return ADMIN_USER_IDS.indexOf(userId) !== -1;
}

const app = express();

app.post('/webhook', line.middleware(config), function(req, res) {
  Promise.all(req.body.events.map(handleEvent))
    .then(function() { res.end(); })
    .catch(function(err) {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  
  const userId = event.source.userId;
  const text = event.message.text.trim();
  const replyToken = event.replyToken;
  
  var userName = 'ลูกค้า';
  try {
    var profile = await client.getProfile(userId);
    userName = profile.displayName;
  } catch(e) {}
  
  var state = userState[userId] || 'main';
  var num = parseInt(text);
  
  // ===== หน้าหลัก =====
  if (state === 'main') {
    if (!isNaN(num) && num >= 1 && num <= 4) {
      return processMenuSelection(num, replyToken, userId, userName);
    }
    
    var lowerText = text.toLowerCase();
    if (lowerText === 'm') return processMenuSelection(1, replyToken, userId, userName);
    if (lowerText === 'o') return processMenuSelection(2, replyToken, userId, userName);
    if (lowerText === 'c') return processMenuSelection(3, replyToken, userId, userName);
    if (lowerText === 'h') return processMenuSelection(4, replyToken, userId, userName);
    
    if (text === 'ม') return processMenuSelection(1, replyToken, userId, userName);
    if (text === 'อ') return processMenuSelection(2, replyToken, userId, userName);
    if (text === 'ต') return processMenuSelection(3, replyToken, userId, userName);
    if (text === 'ป') return processMenuSelection(4, replyToken, userId, userName);
  }
  
  // ===== หน้าสั่งซื้อ =====
  if (state === 'ordering') {
    if (!isNaN(num) && num >= 1 && num <= 14) {
      return processOrderByNum(num, replyToken, userName, userId);
    }
    if (num === 0 || text === 'b' || text === 'B' || text === 'ก') {
      userState[userId] = 'main';
      return replyMainMenu(replyToken, userName);
    }
  }
  
  // ===== Admin =====
  if (text === 'admin' || text === 'export') {
    if (isAdmin(userId)) {
      return replyAdmin(replyToken);
    } else {
      return client.replyMessage(replyToken, { 
        type: 'text', 
        text: '❌ ไม่มีสิทธิ์เข้าถึงค่ะ' 
      });
    }
  }
  
  // ===== Commands =====
  if (text === 'เมนู' || text === 'menu') {
    userState[userId] = 'main';
    return replyMenu(replyToken);
  }
  if (text === 'สั่งซื้อ' || text === 'order' || text === 'สั่ง') {
    userState[userId] = 'ordering';
    return replyStartOrder(replyToken, userName);
  }
  if (text.startsWith('สั่ง ')) {
    return processOrder(text, replyToken, userName, userId);
  }
  if (text === 'ติดต่อ' || text === 'contact') {
    userState[userId] = 'main';
    return replyContact(replyToken);
  }
  if (text === 'ประวัติ' || text === 'history') {
    userState[userId] = 'main';
    return replyHistory(replyToken, userName, userId);
  }
  
  userState[userId] = 'main';
  return replyMainMenu(replyToken, userName);
}

async function processMenuSelection(num, replyToken, userId, userName) {
  if (num === 1) return replyMenu(replyToken);
  if (num === 2) {
    userState[userId] = 'ordering';
    return replyStartOrder(replyToken, userName);
  }
  if (num === 3) return replyContact(replyToken);
  if (num === 4) return replyHistory(replyToken, userName, userId);
  return replyMainMenu(replyToken, userName);
}

async function replyMainMenu(replyToken, userName) {
  var t = '☕ ยินดีต้อนรับ, ' + userName + '!\n\n';
  t += 'เมนูหลัก\n';
  t += '─────────────────\n';
  t += '1. เมนูสินค้า (M/ม)\n';
  t += '2. สั่งซื้อ (O/อ)\n';
  t += '3. ติดต่อเรา (C/ต)\n';
  t += '4. ประวัติการสั่ง (H/ป)\n';
  t += '\n💬 พิมพ์ตัวเลขเพื่อเลือก';
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function replyMenu(replyToken) {
  var t = '📋 เมนูเครื่องดื่ม\n\n';
  menu.forEach(function(m) {
    t += m.num + '. ' + m.name + ' - ' + m.price + ' บาท\n';
  });
  t += '\n─────────────────\n';
  t += '💬 พิมพ์เลข 1-14 เพื่อสั่ง\n';
  t += '0. กลับหน้าหลัก';
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function replyContact(replyToken) {
  var t = '📞 ติดต่อร้าน\n\n';
  t += '📍 กรุงเทพ\n';
  t += '📞 02-xxx-xxxx\n';
  t += '⏰ 07:00-21:00\n';
  t += '\n─────────────────\n';
  t += '0. กลับหน้าหลัก';
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function replyStartOrder(replyToken, userName) {
  var t = '🛒 สั่งซื้อ\n\n';
  menu.forEach(function(m) {
    t += m.num + '. ' + m.name + ' - ' + m.price + ' บาท\n';
  });
  t += '\n─────────────────\n';
  t += '💬 พิมพ์เลขที่ต้องการ (1-14)\n';
  t += '0. กลับหน้าหลัก';
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function processOrder(text, replyToken, userName, userId) {
  var drinkName = text.replace('สั่ง ', '').trim();
  var drink = null;
  for (var i = 0; i < menu.length; i++) {
    if (menu[i].name.toLowerCase().includes(drinkName.toLowerCase())) {
      drink = menu[i];
      break;
    }
  }
  if (!drink) return client.replyMessage(replyToken, { type: 'text', text: 'ไม่พบ ลองใหม่นะคะ' });
  
  return addOrder(drink, replyToken, userName, userId);
}

async function processOrderByNum(num, replyToken, userName, userId) {
  var drink = menu.find(function(m) { return m.num === num; });
  if (!drink) {
    return client.replyMessage(replyToken, { type: 'text', text: 'ไม่พบ ลองใหม่นะคะ' });
  }
  
  return addOrder(drink, replyToken, userName, userId);
}

async function addOrder(drink, replyToken, userName, userId) {
  // บันทึกลง Database
  try {
    var createdAt = new Date().toISOString();
    db.run(
      'INSERT INTO orders (user_id, user_name, drink, price, created_at) VALUES (?, ?, ?, ?, ?)',
      [userId, userName, drink.name, drink.price, createdAt]
    );
    saveDatabase();
    console.log('✅ Order saved:', drink.name);
  } catch(e) {
    console.log('❌ Save order error:', e.message);
  }
  
  userState[userId] = 'main';
  
  var t = '✅ รับออร์เดอร์แล้ว!\n\n';
  t += '☕ ' + drink.name + '\n';
  t += '💵 ' + drink.price + ' บาท\n';
  t += '\n─────────────────\n';
  t += 'ขอบคุณค่ะ 🙏\n';
  t += '0. กลับหน้าหลัก';
  
  // แจ้ง Admin
  try {
    await client.pushMessage(ADMIN_USER_IDS[0], {
      type: 'text',
      text: '🛒 ออร์เดอร์ใหม่!\n\n👤 ' + userName + '\n☕ ' + drink.name + '\n💵 ' + drink.price + ' บาท'
    });
  } catch(e) {
    console.log('Admin notify error:', e.message);
  }
  
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function replyHistory(replyToken, userName, userId) {
  try {
    var stmt = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5');
    stmt.bind([userId]);
    
    var orders = [];
    while (stmt.step()) {
      orders.push(stmt.getAsObject());
    }
    stmt.free();
    
    if (orders.length === 0) {
      return client.replyMessage(replyToken, { 
        type: 'text', 
        text: '📜 ยังไม่มีประวัติการสั่งซื้อ\n\n0. กลับหน้าหลัก' 
      });
    }
    
    var t = '📜 ประวัติการสั่งซื้อ\n\n';
    orders.forEach(function(o, i) {
      t += (i+1) + '. ' + o.drink + ' - ' + o.price + ' บาท\n';
      t += '   📅 ' + new Date(o.created_at).toLocaleDateString('th-TH') + '\n';
    });
    t += '\n0. กลับหน้าหลัก';
    
    return client.replyMessage(replyToken, { type: 'text', text: t });
  } catch(e) {
    console.log('History error:', e.message);
    return client.replyMessage(replyToken, { 
      type: 'text', 
      text: '❌ เกิดข้อผิดพลาด\n\n0. กลับหน้าหลัก' 
    });
  }
}

async function replyAdmin(replyToken) {
  try {
    var results = [];
    var stmt = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 20');
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    
    var t = '📊 รายงานออร์เดอร์ทั้งหมด\n\n';
    t += '─────────────────\n';
    
    var total = 0;
    results.forEach(function(o) {
      t += new Date(o.created_at).toLocaleDateString('th-TH') + ' | ' + o.user_name + ' | ' + o.drink + ' | ' + o.price + ' บาท\n';
      total += o.price;
    });
    
    t += '─────────────────\n';
    t += '💰 รวม: ' + total + ' บาท (' + results.length + ' รายการ)';
    
    return client.replyMessage(replyToken, { type: 'text', text: t });
  } catch(e) {
    return client.replyMessage(replyToken, { 
      type: 'text', 
      text: '❌ Error: ' + e.message 
    });
  }
}

app.get('/', function(req, res) {
  res.send('☕ LINE Coffee Shop Bot Running!');
});

const PORT = process.env.PORT || 3000;

// Init Database then start server
initDatabase().then(function() {
  app.listen(PORT, function() {
    console.log('🤖 LINE Coffee Shop Bot v3 (sql.js) running on port ' + PORT);
  });
});
