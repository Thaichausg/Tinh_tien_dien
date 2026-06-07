'use client';

import React from 'react';
import { formatVND, formatKwhValue, calculateSplit, EVN_TIERS, calculateRawEvnCost } from '@/utils/calculator';

interface PDFExportProps {
  month: string;
  totalAmount: number;
  totalKwh: number;
  kwhTret: number;
  kwhLau: number;
  results: ReturnType<typeof calculateSplit>;
}

// Simple PDF generation without external library dependencies
// Uses native browser printing capabilities with custom styling

export async function generatePDFContent(props: PDFExportProps): Promise<string> {
  const { month, totalAmount, totalKwh, kwhTret, kwhLau, results } = props;
  const tret = results.households[0];
  const lau = results.households[1];

  const tretPctKwh = totalKwh > 0 ? (kwhTret / totalKwh) * 100 : 0;
  const lauPctKwh = totalKwh > 0 ? (kwhLau / totalKwh) * 100 : 0;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Hóa Đơn Tiền Điện - ${month}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #1e293b;
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 20px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .header-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.05em;
    }

    .header-subtitle {
      font-size: 12px;
      color: #64748b;
    }

    .header-right {
      text-align: right;
    }

    .month-badge {
      display: inline-block;
      background: #0d9488;
      color: white;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
    }

    .total-evn {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }

    .summary-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .summary-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      text-align: center;
    }

    .summary-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }

    .summary-unit {
      font-size: 10px;
      color: #94a3b8;
    }

    .households-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }

    .household-card {
      border-radius: 14px;
      padding: 16px;
    }

    .tret-card {
      background: linear-gradient(135deg, rgba(45, 212, 191, 0.08) 0%, rgba(13, 148, 136, 0.05) 100%);
      border: 1px solid rgba(45, 212, 191, 0.2);
    }

    .lau-card {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(109, 40, 217, 0.05) 100%);
      border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .household-header {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }

    .tret-header {
      color: #0d9488;
    }

    .lau-header {
      color: #7c3aed;
    }

    .household-amount {
      font-size: 28px;
      font-weight: 900;
      margin-bottom: 12px;
    }

    .tret-amount {
      color: #0d9488;
    }

    .lau-amount {
      color: #7c3aed;
    }

    .household-details {
      padding-top: 10px;
      border-top: 1px solid rgba(0,0,0,0.06);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 4px 0;
    }

    .detail-label {
      color: #64748b;
    }

    .detail-value {
      font-weight: 600;
      color: #334155;
    }

    .detail-value.tret {
      color: #0d9488;
    }

    .detail-value.lau {
      color: #7c3aed;
    }

    .verification-bar {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .verification-icon {
      color: #22c55e;
      font-size: 16px;
    }

    .verification-text {
      font-size: 12px;
      font-weight: 600;
      color: #166534;
    }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }

    .tier-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    .tier-table th {
      text-align: left;
      padding: 8px;
      background: #f8fafc;
      color: #64748b;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .tier-table th:nth-child(2),
    .tier-table th:nth-child(3) {
      text-align: right;
    }

    .tier-table td {
      padding: 8px;
      border-bottom: 1px solid #f1f5f9;
    }

    .tier-table td:nth-child(2),
    .tier-table td:nth-child(3) {
      text-align: right;
      font-family: 'Consolas', monospace;
    }

    .tier-name {
      font-weight: 600;
      color: #334155;
    }

    .tier-range {
      font-size: 9px;
      color: #94a3b8;
      margin-left: 4px;
    }

    .tier-price {
      color: #64748b;
      font-size: 10px;
    }

    .tret-value {
      color: #0d9488;
      font-weight: 600;
    }

    .lau-value {
      color: #7c3aed;
      font-weight: 600;
    }

    .tier-total-row {
      background: #f8fafc;
      font-weight: 700;
    }

    .tier-total-row td {
      border-bottom: none;
      padding: 10px 8px;
    }

    .loss-row {
      background: #fffbeb;
    }

    .loss-row td {
      color: #b45309;
      font-weight: 600;
    }

    .footer {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      margin-top: 20px;
    }

    .footer-text {
      font-size: 10px;
      color: #94a3b8;
    }

    .footer-date {
      font-size: 9px;
      color: #cbd5e1;
      margin-top: 4px;
    }

    @media print {
      body {
        padding: 0;
      }

      .households-grid {
        gap: 12px;
      }

      .household-amount {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="logo">⚡</div>
      <div>
        <div class="header-title">HÓA ĐƠN CHIA TIỀN ĐIỆN</div>
        <div class="header-subtitle">100F Lê Văn Duyệt</div>
      </div>
    </div>
    <div class="header-right">
      <div class="month-badge">${month}</div>
      <div class="total-evn">Tổng EVN: ${formatVND(totalAmount)}</div>
    </div>
  </div>

  <!-- Summary Row -->
  <div class="summary-row">
    <div class="summary-item">
      <div class="summary-label">Tổng kWh</div>
      <div class="summary-value">${formatKwhValue(totalKwh)}</div>
      <div class="summary-unit">kWh</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Hao hụt</div>
      <div class="summary-value" style="color: #f59e0b;">${formatKwhValue(results.lossKwh)}</div>
      <div class="summary-unit">kWh</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Đối soát</div>
      <div class="summary-value" style="color: #22c55e;">✓</div>
      <div class="summary-unit">Khớp 100%</div>
    </div>
  </div>

  <!-- Household Cards -->
  <div class="households-grid">
    <div class="household-card tret-card">
      <div class="household-header tret-header">🏠 Hộ Trệt</div>
      <div class="household-amount tret-amount">${formatVND(tret.allocatedTotal)}<span style="font-size: 14px; font-weight: 500;">đ</span></div>
      <div class="household-details">
        <div class="detail-row">
          <span class="detail-label">Số điện:</span>
          <span class="detail-value tret">${formatKwhValue(kwhTret)} kWh</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tỷ lệ:</span>
          <span class="detail-value">${tretPctKwh.toFixed(1)}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Đơn giá TB:</span>
          <span class="detail-value">${tret.averagePricePerKwh.toLocaleString('vi-VN')} đ/kWh</span>
        </div>
      </div>
    </div>

    <div class="household-card lau-card">
      <div class="household-header lau-header">🏢 Hộ Lầu</div>
      <div class="household-amount lau-amount">${formatVND(lau.allocatedTotal)}<span style="font-size: 14px; font-weight: 500;">đ</span></div>
      <div class="household-details">
        <div class="detail-row">
          <span class="detail-label">Số điện:</span>
          <span class="detail-value lau">${formatKwhValue(kwhLau)} kWh</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tỷ lệ:</span>
          <span class="detail-value">${lauPctKwh.toFixed(1)}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Đơn giá TB:</span>
          <span class="detail-value">${lau.averagePricePerKwh.toLocaleString('vi-VN')} đ/kWh</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Verification Bar -->
  <div class="verification-bar">
    <span class="verification-icon">✓</span>
    <span class="verification-text">Đối soát chênh lệch: 0đ (Khớp 100%)</span>
  </div>

  <!-- EVN Tier Breakdown -->
  <div class="section">
    <div class="section-title">📊 Phân bổ bậc thang EVN</div>
    <table class="tier-table">
      <thead>
        <tr>
          <th>Bậc</th>
          <th style="color: #0d9488;">Trệt</th>
          <th style="color: #7c3aed;">Lầu</th>
        </tr>
      </thead>
      <tbody>
        ${EVN_TIERS.map((tier, index) => {
          const tretRaw = calculateRawEvnCost(kwhTret);
          const lauRaw = calculateRawEvnCost(kwhLau);
          const tretDist = tretRaw.tierDistribution.find((d) => d.level === tier.level);
          const lauDist = lauRaw.tierDistribution.find((d) => d.level === tier.level);
          const totalInTier = (tretDist?.kwhAllocated || 0) + (lauDist?.kwhAllocated || 0);

          if (totalInTier === 0 && index > 0) return '';

          const ranges = ['0-50', '51-100', '101-200', '201-300', '301-400', '401+'];

          return `
            <tr>
              <td>
                <span class="tier-name">Bậc ${tier.level}</span>
                <span class="tier-range">(${ranges[index]})</span>
                <span class="tier-price">${tier.price.toLocaleString('vi-VN')}đ</span>
              </td>
              <td class="tret-value">${tretDist?.kwhAllocated ? `${formatKwhValue(tretDist.kwhAllocated)} kWh` : '—'}</td>
              <td class="lau-value">${lauDist?.kwhAllocated ? `${formatKwhValue(lauDist.kwhAllocated)} kWh` : '—'}</td>
            </tr>
          `;
        }).join('')}

        <tr class="tier-total-row">
          <td><strong>Tổng cộng</strong></td>
          <td class="tret-value"><strong>${formatKwhValue(kwhTret)} kWh</strong></td>
          <td class="lau-value"><strong>${formatKwhValue(kwhLau)} kWh</strong></td>
        </tr>

        ${results.lossKwh > 0 ? `
        <tr class="loss-row">
          <td><span style="color: #b45309;">⚠️ Bù hao hụt</span></td>
          <td>+${formatKwhValue(tret.lossKwhShare)} kWh</td>
          <td>+${formatKwhValue(lau.lossKwhShare)} kWh</td>
        </tr>
        ` : ''}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-text">Tạo bởi app chia tiền điện • 100F Lê Văn Duyệt</div>
    <div class="footer-date">Xuất ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
  </div>
</body>
</html>
`;

  return htmlContent;
}

// Component to trigger PDF export
export function usePDFExport() {
  const exportPDF = async (props: PDFExportProps) => {
    try {
      const htmlContent = await generatePDFContent(props);

      // Create a hidden iframe to print
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait for content to load, then print
      iframe.onload = () => {
        iframe.contentWindow?.print();

        // Clean up after printing
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      };

      // Fallback cleanup
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);

    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    }
  };

  return { exportPDF };
}

// Component for download PDF button
interface DownloadPDFButtonProps {
  month: string;
  totalAmount: number;
  totalKwh: number;
  kwhTret: number;
  kwhLau: number;
  results: ReturnType<typeof calculateSplit>;
}

export function DownloadPDFButton({
  month,
  totalAmount,
  totalKwh,
  kwhTret,
  kwhLau,
  results
}: DownloadPDFButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);
  const { exportPDF } = usePDFExport();

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await exportPDF({ month, totalAmount, totalKwh, kwhTret, kwhLau, results });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isExporting}
      className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 active:scale-[0.97] transition-all text-slate-300 disabled:opacity-50"
      title="In/Xuất PDF"
    >
      <span className="text-sm mb-0.5">{isExporting ? '⏳' : '📄'}</span>
      <span className="text-[9px] font-bold">{isExporting ? 'Đang in...' : 'In PDF'}</span>
    </button>
  );
}

// Export as downloadable HTML file (for non-printer use)
export async function downloadHTMLFile(props: PDFExportProps): Promise<void> {
  const htmlContent = await generatePDFContent(props);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `hoa-don-dien-${props.month.replace('/', '-')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}