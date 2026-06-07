'use client';

import React, { useState, useEffect } from 'react';

interface ZaloSettingsProps {
  onSave: (settings: ZaloSettings) => void;
  onTest: (settings: ZaloSettings) => Promise<boolean>;
  initialSettings?: ZaloSettings;
}

export interface ZaloSettings {
  enabled: boolean;
  appId: string;
  appSecret: string;
  oaId: string;
  userIdTret: string;
  userIdLau: string;
  autoNotify: boolean;
}

const defaultSettings: ZaloSettings = {
  enabled: false,
  appId: '',
  appSecret: '',
  oaId: '',
  userIdTret: '',
  userIdLau: '',
  autoNotify: true,
};

export function ZaloSettings({ onSave, onTest, initialSettings }: ZaloSettingsProps) {
  const [settings, setSettings] = useState<ZaloSettings>(initialSettings || defaultSettings);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const success = await onTest(settings);
      setTestResult({
        success,
        message: success
          ? 'Kết nối Zalo thành công!'
          : 'Kết nối thất bại. Kiểm tra App ID và Secret.',
      });
    } catch {
      setTestResult({
        success: false,
        message: 'Lỗi khi test kết nối.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onSave(settings);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof ZaloSettings>(key: K, value: ZaloSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
        <div>
          <div className="text-xs font-bold text-slate-200">Kich hoat Zalo Bot</div>
          <div className="text-[10px] text-slate-400">Gui thong bao hoa don qua Zalo OA</div>
        </div>
        <button
          onClick={() => updateSetting('enabled', !settings.enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-teal-500' : 'bg-slate-700'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* App ID */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zalo App ID</label>
            <input
              type="text"
              value={settings.appId}
              onChange={(e) => updateSetting('appId', e.target.value)}
              placeholder="123456789"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* App Secret */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">App Secret Key</label>
            <input
              type="password"
              value={settings.appSecret}
              onChange={(e) => updateSetting('appSecret', e.target.value)}
              placeholder="Nhap secret key"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* OA ID */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Account ID</label>
            <input
              type="text"
              value={settings.oaId}
              onChange={(e) => updateSetting('oaId', e.target.value)}
              placeholder="987654321"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* User IDs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-wider">User ID Ho Trets</label>
              <input
                type="text"
                value={settings.userIdTret}
                onChange={(e) => updateSetting('userIdTret', e.target.value)}
                placeholder="Zalo ID Tret"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-violet-400 uppercase tracking-wider">User ID Ho Lau</label>
              <input
                type="text"
                value={settings.userIdLau}
                onChange={(e) => updateSetting('userIdLau', e.target.value)}
                placeholder="Zalo ID Lau"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Auto Notify Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-800/50">
            <div>
              <div className="text-[10px] font-bold text-slate-300">Tu dong thong bao</div>
              <div className="text-[9px] text-slate-500">Gui Zalo khi luu hoa don moi</div>
            </div>
            <button
              onClick={() => updateSetting('autoNotify', !settings.autoNotify)}
              className={`relative w-10 h-5 rounded-full transition-colors ${settings.autoNotify ? 'bg-teal-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.autoNotify ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg text-xs font-semibold ${testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              {testResult.message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={isTesting || !settings.appId || !settings.appSecret}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[11px] font-bold text-slate-300 transition-all active:scale-[0.97]"
            >
              {isTesting ? 'Dang test...' : 'Test ket noi'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[11px] font-bold text-white transition-all active:scale-[0.97]"
            >
              {isSaving ? 'Dang luu...' : 'Luu cai dat'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Component for Zalo notification button
interface ZaloNotifyButtonProps {
  month: string;
  totalAmount: number;
  totalKwh: number;
  kwhTret: number;
  kwhLau: number;
  tretAmount: number;
  lauAmount: number;
  tretAvgPrice: number;
  lauAvgPrice: number;
  lossKwh: number;
  disabled?: boolean;
}

export function ZaloNotifyButton({ month, totalAmount, totalKwh, kwhTret, kwhLau, tretAmount, lauAmount, tretAvgPrice, lauAvgPrice, lossKwh, disabled }: ZaloNotifyButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/zalo/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, totalAmount, totalKwh, kwhTret, kwhLau, tretAmount, lauAmount, tretAvgPrice, lauAvgPrice, lossKwh }),
      });

      const data = await response.json();

      setResult({
        success: data.success,
        message: data.success ? 'Da gui thong bao Zalo!' : `Gui that bai: ${data.error}`,
      });

      setTimeout(() => setResult(null), 3000);
    } catch {
      setResult({ success: false, message: 'Loi ket noi server' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleSend}
        disabled={isSending || disabled}
        className="w-full flex flex-col items-center justify-center p-2 rounded-lg bg-blue-600/10 border border-blue-600/20 hover:bg-blue-600/20 active:scale-[0.97] transition-all text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-sm mb-0.5">{isSending ? 'Dang gui...' : 'Gui Zalo'}</span>
        <span className="text-[9px] font-bold">Zalo</span>
      </button>

      {result && (
        <div className={`text-[9px] font-semibold text-center p-1 rounded ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}