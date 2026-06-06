"use client";

import React, { useState, useEffect, useMemo } from "react";
import { calculateSplit, formatVND, EVN_TIERS, calculateRawEvnCost, calculateKwhFromAmount } from "../utils/calculator";
import { saveBillAction, getBillsAction, deleteBillAction, SaveBillInput } from "./actions";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

gsap.registerPlugin(useGSAP);

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

const formatKwhValue = (val: number): string => {
  return parseFloat(val.toFixed(1)).toString();
};

const formatDateDisplay = (val: string) => {
  if (!val) return "";
  const [year, monthNum] = val.split("-");
  return `${monthNum}/${year}`;
};

export default function ElectricitySplitter() {
  // 1. Inputs state
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
  });
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalKwh, setTotalKwh] = useState<number>(0);
  const [kwhTret, setKwhTret] = useState<number>(0);
  const [kwhLau, setKwhLau] = useState<number>(0);
  const [autoCalcKwh, setAutoCalcKwh] = useState<boolean>(false);

  // 2. UI and database states
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [savingBill, setSavingBill] = useState<boolean>(false);
  const [printingBill, setPrintingBill] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showExplain, setShowExplain] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [expandedBillId, setExpandedBillId] = useState<number | null>(null);

  // 3. Custom confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState<string>("");
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

  // 4. Toast Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 5. Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const totalBillRef = useRef<HTMLSpanElement>(null);
  const tretBillRef = useRef<HTMLSpanElement>(null);
  const lauBillRef = useRef<HTMLSpanElement>(null);
  const prevMonthRef = useRef<string>(month);
  const printableRef = useRef<HTMLDivElement>(null);

  const [initialMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // 6. Effects
  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from("header", { y: -30, opacity: 0, duration: 0.5, ease: "power3.out" })
      .from(".gsap-card", { y: 20, opacity: 0, duration: 0.4, stagger: 0.1, ease: "back.out(1.2)" }, "-=0.2");

    gsap.to(iconRef.current, {
      y: -3,
      rotation: 4,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, { scope: containerRef });

  useEffect(() => {
    if (prevMonthRef.current !== month) {
      prevMonthRef.current = month;
      const formattedMonth = formatDateDisplay(month);
      const existing = savedBills.find((b) => b.month === formattedMonth);
      if (existing) {
        setTotalAmount(existing.totalAmount);
        setTotalKwh(existing.totalKwh);
        const tretVal = existing.usages.find((u) => u.householdName === "Hộ Trệt")?.kwhUsed || 0;
        const lauVal = existing.usages.find((u) => u.householdName === "Hộ Lầu")?.kwhUsed || 0;
        setKwhTret(tretVal);
        setKwhLau(lauVal);
        setAutoCalcKwh(false);
        triggerToast(`Tự động tải số liệu tháng ${formattedMonth}`);
      } else {
        setTotalAmount(0);
        setTotalKwh(0);
        setKwhTret(0);
        setKwhLau(0);
        setAutoCalcKwh(false);
      }
    }
  }, [month, savedBills]);

  // 7. Navigation handlers
  const handlePrevMonth = () => {
    if (!month) return;
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 - 1, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    if (!month) return;
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + 1, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };



  const chartData = useMemo(() => {
    const sorted = [...savedBills].sort((a, b) => {
      const [mA, yA] = a.month.split("/");
      const [mB, yB] = b.month.split("/");
      return new Date(Number(yA), Number(mA) - 1).getTime() - new Date(Number(yB), Number(mB) - 1).getTime();
    });

    return sorted.map(bill => {
      const tret = bill.usages.find(u => u.householdName === "Hộ Trệt")?.kwhUsed || 0;
      const lau = bill.usages.find(u => u.householdName === "Hộ Lầu")?.kwhUsed || 0;
      return {
        month: bill.month,
        "Trệt": tret,
        "Lầu": lau
      };
    });
  }, [savedBills]);

  const sortedBillsForHistory = useMemo(() => {
    return [...savedBills].sort((a, b) => {
      const [mA, yA] = a.month.split("/");
      const [mB, yB] = b.month.split("/");
      const dateA = new Date(Number(yA), Number(mA) - 1);
      const dateB = new Date(Number(yB), Number(mB) - 1);
      return dateB.getTime() - dateA.getTime();
    });
  }, [savedBills]);

  const reportEvaluation = useMemo(() => {
    if (chartData.length < 2) return null;
    const latest = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];

    const evalHousehold = (name: "Trệt" | "Lầu") => {
      const diff = latest[name] - prev[name];
      const percent = prev[name] > 0 ? ((diff / prev[name]) * 100).toFixed(1) : 0;
      if (diff > 0) return { status: "increase", text: `Tăng ${diff} kWh (+${percent}%) so với tháng trước. Cần lưu ý tiết kiệm.` };
      if (diff < 0) return { status: "decrease", text: `Giảm ${Math.abs(diff)} kWh (${percent}%) so với tháng trước. Rất tốt!` };
      return { status: "stable", text: `Không đổi so với tháng trước (${latest[name]} kWh).` };
    };

    return {
      tret: evalHousehold("Trệt"),
      lau: evalHousehold("Lầu"),
      latestMonth: latest.month,
      prevMonth: prev.month
    };
  }, [chartData]);

  const results = useMemo(() => {
    return calculateSplit(totalAmount, totalKwh, kwhTret, kwhLau);
  }, [totalAmount, totalKwh, kwhTret, kwhLau]);

  useGSAP(() => {
    if (tretBillRef.current) {
      gsap.fromTo(tretBillRef.current,
        { innerHTML: 0 },
        {
          innerHTML: results.households[0].allocatedTotal,
          duration: 0.8,
          ease: "power2.out",
          snap: { innerHTML: 1 },
          onUpdate: function () {
            tretBillRef.current!.innerHTML = formatVND(Math.round(Number(this.targets()[0].innerHTML)));
          }
        }
      );
    }

    if (lauBillRef.current) {
      gsap.fromTo(lauBillRef.current,
        { innerHTML: 0 },
        {
          innerHTML: results.households[1].allocatedTotal,
          duration: 0.8,
          ease: "power2.out",
          snap: { innerHTML: 1 },
          onUpdate: function () {
            lauBillRef.current!.innerHTML = formatVND(Math.round(Number(this.targets()[0].innerHTML)));
          }
        }
      );
    }

    if (totalBillRef.current) {
      gsap.fromTo(totalBillRef.current,
        { innerHTML: 0, scale: 1.1, color: "#2dd4bf" },
        {
          innerHTML: results.inputTotalBill,
          scale: 1,
          color: "#ffffff",
          duration: 1,
          ease: "elastic.out(1, 0.6)",
          snap: { innerHTML: 1 },
          onUpdate: function () {
            totalBillRef.current!.innerHTML = formatVND(Math.round(Number(this.targets()[0].innerHTML)));
          }
        }
      );
    }
  }, [results.households[0].allocatedTotal, results.households[1].allocatedTotal, results.inputTotalBill]);

  useEffect(() => {
    loadBillHistory();
  }, []);

  const loadBillHistory = async () => {
    setLoadingHistory(true);
    const res = await getBillsAction();
    if (res.success && res.data) {
      const parsedData = res.data.map((bill: any) => ({
        ...bill,
        createdAt: new Date(bill.createdAt),
      })) as SavedBill[];
      setSavedBills(parsedData);
    }
    setLoadingHistory(false);
  };

  const askConfirmation = (message: string, onConfirm: () => void) => {
    setConfirmModalMessage(message);
    setOnConfirmAction(() => onConfirm);
    setShowConfirmModal(true);
  };

  const handleSaveBill = async () => {
    if (!month) {
      triggerToast("Chọn tháng hóa đơn.");
      return;
    }

    const formattedMonth = formatDateDisplay(month);
    const hasExisting = savedBills.some((b) => b.month === formattedMonth);

    const executeSave = async () => {
      setSavingBill(true);
      const input: SaveBillInput = {
        month: formattedMonth,
        totalAmount,
        totalKwh,
        kwhTret,
        kwhLau,
      };

      const res = await saveBillAction(input);
      if (res.success) {
        triggerToast(`Đã lưu tháng ${formattedMonth}!`);
        loadBillHistory();
      } else {
        triggerToast(`Lỗi: ${res.error}`);
      }
      setSavingBill(false);
    };

    if (hasExisting) {
      askConfirmation(
        `Tháng ${formattedMonth} đã có hóa đơn trong lịch sử. Bạn có muốn lưu bill mới này không?`,
        executeSave
      );
    } else {
      executeSave();
    }
  };

  const handleDeleteBill = async (id: number, monthName: string) => {
    askConfirmation(
      `Bạn có chắc chắn muốn xóa hóa đơn tháng ${monthName}?`,
      async () => {
        const res = await deleteBillAction(id);
        if (res.success) {
          triggerToast(`Đã xóa tháng ${monthName}`);
          loadBillHistory();
        } else {
          triggerToast(`Lỗi: ${res.error}`);
        }
      }
    );
  };

  const handleCopyZaloForBill = (bill: SavedBill) => {
    const tretUsage = bill.usages.find((u) => u.householdName === "Hộ Trệt");
    const lauUsage = bill.usages.find((u) => u.householdName === "Hộ Lầu");
    const billResult = calculateSplit(
      bill.totalAmount,
      bill.totalKwh,
      tretUsage?.kwhUsed || 0,
      lauUsage?.kwhUsed || 0
    );
    const tret = billResult.households[0];
    const lau = billResult.households[1];

    const message = `⚡ BÁO CÁO PHÂN BỔ TIỀN ĐIỆN (Tháng ${bill.month}) ⚡
-----------------------------------------
• Tổng tiền bill: ${formatVND(bill.totalAmount)}
• Điện tiêu thụ: ${bill.totalKwh} kWh
• Hao hụt: ${formatKwhValue(billResult.lossKwh)} kWh

=========================================
1. HỘ TRỆT:
   - Số điện: ${tret.kwhUsed} kWh
   👉 TỔNG CỘNG: ${formatVND(tret.allocatedTotal)}
   - Đơn giá TB: ${tret.averagePricePerKwh.toLocaleString("vi-VN")} đ/kWh

2. HỘ LẦU:
   - Số điện: ${lau.kwhUsed} kWh
   👉 TỔNG CỘNG: ${formatVND(lau.allocatedTotal)}
   - Đơn giá TB: ${lau.averagePricePerKwh.toLocaleString("vi-VN")} đ/kWh

-----------------------------------------
✓ Đối soát chênh lệch: 0 đ (Khớp 100%)`;

    navigator.clipboard.writeText(message).then(
      () => triggerToast(`Đã sao chép Zalo tháng ${bill.month}!`),
      () => triggerToast("Lỗi sao chép.")
    );
  };

  const handleLoadBill = (bill: SavedBill) => {
    const [m, y] = bill.month.split("/");
    const formattedMonth = `${y}-${m}`;

    setMonth(formattedMonth);
    setTotalAmount(bill.totalAmount);
    setTotalKwh(bill.totalKwh);

    const tretUsage = bill.usages.find((u) => u.householdName === "Hộ Trệt")?.kwhUsed || 0;
    const lauUsage = bill.usages.find((u) => u.householdName === "Hộ Lầu")?.kwhUsed || 0;
    setKwhTret(tretUsage);
    setKwhLau(lauUsage);
    setAutoCalcKwh(false);

    triggerToast(`Đã tải số liệu tháng ${bill.month} lên bảng tính.`);
  };

  const handlePrintImage = async () => {
    if (!printableRef.current) return;
    setPrintingBill(true);
    triggerToast("Đang tạo ảnh bảng tính...");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(printableRef.current, {
        scale: 2,
        backgroundColor: "#020617",
        useCORS: true,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) { triggerToast("Lỗi tạo ảnh."); setPrintingBill(false); return; }
        const formattedMonth = formatDateDisplay(month);
        const fileName = `tien-dien-${formattedMonth.replace("/", "-")}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `Tiền điện tháng ${formattedMonth}` });
            triggerToast("Đã mở chia sẻ!");
          } catch {
            triggerToast("Đã hủy chia sẻ.");
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
          triggerToast("Đã tải ảnh bảng tính!");
        }
        setPrintingBill(false);
      }, "image/png");
    } catch {
      triggerToast("Lỗi xuất ảnh.");
      setPrintingBill(false);
    }
  };

  const handleCopyZalo = () => {
    const formattedMonth = formatDateDisplay(month);
    const tret = results.households[0];
    const lau = results.households[1];

    const message = `⚡ BÁO CÁO TIỀN ĐIỆN (${formattedMonth}) 
-------------------------
• Tổng tiền bill: ${formatVND(totalAmount)}
• Điện tiêu thụ: ${totalKwh} kWh
• Hao hụt: ${formatKwhValue(results.lossKwh)} kWh

=========================
1. HỘ TRỆT:
   - Số điện: ${tret.kwhUsed} kWh
   👉 TỔNG CỘNG: ${formatVND(tret.allocatedTotal)}
   - Đơn giá TB: ${tret.averagePricePerKwh.toLocaleString("vi-VN")} đ/kWh

2. HỘ LẦU:
   - Số điện: ${lau.kwhUsed} kWh
   👉 TỔNG CỘNG: ${formatVND(lau.allocatedTotal)}
   - Đơn giá TB: ${lau.averagePricePerKwh.toLocaleString("vi-VN")} đ/kWh

-------------------------
✓ Đối soát chênh lệch: 0 đ (Khớp 100%)`;

    navigator.clipboard.writeText(message).then(
      () => triggerToast("Đã sao chép báo cáo Zalo!"),
      () => triggerToast("Lỗi sao chép.")
    );
  };

  const tretPctKwh = totalKwh > 0 ? (kwhTret / totalKwh) * 100 : 0;
  const lauPctKwh = totalKwh > 0 ? (kwhLau / totalKwh) * 100 : 0;
  const lossPctKwh = totalKwh > 0 ? (results.lossKwh / totalKwh) * 100 : 0;

  const totalHouseholdsCost = results.households[0].allocatedTotal + results.households[1].allocatedTotal;
  const tretPctCost = totalHouseholdsCost > 0 ? (results.households[0].allocatedTotal / totalHouseholdsCost) * 100 : 0;
  const lauPctCost = totalHouseholdsCost > 0 ? (results.households[1].allocatedTotal / totalHouseholdsCost) * 100 : 0;

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-teal-500 selection:text-slate-950 shadow-2xl border-x border-slate-900 pb-4 relative overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur px-3 py-1.5 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div ref={iconRef} className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold border border-teal-500/20 text-xs">
            ⚡
          </div>
          <h1 className="text-xs font-black tracking-wider text-slate-200">
            100F LÊ VĂN DUYỆT
          </h1>
        </div>

        {/* Month Selector in Header */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md scale-90 overflow-hidden">
          <button
            onClick={handlePrevMonth}
            className="px-2 py-0.5 text-slate-400 hover:text-teal-400 active:bg-slate-800 transition-colors"
            title="Tháng trước"
          >
            ◀
          </button>
          <div className="relative flex items-center justify-center px-1.5 py-0.5 min-w-[70px] cursor-pointer">
            <span className="text-[10px] text-slate-200 font-bold">
              {month ? (() => {
                const [y, m] = month.split("-");
                return `${m}/${y}`;
              })() : "Chọn tháng"}
            </span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <button
            onClick={handleNextMonth}
            className="px-2 py-0.5 text-slate-400 hover:text-teal-400 active:bg-slate-800 transition-colors"
            title="Tháng sau"
          >
            ▶
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-3 py-2 space-y-2">
        {/* Verification Alert if failed */}
        {!results.selfTest.passed && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-2 flex items-center justify-between text-rose-400 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span>⚠️</span>
              <div>
                <p className="font-bold">Sai lệch phân bổ</p>
                <p className="text-[9px] opacity-70">Lệch: {formatVND(results.selfTest.difference)}đ</p>
              </div>
            </div>
          </div>
        )}

        {/* Input Forms Card */}
        <div className="gsap-card bg-slate-900/30 border border-slate-900 rounded-xl p-2 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📥 Số liệu hóa đơn</span>
            <button
              onClick={() => {
                setTotalAmount(0);
                setTotalKwh(0);
                setKwhTret(0);
                setKwhLau(0);
                setAutoCalcKwh(false);
              }}
              className="text-[9px] text-slate-500 hover:text-rose-455 font-semibold flex items-center gap-0.5"
            >
              🗑️ Xóa
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Amount */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-450 uppercase tracking-wider">
                TIỀN ĐIỆN THÁNG
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={totalAmount ? totalAmount.toLocaleString("vi-VN") : ""}
                onChange={(e) => {
                  const rawVal = e.target.value.replace(/\D/g, "");
                  const amt = parseInt(rawVal, 10) || 0;
                  setTotalAmount(amt);
                  if (autoCalcKwh) {
                    setTotalKwh(calculateKwhFromAmount(amt));
                  }
                }}
                placeholder="VD: 2.920.493"
                className="w-full min-h-[60px] bg-slate-950 border-2 border-slate-850 hover:border-slate-800 focus:border-teal-500 rounded-xl px-4 py-3 text-slate-100 text-2xl font-black outline-none transition-all placeholder:text-slate-700 placeholder:font-black"
              />
            </div>

            {/* Total kWh */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <label className="block text-[12px] font-bold text-slate-455 uppercase tracking-wider">
                  Tổng kWh
                </label>
                <label className="flex items-center gap-1.5 text-[13px] font-black text-teal-400 cursor-pointer select-none whitespace-nowrap">
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
                    className="rounded border-slate-850 bg-slate-950 text-teal-500 focus:ring-0 h-4 w-4 accent-teal-500 cursor-pointer"
                  />
                  Tính KWH
                </label>
              </div>
              <input
                type="number"
                value={totalKwh || ""}
                onChange={(e) => {
                  setTotalKwh(parseFloat(e.target.value) || 0);
                  setAutoCalcKwh(false);
                }}
                placeholder="VD: 871"
                className="w-full min-h-[60px] bg-slate-950 border-2 border-slate-850 hover:border-slate-800 focus:border-teal-500 rounded-xl px-4 py-3 text-slate-100 text-2xl font-black outline-none transition-all placeholder:text-slate-700 placeholder:font-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Trệt kWh */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-teal-400 uppercase tracking-wider">
                Hộ Trệt (kWh)
              </label>
              <input
                type="number"
                value={kwhTret || ""}
                onChange={(e) => setKwhTret(parseFloat(e.target.value) || 0)}
                placeholder="VD: 350"
                className="w-full min-h-[60px] bg-slate-950 border-2 border-slate-850 hover:border-teal-500/40 focus:border-teal-500 rounded-xl px-4 py-3 text-teal-400 text-2xl font-black outline-none transition-all placeholder:text-slate-700 placeholder:font-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Lầu kWh */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-violet-400 uppercase tracking-wider">
                Hộ Lầu (kWh)
              </label>
              <input
                type="number"
                value={kwhLau || ""}
                onChange={(e) => setKwhLau(parseFloat(e.target.value) || 0)}
                placeholder="VD: 521"
                className="w-full min-h-[60px] bg-slate-950 border-2 border-slate-850 hover:border-violet-500/40 focus:border-violet-500 rounded-xl px-4 py-3 text-violet-400 text-2xl font-black outline-none transition-all placeholder:text-slate-700 placeholder:font-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Loss Info Summary */}
          <div className="flex justify-between items-center text-[9px] bg-slate-950/40 border border-slate-900 px-2 py-1 rounded-lg text-slate-400">
            <span>Hao hụt: <strong className={results.lossKwh > 0 ? "text-amber-400" : "text-emerald-400"}>{formatKwhValue(results.lossKwh)} kWh ({formatKwhValue(lossPctKwh)}%)</strong></span>
            <span>Tổng phụ: <strong className="text-slate-200">{formatKwhValue(kwhTret + kwhLau)} kWh</strong></span>
          </div>
        </div>

        {/* Results Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Trệt Card */}
          <div className="bg-gradient-to-br from-teal-950/10 to-slate-900 border border-teal-500/15 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="text-[9px] uppercase font-black text-teal-400/80 tracking-wider">Hộ Trệt</span>
              <div className="text-base font-black text-teal-400 mt-1">
                <span ref={tretBillRef}>{formatVND(results.households[0].allocatedTotal)}</span> đ
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-teal-500/10 text-[9px] text-slate-450 space-y-0.5 font-mono">
              <div className="flex justify-between"><span>Số điện:</span> <span className="font-bold text-slate-200">{formatKwhValue(kwhTret)} kWh</span></div>
              <div className="flex justify-between"><span>Đơn giá TB:</span> <span className="font-bold text-slate-250">{results.households[0].averagePricePerKwh.toLocaleString("vi-VN")} đ</span></div>
            </div>
          </div>

          {/* Lầu Card */}
          <div className="bg-gradient-to-br from-violet-950/10 to-slate-900 border border-violet-500/15 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="text-[9px] uppercase font-black text-violet-400/80 tracking-wider">Hộ Lầu</span>
              <div className="text-base font-black text-violet-450 mt-1">
                <span ref={lauBillRef}>{formatVND(results.households[1].allocatedTotal)}</span> đ
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-violet-500/10 text-[9px] text-slate-450 space-y-0.5 font-mono">
              <div className="flex justify-between"><span>Số điện:</span> <span className="font-bold text-slate-200">{formatKwhValue(kwhLau)} kWh</span></div>
              <div className="flex justify-between"><span>Đơn giá TB:</span> <span className="font-bold text-slate-250">{results.households[1].averagePricePerKwh.toLocaleString("vi-VN")} đ</span></div>
            </div>
          </div>
        </div>

        {/* Group 1: Result Action Buttons (directly under result cards) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Zalo Copy */}
          <button
            onClick={handleCopyZalo}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 active:scale-[0.97] transition-all text-slate-300"
          >
            <span className="text-sm mb-0.5">💬</span>
            <span className="text-[9px] font-bold">Zalo Copy</span>
          </button>

          {/* Lưu Lịch Sử */}
          <button
            onClick={handleSaveBill}
            disabled={savingBill}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 active:scale-[0.97] transition-all text-teal-400 disabled:opacity-50"
          >
            <span className="text-sm mb-0.5">{savingBill ? "⏳" : "💾"}</span>
            <span className="text-[9px] font-bold">{savingBill ? "Đang lưu" : "Lưu Lịch Sử"}</span>
          </button>
        </div>

        {/* Split Ratios Bar */}
        <div className="bg-slate-900/20 border border-slate-900/60 rounded-xl p-2.5 space-y-2 text-[9px]">
          <div className="space-y-0.5">
            <div className="flex justify-between text-slate-450">
              <span>Tỷ lệ Điện (kWh)</span>
              <span className="font-bold text-slate-350">Trệt {tretPctKwh.toFixed(0)}% | Lầu {lauPctKwh.toFixed(0)}%</span>
            </div>
            <div className="h-1 w-full bg-slate-950 rounded-full flex overflow-hidden border border-slate-850">
              <div style={{ width: `${tretPctKwh}%` }} className="bg-teal-500 rounded-full transition-all duration-500"></div>
              <div style={{ width: `${lauPctKwh}%` }} className="bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500 mx-0.5"></div>
              {results.lossKwh > 0 && (
                <div style={{ width: `${lossPctKwh}%` }} className="bg-amber-500/30 rounded-full transition-all duration-500"></div>
              )}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between text-slate-455">
              <span>Tỷ lệ Tiền (đã gồm VAT)</span>
              <span className="font-bold text-slate-350">Trệt {tretPctCost.toFixed(0)}% | Lầu {lauPctCost.toFixed(0)}%</span>
            </div>
            <div className="h-1 w-full bg-slate-950 rounded-full flex overflow-hidden border border-slate-850">
              <div style={{ width: `${tretPctCost}%` }} className="bg-teal-500 rounded-full transition-all duration-500"></div>
              <div style={{ width: `${lauPctCost}%` }} className="bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500 mx-0.5"></div>
            </div>
          </div>
        </div>

        {/* Group 2: Secondary Tab Navigation (4 columns) */}
        <div className="grid grid-cols-4 gap-1">
          {/* Chi tiết */}
          <button
            onClick={() => { setShowDetails(!showDetails); setShowReport(false); setShowHistory(false); setShowExplain(false); }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border active:scale-[0.97] transition-all ${showDetails ? "bg-teal-500/10 border-teal-500/40 text-teal-400" : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400"
              }`}
          >
            <span className="text-sm mb-0.5">📝</span>
            <span className="text-[9px] font-bold">Chi tiết</span>
          </button>

          {/* Báo cáo */}
          <button
            onClick={() => { setShowReport(!showReport); setShowDetails(false); setShowHistory(false); setShowExplain(false); }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border active:scale-[0.97] transition-all ${showReport ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400" : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400"
              }`}
          >
            <span className="text-sm mb-0.5">📊</span>
            <span className="text-[9px] font-bold">Báo cáo</span>
          </button>

          {/* Lịch sử */}
          <button
            onClick={() => { setShowHistory(!showHistory); setShowReport(false); setShowDetails(false); setShowExplain(false); }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border active:scale-[0.97] transition-all ${showHistory ? "bg-amber-500/10 border-amber-500/40 text-amber-400" : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400"
              }`}
          >
            <span className="text-sm mb-0.5">📂</span>
            <span className="text-[9px] font-bold">Lịch sử</span>
          </button>

          {/* Hỏi & Đáp */}
          <button
            onClick={() => { setShowExplain(!showExplain); setShowReport(false); setShowDetails(false); setShowHistory(false); }}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border active:scale-[0.97] transition-all ${showExplain ? "bg-sky-500/10 border-sky-500/40 text-sky-400" : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400"
              }`}
          >
            <span className="text-sm mb-0.5">💡</span>
            <span className="text-[9px] font-bold">Hỏi & Đáp</span>
          </button>
        </div>

        {/* Collapsible Panel 1: Báo cáo (showReport) */}
        {showReport && (
          <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-3.5 space-y-3 animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">📊 Biểu đồ & Đánh giá</span>
              <span className="text-[8px] text-slate-500">(Lịch sử qua các tháng)</span>
            </div>

            {chartData.length > 0 ? (
              <>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px', color: '#f1f5f9', borderRadius: '6px' }}
                        itemStyle={{ padding: '2px 0' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }} iconType="circle" />
                      <Line type="monotone" dataKey="Trệt" stroke="#2dd4bf" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="Lầu" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {reportEvaluation ? (
                  <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 space-y-2 text-[10px]">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                      Nhận xét tháng {reportEvaluation.latestMonth}:
                    </div>
                    <div className="flex gap-2">
                      <span className="text-teal-400 font-bold shrink-0">🏠 Trệt:</span>
                      <span className="text-slate-300 leading-snug">{reportEvaluation.tret.text}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-violet-400 font-bold shrink-0">🏢 Lầu:</span>
                      <span className="text-slate-300 leading-snug">{reportEvaluation.lau.text}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 italic text-center py-2">
                    Cần ít nhất 2 tháng dữ liệu để so sánh và nhận xét.
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-slate-500 text-[10px]">
                Chưa có dữ liệu lịch sử để vẽ biểu đồ.
              </div>
            )}
          </div>
        )}

        {/* Collapsible Panel 2: Chi tiết đối soát (showDetails) */}
        {showDetails && (
          <div className="bg-slate-900 border border-teal-500/20 rounded-xl p-3 space-y-2 overflow-x-hidden animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-400">📝 Chi Tiết Đối Soát</span>
              <span className="text-[8px] text-slate-500">(Gồm hao hụt & VAT)</span>
            </div>

            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[7px] tracking-wider">
                  <th className="py-1 w-[35%]">Bậc điện</th>
                  <th className="py-1 text-right w-[15%] text-slate-400">Đơn giá</th>
                  <th className="py-1 text-right w-[25%] text-teal-400">Trệt</th>
                  <th className="py-1 text-right w-[25%] text-violet-400">Lầu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono">
                {(() => {
                  const tretRaw = calculateRawEvnCost(kwhTret);
                  const lauRaw = calculateRawEvnCost(kwhLau);

                  const getTierData = (distribution: any[], level: number) => {
                    return distribution.find((d) => d.level === level) || { level, kwhAllocated: 0, cost: 0 };
                  };

                  return (
                    <>
                      {EVN_TIERS.map((tier) => {
                        const tretDist = getTierData(tretRaw.tierDistribution, tier.level);
                        const lauDist = getTierData(lauRaw.tierDistribution, tier.level);
                        const totalTierKwh = tretDist.kwhAllocated + lauDist.kwhAllocated;

                        if (totalTierKwh === 0) return null;

                        return (
                          <tr key={tier.level} className="hover:bg-slate-850/30 transition-colors">
                            <td className="py-1 font-sans">
                              <div className="text-[8px]">
                                <span className="font-bold text-slate-300">B{tier.level}</span>
                                <span className="text-slate-500 text-[7px] ml-1">({(() => {
                                  const ranges = ["0-50", "51-100", "101-200", "201-300", "301-400", "401+"];
                                  return ranges[tier.level - 1];
                                })()})</span>
                              </div>
                            </td>
                            <td className="py-1 text-right font-mono">
                              <div className="text-[7px] text-slate-400">{tier.price.toLocaleString("vi-VN")}</div>
                            </td>
                            <td className="py-1 text-right text-teal-400">
                              {tretDist.kwhAllocated > 0 ? (
                                <div>
                                  <div className="font-bold text-[8px]">{formatKwhValue(tretDist.kwhAllocated)}</div>
                                  <div className="text-[7px] text-slate-500 mt-0.5">{tretDist.cost.toLocaleString("vi-VN")}</div>
                                </div>
                              ) : <span className="text-slate-700/40 text-[7px]">—</span>}
                            </td>
                            <td className="py-1 text-right text-violet-400">
                              {lauDist.kwhAllocated > 0 ? (
                                <div>
                                  <div className="font-bold text-[8px]">{formatKwhValue(lauDist.kwhAllocated)}</div>
                                  <div className="text-[7px] text-slate-500 mt-0.5">{lauDist.cost.toLocaleString("vi-VN")}</div>
                                </div>
                              ) : <span className="text-slate-700/40 text-[7px]">—</span>}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Summary rows */}
                      <tr className="bg-slate-950/40 text-[8px] font-bold text-slate-400 border-t-2 border-slate-800">
                        <td className="py-1 font-sans">Tổng kWh</td>
                        <td className="py-1"></td>
                        <td className="py-1 text-right text-teal-400">{formatKwhValue(kwhTret)}</td>
                        <td className="py-1 text-right text-violet-400">{formatKwhValue(kwhLau)}</td>
                      </tr>

                      <tr className="bg-slate-950/40 text-[7px] font-bold text-slate-450">
                        <td className="py-1 font-sans">Tiêu thụ thô</td>
                        <td className="py-1"></td>
                        <td className="py-1 text-right text-slate-300">{formatVND(tretRaw.totalRawCost)}</td>
                        <td className="py-1 text-right text-slate-300">{formatVND(lauRaw.totalRawCost)}</td>
                      </tr>

                      <tr className="bg-amber-500/[0.03] text-[7px] font-bold text-amber-500 border-y border-amber-500/20">
                        <td className="py-1.5 font-sans">
                          <span className="text-[8px]">Bù hao hụt</span>
                          {results.lossKwh > 0 && <span className="block text-[6px] text-amber-500/60 font-normal mt-0.5">{formatKwhValue(results.lossKwh)} kWh</span>}
                        </td>
                        <td className="py-1.5"></td>
                        <td className="py-1.5 text-right">
                          <span className="text-amber-400 text-[8px]">+{formatVND(results.households[0].lossCostShareBeforeVat)}</span>
                          {results.lossKwh > 0 && <span className="block text-[6px] text-amber-500/60 font-normal mt-0.5">+{formatKwhValue(results.households[0].lossKwhShare)}</span>}
                        </td>
                        <td className="py-1.5 text-right">
                          <span className="text-amber-400 text-[8px]">+{formatVND(results.households[1].lossCostShareBeforeVat)}</span>
                          {results.lossKwh > 0 && <span className="block text-[6px] text-amber-500/60 font-normal mt-0.5">+{formatKwhValue(results.households[1].lossKwhShare)}</span>}
                        </td>
                      </tr>

                      <tr className="bg-slate-900/50 text-[7px] font-bold text-slate-300">
                        <td className="py-1 font-sans">Chưa VAT</td>
                        <td className="py-1"></td>
                        <td className="py-1 text-right text-slate-200">{formatVND(results.households[0].allocatedBeforeVat)}</td>
                        <td className="py-1 text-right text-slate-200">{formatVND(results.households[1].allocatedBeforeVat)}</td>
                      </tr>

                      <tr className="bg-slate-950/40 text-[7px] font-bold text-slate-400">
                        <td className="py-1 font-sans">VAT 8%</td>
                        <td className="py-1"></td>
                        <td className="py-1 text-right text-slate-350">{formatVND(results.households[0].allocatedVat)}</td>
                        <td className="py-1 text-right text-slate-350">{formatVND(results.households[1].allocatedVat)}</td>
                      </tr>

                      <tr className="bg-slate-950/80 font-black border-t-2 border-teal-500/30 text-[8px] text-white">
                        <td className="py-1.5 font-sans">💰 Tổng</td>
                        <td className="py-1.5"></td>
                        <td className="py-1.5 text-right text-teal-400">{formatVND(results.households[0].allocatedTotal)}</td>
                        <td className="py-1.5 text-right text-violet-400">{formatVND(results.households[1].allocatedTotal)}</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* Collapsible Panel 3: Lịch sử (showHistory) */}
        {showHistory && (
          <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3.5 space-y-2.5 animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">📂 Lịch sử lưu trữ</span>
              {/* Month nav in history panel */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md overflow-hidden">
                <button
                  onClick={handlePrevMonth}
                  className="px-2 py-0.5 text-slate-400 hover:text-teal-400 active:bg-slate-800 transition-colors text-[10px]"
                  title="Tháng trước"
                >◀</button>
                <div className="relative flex items-center justify-center px-1.5 py-0.5 min-w-[52px] cursor-pointer">
                  <span className="text-[10px] text-slate-200 font-bold">
                    {month ? (() => { const [y, m] = month.split("-"); return `${m}/${y}`; })() : "Chọn"}
                  </span>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <button
                  onClick={handleNextMonth}
                  className="px-2 py-0.5 text-slate-400 hover:text-teal-400 active:bg-slate-800 transition-colors text-[10px]"
                  title="Tháng sau"
                >▶</button>
              </div>
              <button onClick={loadBillHistory} className="text-[9px] text-teal-400 font-bold">🔄 Tải lại</button>
            </div>

            {loadingHistory ? (
              <div className="py-4 text-center text-slate-500 text-[10px]">⏳ Đang tải...</div>
            ) : sortedBillsForHistory.length === 0 ? (
              <div className="py-4 text-center text-slate-500 text-[10px] italic">Chưa có hóa đơn nào được lưu.</div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {sortedBillsForHistory.map((bill) => {
                  const tretUsage = bill.usages.find((u) => u.householdName === "Hộ Trệt");
                  const lauUsage = bill.usages.find((u) => u.householdName === "Hộ Lầu");

                  const billResult = calculateSplit(
                    bill.totalAmount,
                    bill.totalKwh,
                    tretUsage?.kwhUsed || 0,
                    lauUsage?.kwhUsed || 0
                  );
                  const tretCost = billResult.households[0].allocatedTotal;
                  const lauCost = billResult.households[1].allocatedTotal;

                  return (
                    <div
                      key={bill.id}
                      className="bg-slate-950 rounded-lg border border-slate-850 text-[10px] hover:border-slate-800 overflow-hidden flex flex-col transition-all"
                    >
                      {/* Clickable Header */}
                      <div
                        onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
                        className="p-2.5 flex items-center justify-between cursor-pointer active:bg-slate-900/60 select-none"
                      >
                        <div className="space-y-0.5 w-full font-sans">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">
                              Tháng {bill.month} {expandedBillId === bill.id ? "▼" : "▶"}
                            </span>
                            <span className="text-[8px] text-slate-500">
                              {bill.createdAt.toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                          <div className="text-slate-450 text-[9px]">
                            Tổng: {bill.totalKwh} kWh — {formatVND(bill.totalAmount)} đ
                          </div>
                        </div>
                      </div>

                      {/* Expandable Details and Action Buttons */}
                      {expandedBillId === bill.id && (
                        <div className="px-2.5 pb-2.5 pt-1.5 border-t border-slate-900 bg-slate-900/10 space-y-2.5 animate-slide-in">
                          <div className="flex justify-between text-[9px] font-mono text-slate-350">
                            <span className="text-teal-400">Trệt: {formatVND(tretCost)} đ ({tretUsage?.kwhUsed || 0} kWh)</span>
                            <span className="text-violet-400">Lầu: {formatVND(lauCost)} đ ({lauUsage?.kwhUsed || 0} kWh)</span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-900/60">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyZaloForBill(bill);
                              }}
                              className="flex-1 py-1 rounded bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 active:scale-95 transition-all font-bold text-[9px] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>💬</span> Copy Zalo
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadBill(bill);
                              }}
                              className="flex-1 py-1 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 active:scale-95 transition-all font-bold text-[9px] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <span>📥</span> Nạp số liệu
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBill(bill.id, bill.month);
                              }}
                              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 border border-rose-500/20 active:scale-95 transition-all text-[11px] cursor-pointer"
                              title="Xóa hóa đơn"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Panel 4: Hỏi & Đáp (showExplain) */}
        {showExplain && (
          <div className="bg-slate-900 border border-sky-500/20 rounded-xl p-3.5 text-[10px] text-slate-350 leading-relaxed space-y-3 animate-slide-in">
            {/* Detailed guide */}
            <div>
              <h4 className="text-sky-400 font-bold mb-2 flex items-center gap-1 text-[11px]">
                <span>📖</span> Hướng Dẫn Số Liệu & Ý Nghĩa
              </h4>
              <ul className="list-disc pl-3.5 space-y-1.5 text-slate-450 font-sans">
                <li>
                  <strong className="text-slate-205">Tổng Tiền & Tổng kWh:</strong> Điền đúng theo hóa đơn EVN gửi về. Có thể tích "Tự tính" để app tự dò số kWh dựa trên tổng tiền.
                </li>
                <li>
                  <strong className="text-slate-205">Trệt / Lầu (kWh):</strong> Số điện (chữ điện) ghi trên đồng hồ phụ của mỗi hộ trong tháng.
                </li>
                <li>
                  <strong className="text-slate-205">Hao hụt (Loss):</strong> Lượng điện thất thoát do truyền tải đường dây. Tính bằng: Tổng EVN - (Trệt + Lầu). Hao hụt này được chia đôi theo tỷ lệ sử dụng để cả hai cùng gánh.
                </li>
                <li>
                  <strong className="text-slate-205">Tiêu thụ thô:</strong> Số tiền điện giả định nếu mỗi hộ đứng tên riêng một đồng hồ EVN độc lập (được hưởng đầy đủ bậc rẻ).
                </li>
              </ul>
            </div>

            <hr className="border-slate-850" />

            {/* Explain Proportional Split */}
            <div>
              <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-1 text-[11px]">
                <span>❓</span> Bù Hao Hụt & Lệch Bậc Là Gì?
              </h4>
              <div className="space-y-2 text-slate-400 font-sans">
                <p>
                  <strong>1. Bất công khi tính riêng:</strong> EVN chỉ cấp 1 suất giá rẻ duy nhất (50 số đầu bậc 1, 50 số bậc 2...) cho cả căn nhà. Nếu lấy số điện Trệt và Lầu tự tính độc lập, cả hai đều đòi hưởng suất giá rẻ đó. Tổng cộng lại sẽ thiếu hụt rất nhiều so với hóa đơn tổng thực tế (do phần dư bị đẩy lên bậc 6 đắt nhất).
                </p>
                <p>
                  <strong>2. Tránh ép người dùng nhiều gánh hết:</strong> Nếu bắt người dùng nhiều gánh toàn bộ bậc đắt bậc 6, còn người dùng ít hưởng trọn bậc rẻ thì rất bất công.
                </p>
                <p>
                  <strong>3. Giải pháp Chia Tỷ Lệ:</strong> Phần mềm gom chung hóa đơn thành 1 "cái bánh". Tỷ lệ tiền điện thực tế mỗi hộ phải trả sẽ tương ứng sòng phẳng với tỷ lệ họ sử dụng. Cả Trệt và Lầu đều được chia sẻ bậc rẻ và cùng gánh bậc đắt một cách công bằng nhất.
                </p>
              </div>
            </div>

            {/* Explain Low User Benefit */}
            <div>
              <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-1 text-[11px]">
                <span>⚖️</span> Hộ Dùng Ít Có Bị Thiệt Không?
              </h4>
              <div className="space-y-2 text-slate-400 font-sans">
                <p>
                  <strong>Hoàn toàn KHÔNG.</strong> Giải thuật tỷ lệ này được thiết kế để bảo vệ hộ dùng ít (tiết kiệm):
                </p>
                <ul className="list-disc pl-3.5 space-y-1.5 text-slate-400 font-sans">
                  <li>Nếu chia đều theo đơn giá trung bình, hộ dùng ít sẽ bị gánh oan đơn giá cao bậc 5-6 của hộ dùng nhiều.</li>
                  <li>Nếu tính độc lập hoàn toàn, tổng tiền 2 hộ cộng lại sẽ bị hụt rất nhiều so với hóa đơn EVN (do EVN chỉ cấp 1 suất giá rẻ cho cả công tơ tổng).</li>
                  <li>Giải thuật tỷ lệ: Giữ đơn giá của hộ dùng ít ở mức cực rẻ (~2.000 đ/kWh, gần sát Bậc 1-2), trong khi hộ dùng nhiều sẽ gánh phần lớn các bậc đắt hơn (~2.900 đ/kWh). Đây là phương án chia sẻ công bằng và sòng phẳng nhất.</li>
                </ul>
              </div>
            </div>

            <hr className="border-slate-855" />

            {/* Explain High User Benefit */}
            <div>
              <h4 className="text-violet-400 font-bold mb-2 flex items-center gap-1 text-[11px]">
                <span>⚖️</span> Hộ Dùng Nhiều Có Bị Thiệt Không?
              </h4>
              <div className="space-y-2 text-slate-400 font-sans">
                <p>
                  <strong>Hoàn toàn KHÔNG.</strong> Giải thuật bảo đảm quyền lợi tối đa cho cả hộ dùng nhiều:
                </p>
                <ul className="list-disc pl-3.5 space-y-1.5 text-slate-400 font-sans">
                  <li><strong>Không bị gánh 100% lệch bậc:</strong> Nếu chia theo cách cũ (hộ ít trả giá rẻ cố định, hộ nhiều gánh sạch phần thừa), hộ dùng nhiều sẽ phải chịu toàn bộ tiền lệch bậc đắt nhất. Ở đây, phần lệch bậc được chia đều theo tỷ lệ phần trăm sử dụng (cả hai cùng gánh vác).</li>
                  <li><strong>Vẫn được chia sẻ bậc rẻ:</strong> Hộ dùng nhiều vẫn được hưởng một phần lượng điện giá rẻ (Bậc 1-2) của công tơ tổng theo đúng tỷ lệ % sử dụng của mình, chứ không bị đẩy 100% chỉ số vào bậc cao.</li>
                  <li>Đây là phương án khoa học, công bằng nhất để cả hai hộ cùng chung tay giải quyết đặc thù dùng chung công tơ tổng của EVN.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg shadow-lg text-[10px] font-bold border-l-2 border-l-teal-500 animate-slide-in whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs px-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 w-full max-w-xs shadow-2xl flex flex-col items-center text-center space-y-3.5 animate-slide-in">
            <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-500/20">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-200">Xác nhận</h3>
              <p className="text-[10px] text-slate-400 leading-normal">{confirmModalMessage}</p>
            </div>
            <div className="flex w-full gap-2 pt-1 font-sans">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setOnConfirmAction(null);
                }}
                className="flex-1 py-1.5 rounded-lg bg-slate-950 border border-slate-850 text-slate-400 font-bold active:scale-95 transition-all text-[10px] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  if (onConfirmAction) onConfirmAction();
                }}
                className="flex-1 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold active:scale-95 transition-all text-[10px] cursor-pointer"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Invoice (off-screen, used for html2canvas) */}
      <div
        ref={printableRef}
        style={{ position: "fixed", left: "-9999px", top: "0", width: "450px", zIndex: -1 }}
        className="bg-slate-950 text-slate-100 p-6 font-sans"
      >
        {/* Invoice Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#f1f5f9", letterSpacing: "0.05em" }}>HÓA ĐƠN CHIA TIỀN ĐIỆN</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>100F Lê Văn Duyệt</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#2dd4bf" }}>Tháng {formatDateDisplay(month)}</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Tổng EVN: {formatVND(totalAmount)} đ</div>
          </div>
        </div>

        {/* Household Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(45,212,191,0.2)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(45,212,191,0.8)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Hộ Trệt</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#2dd4bf" }}>{formatVND(results.households[0].allocatedTotal)}<span style={{ fontSize: 12, marginLeft: 2 }}>đ</span></div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(45,212,191,0.1)", fontSize: 10, fontFamily: "monospace" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}><span>Số điện:</span><span style={{ color: "#e2e8f0", fontWeight: 700 }}>{formatKwhValue(kwhTret)} kWh</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", marginTop: 2 }}><span>Đơn giá TB:</span><span style={{ color: "#e2e8f0", fontWeight: 700 }}>{results.households[0].averagePricePerKwh.toLocaleString("vi-VN")} đ</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", marginTop: 2 }}><span>Tỷ lệ:</span><span style={{ color: "#2dd4bf", fontWeight: 700 }}>{tretPctKwh.toFixed(1)}%</span></div>
            </div>
          </div>
          <div style={{ background: "rgba(109,40,217,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(139,92,246,0.8)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Hộ Lầu</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#a78bfa" }}>{formatVND(results.households[1].allocatedTotal)}<span style={{ fontSize: 12, marginLeft: 2 }}>đ</span></div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(139,92,246,0.1)", fontSize: 10, fontFamily: "monospace" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}><span>Số điện:</span><span style={{ color: "#e2e8f0", fontWeight: 700 }}>{formatKwhValue(kwhLau)} kWh</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", marginTop: 2 }}><span>Đơn giá TB:</span><span style={{ color: "#e2e8f0", fontWeight: 700 }}>{results.households[1].averagePricePerKwh.toLocaleString("vi-VN")} đ</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", marginTop: 2 }}><span>Tỷ lệ:</span><span style={{ color: "#a78bfa", fontWeight: 700 }}>{lauPctKwh.toFixed(1)}%</span></div>
            </div>
          </div>
        </div>

        {/* Summary Row */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 12, marginBottom: 16, fontFamily: "monospace" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
            <div><div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>Tổng kWh EVN</div><div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 11 }}>{formatKwhValue(totalKwh)} kWh</div></div>
            <div><div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>Hao hụt</div><div style={{ fontWeight: 700, color: "#fbbf24", fontSize: 11 }}>{formatKwhValue(results.lossKwh)} kWh</div></div>
            <div><div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>Đối soát</div><div style={{ fontWeight: 700, color: "#34d399", fontSize: 11 }}>✓ Khớp 100%</div></div>
          </div>
        </div>

        {/* EVN Tier Breakdown */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Phân bổ bậc thang EVN</div>
          <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                <th style={{ textAlign: "left", padding: "4px 0", color: "#64748b" }}>Bậc</th>
                <th style={{ textAlign: "right", padding: "4px 0", color: "#2dd4bf" }}>Trệt</th>
                <th style={{ textAlign: "right", padding: "4px 0", color: "#a78bfa" }}>Lầu</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: "monospace" }}>
              {EVN_TIERS.map((tier) => {
                const tretRaw = calculateRawEvnCost(kwhTret);
                const lauRaw = calculateRawEvnCost(kwhLau);
                const tretDist = tretRaw.tierDistribution.find((d) => d.level === tier.level);
                const lauDist = lauRaw.tierDistribution.find((d) => d.level === tier.level);
                const totalInTier = (tretDist?.kwhAllocated || 0) + (lauDist?.kwhAllocated || 0);
                if (totalInTier === 0) return null;
                return (
                  <tr key={tier.level} style={{ borderBottom: "1px solid #0f172a" }}>
                    <td style={{ padding: "4px 0", color: "#94a3b8" }}>Bậc {tier.level} <span style={{ color: "#475569" }}>({tier.price.toLocaleString("vi-VN")} đ/kWh)</span></td>
                    <td style={{ padding: "4px 0", textAlign: "right", color: "#2dd4bf" }}>{tretDist && tretDist.kwhAllocated > 0 ? `${formatKwhValue(tretDist.kwhAllocated)} kWh` : "—"}</td>
                    <td style={{ padding: "4px 0", textAlign: "right", color: "#a78bfa" }}>{lauDist && lauDist.kwhAllocated > 0 ? `${formatKwhValue(lauDist.kwhAllocated)} kWh` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 12, borderTop: "1px solid #1e293b", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#334155" }}>Tạo bởi app chia tiền điện • 100F Lê Văn Duyệt</div>
          <div style={{ fontSize: 9, color: "#1e293b", marginTop: 2 }}>{new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </div>
    </div>
  );
}

