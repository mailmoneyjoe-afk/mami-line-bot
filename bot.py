from flask import Flask, request, Response
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage,
    FlexSendMessage, BubbleContainer, BoxComponent,
    TextComponent, ButtonComponent, URIAction,
    CarouselContainer, CarouselColumn, ImageComponent
)
import logging
import hmac
import hashlib
import json

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# ====== Credentials ของ Jo ======
CHANNEL_ACCESS_TOKEN = 'vttx04QnmH5l0VxMCGkYLct/YPlXoPyIz/rYR2WzApSvi2puACPdK+kZkqjLlLg8TvREp1/ESoROD2hnp16TXWhB8kYukdm62tTXoClM66xk+xZ2RPBVIQC1u0vqsv/pRHkmyes1KxXYwZG2BGDDxAdB04t89/1O/w1cDnyilFU='
CHANNEL_SECRET = '87c859203d8a9b8e55aa8dd2b495e889'
# ==================================

line_bot_api = LineBotApi(CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(CHANNEL_SECRET)

# ====== Menu สำหรับ Bot ======
MAIN_MENU = """
🦐 ยินดีต้อนรับสู่ JijiEcho Bot!

กรุณาเลือกเมนู:

1️⃣ - สั่งซื้อสินค้า
2️⃣ - ถาม-ตอบ (FAQ)
3️⃣ - ติดต่อเรา
4️⃣ - โปรโมชั่น
5️⃣ - วิธีการสั่งซื้อ

พิมพ์หมายเลข หรือ คำที่ต้องการได้เลยค่ะ!
"""

PRODUCTS = """
🛒 สินค้าของเรา:

🥐 ขนมปัง
- ขนมปังซาวด์ 25 ฿
- ขนมปังกรอบ 30 ฿
- ครัวซองต์ 35 ฿

☕ เครื่องดื่ม
- กาแฟดำ 30 ฿
- ลาเต้ 40 ฿
- คาปูชิโน 45 ฿
- ชาเขียว 35 ฿

🥤 น้ำ
- น้ำเปล่า 10 ฿
- น้ำส้ม 25 ฿

---
พิมพ์ 'สั่ง' เพื่อสั่งซื้อ
พิมพ์ 'กลับ' เพื่อกลับเมนูหลัก
"""

FAQ = """
📝 คำถามที่พบบ่อย:

Q: เปิดกี่โมง?
A: เปิดทุกวัน 07:00 - 20:00 น.

Q: มีที่จอดรถไหม?
A: มีค่ะ จอดได้ 10 คัน

Q: สั่งล่วงหน้าได้ไหม?
A: ได้ค่ะ สั่งล่วงหน้า 1 วัน

Q: มีส่งDeliveryไหม?
A: มีค่ะ ฟรีในระยะ 3 กม.

---
พิมพ์ 'กลับ' เพื่อกลับเมนูหลัก
"""

CONTACT = """
📞 ติดต่อเรา:

📍 ที่อยู่:
123 ถนนสุขุมวิท กรุงเทพฯ

📞 โทร:
02-123-4567

� LINE:
@jijibot

📧 อีเมล:
info@jijibot.com

---
พิมพ์ 'กลับ' เพื่อกลับเมนูหลัก
"""

PROMO = """
🎉 โปรโมชั่นวันนี้:

🏆 ส่วนลด 20%
- ซื้อครบ 200 ฿ ลด 20%

🎁 สะสมแต้ม
- ซื้อ 10 ฿ = 1 แต้ม
- แลกของรางวัลได้!

🎂 วันเกิด
- ส่วนลด 50% วันเกิด!

---
พิมพ์ 'กลับ' เพื่อกลับเมนูหลัก
"""

HOW_TO_ORDER = """
📋 วิธีการสั่งซื้อ:

1️⃣ เลือกสินค้าจากเมนู
2️⃣ บอกจำนวนที่ต้องการ
3️⃣ เลือกวิธีรับ:
   - มารับเอง
   - Delivery
4️⃣ ยืนยันการสั่งซื้อ

---
พิมพ์ 'กลับ' เพื่อกลับเมนูหลัก
"""

ORDER_START = """
🛒 สั่งซื้อสินค้า:

กรุณาพิมพ์รายการสินค้าที่ต้องการ

ตัวอย่าง:
"1 ครัวซองต์, 2 กาแฟดำ"

---
พิมพ์ 'ยกเลิก' เพื่อยกเลิกการสั่ง
พิมพ์ 'กลับ' เพื่อกลับเมนูหลัก
"""

# ====== User State Management ======
user_states = {}

def get_user_state(user_id):
    return user_states.get(user_id, 'main')

def set_user_state(user_id, state):
    user_states[user_id] = state

def reset_user_state(user_id):
    if user_id in user_states:
        del user_states[user_id]

@app.route("/callback", methods=['POST'])
def callback():
    signature = request.headers.get('X-Line-Signature', '')
    body = request.get_data(as_text=True)
    
    app.logger.info(f"Request body: {body}")
    
    # Skip if no events
    try:
        body_json = json.loads(body)
        if not body_json.get('events'):
            return Response(status=200)
    except:
        pass
    
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        app.logger.error("Invalid signature!")
    except Exception as e:
        app.logger.error(f"Error: {e}")
    
    return Response(status=200)

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    user_id = event.source.user_id
    user_message = event.message.text.strip()
    state = get_user_state(user_id)
    
    app.logger.info(f"User: {user_id}, State: {state}, Message: {user_message}")
    
    # Handle based on current state
    if state == 'ordering':
        if user_message in ['ยกเลิก', 'cancel']:
            reset_user_state(user_id)
            reply = "❌ ยกเลิกการสั่งซื้อแล้ว\n\n" + MAIN_MENU
        elif user_message in ['กลับ', 'back']:
            reset_user_state(user_id)
            reply = MAIN_MENU
        else:
            reply = f"✅ ได้รับคำสั่งซื้อแล้ว!\n\nรายการ: {user_message}\n\n📞 ทีมงานจะติดต่อกลับไปภายใน 5 นาทีค่ะ!\n\nพิมพ์ 'กลับ' เพื่อกลับเมนูหลัก"
            set_user_state(user_id, 'confirm_order')
    elif state == 'confirm_order':
        if user_message in ['กลับ', 'back']:
            reset_user_state(user_id)
            reply = MAIN_MENU
        else:
            reply = "✅ ขอบคุณค่ะ!\n\n" + MAIN_MENU
    else:
        # Main menu handling
        msg_lower = user_message.lower()
        
        if msg_lower in ['1', 'สั่งซื้อ', 'order']:
            set_user_state(user_id, 'ordering')
            reply = ORDER_START
        elif msg_lower in ['2', 'faq', 'ถาม']:
            reply = FAQ
        elif msg_lower in ['3', 'ติดต่อ', 'contact']:
            reply = CONTACT
        elif msg_lower in ['4', 'โปร', 'promo']:
            reply = PROMO
        elif msg_lower in ['5', 'วิธี', 'how']:
            reply = HOW_TO_ORDER
        elif msg_lower in ['menu', 'เมนู']:
            reply = MAIN_MENU
        elif msg_lower in ['กลับ', 'back']:
            reset_user_state(user_id)
            reply = MAIN_MENU
        else:
            reply = MAIN_MENU
    
    # Send reply
    try:
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=reply)
        )
        app.logger.info(f"Replied to user {user_id}")
    except Exception as e:
        app.logger.error(f"Reply error: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("🦐 JijiEcho Bot - Advanced Version")
    print("=" * 50)
    print("Features:")
    print("  - ระบบสั่งซื้อ")
    print("  - FAQ")
    print("  - โปรโมชั่น")
    print("  - ติดต่อ")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000)
