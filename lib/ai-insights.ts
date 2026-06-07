/**
 * AI Insights & Predictions Engine
 *
 * Phan tich hoa don dien, du doan, va dua ra recommendations
 */

import { formatVND } from '@/utils/calculator';

// Types
export interface BillHistory {
  id: number;
  month: string;
  totalAmount: number;
  totalKwh: number;
  usages: {
    householdName: string;
    kwhUsed: number;
  }[];
  createdAt: Date;
}

export interface UsageTrend {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  kwhChange: number;
}

export interface PredictionResult {
  month: string;
  estimatedKwh: number;
  estimatedAmount: number;
  confidence: 'low' | 'medium' | 'high';
  basedOnMonths: number;
}

export interface AnomalyResult {
  detected: boolean;
  type: 'high_usage' | 'low_usage' | 'unusual_pattern' | 'loss_increase' | null;
  severity: 'warning' | 'alert' | null;
  message: string;
  suggestion: string;
}

export interface InsightItem {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'tip' | 'comparison';
  icon: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success';
  actionLabel?: string;
  actionData?: any;
}

// EVN Tariff tiers for cost estimation
const EVN_TIERS = [
  { level: 1, limit: 50, price: 1984 },
  { level: 2, limit: 50, price: 2050 },
  { level: 3, limit: 100, price: 2380 },
  { level: 4, limit: 100, price: 2998 },
  { level: 5, limit: 100, price: 3350 },
  { level: 6, limit: Infinity, price: 3460 },
];

/**
 * Parse month string to Date
 */
function parseMonth(monthStr: string): Date {
  const [m, y] = monthStr.split('/');
  return new Date(parseInt(y), parseInt(m) - 1);
}

/**
 * Calculate usage trend between two periods
 */
export function calculateTrend(current: number, previous: number): UsageTrend {
  const change = current - previous;
  const percentage = previous > 0 ? (change / previous) * 100 : 0;

  let direction: 'up' | 'down' | 'stable';
  if (percentage > 5) direction = 'up';
  else if (percentage < -5) direction = 'down';
  else direction = 'stable';

  return {
    direction,
    percentage: Math.abs(percentage),
    kwhChange: change,
  };
}

/**
 * Predict next month's usage based on historical data
 */
export function predictNextMonth(bills: BillHistory[]): PredictionResult {
  if (bills.length === 0) {
    return {
      month: getNextMonth(),
      estimatedKwh: 0,
      estimatedAmount: 0,
      confidence: 'low',
      basedOnMonths: 0,
    };
  }

  // Sort bills by month
  const sortedBills = [...bills].sort((a, b) =>
    parseMonth(a.month).getTime() - parseMonth(b.month).getTime()
  );

  // Take last 3-6 months for prediction
  const recentBills = sortedBills.slice(-Math.min(6, sortedBills.length));

  if (recentBills.length < 2) {
    return {
      month: getNextMonth(),
      estimatedKwh: recentBills[0]?.totalKwh || 0,
      estimatedAmount: recentBills[0]?.totalAmount || 0,
      confidence: 'low',
      basedOnMonths: recentBills.length,
    };
  }

  // Calculate average kWh and trend
  const kwhValues = recentBills.map(b => b.totalKwh);
  const avgKwh = kwhValues.reduce((a, b) => a + b, 0) / kwhValues.length;

  // Calculate simple linear trend
  const recentTrend = calculateTrend(
    kwhValues[kwhValues.length - 1],
    kwhValues[0]
  );

  // Predict based on average with trend adjustment
  let predictedKwh: number;
  if (recentTrend.direction === 'up') {
    predictedKwh = avgKwh * (1 + recentTrend.percentage / 200);
  } else if (recentTrend.direction === 'down') {
    predictedKwh = avgKwh * (1 - recentTrend.percentage / 200);
  } else {
    predictedKwh = avgKwh;
  }

  // Estimate cost
  const estimatedAmount = estimateCostFromKwh(predictedKwh);

  // Determine confidence based on data quality
  const variance = calculateVariance(kwhValues);
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (variance < 5) confidence = 'high';
  else if (variance > 20) confidence = 'low';

  return {
    month: getNextMonth(),
    estimatedKwh: Math.round(predictedKwh * 10) / 10,
    estimatedAmount,
    confidence,
    basedOnMonths: recentBills.length,
  };
}

/**
 * Get next month string
 */
function getNextMonth(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
  const m = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const y = nextMonth.getFullYear();
  return `${m}/${y}`;
}

/**
 * Calculate variance of kWh values
 */
function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length) / mean * 100;
}

/**
 * Estimate cost from kWh using EVN tariff
 */
export function estimateCostFromKwh(kwh: number): number {
  let remaining = kwh;
  let totalCost = 0;

  for (const tier of EVN_TIERS) {
    if (remaining <= 0) break;
    const used = Math.min(tier.limit, remaining);
    totalCost += used * tier.price;
    remaining -= used;
  }

  // Add 8% VAT
  return Math.round(totalCost * 1.08);
}

/**
 * Detect anomalies in current bill
 */
export function detectAnomaly(
  currentBill: { totalKwh: number; totalAmount: number },
  historicalBills: BillHistory[],
  lossKwh: number
): AnomalyResult {
  if (historicalBills.length < 2) {
    return {
      detected: false,
      type: null,
      severity: null,
      message: '',
      suggestion: '',
    };
  }

  const sortedBills = [...historicalBills].sort((a, b) =>
    parseMonth(a.month).getTime() - parseMonth(b.month).getTime()
  );

  const previousBill = sortedBills[sortedBills.length - 2];
  const previousKwh = previousBill.totalKwh;
  const previousAmount = previousBill.totalAmount;

  // Check for high usage increase
  const usageTrend = calculateTrend(currentBill.totalKwh, previousKwh);
  if (usageTrend.direction === 'up' && usageTrend.percentage > 30) {
    return {
      detected: true,
      type: 'high_usage',
      severity: 'alert',
      message: `Sử dụng điện tăng ${usageTrend.percentage.toFixed(0)}% so với tháng trước!`,
      suggestion: 'Kiểm tra các thiết bị tiêu thụ điện hoặc có thể có rò rỉ điện.',
    };
  }

  // Check for unusual loss
  const totalKwhUsed = currentBill.totalKwh - lossKwh;
  const lossPercentage = (lossKwh / currentBill.totalKwh) * 100;

  if (lossPercentage > 5) {
    return {
      detected: true,
      type: 'loss_increase',
      severity: 'warning',
      message: `Hao hụt điện cao bất thường: ${lossPercentage.toFixed(1)}%`,
      suggestion: 'Kiểm tra đường dây điện hoặc đồng hồ có vấn đề.',
    };
  }

  // Check for low usage (might indicate meter issue)
  if (usageTrend.direction === 'down' && usageTrend.percentage > 40) {
    return {
      detected: true,
      type: 'low_usage',
      severity: 'warning',
      message: `Sử dụng điện giảm đột ngột ${usageTrend.percentage.toFixed(0)}%!`,
      suggestion: 'Xác nhận lại số điện trên đồng hồ có đúng không.',
    };
  }

  return {
    detected: false,
    type: null,
    severity: null,
    message: '',
    suggestion: '',
  };
}

/**
 * Generate AI-powered insights from bill history
 */
export function generateInsights(
  currentBill: {
    month: string;
    totalKwh: number;
    totalAmount: number;
    kwhTret: number;
    kwhLau: number;
    lossKwh: number;
  },
  historicalBills: BillHistory[]
): InsightItem[] {
  const insights: InsightItem[] = [];

  if (historicalBills.length === 0) {
    return [{
      id: 'first-bill',
      type: 'tip',
      icon: '💡',
      title: 'Bắt đầu theo dõi',
      description: 'Lưu hóa đơn hàng tháng để nhận các phân tích chi tiết.',
      severity: 'info',
    }];
  }

  // 1. Monthly comparison
  if (historicalBills.length >= 1) {
    const sortedBills = [...historicalBills].sort((a, b) =>
      parseMonth(b.month).getTime() - parseMonth(a.month).getTime()
    );
    const lastBill = sortedBills[0];
    const trend = calculateTrend(currentBill.totalKwh, lastBill.totalKwh);

    if (trend.direction === 'up') {
      insights.push({
        id: 'usage-up',
        type: 'trend',
        icon: '📈',
        title: `Tiêu thụ tăng ${trend.percentage.toFixed(0)}%`,
        description: `So với tháng ${lastBill.month}, điện tiêu thụ tăng ${trend.kwhChange.toFixed(1)} kWh.`,
        severity: 'warning',
      });
    } else if (trend.direction === 'down') {
      insights.push({
        id: 'usage-down',
        type: 'trend',
        icon: '📉',
        title: `Tiêu thụ giảm ${trend.percentage.toFixed(0)}%`,
        description: `Tiết kiệm được ${Math.abs(trend.kwhChange).toFixed(1)} kWh so với tháng trước!`,
        severity: 'success',
      });
    }
  }

  // 2. Anomaly detection
  const anomaly = detectAnomaly(
    { totalKwh: currentBill.totalKwh, totalAmount: currentBill.totalAmount },
    historicalBills,
    currentBill.lossKwh
  );

  if (anomaly.detected) {
    insights.push({
      id: 'anomaly-detected',
      type: 'anomaly',
      icon: anomaly.severity === 'alert' ? '🚨' : '⚠️',
      title: anomaly.type === 'high_usage' ? 'Sử dụng bất thường' :
             anomaly.type === 'loss_increase' ? 'Hao hụt cao' :
             anomaly.type === 'low_usage' ? 'Số điện giảm' : 'Cảnh báo',
      description: anomaly.message,
      severity: anomaly.severity === 'alert' ? 'warning' : 'info',
      actionLabel: 'Xem chi tiết',
      actionData: { type: anomaly.type },
    });
  }

  // 3. Prediction
  const prediction = predictNextMonth(historicalBills);
  if (prediction.confidence !== 'low' && prediction.basedOnMonths >= 2) {
    insights.push({
      id: 'prediction',
      type: 'prediction',
      icon: '🔮',
      title: `Dự đoán tháng ${prediction.month}`,
      description: `Estimated: ~${formatVND(prediction.estimatedAmount)} (${prediction.estimatedKwh} kWh)`,
      severity: 'info',
      actionLabel: prediction.confidence === 'high' ? 'Độ chính xác cao' : 'Cần thêm dữ liệu',
    });
  }

  // 4. Seasonal comparison (if available)
  if (historicalBills.length >= 3) {
    const currentMonthNum = parseMonth(currentBill.month).getMonth();
    const sameMonthLastYear = historicalBills.find(b => {
      const date = parseMonth(b.month);
      return date.getMonth() === currentMonthNum &&
             date.getFullYear() === new Date().getFullYear() - 1;
    });

    if (sameMonthLastYear) {
      const seasonalTrend = calculateTrend(currentBill.totalKwh, sameMonthLastYear.totalKwh);
      insights.push({
        id: 'seasonal-comparison',
        type: 'comparison',
        icon: '📅',
        title: `So sánh cùng tháng năm ngoái`,
        description: seasonalTrend.direction === 'down'
          ? `Tiết kiệm ${seasonalTrend.percentage.toFixed(0)}% so với cùng kỳ năm ngoái!`
          : `Tăng ${seasonalTrend.percentage.toFixed(0)}% so với cùng kỳ năm ngoái.`,
        severity: seasonalTrend.direction === 'down' ? 'success' : 'info',
      });
    }
  }

  // 5. Saving tip based on pattern
  const avgUsage = historicalBills.reduce((sum, b) => sum + b.totalKwh, 0) / historicalBills.length;
  if (currentBill.totalKwh > avgUsage * 1.2) {
    insights.push({
      id: 'saving-tip-high',
      type: 'tip',
      icon: '💰',
      title: 'Có thể tiết kiệm hơn',
      description: `Tháng này bạn dùng nhiều hơn trung bình ${((currentBill.totalKwh / avgUsage - 1) * 100).toFixed(0)}%.`,
      severity: 'info',
    });
  }

  // 6. Loss analysis
  if (currentBill.lossKwh > 20) {
    insights.push({
      id: 'high-loss',
      type: 'anomaly',
      icon: '⚡',
      title: 'Hao hụt cao cần lưu ý',
      description: `${currentBill.lossKwh.toFixed(1)} kWh hao hụt - nên kiểm tra đường dây.`,
      severity: 'warning',
    });
  }

  return insights;
}

/**
 * Get household comparison insights
 */
export function getHouseholdComparison(
  kwhTret: number,
  kwhLau: number
): InsightItem[] {
  const insights: InsightItem[] = [];
  const total = kwhTret + kwhLau;

  if (total === 0) return insights;

  const tretPercentage = (kwhTret / total) * 100;
  const lauPercentage = (kwhLau / total) * 100;

  // Imbalance warning
  if (Math.abs(tretPercentage - lauPercentage) > 40) {
    const higher = tretPercentage > lauPercentage ? 'Trệt' : 'Lầu';
    insights.push({
      id: 'imbalance',
      type: 'tip',
      icon: '⚖️',
      title: `Chênh lệch sử dụng`,
      description: `${higher} dùng nhiều hơn ${Math.abs(tretPercentage - lauPercentage).toFixed(0)}%. Cân nhắc kiểm tra thiết bị.`,
      severity: 'info',
    });
  }

  return insights;
}

/**
 * Format number with Vietnamese locale
 */
function formatNumber(num: number): string {
  return num.toLocaleString('vi-VN');
}

export default {
  calculateTrend,
  predictNextMonth,
  detectAnomaly,
  generateInsights,
  getHouseholdComparison,
  estimateCostFromKwh,
};