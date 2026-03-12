import { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import { fmtRp, getCurrentMonthName } from '../lib/utils';
import type { FinancialMonth } from '../types';

export default function Finance() {
  const [financial, setFinancial] = useState<FinancialMonth[]>([]);
  const [config, setConfig] = useState<Record<string, number>>({});
  const [month] = useState(getCurrentMonthName());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiGet<{ monthly?: FinancialMonth[]; config?: Record<string, number> }>('getFinancial');
        if (res.monthly) setFinancial(res.monthly);
        if (res.config) setConfig(res.config as Record<string, number>);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = financial.find((m) => m.month === month) ?? null;
  const target = config.target_revenue_month || 25_000_000;
  const targetPct = target > 0 && current?.revenue ? Math.round((current.revenue / target) * 100) : 0;
  const fixedBreakdown = [
    { label: 'Lapang BKPSDM', value: config.fixed_lapang_bkpsdm || 0 },
    { label: 'Sewa DENPOM III', value: config.fixed_lapang_denpom || 0 },
    { label: 'Marketing Sosmed', value: config.fixed_marketing || 0 },
    { label: 'Sewa 5 Raket', value: config.fixed_raket || 0 },
    { label: 'Air Mineral', value: config.fixed_air_mineral || 0 },
  ];

  return (
    <div className="p-3 pb-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[15px] font-extrabold">💰 Laporan Keuangan · {month}</span>
        <button
          onClick={() => window.location.reload()}
          className="text-[11px] font-bold border border-white/10 bg-surface2 px-3 py-1.5 rounded-lg"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500 text-sm">Memuat...</div>
      ) : !current ? (
        <div className="py-10 text-center text-gray-500 text-sm">
          Belum ada data keuangan untuk <strong>{month}</strong>.<br />
          Pastikan sheet bulan ini ada dan kolom TERISI sudah terisi.
        </div>
      ) : (
        <>
          <div className="bg-surface border border-white/10 rounded-xl overflow-hidden mb-3">
            <div className="px-3 py-2 border-b border-white/10 text-[10px] font-bold text-gray-500 uppercase">
              📋 Profit & Loss Statement
            </div>
            <div className="p-3 space-y-1">
              <div className="text-[10px] font-bold text-gray-500 uppercase py-2">💵 Pendapatan</div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-sm text-gray-300">Gross Revenue</span>
                <span className="font-bold text-green">{fmtRp(current.revenue)}</span>
              </div>
              <div className="flex justify-between items-center py-1 text-xs text-gray-500">
                <span>Target: {fmtRp(target)} ({targetPct}%)</span>
              </div>

              <div className="text-[10px] font-bold text-gray-500 uppercase pt-3 pb-1">💸 Biaya Variabel</div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-sm text-gray-300">Coach + Ballboy + Foto</span>
                <span className="font-bold text-red">-{fmtRp(current.variable_cost)}</span>
              </div>

              <div className="text-[10px] font-bold text-gray-500 uppercase pt-3 pb-1">🏟️ Fixed Cost</div>
              {fixedBreakdown.map((f) => (
                <div key={f.label} className="flex justify-between py-1.5 pl-3 text-sm text-gray-400">
                  <span>{f.label}</span>
                  <span className="text-red">-{fmtRp(f.value)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-t border-white/10 font-bold">
                <span>Total Fixed Cost</span>
                <span className="text-red">-{fmtRp(current.fixed_cost)}</span>
              </div>

              <div className="flex justify-between py-3 border-t-2 border-white/10 mt-2">
                <span className="font-extrabold text-base">NET PROFIT</span>
                <span className={`text-lg font-bold ${(current.profit ?? 0) >= 0 ? 'text-green' : 'text-red'}`}>
                  {fmtRp(current.profit)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Profit Margin</span>
                <span className="font-bold">{(current.margin ?? 0)}%</span>
              </div>
            </div>
          </div>

          {current.by_class && Object.keys(current.by_class).length > 0 && (
            <div className="bg-surface border border-white/10 rounded-xl p-3">
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">🎯 Margin per Kelas</div>
              <div className="space-y-2">
                {Object.entries(current.by_class).map(([kelas, c]) => {
                  const margin = (c.revenue ?? 0) > 0 ? Math.round(((c.revenue - (c.cost ?? 0)) / c.revenue) * 100) : 0;
                  return (
                    <div key={kelas} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{kelas}</div>
                        <div className="text-[10px] text-gray-500">Rev: {fmtRp(c.revenue)} · {c.sessions} sesi · {c.pax} pax</div>
                      </div>
                      <div className="text-right ml-2">
                        <div className={`font-bold ${margin >= 50 ? 'text-green' : margin >= 30 ? 'text-gold' : 'text-red'}`}>
                          {margin}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
