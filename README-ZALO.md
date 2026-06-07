# 📱 Zalo Bot Integration

## 🎯 Tong quan

Zalo Bot cho phep gui thong bao hoa don dien truc tiep den dien thoai cua moi ho gia dinh thong qua Zalo Official Account (OA).

## ✨ Tinh nang

- **Gui thong bao hoa don** - Gui noi dung chi tiet ve tien dien thang qua Zalo
- **Tu dong thong bao** - Gui thong bao tu dong khi luu hoa don moi
- **Ho tro 2 ho** - Gui cho ca Ho Trets va Ho Lau
- **Webhook nhan tin** - Nhan tin nhan tu nguoi dung (help, bill, history)

## 🔧 Setup Zalo OA

### Buoc 1: Dang ky Zalo Official Account
1. Di den https://oa.zalo.me
2. Dang nhap voi so dien thoai Zalo
3. Tao OA moi (chon loai "Business")
4. Hoan thanh quy trinh xac thuc

### Buoc 2: Tao App trong Zalo Dev Console
1. Di den https://developers.zalo.me
2. Tao app moi
3. Lay **App ID** va **App Secret Key**
4. Cai dat **Webhook URL**: `https://your-domain.com/api/zalo/webhook`

### Buoc 3: Lay OA ID
1. Vao trang quan ly OA tai https://oa.zalo.me
2. Tim OA ID trong phan thong tin tai khoan
3. Copy vao file `.env`

### Buoc 4: Lay User ID cua nguoi nhan
1. Nguoi dung can follow OA cua ban
2. Lay User ID thong qua API hoac Zalo OA Dashboard

## 📁 Cau truc Files

```
Tinh tien dien thang/
├── lib/
│   └── zalo.ts              # Zalo API service
├── app/
│   ├── components/
│   │   └── ZaloSettings.tsx # UI cau hinh Zalo
│   └── api/
│       └── zalo/
│           ├── notify/
│           │   └── route.ts  # API gui thong bao
│           └── webhook/
│               └── route.ts  # Webhook xu ly tin nhan
├── .env.example             # Vi du cau hinh
└── README-ZALO.md           # File nay
```

## 🔐 Bien moi truong

Them vao file `.env`:

```env
ZALO_APP_ID=123456789
ZALO_APP_SECRET=your_secret_key_here
ZALO_OA_ID=987654321
```

## 📤 Tin nhan Zalo

### Noi dung thong bao:

```
⚡ HOA DON TIEN DIEN THANG 06/2026

━━━━━━━━━━━━━━━━━━

📊 Tong hoa don: 2,920,493 đ
📈 Tong kWh: 871 kWh
⚠️ Hao hut: 12.5 kWh

━━━━━━━━━━━━━━━━━━

🏠 HO TRETS:
• So dien: 350.0 kWh
• Tien dien: 1,234,567 đ
• Don gia TB: 3,527 đ/kWh

🏢 HO LAU:
• So dien: 521.0 kWh
• Tien dien: 1,685,926 đ
• Don gia TB: 3,236 đ/kWh

━━━━━━━━━━━━━━━━━━

✅ Doi soat: 0 đ (Khop 100%)

━━━━━━━━━━━━━━━━━━

📱 App chia tien dien
100F Le Van Duyet
```

## 🌐 Webhook Commands

Nguoi dung co the gui cac tin nhan sau den Zalo OA:

| Tin nhan | Phan hoi |
|----------|----------|
| `help` | Hien thi huong dan su dung |
| `bill` | Xem thong tin hoa don |
| `history` | Xem lich su hoa don |

## 🔌 API Endpoints

### POST /api/zalo/notify
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
  "userIdTret": "user_zalo_id_1",
  "userIdLau": "user_zalo_id_2"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "user": "tret", "success": true },
    { "user": "lau", "success": true }
  ]
}
```

### GET/POST /api/zalo/webhook
Nhan tin nhan tu Zalo OA.

## ⚠️ Luu y quan trong

1. **HTTPS Required** - Zalo webhook can HTTPS
2. **Server co the truy cap internet** - De goi Zalo API
3. **User can follow OA** - De nhan tin nhan
4. **Rate limits** - Zalo co gioi han so tin nhan/ngay

## 🧪 Testing

### Test local:
1. Su dung ngrok de tao HTTPS tunnel
2. Cai dat webhook URL = ngrok_url/api/zalo/webhook
3. Test gui tin nhan den OA

### Test production:
1. Deploy len server co HTTPS
2. Verify webhook URL
3. Test tu Zalo OA Dashboard

## 💰 Chi phi

- **Zalo OA Free**: Gui tin nhan text miễn phí (gioi han)
- **Zalo OA Business**: Phí hàng tháng cho cac tính năng nâng cao
- **Zalo API**: Miễn phí cho basic features

## 🚀 Trien khai

1. Them environment variables vao `.env`
2. Deploy app len production
3. Config webhook URL trong Zalo Dev Console
4. Test ket noi

## 📞 Ho tro

Neu gap loi:
1. Kiem tra App ID va Secret Key
2. Kiem tra User ID cua nguoi nhan
3. Kiem tra OA da duoc xac thuc chua
4. Xem logs tai `/api/zalo/notify`