require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const config = {
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
};

const client = new line.Client(config);

const menu = {
  espresso: { name: 'เอสเปรสโซ', price: 40 },
  americano: { name: 'อเมริกาโซ', price: 45 },
  cappuccino: { name: 'คาปูชิโน', price: 50 },
  latte: { name: 'ลาเต้', price: 50 },
  mocha: { name: 'มอคชา', price: 55 },
  greentea: { name: 'ชาเขียว', price: 45 },
  milktea: { name: 'ชานม', price: 45 },
  thaitea: { name: 'ชาไทย', price: 40 },
  'iced-latte': { name: 'ลาเต้เย็น', price: 55 },
  'iced-americano': { name: 'อเมริกาโซเย็น', price: 50 },
  'iced-mocha': { name: 'มอคชาเย็น', price: 60 },
  'iced-greentea': { name: 'ชาเขียวเย็น', price: 50 },
  milkshake: { name: 'มิลค์เชค', price: 65 },
  frappuccino: { name: 'ฟรัปปูชิโน', price: 70 }
};

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
  
  return client.replyMessage(replyToken, {
    type: 'text',
    text: '☕ สวัสดีค่ะ ' + userName + '!\n\n• เมนู - ดูเมนู\n• ราคา - ดูราคา\n• สั่ง - สั่งซื้อ\n• ติดต่อ - ติดต่อร้าน\n• ประวัติ - ดูประวัติ'
  });
}

async function replyMenu(replyToken) {
  var t = '☕ เมนูร้านกาแฟ\n\n';
  for (var key in menu) { t += menu[key].name + ' - ' + menu[key].price + ' บาท\n'; }
  t += '\n💬 พิมพ์ "สั่ง ชื่อเครื่องดื่ม"';
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function replyPrice(replyToken) {
  var t = '💰 ราคา\n\n';
  for (var key in menu) { t += menu[key].name + ': ' + menu[key].price + ' บาท\n'; }
  return client.replyMessage(replyToken, { type: 'text', text: t });
}

async function replyContact(replyToken) {
  return client.replyMessage(replyToken, { type: 'text', text: '📞 ติดต่อร้าน\n\n📍 กรุงเทพ\n📞 02-xxx-xxxx\n⏰ 07:00-21:00' });
}

async function replyStartOrder(replyToken, userName) {
  return client.replyMessage(replyToken, { type: 'text', text: '🛒 สั่งซื้อ\n\nพิมพ์ "สั่ง ลาเต้"' });
}

async function processOrder(text, replyToken, userName) {
  var drinkName = text.replace('สั่ง ', '').trim();
  var drink = null;
  for (var key in menu) {
    if (menu[key].name.toLowerCase().includes(drinkName.toLowerCase())) {
      drink = menu[key];
      break;
    }
  }
  if (!drink) return client.replyMessage(replyToken, { type: 'text', text: 'ไม่พบ ลองใหม่นะคะ' });
  
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
