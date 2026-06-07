'use client';

import React, { useEffect } from 'react';
import { usePWA, useNetworkStatus, useNotificationPermission } from '@/hooks/usePWA';

interface PWAManagerProps {
  children: React.ReactNode;
}

export function PWAManager({ children }: PWAManagerProps) {
  const { isOnline, isUpdateAvailable, updateServiceWorker, isLoading } = usePWA();
  const { isOnline: networkOnline, effectiveType } = useNetworkStatus();
  const { permission: notificationPermission, requestPermission } = useNotificationPermission();

  // Request notification permission on mount
  useEffect(() => {
    if (notificationPermission === 'default') {
      // Delay to not be too intrusive
      const timer = setTimeout(() => {
        requestPermission();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [notificationPermission, requestPermission]);

  // Auto-refresh when update is available
  useEffect(() => {
    if (isUpdateAvailable && updateServiceWorker) {
      // Show update notification after a delay
      const timer = setTimeout(() => {
        if (confirm('Đã có phiên bản mới! Cập nhật ngay?')) {
          updateServiceWorker();
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isUpdateAvailable, updateServiceWorker]);

  return (
    <>
      {/* Network Status Banner */}
      {!networkOnline && (
        <div
          className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-slate-900 text-center py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-2"
          role="alert"
        >
          <span>📡</span>
          <span>Offline - Một số tính năng có thể không hoạt động</span>
          {effectiveType && (
            <span className="opacity-70 text-[10px]">({effectiveType})</span>
          )}
        </div>
      )}

      {/* Update Available Banner */}
      {isUpdateAvailable && (
        <div
          className="fixed top-0 left-0 right-0 z-[9999] bg-teal-500 text-slate-950 text-center py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-2"
          role="status"
        >
          <span>🔄</span>
          <span>Đã có phiên bản mới - Đang chờ cập nhật...</span>
        </div>
      )}

      {children}
    </>
  );
}

// Component to show install prompt
export function PWAInstallPrompt() {
  const { deferredPrompt, installPWA, isPWAInstalled } = usePWA();

  if (isPWAInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl animate-slide-in">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-xl shrink-0">
          ⚡
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-200 mb-0.5">
            Cài đặt ứng dụng
          </h3>
          <p className="text-[11px] text-slate-400 leading-snug">
            Thêm vào màn hình chính để sử dụng nhanh hơn và offline được nhé!
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setDeferredPrompt(null)}
          className="flex-1 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold active:scale-[0.97] transition-all"
        >
          Bỏ qua
        </button>
        <button
          onClick={installPWA}
          className="flex-1 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold active:scale-[0.97] transition-all"
        >
          Cài đặt ngay
        </button>
      </div>
    </div>
  );
}

// Helper to set deferred prompt reference
let setDeferredPromptRef: ((prompt: any) => void) | null = null;

export function showInstallPrompt(prompt: any) {
  if (setDeferredPromptRef) {
    setDeferredPromptRef(prompt);
  }
}

// Connection quality indicator
export function ConnectionIndicator() {
  const { isOnline, effectiveType } = useNetworkStatus();

  if (!isOnline) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        Offline
      </span>
    );
  }

  const getQuality = () => {
    switch (effectiveType) {
      case '4g':
        return { icon: '📶', text: '4G', color: 'text-emerald-400' };
      case '3g':
        return { icon: '📱', text: '3G', color: 'text-amber-400' };
      case '2g':
        return { icon: '📵', text: '2G', color: 'text-rose-400' };
      case 'slow-2g':
        return { icon: '📵', text: 'Slow', color: 'text-rose-400' };
      default:
        return { icon: '🌐', text: 'Online', color: 'text-teal-400' };
    }
  };

  const quality = getQuality();

  return (
    <span className={`inline-flex items-center gap-1 text-[9px] ${quality.color}`}>
      <span>{quality.icon}</span>
      <span>{quality.text}</span>
    </span>
  );
}