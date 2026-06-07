# 📱 Telegram Bot Integration

## 🎯 Tong quan

Telegram Bot cho phep gui thong bao hoa don dien truc tiep den dien thoai cua moi ho gia dinh thong qua ung dung Telegram.

## ✨ Tinh nang

- **Gui thong bao hoa don** - Gui noi dung chi tiet ve tien dien thang qua Telegram
- **Tu dong thong bao** - Gui thong bao tu dong khi luu hoa don moi
- **Ho tro 2 ho** - Gui cho ca Ho Trets va Ho Lau
- **Webhook xu ly tin nhan** - Nhan tin nhan tu nguoi dung (commands)
- **Ho tro Group/Supergroup** - Bot co the hoat dong trong nhom

## 🔧 Setup Telegram Bot

### Buoc 1: Tao Bot moi
1. Mo Telegram app
2. Tim va mo chat voi **@BotFather**
3. Gui tin nhan: `/newbot`
4. Lam theo huong dan de dat ten cho bot
5. Ban se nhan duoc **Bot Token** co dang:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

### Buoc 2: Lay Chat ID
**Cach 1: Lay Chat ID rieng (cho tung nguoi)**
1. Tim va mo chat voi **@userinfobot**
2. Gui tin nhan bat ky
3. Bot se tra ve thong tin bao gom Chat ID cua ban

**Cach 2: Lay Group Chat ID (neu dung nhom)**
1. Tao nhom Telegram va them bot vao
2. Dat bot lam admin trong nhom
3. Gui tin nhan `/id` hoac `/start`
4. Lay Chat ID tu response

### Buoc 3: Cai dat Webhook (Optional - neu dung polling)
1. Cai dat environment variable `TELEGRAM_BOT_TOKEN`
2. Webhook se tu dong nhan update

## 📁 Cau truc Files

```
Tinh tien dien thang/
├── lib/
│   └── telegram.ts          # Telegram API service
├── app/
│   ├── components/
│   │   └── TelegramSettings.tsx # UI cau hinh
│   └── api/
│       └── telegram/
│           ├── notify/
│           │   └── route.ts  # API gui thong bao
│           └── webhook/
│               └── route.ts  # Webhook xu ly tin nhan
├── .env.example             # Cau hinh moi truong
└── README-TELEGRAM.md       # File nay
```

## 🔐 Bien moi truong

Them vao file `.env`:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

## 📤 Tin nhan Telegram

### Noi dung HTML (formatted):

```
⚡ HÓA ĐƠN TIỀN ĐIỆN THÁNG 06/2026

━━━━━━━━━━━━━━━

📊 Tổng hóa đơn: 2,920,493 đ
📈 Tổng kWh: 871 kWh
⚠️ Hao hụt: 12.5 kWh

━━━━━━━━━━━━━━━

🏠 HỘ TRỆT:
• Số điện: 350.0 kWh
• Tiền điện: 1,234,567 đ
• Đơn giá TB: 3,527 đ/kWh

🏢 HỘ LẦU:
• Số điện: 521.0 kWh
• Tiền điện: 1,685,926 đ
• Đơn giá TB: 3,236 đ/kWh

━━━━━━━━━━━━━━━

✅ Đối soát: 0 đ (Khớp 100%)

━━━━━━━━━━━━━━━

📱 App chia tiền điện • 100F Lê Văn Duyệt
```

## 🌐 Bot Commands

Nguoi dung co the gui cac lenh sau cho bot:

| Lenh | Mo ta |
|------|-------|
| `/start` | Bat dau su dung bot |
| `/help` | Xem huong dan su dung |
| `/bill` | Yeu cau thong tin hoa don |
| `/history` | Xem lich su hoa don |
| `/status` | Kiem tra trang thai ket noi |

## 🔌 API Endpoints

### POST /api/telegram/notify
Gui thong bao hoa don den nguoi dung.

**Request Body:**
```json
{
  "month": "06/2026",
  "totalAmount": 2920493,
  "totalKwh": 871,
  "kwhTret": 350,
  "kwhLau": 521,
  "tretAmount": 1234567,
  "lauAmount": 1685926,
  "tretAvgPrice": 3527,
  "lauAvgPrice": 3236,
  "lossKwh": 12.5,
  "chatIdTret": "123456789",
  "chatIdLau": "987654321"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "user": "tret", "success": true, "messageId": 123 },
    { "user": "lau", "success": true, "messageId": 124 }
  ]
}
```

### POST /api/telegram/webhook
Nhan updates tu Telegram (webhook mode).

## 🤖 Xu ly tin nhan

### Private Chat
- Bot tra loi tat ca tin nhan bang tin nhan huong dan hoac noi dung hoa don

### Group Chat
- Bot chi phan hoi khi co lenh bat dau bang `/`
- Co the dat lam admin de xem tin nhan

### Callback Query
- Khi nguoi dung click inline button, bot se xu ly callback

## ⚠️ Lưu y quan trọng

1. **HTTPS Required** - Telegram webhook bat buoc phai co HTTPS
2. **Bot Token bao mat** - Khong chia se Bot Token voi bat ky ai
3. **Rate limits** - Telegram co gioi han:
   - 30 tin nhan moi / giay
   - 20 tin nhan / phut toi cung da den 1 nhom
4. **Chat ID am/duong**:
   - Private chat: Chat ID duong (123456789)
   - Group: Chat ID am (-123456789)

## 🧪 Testing

### Test local:
1. Su dung ngrok de tao HTTPS tunnel
2. Cai dat webhook URL = ngrok_url/api/telegram/webhook
3. Test gui tin nhan den bot

### Test voi Telegram:
1. Mo Telegram va tim bot cua ban
2. Gui `/start` de bat dau
3. Gui `/help` de xem huong dan
4. Gui `/status` de kiem tra ket noi

## 🚀 Trien khai

1. Them environment variable vao `.env`
2. Deploy app len production
3. Config webhook URL trong Telegram (hoac dung polling)
4. Test ket noi

## 📊 So sanh Zalo vs Telegram

| Tieu chi | Zalo | Telegram |
|----------|------|----------|
| Khu vuc | Chu yeu VN | Toan cau |
| API | Phuc tap hon | Don gian hon |
| Bot Father | Co | Co |
| Webhook | HTTPS bat buoc | HTTPS cho webhook |
| Rate limit | 100 tin nhan/ngay | 30 tin nhan/giay |
| Group support | Co | Co |
| Inline keyboard | Khong | Co |
| Payments | ZaloPay | Telegram Payments |

## 💰 Chi phi

- **Telegram Bot**: **Mien phi** - Khong co phi khi su dung bot
- **Telegram API**: **Mien phi** - Khong co phi khi gui tin nhan
- **Cloud hosting**: Neu can deploy

## 📞 Ho tro

Tai lieu chinh thuc: https://core.telegram.org/bots/api