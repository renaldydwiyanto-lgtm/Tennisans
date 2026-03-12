import { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import { fmtRp, getCurrentMonthName } from '../lib/utils';
import type { ScheduleItem } from '../types';

export default function Schedule() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState(getCurrentMonthName());
  const [summary, setSummary] = useState<{ total_sessions?: number; avg_fill_rate?: number; revenue_actual?: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await apiGet<{ months: string[] }>('getMonths');
      if (res.months?.length) setMonths(res.months);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiGet<{ success: boolean; schedule: ScheduleItem[]; summary?: unknown }>('getSchedule', { month });
        if (res.success) {
          setSchedule(res.schedule || []);
          setSummary((res.summary as typeof summary) || {});
        } else {
          setSchedule([]);
        }
      } catch (e) {
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [month]);

  return (
    <div className="p-3 pb-8">
      <div className="flex gap-2 mb-3">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="flex-1 h-10 bg-surface border border-white/10 rounded-xl text-sm font-bold px-3 outline-none text-white"
        >
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 bg-surface border border-white/10 rounded-xl p-3 text-sm">
        <div>
          <div className="text-[9px] text-gray-500 font-bold uppercase">Sessions</div>
          <div className="font-bold text-blue">{summary.total_sessions ?? '—'}</div>
        </div>
        <div>
          <div className="text-[9px] text-gray-500 font-bold uppercase">Avg Fill</div>
          <div className="font-bold text-green">{(summary.avg_fill_rate ?? '—') + (summary.avg_fill_rate != null ? '%' : '')}</div>
        </div>
        <div>
          <div className="text-[9px] text-gray-500 font-bold uppercase">Est. Revenue</div>
          <div className="font-bold text-gold">{fmtRp(summary.revenue_actual ?? 0)}</div>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500 text-sm">Memuat jadwal...</div>
      ) : schedule.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm">
          Sheet <strong>{month}</strong> belum ada atau kosong. Gunakan Gen Bulan di dashboard legacy atau System GAS.
        </div>
      ) : (
        <div className="space-y-2">
          {schedule.map((s) => (
            <div key={`${s.sheet_name}-${s.row}`} className="bg-surface border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="bg-surface2 rounded-lg px-2 py-1.5 text-center min-w-[50px]">
                  <div className="text-[9px] font-bold text-gray-500 uppercase">{(s.hari || '').slice(0, 3)}</div>
                  <div className="text-lg font-black leading-none">{(s.tanggal || '').split('-')[0]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{s.nama_kelas}</div>
                  <div className="text-[11px] text-gray-500">⏰ {s.waktu} · 📍 {s.lokasi} · 👨‍🏫 {s.coach}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green">{fmtRp(s.harga)}</div>
                  <div className="h-1 w-14 bg-surface2 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full rounded-full bg-green"
                      style={{ width: `${Math.min(100, s.fill_rate || 0)}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-gray-500">{s.terisi}/{s.max_pax} pax</div>
                </div>
              </div>
              {s.reclub_link && (
                <a
                  href={s.reclub_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-pink-400 font-bold mt-1 inline-block"
                >
                  🎾 Reclub ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
