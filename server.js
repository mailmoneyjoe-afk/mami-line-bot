require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');

const config = {
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
};

const client = new line.Client(config);

// ไฟล์เก็บข้อมูล
const DATA_FILE = 'D:/backup_JijiClaw/line_bot/orders.json';

// Admin User IDs (ผู้ที่สามารถใช้คำสั่ง admin ได้)
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

// โหลดข้อมูลจากไฟล์
var orders = [];
function loadOrders() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      var data = fs.readFileSync(DATA_FILE, 'utf8');
      orders = JSON.parse(data);
      console.log('Loaded ' + orders.length + ' orders from file');
    }
  } catch(e) {
    console.log('Error loading orders:', e.message);
    orders = [];
  }
}

// บันทึกข้อมูลลงไฟล์
function saveOrders() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
    console.log('Saved ' + orders.length + ' orders to file');
  } catch(e) {
    console.log('Error saving orders:', e.message);
  }
}

// ตรวจสอบว่าเป็น admin หรือไม่
function isAdmin(userId) {
  return ADMIN_USER_IDS.indexOf(userId) !== -1;
}

// โหลดตอนเริ่มต้น
loadOrders();

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
  
  // ตรวจสอบสถานะผู้ใช้
  var state = userState[userId] || 'main';
  
  // แปลงเป็นตัวเลข
  var num = parseInt(text);
  
  // ===== หน้าหลัก =====
  if (state === 'main') {
    // เมนูหลัก 1-5
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return processMenuSelection(num, replyToken, userId, userName);
    }
  }
  
  // ===== หน้าสั่งซื้อ =====
  if (state === 'ordering') {
    // สั่งเครื่องดื่ม 1-14
    if (!isNaN(num) && num >= 1 && num <= 14) {
      return processOrderByNum(num, replyToken, userName, userId);
    }
    // กลับหน้าหลัก
    if (num === 0) {
      userState[userId] = 'main';
      return replyMainMenu(replyToken, userName);
    }
  }
  
  // ===== Admin command =====
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
  
  // ===== คำสั่งพิเศษ =====
  if (text === 'เมนู' || text === 'menu') {
    userState[userId] = 'main';
    return replyMenu(replyToken);
  }
  if (text === 'ราคา' || text === 'price') {
    userState[userId] = 'main';
    return replyPrice(replyToken);
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
    return replyHistory(replyToken, userName);
  }
  
  // Default: กลับหน้าหลัก
  userState[userId] = 'main';
  return replyMainMenu(replyToken, userName);
}

async function processMenuSelection(num, replyToken, userId, userName) {
  if (num === 1) return replyMenu(replyToken);
  if (num === 2) return replyPrice(replyToken);
  if (num === 3) {
    userState[userId] = 'ordering';
    return replyStartOrder(replyToken, userName);
  }
  if (num === 4) return replyContact(replyToken);
  if (num === 5) return replyHistory(replyToken, userName);
  return replyMainMenu(replyToken, userName);
}

async function replyMainMenu(replyToken, userName) {
  var t = '☕ สวัสดีค่ะ ' + userName + '!\n\n';
  t += 'หน้าหลัก\n';
  t += '─────────────────\n';
  t += '1. 📋 เมนูเครื่องดื่ม\n';
  t += '2. 💰 ราคา\n';
  t += '3. 🛒 สั่งซื้อ\n';
  t += '4. 📞 ติดต่อร้าน\n';
  t += '5. 📜 ประวัติการสั่ง\n';
  t += '\n💬 พิมพ์เลข 1-5';
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

async function replyPrice(replyToken) {
  var t = '💰 ราคา\n\n';
  menu.forEach(function(m) {
    t += m.num + '. ' + m.name + ': ' + m.price + ' บาท\n';
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
  var order = { 
    id: orders.length + 1, 
    user: userName, 
    drink: drink.name, 
    price: drink.price, 
    time: new Date().toLocaleString('th'),
    timestamp: new Date().toISOString()
  };
  orders.push(order);
  
  // บันทึกลงไฟล์
  saveOrders();
  
  // รีเซ็ตสถานะ
  userState[userId] = 'main';
  
  var t = '✅ รับออร์เดอร์แล้ว!\n\n';
  t += '☕ ' + drink.name + '\n';
  t += '💵 ' + drink.price + ' บาท\n';
  t += '\n─────────────────\n';
  t += 'ขอบคุณค่ะ 🙏\n';
  t += '0. กลับหน้าหลัก';
  
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function replyHistory(replyToken, userName) {
  var userOrders = orders.filter(function(o) { return o.user === userName; });
  if (userOrders.length === 0) {
    var t = '📜 ประวัติการสั่ง\n\n';
    t += 'ยังไม่เคยสั่งเลยค่ะ\n';
    t += '\n─────────────────\n';
    t += '0. กลับหน้าหลัก';
    return client.replyMessage(replyToken, { type: 'text', text: t });
  }
  var t = '📜 ประวัติการสั่ง\n';
  var total = 0;
  userOrders.slice(-5).forEach(function(o) { t += '• ' + o.drink + ' - ' + o.price + ' บาท\n'; total += o.price; });
  t += '\nรวม: ' + total + ' บาท';
  t += '\n─────────────────\n';
  t += '0. กลับหน้าหลัก';
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

// Admin: ดูข้อมูลทั้งหมด (เฉพาะ admin เท่านั้น)
async function replyAdmin(replyToken) {
  var t = '📊 ข้อมูลทั้งหมด\n\n';
  t += 'จำนวนออร์เดอร์: ' + orders.length + '\n\n';
  
  // สรุปรายได้
  var total = 0;
  orders.forEach(function(o) { total += o.price; });
  t += 'รายได้รวม: ' + total + ' บาท\n';
  t += '\n────────── ล่าสุด ──────────\n';
  
  orders.slice(-10).reverse().forEach(function(o) {
    t += o.time + '\n';
    t += o.user + ': ' + o.drink + ' - ' + o.price + ' บาท\n';
    t += '─────────────────\n';
  });
  
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() { 
  console.log('Coffee Bot on ' + PORT);
  console.log('Data file: ' + DATA_FILE);
  console.log('Admin user IDs:', ADMIN_USER_IDS);
});
