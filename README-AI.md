# 🤖 AI Insights & Predictions

## 🎯 Tong quan

AI Insights cung cap cac phan tich thong minh, du doan, va khuyen nghi cho hoa don dien cua ban.

## ✨ Tinh nang chinh

### 1. Phan tich xu huong
- **So sanh thang** - Tang/giam bao nhieu % so voi thang truoc
- **So sanh mua** - So sanh voi cung ky nam ngoai
- **Bieu do truc quan** - Line chart theo thoi gian

### 2. Phat hien bat thuong (Anomaly Detection)
- **Su dung cao bat thuong** - Tang >30% so voi thang truoc
- **Hao hut dien cao** - Loss >5% thi se canh bao
- **So dien giam dot ngot** - Gap 40% thi canh bao

### 3. Du doan (Predictions)
- **Uoc tinh kWh thang toi** - Dua tren xu huong
- **Du doan chi phi** - Uoc tinh tien dien thang toi
- **Do chinh xac** - Low/Medium/High confidence

### 4. Khuyen nghi (Tips)
- **Mẹo tiết kiệm** - Dua tren mau tieu thụ
- **Canh bao chi phi** - Neu dang dung nhieu hon TB

## 📁 Cau truc Files

```
Tinh tien dien thang/
├── lib/
│   └── ai-insights.ts     # AI engine xu ly
├── app/
│   └── components/
│       └── AIInsights.tsx # UI components
└── README-AI.md          # File nay
```

## 🔧 API Functions

### `generateInsights()`
Phan tich va tao danh sach insights.

```typescript
import { generateInsights } from '@/lib/ai-insights';

const insights = generateInsights(
  {
    month: '06/2026',
    totalKwh: 871,
    totalAmount: 2920493,
    kwhTret: 350,
    kwhLau: 521,
    lossKwh: 12.5,
  },
  historicalBills
);
```

### `predictNextMonth()`
Du doan hoa don thang toi.

```typescript
import { predictNextMonth } from '@/lib/ai-insights';

const prediction = predictNextMonth(historicalBills);
// {
//   month: '07/2026',
//   estimatedKwh: 890,
//   estimatedAmount: 2987654,
//   confidence: 'high',
//   basedOnMonths: 6
// }
```

### `detectAnomaly()`
Phat hien bat thuong.

```typescript
import { detectAnomaly } from '@/lib/ai-insights';

const anomaly = detectAnomaly(currentBill, historicalBills, lossKwh);
// {
//   detected: true,
//   type: 'high_usage',
//   severity: 'alert',
//   message: 'Sử dụng điện tăng 35% so với tháng trước!',
//   suggestion: 'Kiểm tra các thiết bị tiêu thụ điện...'
// }
```

## 📊 Insights Types

| Type | Icon | Mo ta | Severity |
|------|------|-------|----------|
| `trend` | 📈 | Xu huong su dung | info/warning/success |
| `anomaly` | ⚠️ | Bat thuong duoc phat hien | warning/alert |
| `prediction` | 🔮 | Du doan thang toi | info |
| `tip` | 💡 | Meo tiet kiem | info |
| `comparison` | 📊 | So sanh voi ky khac | info |

## 🔮 Thuat toan Du doan

### Linear Regression (Don gian)
```javascript
// Lay 3-6 thang gan nhat
const recentBills = sortedBills.slice(-6);

// Tinh trung binh kWh
const avgKwh = kwhValues.reduce((a, b) => a + b) / kwhValues.length;

// Dieu chinh theo xu huong
if (trend.direction === 'up') {
  predictedKwh = avgKwh * (1 + percentage / 200);
}
```

### Confidence Levels
- **High**: Variance < 5% (du lieu on dinh)
- **Medium**: Variance 5-20%
- **Low**: Variance > 20% hoac it hon 2 thang du lieu

## ⚠️ Anomaly Detection Rules

### High Usage Alert
```
if (usageIncrease > 30%) {
  severity: 'alert'
  message: 'Tang 30%+'
}
```

### High Loss Warning
```
if (lossPercentage > 5%) {
  severity: 'warning'
  message: 'Hao hut >5%'
}
```

### Low Usage Warning
```
if (usageDecrease > 40%) {
  severity: 'warning'
  message: 'Giam 40%+'
}
```

## 🎨 UI Components

### `<AIInsights />`
Hien thi danh sach insights va prediction.

### `<AIInsightsMini />`
Phien ban compact, chi hien thi 2 insights.

### `<AIDashboard />`
Dashboard day du voi stats va tips.

## 📱 Vi tri trong App

AI Insights hien thi trong tab **"Báo cáo"** (showReport):

```
┌─────────────────────────────────────┐
│ 📊 Bieu do & Danh gia               │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🤖 AI Insights                   │ │
│ │ • Tang 25% so voi thang truoc    │ │
│ │ • Hao hut cao can kiem tra       │ │
│ │ • Du doan thang 07: ~890 kWh     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Line Chart theo thang]             │
│                                     │
│ Nhan xet:                            │
│ • Trets: Tang 15 kWh...            │
│ • Lau: Giam 20 kWh...               │
└─────────────────────────────────────┘
```

## 🚀 Trien khai them

### Them Insight moi
```typescript
// Trong lib/ai-insights.ts
export function generateInsights(...) {
  // ...

  // Them tip moi
  insights.push({
    id: 'new-tip',
    type: 'tip',
    icon: '💰',
    title: 'Tieu de',
    description: 'Mo ta chi tiet',
    severity: 'info',
  });

  return insights;
}
```

### Them Anomaly moi
```typescript
// Trong ham detectAnomaly()
if (someCondition) {
  return {
    detected: true,
    type: 'new_anomaly_type',
    severity: 'warning',
    message: '...',
    suggestion: '...'
  };
}
```

## 💡 Saving Tips

Mặc định có sẵn các tips:
1. 🌡️ Điều hòa 25-26°C tiết kiệm 10-15% điện
2. 💡 Tắt đèn khi ra khỏi phòng
3. 🔌 Rút sạc khi không sử dụng
4. 🍳 Nấu ăn bằng bếp từ hiệu quả hơn bếp gas

## 📊 Statistical Functions

### Trend Calculation
```javascript
const change = current - previous;
const percentage = (change / previous) * 100;

// direction: 'up' | 'down' | 'stable'
// threshold: ±5%
```

### Variance Calculation
```javascript
// Coefficient of Variation
CV = (StdDev / Mean) * 100
```

## 🔌 Integration

### SSR Safe
Kiem tra truoc khi su dung:
```typescript
// Trong component
const insights = useMemo(() => {
  if (typeof window === 'undefined') return [];
  return generateInsights(currentBill, historicalBills);
}, [currentBill, historicalBills]);
```

### Performance
- useMemo() de cache insights
- Chi chay khi data thay doi
- Khong goi API ben ngoai