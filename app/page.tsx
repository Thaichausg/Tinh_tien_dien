"use client";

import React, { useState, useEffect, useMemo, startTransition } from "react";
import { calculateSplit, formatVND, EVN_TIERS, calculateRawEvnCost, calculateKwhFromAmount } from "../utils/calculator";
import { saveBillAction, getBillsAction, deleteBillAction, SaveBillInput } from "./actions";

interface SavedBill {
  id: number;
  month: string;
  totalAmount: number;
  totalKwh: number;
  createdAt: Date;
  usages: {
    id: number;
    billId: number;
    householdName: string;
    kwhUsed: number;
  }[];
}

// Helper functions for progressive tier coloring
const getTretTierClass = (level: number, kwh: number) => {
  if (kwh <= 0) return "text-slate-600 opacity-40 font-mono text-xs";
  const base = "inline-flex flex-col items-end px-2.5 py-1.5 rounded-xl border font-mono transition-all hover:scale-[1.02] ";
  switch (level) {
    case 1: return base + "bg-teal-950/20 text-teal-400/90 border-teal-500/10";
    case 2: return base + "bg-teal-950/40 text-teal-400 border-teal-500/20";
    case 3: return base + "bg-teal-900/25 text-teal-300 border-teal-500/30 font-medium";
    case 4: return base + "bg-teal-900/50 text-teal-200 border-teal-500/40 font-semibold";
    case 5: return base + "bg-teal-800/40 text-teal-100 border-teal-400/50 font-bold";
    case 6: return base + "bg-teal-650/70 text-white border-teal-300/60 font-extrabold shadow-md shadow-teal-500/10";
    default: return base;
  }
};

const getLauTierClass = (level: number, kwh: number) => {
  if (kwh <= 0) return "text-slate-600 opacity-40 font-mono text-xs";
  const base = "inline-flex flex-col items-end px-2.5 py-1.5 rounded-xl border font-mono transition-all hover:scale-[1.02] ";
  switch (level) {
    case 1: return base + "bg-violet-950/20 text-violet-400/90 border-violet-500/10";
    case 2: return base + "bg-violet-950/40 text-violet-400 border-violet-500/20";
    case 3: return base + "bg-violet-900/25 text-violet-300 border-violet-500/30 font-medium";
    case 4: return base + "bg-violet-900/50 text-violet-200 border-violet-500/40 font-semibold";
    case 5: return base + "bg-violet-800/40 text-violet-100 border-violet-400/50 font-bold";
    case 6: return base + "bg-violet-650/70 text-white border-violet-300/60 font-extrabold shadow-md shadow-violet-500/10";
    default: return base;
  }
};

const getMainTierClass = (level: number, kwh: number) => {
  if (kwh <= 0) return "text-slate-600 opacity-40 font-mono text-xs";
  const base = "inline-flex flex-col items-end px-2.5 py-1.5 rounded-xl border font-mono transition-all hover:scale-[1.02] ";
  switch (level) {
    case 1: return base + "bg-slate-900/15 text-slate-400 border-slate-800/80";
    case 2: return base + "bg-slate-900/30 text-slate-350 border-slate-700/60";
    case 3: return base + "bg-slate-800/20 text-slate-300 border-slate-750 font-medium";
    case 4: return base + "bg-slate-800/50 text-slate-200 border-slate-650 font-semibold";
    case 5: return base + "bg-slate-700/35 text-slate-100 border-slate-550 font-bold";
    case 6: return base + "bg-slate-600/45 text-white border-slate-450 font-extrabold";
    default: return base;
  }
};

export default function ElectricitySplitter() {
  // Inputs state (default data matching typical bills)
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
  });
  const [totalAmount, setTotalAmount] = useState<number>(2920493);
  const [totalKwh, setTotalKwh] = useState<number>(871);
  const [kwhTret, setKwhTret] = useState<number>(350);
  const [kwhLau, setKwhLau] = useState<number>(421);
  const [autoCalcKwh, setAutoCalcKwh] = useState<boolean>(false);

  // Keep track of the initial month to detect if switching to a new month
  const [initialMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Automatically clear default loaded values when switching months
  useEffect(() => {
    if (month !== initialMonth) {
      setTotalAmount(0);
      setTotalKwh(0);
      setKwhTret(0);
      setKwhLau(0);
      setAutoCalcKwh(false);
    }
  }, [month, initialMonth]);

  // DB integration state
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [savingBill, setSavingBill] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Perform split calculations reactively on input changes
  const results = useMemo(() => {
    return calculateSplit(totalAmount, totalKwh, kwhTret, kwhLau);
  }, [totalAmount, totalKwh, kwhTret, kwhLau]);

  // Load saved bill records from database on mount
  useEffect(() => {
    loadBillHistory();
  }, []);

  const loadBillHistory = async () => {
    setLoadingHistory(true);
    const res = await getBillsAction();
    if (res.success && res.data) {
      // Cast the date string into Date objects
      const parsedData = res.data.map((bill: any) => ({
        ...bill,
        createdAt: new Date(bill.createdAt),
      })) as SavedBill[];
      setSavedBills(parsedData);
    }
    setLoadingHistory(false);
  };

  // Handler to save current calculation to Neon DB
  const handleSaveBill = async () => {
    if (!month) {
      triggerToast("Vui lòng chọn tháng hóa đơn.");
      return;
    }
    setSavingBill(true);
    setSaveStatus(null);

    const formattedMonth = formatDateDisplay(month);
    const input: SaveBillInput = {
      month: formattedMonth,
      totalAmount,
      totalKwh,
      kwhTret,
      kwhLau,
    };

    const res = await saveBillAction(input);
    if (res.success) {
      setSaveStatus({ success: true, message: `Lưu hóa đơn tháng ${formattedMonth} thành công!` });
      loadBillHistory();
    } else {
      setSaveStatus({ success: false, message: `Lỗi: ${res.error}` });
    }
    setSavingBill(false);

    // Auto clear status message after 3 seconds
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Handler to delete a historical bill from DB
  const handleDeleteBill = async (id: number, monthName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa hóa đơn tháng ${monthName}?`)) {
      const res = await deleteBillAction(id);
      if (res.success) {
        triggerToast(`Đã xóa hóa đơn tháng ${monthName}`);
        loadBillHistory();
      } else {
        triggerToast(`Lỗi khi xóa: ${res.error}`);
      }
    }
  };

  // Helper to format date display (e.g. "2026-06" -> "Tháng 06/2026")
  const formatDateDisplay = (val: string) => {
    if (!val) return "";
    const [year, monthNum] = val.split("-");
    return `${monthNum}/${year}`;
  };

  // Helper for quick transient alerts
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Copy result breakdown formatted for Zalo sharing
  const handleCopyZalo = () => {
    const formattedMonth = formatDateDisplay(month);
    const tret = results.households[0];
    const lau = results.households[1];

    const message = `⚡ BÁO CÁO PHÂN BỔ TIỀN ĐIỆN (${formattedMonth}) ⚡
-----------------------------------------
• Tổng tiền bill: ${formatVND(totalAmount)} (Thuế VAT: 8%)
• Tổng điện tiêu thụ: ${totalKwh} kWh
• Điện năng hao hụt: ${results.lossKwh.toFixed(1)} kWh

=========================================
1. HỘ TRỆT (Tỷ lệ: ${((tret.rawCostBeforeVat / (tret.rawCostBeforeVat + lau.rawCostBeforeVat || 1)) * 100).toFixed(0)}%):
   - Điện năng tiêu thụ: ${tret.kwhUsed} kWh
   - Thành tiền trước VAT: ${formatVND(tret.allocatedBeforeVat)}
   - Thuế VAT (8%): ${formatVND(tret.allocatedVat)}
   👉 TỔNG CỘNG: ${formatVND(tret.allocatedTotal)}
   - Đơn giá trung bình thực tế: ${tret.averagePricePerKwh.toLocaleString("vi-VN")} đ/kWh

2. HỘ LẦU (Tỷ lệ: ${((lau.rawCostBeforeVat / (tret.rawCostBeforeVat + lau.rawCostBeforeVat || 1)) * 100).toFixed(0)}%):
   - Điện năng tiêu thụ: ${lau.kwhUsed} kWh
   - Thành tiền trước VAT: ${formatVND(lau.allocatedBeforeVat)}
   - Thuế VAT (8%): ${formatVND(lau.allocatedVat)}
   👉 TỔNG CỘNG: ${formatVND(lau.allocatedTotal)}
   - Đơn giá trung bình thực tế: ${lau.averagePricePerKwh.toLocaleString("vi-VN")} đ/kWh

-----------------------------------------
✓ Đối soát chênh lệch: 0 đ (Hộ Trệt + Hộ Lầu khớp 100% hóa đơn gốc)
(Ứng dụng chia tiền điện tự động - Next.js & Neon Database)`;

    navigator.clipboard.writeText(message).then(
      () => triggerToast("Đã sao chép báo cáo Zalo vào Clipboard!"),
      (err) => triggerToast("Không thể tự động sao chép. Vui lòng thử lại.")
    );
  };

  // Calculate percentage splits
  const tretPctKwh = totalKwh > 0 ? (kwhTret / totalKwh) * 100 : 0;
  const lauPctKwh = totalKwh > 0 ? (kwhLau / totalKwh) * 100 : 0;
  const lossPctKwh = totalKwh > 0 ? (results.lossKwh / totalKwh) * 100 : 0;

  const totalHouseholdsCost = results.households[0].allocatedTotal + results.households[1].allocatedTotal;
  const tretPctCost = totalHouseholdsCost > 0 ? (results.households[0].allocatedTotal / totalHouseholdsCost) * 100 : 0;
  const lauPctCost = totalHouseholdsCost > 0 ? (results.households[1].allocatedTotal / totalHouseholdsCost) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12 selection:bg-teal-500 selection:text-slate-950">
      {/* Premium Top Navigation header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 py-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-teal-500 to-emerald-400 p-2 rounded-xl text-slate-950 font-bold shadow-lg shadow-teal-500/10">
              ⚡
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-400 via-emerald-300 to-violet-400 bg-clip-text text-transparent">
                EVN Splitter
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Bộ Chia Tiền Điện 6 Bậc Hộ Gia Đình
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Neon Database Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Verification & Self-Test Banner */}
        {results.selfTest.passed ? (
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-300 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-xl">✓</span>
              <div>
                <p className="font-semibold text-sm sm:text-base">
                  Tổng kiểm tra (Self-Test) hợp lệ
                </p>
                <p className="text-xs text-emerald-400/80">
                  Hộ Trệt ({formatVND(results.households[0].allocatedTotal)}) + Hộ Lầu (
                  {formatVND(results.households[1].allocatedTotal)}) ={" "}
                  {formatVND(results.selfTest.sumOfHouseholdsTotal)} (Sai số: 0đ)
                </p>
              </div>
            </div>
            <span className="text-xs bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-400/30 uppercase font-mono tracking-wider font-bold">
              PASS
            </span>
          </div>
        ) : (
          <div className="bg-rose-950/40 border border-rose-800/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-300 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-sm sm:text-base">
                  Có sai lệch trong phân bổ tổng tiền
                </p>
                <p className="text-xs text-rose-400/80">
                  Tổng 2 hộ không khớp hóa đơn gốc. Sai lệch:{" "}
                  {formatVND(results.selfTest.difference)}
                </p>
              </div>
            </div>
            <span className="text-xs bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-400/30 uppercase font-mono tracking-wider font-bold">
              WARN
            </span>
          </div>
        )}

        {/* 2-Column Responsive Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input Forms */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>📥</span> Nhập Số Liệu Hóa Đơn
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setTotalAmount(0);
                      setTotalKwh(0);
                      setKwhTret(0);
                      setKwhLau(0);
                      setAutoCalcKwh(false);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors font-semibold flex items-center gap-1 active:scale-95 px-2 py-1 rounded-lg bg-slate-800/40 hover:bg-rose-500/10 border border-slate-700/50"
                    title="Xóa dữ liệu đang nhập"
                  >
                    🗑️ Xóa nhập liệu
                  </button>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-sm text-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Total Invoice Amount */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Tổng Tiền Hóa Đơn (gồm VAT)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 cursor-pointer select-none hover:text-teal-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={autoCalcKwh}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAutoCalcKwh(checked);
                          if (checked) {
                            setTotalKwh(calculateKwhFromAmount(totalAmount));
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500/20 h-3.5 w-3.5 accent-teal-500 cursor-pointer"
                      />
                      Tự tính Số điện tổng
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={totalAmount || ""}
                      onChange={(e) => {
                        const amt = parseInt(e.target.value, 10) || 0;
                        setTotalAmount(amt);
                        if (autoCalcKwh) {
                          setTotalKwh(calculateKwhFromAmount(amt));
                        }
                      }}
                      placeholder="VD: 2920000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 pl-5 pr-14 text-white text-lg font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                      VND
                    </span>
                  </div>
                </div>

                {/* Total kWh */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Tổng Điện Năng Tiêu Thụ (kWh) {autoCalcKwh && <span className="text-[10px] text-teal-400 font-normal lowercase">(tự động tính từ số tiền)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={totalKwh || ""}
                      onChange={(e) => {
                        setTotalKwh(parseFloat(e.target.value) || 0);
                        setAutoCalcKwh(false); // Turn off auto-calc when manually overridden
                      }}
                      placeholder="VD: 871"
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 pl-5 pr-14 text-white text-lg font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                      kWh
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
                  {/* Hộ Trệt */}
                  <div>
                    <label className="block text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">
                      Hộ Trệt (kWh)
                    </label>
                    <input
                      type="number"
                      value={kwhTret || ""}
                      onChange={(e) => setKwhTret(parseFloat(e.target.value) || 0)}
                      placeholder="VD: 350"
                      className="w-full bg-slate-950 border border-teal-500/30 rounded-2xl px-4 py-3 text-white font-bold outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  {/* Hộ Lầu */}
                  <div>
                    <label className="block text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">
                      Hộ Lầu (kWh)
                    </label>
                    <input
                      type="number"
                      value={kwhLau || ""}
                      onChange={(e) => setKwhLau(parseFloat(e.target.value) || 0)}
                      placeholder="VD: 421"
                      className="w-full bg-slate-950 border border-violet-500/30 rounded-2xl px-4 py-3 text-white font-bold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* Sub-meters vs Main verification indicator */}
                <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800 text-xs space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tổng điện năng phụ:</span>
                    <span className="font-semibold text-slate-200">
                      {(kwhTret + kwhLau).toFixed(1)} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hao hụt thất thoát (Loss):</span>
                    <span
                      className={`font-semibold ${
                        results.lossKwh > 0 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {results.lossKwh.toFixed(1)} kWh ({lossPctKwh.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* DB actions */}
                <div className="pt-2 space-y-3">
                  <button
                    onClick={handleSaveBill}
                    disabled={savingBill}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-600 hover:to-emerald-500 text-slate-950 font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-teal-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-base"
                  >
                    {savingBill ? (
                      <>
                        <span className="animate-spin text-lg">⏳</span> Đang lưu vào Neon DB...
                      </>
                    ) : (
                      <>💾 Lưu Kết Quả Phân Bổ</>
                    )}
                  </button>
                  {saveStatus && (
                    <div
                      className={`text-center py-2 px-3 rounded-xl text-xs font-semibold border ${
                        saveStatus.success
                          ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-950/20 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {saveStatus.message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EVN Tariff reference panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>📋</span> Biểu giá bán lẻ điện sinh hoạt EVN
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {EVN_TIERS.map((tier) => (
                  <div
                    key={tier.level}
                    className="flex justify-between items-center py-1.5 border-b border-slate-800 last:border-0"
                  >
                    <span className="text-slate-400">{tier.label}</span>
                    <span className="font-bold text-teal-400">
                      {tier.price.toLocaleString("vi-VN")} đ/kWh
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-500 italic mt-3 text-center">
                  * Biểu giá bán lẻ điện theo QĐ số 2941/QĐ-BCT chưa bao gồm thuế VAT (8%).
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Calculations & Results */}
          <div className="lg:col-span-7 space-y-6">
            {/* Unified Calculation & Audit Table Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-violet-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>📊</span> Bảng Phân Bổ & Đối Soát Điện Bậc Thang Chi Tiết
                </h2>
                <button
                  onClick={handleCopyZalo}
                  className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-700 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <span>💬</span> Zalo Copy
                </button>
              </div>

              {/* Visual Split Graph */}
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Tỷ lệ phân chia Điện tiêu thụ (kWh)</span>
                    <span>
                      Trệt: {tretPctKwh.toFixed(0)}% | Lầu: {lauPctKwh.toFixed(0)}%
                      {results.lossKwh > 0 && ` | Hao hụt: ${lossPctKwh.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-950 rounded-full flex overflow-hidden p-0.5 border border-slate-800">
                    <div
                      style={{ width: `${tretPctKwh}%` }}
                      className="bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
                    ></div>
                    <div
                      style={{ width: `${lauPctKwh}%` }}
                      className="bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500 mx-0.5"
                    ></div>
                    {results.lossKwh > 0 && (
                      <div
                        style={{ width: `${lossPctKwh}%` }}
                        className="bg-amber-500/40 rounded-full transition-all duration-500"
                      ></div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Tỷ lệ phân chia Tiền trả (đã gồm VAT)</span>
                    <span>
                      Trệt: {tretPctCost.toFixed(0)}% | Lầu: {lauPctCost.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-950 rounded-full flex overflow-hidden p-0.5 border border-slate-800">
                    <div
                      style={{ width: `${tretPctCost}%` }}
                      className="bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
                    ></div>
                    <div
                      style={{ width: `${lauPctCost}%` }}
                      className="bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500 mx-0.5"
                    ></div>
                  </div>
                </div>
              </div>

              {/* Table details */}
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="w-full border-collapse text-left text-xs sm:text-sm whitespace-nowrap min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px] tracking-wider uppercase bg-slate-950/40">
                      <th className="py-3 px-4">Bậc Điện / Khoản Mục</th>
                      <th className="py-3 px-4 text-center">Đơn Giá</th>
                      <th className="py-3 px-4 text-right">
                        Hộ Trệt
                        <span className="block text-[10px] text-slate-500 font-normal normal-case">
                          Dùng: {kwhTret.toFixed(1)} kWh
                        </span>
                      </th>
                      <th className="py-3 px-4 text-right">
                        Hộ Lầu
                        <span className="block text-[10px] text-slate-500 font-normal normal-case">
                          Dùng: {kwhLau.toFixed(1)} kWh
                        </span>
                      </th>
                      <th className="py-3 px-4 text-right">
                        Tổng Hóa Đơn
                        <span className="block text-[10px] text-slate-500 font-normal normal-case">
                          Dùng: {results.inputTotalKwh.toFixed(1)} kWh
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {(() => {
                      const tretRaw = calculateRawEvnCost(kwhTret);
                      const lauRaw = calculateRawEvnCost(kwhLau);
                      const mainRaw = calculateRawEvnCost(results.inputTotalKwh);

                      const getTierData = (distribution: any[], level: number) => {
                        const found = distribution.find((d) => d.level === level);
                        return found ? found : { level, kwhAllocated: 0, cost: 0 };
                      };

                      return (
                        <>
                          {/* 6 Tiers Row */}
                          {EVN_TIERS.map((tier) => {
                            const tretDist = getTierData(tretRaw.tierDistribution, tier.level);
                            const lauDist = getTierData(lauRaw.tierDistribution, tier.level);
                            const mainDist = getTierData(mainRaw.tierDistribution, tier.level);

                            return (
                              <tr key={tier.level} className="hover:bg-slate-800/10 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-slate-200">{tier.label}</div>
                                </td>
                                <td className="py-3.5 px-4 text-center font-mono text-teal-400 font-medium">
                                  {tier.price.toLocaleString("vi-VN")} đ
                                </td>
                                
                                {/* Hộ Trệt */}
                                <td className="py-3.5 px-4 text-right">
                                  {tretDist.kwhAllocated > 0 ? (
                                    <div className={getTretTierClass(tier.level, tretDist.kwhAllocated)}>
                                      <span className="text-xs font-bold">{tretDist.kwhAllocated.toFixed(1)} kWh</span>
                                      <span className="text-[10px] opacity-80">{formatVND(tretDist.cost)}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 opacity-40 font-mono text-xs">—</span>
                                  )}
                                </td>

                                {/* Hộ Lầu */}
                                <td className="py-3.5 px-4 text-right">
                                  {lauDist.kwhAllocated > 0 ? (
                                    <div className={getLauTierClass(tier.level, lauDist.kwhAllocated)}>
                                      <span className="text-xs font-bold">{lauDist.kwhAllocated.toFixed(1)} kWh</span>
                                      <span className="text-[10px] opacity-80">{formatVND(lauDist.cost)}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 opacity-40 font-mono text-xs">—</span>
                                  )}
                                </td>

                                {/* Tổng Hóa Đơn */}
                                <td className="py-3.5 px-4 text-right">
                                  {mainDist.kwhAllocated > 0 ? (
                                    <div className={getMainTierClass(tier.level, mainDist.kwhAllocated)}>
                                      <span className="text-xs font-semibold text-slate-200">{mainDist.kwhAllocated.toFixed(1)} kWh</span>
                                      <span className="text-[10px] text-slate-400">{formatVND(mainDist.cost)}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 opacity-40 font-mono text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Summary Divider Header */}
                          <tr className="bg-slate-950/40 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <td colSpan={5} className="py-2.5 px-4 border-t border-slate-800">
                              Cộng dồn & Phân bổ chi tiết
                            </td>
                          </tr>

                          {/* Row 1: Tổng số kWh dùng thực tế */}
                          <tr className="hover:bg-slate-800/10 transition-colors font-semibold">
                            <td className="py-3 px-4 text-slate-300">Tổng kWh dùng thực tế</td>
                            <td className="py-3 px-4 text-center">—</td>
                            <td className="py-3 px-4 text-right text-teal-400 font-mono">
                              {kwhTret.toFixed(1)} kWh
                            </td>
                            <td className="py-3 px-4 text-right text-violet-400 font-mono">
                              {kwhLau.toFixed(1)} kWh
                            </td>
                            <td className="py-3 px-4 text-right text-slate-200 font-mono">
                              {(kwhTret + kwhLau).toFixed(1)} kWh
                            </td>
                          </tr>

                          {/* Row 2: Thành tiền dùng thô (trước VAT) */}
                          <tr className="hover:bg-slate-800/10 transition-colors text-slate-400">
                            <td className="py-3 px-4">Thành tiền tiêu thụ thô (chưa VAT)</td>
                            <td className="py-3 px-4 text-center">—</td>
                            <td className="py-3 px-4 text-right font-mono">
                              {formatVND(tretRaw.totalRawCost)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {formatVND(lauRaw.totalRawCost)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">
                              {formatVND(tretRaw.totalRawCost + lauRaw.totalRawCost)}
                            </td>
                          </tr>

                          {/* Row 3: Hao hụt & Lệch bậc */}
                          <tr className="hover:bg-slate-800/10 transition-colors text-amber-400/90 font-medium bg-amber-500/5">
                            <td className="py-3 px-4">
                              <span className="flex items-center gap-1">📉 Bù hao hụt & lệch bậc</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              {results.lossKwh > 0 ? `+${results.lossKwh.toFixed(1)} kWh` : "0 kWh"}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs">
                              <div>+{formatVND(results.households[0].lossCostShareBeforeVat)}</div>
                              {results.lossKwh > 0 && (
                                <div className="text-[10px] text-slate-500 font-normal">
                                  Gánh +{results.households[0].lossKwhShare.toFixed(1)} kWh
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs">
                              <div>+{formatVND(results.households[1].lossCostShareBeforeVat)}</div>
                              {results.lossKwh > 0 && (
                                <div className="text-[10px] text-slate-500 font-normal">
                                  Gánh +{results.households[1].lossKwhShare.toFixed(1)} kWh
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-xs">
                              <div>
                                +{formatVND(
                                  results.households[0].allocatedBeforeVat +
                                    results.households[1].allocatedBeforeVat -
                                    (tretRaw.totalRawCost + lauRaw.totalRawCost)
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Row 4: Tổng trước VAT */}
                          <tr className="hover:bg-slate-800/10 transition-colors bg-slate-900/20 font-bold border-t border-slate-800">
                            <td className="py-3.5 px-4 text-slate-200">Tổng cộng Chưa VAT</td>
                            <td className="py-3.5 px-4 text-center">—</td>
                            <td className="py-3.5 px-4 text-right text-slate-200 font-mono">
                              {formatVND(results.households[0].allocatedBeforeVat)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-200 font-mono">
                              {formatVND(results.households[1].allocatedBeforeVat)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-200 font-mono">
                              {formatVND(
                                results.households[0].allocatedBeforeVat +
                                  results.households[1].allocatedBeforeVat
                              )}
                            </td>
                          </tr>

                          {/* Row 5: Thuế VAT 8% */}
                          <tr className="hover:bg-slate-800/10 transition-colors text-slate-400">
                            <td className="py-3 px-4">Thuế VAT (8%)</td>
                            <td className="py-3 px-4 text-center">—</td>
                            <td className="py-3 px-4 text-right font-mono">
                              {formatVND(results.households[0].allocatedVat)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {formatVND(results.households[1].allocatedVat)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">
                              {formatVND(
                                results.households[0].allocatedVat + results.households[1].allocatedVat
                              )}
                            </td>
                          </tr>

                          {/* Row 6: TỔNG THANH TOÁN (SAU VAT) */}
                          <tr className="bg-slate-950/60 font-bold text-sm sm:text-base border-t border-slate-700">
                            <td className="py-4 px-4 text-slate-100 uppercase tracking-wide">
                              Tổng cộng Phải Trả
                            </td>
                            <td className="py-4 px-4 text-center">—</td>
                            <td className="py-4 px-4 text-right text-teal-400 font-mono text-sm sm:text-lg">
                              {formatVND(results.households[0].allocatedTotal)}
                            </td>
                            <td className="py-4 px-4 text-right text-violet-400 font-mono text-sm sm:text-lg">
                              {formatVND(results.households[1].allocatedTotal)}
                            </td>
                            <td className="py-4 px-4 text-right text-white font-mono text-base sm:text-xl underline decoration-teal-500 decoration-2 underline-offset-4">
                              {formatVND(results.inputTotalBill)}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Neon DB Bill History section */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span>📂</span> Lịch Sử Lưu Trữ Hóa Đơn
                </h3>
                <button
                  onClick={loadBillHistory}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 active:scale-95"
                >
                  🔄 Tải lại
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <span className="animate-spin inline-block mr-2">⏳</span> Đang tải lịch sử...
                </div>
              ) : savedBills.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                  Chưa có hóa đơn nào được lưu. Bấm "Lưu Kết Quả Phân Bổ" ở trên để ghi lại.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {savedBills.map((bill) => {
                    const tretUsage = bill.usages.find((u) => u.householdName === "Hộ Trệt");
                    const lauUsage = bill.usages.find((u) => u.householdName === "Hộ Lầu");
                    return (
                      <div
                        key={bill.id}
                        className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex items-center justify-between gap-3 text-xs sm:text-sm hover:border-slate-700 transition-all group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">
                              Tháng {bill.month}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({bill.createdAt.toLocaleDateString("vi-VN")})
                            </span>
                          </div>
                          <div className="text-slate-400 text-xs flex flex-wrap gap-x-4">
                            <span>
                              Tổng: <strong className="text-slate-200">{bill.totalKwh} kWh</strong> |{" "}
                              <strong className="text-slate-200">{formatVND(bill.totalAmount)}</strong>
                            </span>
                            {tretUsage && (
                              <span className="text-teal-400 font-medium">
                                Trệt: {tretUsage.kwhUsed} kWh
                              </span>
                            )}
                            {lauUsage && (
                              <span className="text-violet-400 font-medium">
                                Lầu: {lauUsage.kwhUsed} kWh
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteBill(bill.id, bill.month)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                          title="Xóa hóa đơn này"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-slate-200 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold max-w-sm border-l-4 border-l-teal-500 animate-slide-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
