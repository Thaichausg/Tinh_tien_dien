'use client';

import React, { useState } from 'react';

interface TelegramSettingsProps {
  onSave: (settings: TelegramSettings) => void;
  onTest: (settings: TelegramSettings) => Promise<boolean>;
  initialSettings?: TelegramSettings;
}

export interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  chatIdTret: string;
  chatIdLau: string;
  autoNotify: boolean;
}

const defaultSettings: TelegramSettings = {
  enabled: false,
  botToken: '',
  chatIdTret: '',
  chatIdLau: '',
  autoNotify: true,
};

export function TelegramSettings({ onSave, onTest, initialSettings }: TelegramSettingsProps) {
  const [settings, setSettings] = useState<TelegramSettings>(initialSettings || defaultSettings);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const success = await onTest(settings);
      setTestResult({
        success,
        message: success
          ? 'Ket noi Telegram thanh cong!'
          : 'Ket noi that bai. Kiem tra Bot Token.',
      });
    } catch {
      setTestResult({
        success: false,
        message: 'Loi khi test ket noi.',
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

  const updateSetting = <K extends keyof TelegramSettings>(key: K, value: TelegramSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
        <div>
          <div className="text-xs font-bold text-slate-200">Kich hoat Telegram Bot</div>
          <div className="text-[10px] text-slate-400">Gui thong bao hoa don qua Telegram</div>
        </div>
        <button
          onClick={() => updateSetting('enabled', !settings.enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-blue-500' : 'bg-slate-700'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Bot Token */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Bot Token
            </label>
            <input
              type="password"
              value={settings.botToken}
              onChange={(e) => updateSetting('botToken', e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
            <div className="text-[9px] text-slate-500">
              Lay tu @BotFather trong Telegram
            </div>
          </div>

          {/* Chat IDs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                Chat ID Ho Trets
              </label>
              <input
                type="text"
                value={settings.chatIdTret}
                onChange={(e) => updateSetting('chatIdTret', e.target.value)}
                placeholder="123456789"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                Chat ID Ho Lau
              </label>
              <input
                type="text"
                value={settings.chatIdLau}
                onChange={(e) => updateSetting('chatIdLau', e.target.value)}
                placeholder="987654321"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          {/* How to get Chat ID */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-[10px] font-bold text-blue-400 mb-2">Cach lay Chat ID:</div>
            <ol className="text-[9px] text-slate-400 space-y-1 list-decimal list-inside">
              <li>Mo Telegram, tim @BotFather</li>
              <li>Gui /newbot de tao bot moi</li>
              <li>Copy Bot Token nhu o tren</li>
              <li>Tim @userinfobot de lay Chat ID cua ban</li>
              <li>Hoac them bot vao group va gui /id de lay group ID</li>
            </ol>
          </div>

          {/* Auto Notify Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-800/50">
            <div>
              <div className="text-[10px] font-bold text-slate-300">Tu dong thong bao</div>
              <div className="text-[9px] text-slate-500">Gui Telegram khi luu hoa don moi</div>
            </div>
            <button
              onClick={() => updateSetting('autoNotify', !settings.autoNotify)}
              className={`relative w-10 h-5 rounded-full transition-colors ${settings.autoNotify ? 'bg-blue-500' : 'bg-slate-700'}`}
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
              disabled={isTesting || !settings.botToken}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[11px] font-bold text-slate-300 transition-all active:scale-[0.97]"
            >
              {isTesting ? 'Dang test...' : 'Test ket noi'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[11px] font-bold text-white transition-all active:scale-[0.97]"
            >
              {isSaving ? 'Dang luu...' : 'Luu cai dat'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Component for Telegram notification button
interface TelegramNotifyButtonProps {
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

export function TelegramNotifyButton({
  month,
  totalAmount,
  totalKwh,
  kwhTret,
  kwhLau,
  tretAmount,
  lauAmount,
  tretAvgPrice,
  lauAvgPrice,
  lossKwh,
  disabled,
}: TelegramNotifyButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          totalAmount,
          totalKwh,
          kwhTret,
          kwhLau,
          tretAmount,
          lauAmount,
          tretAvgPrice,
          lauAvgPrice,
          lossKwh,
        }),
      });

      const data = await response.json();

      setResult({
        success: data.success,
        message: data.success ? 'Da gui thong bao Telegram!' : `Gui that bai: ${data.error}`,
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
        <span className="text-sm mb-0.5">{isSending ? 'Dang gui...' : 'Send TG'}</span>
        <span className="text-[9px] font-bold">Telegram</span>
      </button>

      {result && (
        <div className={`text-[9px] font-semibold text-center p-1 rounded ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}