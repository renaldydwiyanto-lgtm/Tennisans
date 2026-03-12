import { useState, useEffect } from 'react';
import { apiGet, apiPost, STORAGE_KEYS } from '../lib/api';

export default function Settings() {
  const [apiUrl, setApiUrl] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [bankName, setBankName] = useState('');
  const [rekening, setRekening] = useState('');
  const [atasNama, setAtasNama] = useState('');
  const [newPin, setNewPin] = useState('');
  const [config, setConfig] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setApiUrl(localStorage.getItem(STORAGE_KEYS.API_URL) || '');
    setBridgeUrl(localStorage.getItem(STORAGE_KEYS.BRIDGE_URL) || '');
    setBankName(localStorage.getItem(STORAGE_KEYS.BANK_NAME) || '');
    setRekening(localStorage.getItem(STORAGE_KEYS.REKENING) || '');
    setAtasNama(localStorage.getItem(STORAGE_KEYS.ATAS_NAMA) || '');
    (async () => {
      try {
        const res = await apiGet<{ config: Record<string, number> }>('getConfig');
        if (res.config) setConfig(res.config);
      } catch (_) {}
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    if (apiUrl.trim()) localStorage.setItem(STORAGE_KEYS.API_URL, apiUrl.trim());
    if (bridgeUrl.trim()) localStorage.setItem(STORAGE_KEYS.BRIDGE_URL, bridgeUrl.trim());
    if (bankName.trim()) localStorage.setItem(STORAGE_KEYS.BANK_NAME, bankName.trim());
    if (rekening.trim()) localStorage.setItem(STORAGE_KEYS.REKENING, rekening.trim());
    if (atasNama.trim()) localStorage.setItem(STORAGE_KEYS.ATAS_NAMA, atasNama.trim());
    if (newPin.trim().length >= 4) {
      localStorage.setItem(STORAGE_KEYS.PIN, newPin.trim());
      setNewPin('');
    }
    try {
      const r = await apiPost<{ success: boolean }>({
        action: 'saveConfig',
        config: { ...config },
      });
      if (r.success) setTestResult('✅ Konfigurasi tersimpan!');
    } catch (_) {
      setTestResult('✅ Tersimpan lokal (API tidak dijalankan)');
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTestResult('⏳ Testing...');
    const base = apiUrl.trim();
    if (!base || base.length < 30) {
      setTestResult('❌ Isi API URL dulu');
      return;
    }
    try {
      // Use the value currently typed by the user (not localStorage),
      // so connection test works even before saving.
      const url = `${base}?action=getMonths&_t=${Date.now()}`;
      const r = await fetch(url, { cache: 'no-store', redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      const res = JSON.parse(text) as { months?: string[]; error?: string };
      if (res.months && Array.isArray(res.months)) setTestResult('✅ Koneksi berhasil! Sheet: ' + (res.months.join(', ') || '—'));
      else setTestResult('❌ ' + (res.error || 'Response tidak terduga'));
    } catch (e: unknown) {
      setTestResult('❌ ' + (e instanceof Error ? e.message : 'Error'));
    }
  };

  const configKeys = [
    'fixed_lapang_bkpsdm',
    'fixed_lapang_denpom',
    'fixed_marketing',
    'fixed_raket',
    'fixed_air_mineral',
    'coach_fee_normal',
    'ballboy_fee',
    'foto_fee_openclass',
    'target_fill_rate',
    'target_revenue_month',
  ];
  const labels: Record<string, string> = {
    fixed_lapang_bkpsdm: 'Iuran Lapang BKPSDM',
    fixed_lapang_denpom: 'Sewa Lapang DENPOM',
    fixed_marketing: 'Marketing Sosial Media',
    fixed_raket: 'Sewa 5 Raket',
    fixed_air_mineral: 'Air Mineral',
    coach_fee_normal: 'Fee Coach (normal)',
    ballboy_fee: 'Fee Ballboy',
    foto_fee_openclass: 'Biaya Foto (Open Class)',
    target_fill_rate: 'Target Fill Rate (%)',
    target_revenue_month: 'Target Revenue/Bulan (Rp)',
  };

  return (
    <div className="p-3 pb-8">
      <div className="text-[15px] font-extrabold mb-3">⚙️ Konfigurasi Sistem</div>

      <div className="bg-surface border border-white/10 rounded-xl p-3 space-y-4">
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">🔗 System URLs</div>
          <div className="text-xs text-gray-400 mb-1">API URL (System SS)</div>
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://script.google.com/..."
            className="w-full h-10 bg-surface2 border border-white/10 rounded-xl text-sm px-3 outline-none focus:border-green/40 mb-2"
          />
          <div className="text-xs text-gray-400 mb-1">Bridge URL (Booking SS)</div>
          <input
            value={bridgeUrl}
            onChange={(e) => setBridgeUrl(e.target.value)}
            placeholder="https://script.google.com/..."
            className="w-full h-10 bg-surface2 border border-white/10 rounded-xl text-sm px-3 outline-none focus:border-green/40"
          />
        </div>

        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">🏦 Info Pembayaran</div>
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Nama Bank"
            className="w-full h-9 bg-surface2 border border-white/10 rounded-lg text-sm px-3 outline-none mb-2"
          />
          <input
            value={rekening}
            onChange={(e) => setRekening(e.target.value)}
            placeholder="No. Rekening"
            className="w-full h-9 bg-surface2 border border-white/10 rounded-lg text-sm px-3 outline-none mb-2"
          />
          <input
            value={atasNama}
            onChange={(e) => setAtasNama(e.target.value)}
            placeholder="Atas Nama"
            className="w-full h-9 bg-surface2 border border-white/10 rounded-lg text-sm px-3 outline-none"
          />
        </div>

        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">🔐 PIN (min 4 digit)</div>
          <input
            type="password"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="PIN baru (kosongkan jika tidak ganti)"
            maxLength={6}
            className="w-full h-9 bg-surface2 border border-white/10 rounded-lg text-sm px-3 outline-none"
          />
        </div>

        {configKeys.map((key) => (
          <div key={key} className="flex justify-between items-center py-1 border-b border-white/10">
            <span className="text-xs text-gray-400">{labels[key] || key}</span>
            <input
              type="number"
              value={config[key] ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, [key]: Number(e.target.value) || 0 }))}
              className="w-28 h-9 bg-surface2 border border-white/10 rounded-lg text-sm text-right px-2 outline-none"
            />
          </div>
        ))}

        <button
          onClick={save}
          disabled={saving}
          className="w-full h-12 bg-green text-bg font-extrabold rounded-xl"
        >
          💾 Simpan Konfigurasi
        </button>
      </div>

      <div className="mt-3 bg-surface border border-white/10 rounded-xl p-3">
        <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">🗄️ Database & Sheets</div>
        <button
          onClick={testConnection}
          className="w-full h-10 bg-green/10 border border-green/25 text-green rounded-lg text-sm font-bold mb-2"
        >
          🔌 Test Koneksi API
        </button>
        <div className="text-[11px] text-center min-h-[18px] text-gray-500 mb-2">{testResult}</div>
        <a
          href="https://docs.google.com/spreadsheets/d/1i-bXXzvlo7tjO8iOd_B-_fF81hL21NIj9EDi5gHUMpw/edit"
          target="_blank"
          rel="noreferrer"
          className="block w-full h-10 bg-surface2 border border-white/10 text-gray-400 rounded-lg text-xs font-semibold text-center leading-10 mb-2"
        >
          📊 Buka Booking Spreadsheet
        </a>
        <a
          href="https://docs.google.com/spreadsheets/d/12kOj7sM_aZr_HdyjrIcLF06nSeC73SRYw9vAYk5lDO0/edit"
          target="_blank"
          rel="noreferrer"
          className="block w-full h-10 bg-surface2 border border-white/10 text-gray-400 rounded-lg text-xs font-semibold text-center leading-10"
        >
          ⚙️ Buka System Spreadsheet
        </a>
      </div>

      <div className="text-center py-4 text-[10px] text-gray-600">
        Tennisans Owner Dashboard v6.0 — React + Tailwind
      </div>
    </div>
  );
}
