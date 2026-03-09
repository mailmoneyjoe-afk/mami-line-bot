require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
};

const client = new line.Client(config);

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

const orders = [];
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
  
  if (text === 'เมนู' || text === 'menu') return replyMenu(replyToken);
  if (text === 'ราคา' || text === 'price') return replyPrice(replyToken);
  if (text === 'สั่งซื้อ' || text === 'order' || text === 'สั่ง') return replyStartOrder(replyToken, userName);
  if (text.startsWith('สั่ง ')) return processOrder(text, replyToken, userName);
  if (text === 'ติดต่อ' || text === 'contact') return replyContact(replyToken);
  if (text === 'ประวัติ' || text === 'history') return replyHistory(replyToken, userName);
  
  // รองรับการสั่งแบบตัวเลข
  var num = parseInt(text);
  if (!isNaN(num) && num >= 1 && num <= 14) return processOrderByNum(num, replyToken, userName);
  
  return client.replyMessage(replyToken, {
    type: 'text',
    text: '☕ สวัสดีค่ะ ' + userName + '!\n\n• เมนู - ดูเมนู\n• ราคา - ดูราคา\n• สั่ง - สั่งซื้อ\n• ติดต่อ - ติดต่อร้าน\n• ประวัติ - ดูประวัติ'
  });
}

async function replyMenu(replyToken) {
  var t = '☕ เมนูร้านกาแฟ\n\n';
  menu.forEach(function(m) {
    t += m.num + '. ' + m.name + ' - ' + m.price + ' บาท\n';
  });
  t += '\n💬 พิมพ์เลข 1-14 เพื่อสั่ง';
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function replyPrice(replyToken) {
  var t = '💰 ราคา\n\n';
  menu.forEach(function(m) {
    t += m.num + '. ' + m.name + ': ' + m.price + ' บาท\n';
  });
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function replyContact(replyToken) {
  return client.replyMessage(replyToken, { type: 'text', text: '📞 ติดต่อร้าน\n\n📍 กรุงเทพ\n📞 02-xxx-xxxx\n⏰ 07:00-21:00' });
}

async function replyStartOrder(replyToken, userName) {
  var t = '🛒 สั่งซื้อ\n\n';
  menu.forEach(function(m) {
    t += m.num + '. ' + m.name + ' - ' + m.price + ' บาท\n';
  });
  t += '\n💬 พิมพ์เลขที่ต้องการ (1-14)';
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function processOrder(text, replyToken, userName) {
  var drinkName = text.replace('สั่ง ', '').trim();
  var drink = null;
  for (var i = 0; i < menu.length; i++) {
    if (menu[i].name.toLowerCase().includes(drinkName.toLowerCase())) {
      drink = menu[i];
      break;
    }
  }
  if (!drink) return client.replyMessage(replyToken, { type: 'text', text: 'ไม่พบ ลองใหม่นะคะ' });
  
  return addOrder(drink, replyToken, userName);
}

async function processOrderByNum(num, replyToken, userName) {
  var drink = menu.find(function(m) { return m.num === num; });
  if (!drink) return client.replyMessage(replyToken, { type: 'text', text: 'ไม่พบ ลองใหม่นะคะ' });
  
  return addOrder(drink, replyToken, userName);
}

async function addOrder(drink, replyToken, userName) {
  var order = { id: orders.length + 1, user: userName, drink: drink.name, price: drink.price, time: new Date().toLocaleString('th') };
  orders.push(order);
  
  return client.replyMessage(replyToken, { type: 'text', text: '✅ รับออร์เดอร์แล้ว!\n\n☕ ' + drink.name + '\n💵 ' + drink.price + ' บาท\n\nขอบคุณค่ะ 🙏' });
}

async function replyHistory(replyToken, userName) {
  var userOrders = orders.filter(function(o) { return o.user === userName; });
  if (userOrders.length === 0) return client.replyMessage(replyToken, { type: 'text', text: 'ยังไม่เคยสั่งเลยค่ะ' });
  var t = '📜 ประวัติ\n';
  var total = 0;
  userOrders.slice(-5).forEach(function(o) { t += o.drink + ' - ' + o.price + ' บาท\n'; total += o.price; });
  t += '\nรวม: ' + total + ' บาท';
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() { console.log('Coffee Bot on ' + PORT); });
