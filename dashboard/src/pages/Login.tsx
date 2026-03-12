import { useState, FormEvent } from 'react';
import { STORAGE_KEYS } from '../lib/api';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const storedPin = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.PIN) || '2026' : '2026';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pin === storedPin) {
      onSuccess();
    } else {
      setError('PIN salah. Coba lagi.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6 safe-top safe-bottom">
      <div className="w-full max-w-[360px] bg-surface border border-white/10 rounded-3xl p-8">
        <div className="text-2xl font-black tracking-tight mb-1">
          🎾 TENNIS<span className="text-green">ANS</span>
        </div>
        <div className="text-sm text-gray-500 mb-7">Owner Dashboard v6 — Masukkan PIN</div>
        <form onSubmit={handleSubmit}>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-full h-12 bg-surface2 border border-white/10 rounded-xl text-lg px-4 outline-none focus:border-green/40 tracking-[0.2em] font-mono"
            autoFocus
          />
          <button
            type="submit"
            className="w-full h-14 mt-5 bg-green text-bg font-extrabold rounded-xl text-[15px] active:scale-[0.98]"
          >
            🔓 MASUK
          </button>
        </form>
        {error && <div className="text-xs text-red text-center mt-3 min-h-[18px]">{error}</div>}
      </div>
    </div>
  );
}
