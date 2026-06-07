'use client';

import React, { useMemo } from 'react';
import { BillHistory, InsightItem, generateInsights, predictNextMonth } from '@/lib/ai-insights';

interface AIInsightsProps {
  currentBill: {
    month: string;
    totalKwh: number;
    totalAmount: number;
    kwhTret: number;
    kwhLau: number;
    lossKwh: number;
  };
  historicalBills: BillHistory[];
}

export function AIInsights({ currentBill, historicalBills }: AIInsightsProps) {
  const insights = useMemo(() => {
    return generateInsights(currentBill, historicalBills);
  }, [currentBill, historicalBills]);

  const prediction = useMemo(() => {
    return predictNextMonth(historicalBills);
  }, [historicalBills]);

  if (insights.length === 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🤖</span>
          <span className="text-[11px] font-bold text-slate-200">AI Insights</span>
        </div>
        <div className="text-center py-4 text-slate-500 text-[10px]">
          <span className="text-lg block mb-1">📊</span>
          Cần thêm dữ liệu để phân tích
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <span className="text-[11px] font-bold text-slate-200">AI Insights</span>
        </div>
        {prediction.basedOnMonths >= 2 && (
          <div className="text-[9px] text-slate-500">
            Dựa trên {prediction.basedOnMonths} tháng
          </div>
        )}
      </div>

      {/* Insights List */}
      <div className="p-2.5 space-y-2 max-h-[240px] overflow-y-auto">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {/* Prediction Footer */}
      {prediction.basedOnMonths >= 2 && (
        <div className="px-3 py-2 bg-slate-950/50 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">🔮</span>
              <span className="text-[9px] text-slate-400">Dự đoán {prediction.month}:</span>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-teal-400">
                ~{prediction.estimatedKwh} kWh
              </div>
              <div className="text-[9px] text-slate-500">
                ~{prediction.estimatedAmount.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ConfidenceBadge confidence={prediction.confidence} />
          </div>
        </div>
      )}
    </div>
  );
}

// Individual insight card
function InsightCard({ insight }: { insight: InsightItem }) {
  const severityStyles = {
    info: {
      border: 'border-slate-700/50',
      bg: 'bg-slate-800/30',
      icon: 'text-slate-400',
      title: 'text-slate-200',
      desc: 'text-slate-400',
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      icon: 'text-amber-400',
      title: 'text-amber-200',
      desc: 'text-amber-300/80',
    },
    success: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
      title: 'text-emerald-200',
      desc: 'text-emerald-300/80',
    },
  };

  const style = severityStyles[insight.severity];

  const typeIcons = {
    trend: '📈',
    anomaly: '⚠️',
    prediction: '🔮',
    tip: '💡',
    comparison: '📊',
  };

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-2.5`}>
      <div className="flex items-start gap-2">
        <span className="text-base">{typeIcons[insight.type] || insight.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] font-bold ${style.title}`}>
            {insight.title}
          </div>
          <div className={`text-[9px] ${style.desc} mt-0.5 leading-relaxed`}>
            {insight.description}
          </div>
          {insight.actionLabel && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${
                insight.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                insight.severity === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-slate-700/50 text-slate-400'
              }`}>
                {insight.actionLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Confidence badge
function ConfidenceBadge({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'bg-rose-500/20 text-rose-400',
    medium: 'bg-amber-500/20 text-amber-400',
    high: 'bg-emerald-500/20 text-emerald-400',
  };

  const labels = {
    low: 'Độ chính xác thấp',
    medium: 'Độ chính xác trung bình',
    high: 'Độ chính xác cao',
  };

  return (
    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${styles[confidence]}`}>
      {confidence === 'high' ? '✓' : confidence === 'medium' ? '◐' : '○'} {labels[confidence]}
    </span>
  );
}

// Mini version for compact display
export function AIInsightsMini({
  currentBill,
  historicalBills,
}: AIInsightsProps) {
  const insights = useMemo(() => {
    return generateInsights(currentBill, historicalBills).slice(0, 2);
  }, [currentBill, historicalBills]);

  if (insights.length === 0) return null;

  const hasWarning = insights.some(i => i.severity === 'warning');
  const hasSuccess = insights.some(i => i.severity === 'success');

  return (
    <div className="space-y-1.5">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className={`flex items-start gap-2 p-2 rounded-lg text-[9px] ${
            insight.severity === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
            insight.severity === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' :
            'bg-slate-800/30 border border-slate-700/30'
          }`}
        >
          <span className="text-base shrink-0">
            {insight.type === 'trend' ? (insight.severity === 'success' ? '📉' : '📈') :
             insight.type === 'anomaly' ? '⚠️' :
             insight.type === 'prediction' ? '🔮' :
             insight.type === 'tip' ? '💡' : '📊'}
          </span>
          <div className="flex-1 min-w-0">
            <div className={`font-bold ${insight.severity === 'warning' ? 'text-amber-300' : 'text-slate-200'}`}>
              {insight.title}
            </div>
            <div className="text-slate-400 mt-0.5 line-clamp-1">
              {insight.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Full page AI dashboard
export function AIDashboard({ historicalBills }: { historicalBills: BillHistory[] }) {
  const prediction = useMemo(() => predictNextMonth(historicalBills), [historicalBills]);

  const stats = useMemo(() => {
    if (historicalBills.length === 0) return null;

    const sorted = [...historicalBills].sort((a, b) =>
      parseMonth(a.month).getTime() - parseMonth(b.month).getTime()
    );

    const kwhValues = sorted.map(b => b.totalKwh);
    const avgKwh = kwhValues.reduce((a, b) => a + b, 0) / kwhValues.length;
    const maxKwh = Math.max(...kwhValues);
    const minKwh = Math.min(...kwhValues);

    const amounts = sorted.map(b => b.totalAmount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    return { avgKwh, maxKwh, minKwh, avgAmount, count: sorted.length };
  }, [historicalBills]);

  const parseMonth = (monthStr: string) => {
    const [m, y] = monthStr.split('/');
    return new Date(parseInt(y), parseInt(m) - 1);
  };

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Trung bình kWh/tháng</div>
            <div className="text-lg font-black text-teal-400">{stats.avgKwh.toFixed(0)}</div>
            <div className="text-[9px] text-slate-500">kWh</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Chi phí TB/tháng</div>
            <div className="text-lg font-black text-slate-200">{stats.avgAmount.toLocaleString('vi-VN')}</div>
            <div className="text-[9px] text-slate-500">đã incl. VAT</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">kWh cao nhất</div>
            <div className="text-lg font-black text-amber-400">{stats.maxKwh.toFixed(0)}</div>
            <div className="text-[9px] text-slate-500">kWh</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">kWh thấp nhất</div>
            <div className="text-lg font-black text-emerald-400">{stats.minKwh.toFixed(0)}</div>
            <div className="text-[9px] text-slate-500">kWh</div>
          </div>
        </div>
      )}

      {/* Prediction Card */}
      {prediction.basedOnMonths >= 2 && (
        <div className="bg-gradient-to-br from-teal-950/30 to-slate-900 border border-teal-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔮</span>
            <div>
              <div className="text-[11px] font-bold text-teal-400">Dự đoán tháng {prediction.month}</div>
              <div className="text-[9px] text-slate-500">Based on {prediction.basedOnMonths} months data</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-black text-white">{prediction.estimatedKwh}</div>
              <div className="text-[9px] text-slate-400">kWh ước tính</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-teal-400">
                {prediction.estimatedAmount.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-slate-400">đ ước tính</div>
            </div>
          </div>

          <div className="mt-3 flex justify-center">
            <ConfidenceBadge confidence={prediction.confidence} />
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">💡</span>
          <span className="text-[10px] font-bold text-slate-200">Mẹo tiết kiệm điện</span>
        </div>
        <div className="space-y-1.5 text-[9px] text-slate-400">
          <TipItem icon="🌡️" text="Điều hòa 25-26°C tiết kiệm 10-15% điện" />
          <TipItem icon="💡" text="Tắt đèn khi ra khỏi phòng" />
          <TipItem icon="🔌" text="Rút sạc khi không sử dụng để tránh tiêu thụ ẩn" />
          <TipItem icon="🐟" text="Nấu ăn bằng bếp từ hiệu quả hơn bếp gas" />
        </div>
      </div>
    </div>
  );
}

function TipItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default AIInsights;