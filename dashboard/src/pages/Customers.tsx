import { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import type { Customer } from '../types';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiGet<{ success: boolean; customers: Customer[] }>('getCustomers');
        if (res.success && res.customers) setCustomers(res.customers);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = search.trim()
    ? customers.filter(
        (c) =>
          (c.nama || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.whatsapp || '').includes(search)
      )
    : customers;

  return (
    <div className="p-3 pb-8">
      <div className="text-[15px] font-extrabold mb-2">
        👥 Database Customer
        <span className="text-gray-500 font-normal text-sm ml-1">({customers.length} customer)</span>
      </div>
      <input
        type="text"
        placeholder="🔍 Cari nama / nomor WA..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-10 bg-surface2 border border-white/10 rounded-xl text-sm px-3 outline-none focus:border-green/40 mb-3"
      />

      {loading ? (
        <div className="py-10 text-center text-gray-500 text-sm">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm">
          {search ? 'Tidak ada hasil' : 'Belum ada customer'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const initials = (c.nama || '?').slice(0, 2).toUpperCase();
            const waNum = (c.whatsapp || '').replace(/\D/g, '');
            return (
              <div
                key={c.whatsapp}
                className="bg-surface border border-white/10 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-green/10 border-2 border-green/25 flex items-center justify-center font-bold text-sm text-green flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{c.nama || '—'}</div>
                  <div className="text-[11px] text-gray-500">📱 {c.whatsapp} {c.instagram ? `· @${c.instagram}` : ''}</div>
                  <div className="text-[11px] text-gray-500">🎾 {c.kelas_terakhir || '—'} · {c.total_booking ?? 0}x booking</div>
                  <div className="text-[10px] text-gray-600">Terakhir: {c.terakhir_booking || '—'}</div>
                </div>
                <a
                  href={`https://wa.me/${waNum}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 bg-[#25D366] rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                >
                  💬
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
