# ⚡ PWA - Progressive Web App

## 🎯 Tính năng đã thêm

### 1. Service Worker (`public/sw.js`)
- **Cache-first** cho static assets (JS, CSS, images)
- **Network-first** cho navigation (HTML pages)
- **Fetch with cache** cho API requests
- **Offline fallback** page khi không có mạng
- **Push notifications** support
- **Background sync** để sync data khi online

### 2. Web App Manifest (`public/manifest.json`)
- App name: "Chia Tiền Điện - 100F Lê Văn Duyệt"
- Standalone display mode (không browser chrome)
- Dark theme với teal accent color
- Full PWA icons (72px → 512px)

### 3. Offline Page (`public/offline.html`)
- Hiển thị khi không có kết nối
- Liệt kê các tính năng offline
- Tự động retry khi có mạng

### 4. PWA Hook (`hooks/usePWA.ts`)
- `usePWA`: Kiểm tra install status, update available
- `useNetworkStatus`: Theo dõi online/offline + connection type
- `useNotificationPermission`: Quản lý notification permissions

### 5. PWA Manager (`app/components/PWAManager.tsx`)
- Network status banner (hiện khi offline)
- Update available banner
- Install prompt component
- Connection quality indicator

---

## 📄 PDF Export

### Tính năng
- **In hóa đơn** định dạng A4 đẹp mắt
- **Không cần thư viện bên thứ 3** (chỉ dùng browser print)
- Tích hợp trực tiếp vào UI

### Cách sử dụng
1. Nhập số liệu hóa đơn
2. Click nút **"In PDF"** trong group buttons
3. Cửa sổ print preview hiện ra
4. Chọn **"Save as PDF"** thay vì printer
5. Save file

### Cấu trúc PDF
```
┌─────────────────────────────────┐
│  ⚡ HÓA ĐƠN CHIA TIỀN ĐIỆN      │
│  100F Lê Văn Duyệt | Tháng 06   │
├─────────────────────────────────┤
│  Tổng kWh │ Hao hụt │ Đối soát │
│    871    │  12.5   │    ✓     │
├─────────────────────────────────┤
│  🏠 Hộ Trệt    │  🏢 Hộ Lầu    │
│  1,234,567 đ   │  1,685,926 đ  │
│  350 kWh (40%) │  521 kWh (60%)│
├─────────────────────────────────┤
│  ✓ Đối soát: 0đ (Khớp 100%)    │
├─────────────────────────────────┤
│  📊 Phân bổ bậc thang EVN       │
│  Bậc 1 (0-50)   │  Trệt │ Lầu  │
│  Bậc 2 (51-100) │  ...  │ ...  │
└─────────────────────────────────┘
```

### Files liên quan
- `app/components/PDFExport.tsx` - Component và logic xuất PDF
- `app/page.tsx` - Tích hợp nút In PDF vào UI

---

## 📱 Cách cài đặt PWA

### Trên iPhone/iPad:
1. Mở app trong Safari
2. Nhấn nút **Share** (⬆️)
3. Cuộn xuống, chọn **"Add to Home Screen"**
4. Nhấn **Add**

### Trên Android:
1. Mở app trong Chrome
2. Nhấn menu (⋮) góc phải
3. Chọn **"Add to Home screen"**
4. Nhấn **Add**

### Trên Desktop (Chrome/Edge):
1. Khi visit, sẽ thấy icon install trong address bar
2. Hoặc click **Install** từ prompt ở bottom

---

## 🛠️ Tạo Icons

### Cách 1: Dùng script (cần Node.js + sharp)
```bash
# Cài đặt sharp
npm install sharp

# Chạy script
node scripts/generate-icons.js
```

### Cách 2: Online converter
1. Mở https://realfavicongenerator.net/
2. Upload file: `public/icons/icon.svg`
3. Download all sizes
4. Copy vào `public/icons/`

### Cách 3: Tạo thủ công
Tạo các file PNG với kích thước:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

---

## 🔧 Cấu hình thêm

### Thay đổi theme color
Edit `public/manifest.json`:
```json
"theme_color": "#0d9488",
"background_color": "#020617"
```

### Thay đổi app name
Edit `public/manifest.json`:
```json
"name": "Tên app của bạn",
"short_name": "Tên ngắn"
```

### Bật notifications
Mặc định sẽ hỏi quyền sau 30 giây. Hoặc gọi:
```typescript
import { useNotificationPermission } from '@/hooks/usePWA';
const { requestPermission } = useNotificationPermission();
requestPermission();
```

---

## 📊 Cache Strategy

| Loại | Strategy | TTL |
|------|----------|-----|
| Static assets | Cache-first | Permanent |
| HTML pages | Network-first | 1 day |
| API calls | Stale-while-revalidate | 5 min |
| Offline fallback | Cache | Permanent |

---

## 🔄 Update Flow

1. User visit → SW check for updates
2. New SW found → `updatefound` event
3. SW installed but waiting (`state: installed`)
4. Banner shown: "Đã có phiên bản mới"
5. User click "Cập nhật" → `SKIP_WAITING` message
6. New SW activates → `controllerchange` → reload

---

## 🌐 Offline Capabilities

### ✅ Hoạt động offline:
- Xem lịch sử hóa đơn đã lưu
- Xem biểu đồ
- Nhập số kWh và tính toán
- Xem giao diện app

### ❌ Cần online:
- Lưu hóa đơn mới (sẽ queue để sync)
- Load data mới từ database
- Push notifications

---

## 📝 Files mới tạo

```
Tính tiền điện tháng/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   ├── offline.html           # Offline fallback
│   └── icons/
│       └── icon.svg           # Source icon
├── hooks/
│   └── usePWA.ts              # PWA hooks
├── app/
│   └── components/
│       └── PWAManager.tsx     # PWA UI components
├── scripts/
│   └── generate-icons.js      # Icon generator script
└── README-PWA.md              # This file
```

---

## 🚀 Deploy

PWA hoạt động tự động sau khi deploy. Cần đảm bảo:

1. **Service Worker scope** đúng (`/`)
2. **HTTPS** required (hoặc localhost)
3. **Headers** đúng:
   - `Service-Worker-Allowed: /`
   - `Cache-Control: no-cache` (cho SW file)

Vercel deployment đã support sẵn PWA.

---

## 📱 Testing

### Test offline:
1. Mở app → DevTools → Application → Service Workers → Offline
2. Refresh page
3. Kiểm tra offline page hiển thị

### Test install:
1. DevTools → Application → Manifest
2. Kiểm tra "Installable" ✓
3. Click "Install" button trong DevTools

### Test update:
1. Thay đổi version trong `sw.js`
2. Register SW lại
3. Kiểm tra update banner xuất hiện