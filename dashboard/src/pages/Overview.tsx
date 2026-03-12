import { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import { fmtRp, fmtRpK, getCurrentMonthName } from '../lib/utils';
import type { DashboardData } from '../types';
import { Link } from 'react-router-dom';

export default function Overview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [month, setMonth] = useState(getCurrentMonthName());
  const [months, setMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const monthsRes = await apiGet<{ months: string[] }>('getMonths');
      if (monthsRes.months?.length) {
        setMonths(monthsRes.months);
      }
      const d = await apiGet<DashboardData>('getDashboard', { month });
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [month]);

  // Optional: auto-refresh every 90s to catch new bookings
  useEffect(() => {
    const t = setInterval(() => load(), 90000);
    return () => clearInterval(t);
  }, [month]);

  const kpi = data?.kpi;
  const pending = data?.bookings?.filter((b) => b.status === 'PENDING') || [];
  const target = (data?.config?.target_revenue_month as number) || 25_000_000;
  const revPct = target > 0 && kpi?.revenue ? Math.min(100, Math.round((kpi.revenue / target) * 100)) : 0;

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px] text-gray-500">
        <span className="animate-pulse">Memuat...</span>
      </div>
    );
  }

  return (
    <div className="p-3 pb-8">
      <div className="flex items-center gap-2 mb-3 bg-surface border border-white/10 rounded-xl px-3 py-2.5">
        <span className="text-xs font-bold text-gray-500">📅 Bulan:</span>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="flex-1 bg-transparent border-none text-sm font-bold outline-none text-white"
        >
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          onClick={() => load()}
          className="text-[11px] font-bold text-green border border-green/25 bg-green/10 px-3 py-1.5 rounded-lg"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-surface border border-white/10 rounded-2xl p-3.5 border-t-2 border-t-green">
          <div className="text-[9px] text-gray-500 font-bold uppercase">Revenue</div>
          <div className="text-xl font-black text-green">{fmtRp(kpi?.revenue ?? 0)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {revPct}% dari target {fmtRpK(target)}
          </div>
          <div className="h-1 bg-surface2 rounded mt-1 overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{
                width: `${revPct}%`,
                background: revPct >= 100 ? '#3EE07F' : revPct >= 70 ? '#FFB84D' : '#FF5757',
              }}
            />
          </div>
        </div>
        <div className="bg-surface border border-white/10 rounded-2xl p-3.5 border-t-2 border-t-gold">
          <div className="text-[9px] text-gray-500 font-bold uppercase">Net Profit</div>
          <div className="text-xl font-black text-gold">{fmtRp(kpi?.profit ?? 0)}</div>
          <div className="text-[10px] font-bold mt-0.5">
            Margin: {kpi?.margin ?? 0}%
          </div>
        </div>
        <div className="bg-surface border border-white/10 rounded-2xl p-3.5 border-t-2 border-t-blue">
          <div className="text-[9px] text-gray-500 font-bold uppercase">Fill Rate</div>
          <div className="text-xl font-black text-blue">{kpi?.fill_rate ?? 0}%</div>
          <div className="text-[10px] text-gray-500">{kpi?.total_sessions ?? 0} sesi</div>
        </div>
        <div className="bg-surface border border-white/10 rounded-2xl p-3.5 border-t-2 border-t-red">
          <div className="text-[9px] text-gray-500 font-bold uppercase">Pending</div>
          <div className="text-xl font-black text-red">{kpi?.pending_count ?? 0}</div>
          <div className="text-[10px] text-gray-500">booking perlu aksi</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-[15px] font-extrabold">⏳ Pending Bookings</span>
        <Link to="/bookings" className="text-xs text-blue">Lihat semua →</Link>
      </div>
      <div className="space-y-2">
        {pending.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">✅ Tidak ada pending booking</div>
        ) : (
          pending.slice(0, 3).map((b) => (
            <div
              key={b.booking_id}
              className="bg-surface border border-white/10 rounded-xl p-3"
            >
              <div className="flex items-start gap-2">
                <div className="w-9 h-9 bg-surface2 rounded-lg flex items-center justify-center text-base">🎾</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{b.nama || '—'}</div>
                  <div className="text-[11px] text-gray-500">📱 {b.whatsapp} {b.instagram ? `· @${b.instagram}` : ''}</div>
                  <div className="text-[9px] font-mono text-gray-600">{b.booking_id}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/25">
                  Pending
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-2 text-[11px]">
                <div className="bg-surface2 rounded-lg px-2 py-1">{b.nama_kelas || '—'}</div>
                <div className="bg-surface2 rounded-lg px-2 py-1">{b.tanggal_sesi}</div>
                <div className="bg-surface2 rounded-lg px-2 py-1 text-green font-bold">{fmtRp(b.total_bayar)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
