import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { fmtRp } from '../lib/utils';
import type { Booking } from '../types';
import { STORAGE_KEYS } from '../lib/api';

type Filter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED';

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; bookings: Booking[] }>('getBookings', {
        status: filter === 'ALL' ? 'ALL' : filter,
      });
      if (res.success && res.bookings) setBookings(res.bookings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const confirmBooking = async (b: Booking) => {
    if (!window.confirm(`Konfirmasi booking ${b.booking_id}?`)) return;
    const r = await apiPost<{ success: boolean; error?: string }>({
      action: 'confirmBooking',
      booking_id: b.booking_id,
      row_jadwal: b.row_jadwal,
      sheet_jadwal: b.sheet_jadwal,
      pax: b.pax,
      admin_name: 'Owner',
    });
    if (r.success) {
      setBookings((prev) => prev.map((x) => (x.booking_id === b.booking_id ? { ...x, status: 'CONFIRMED' } : x)));
    } else {
      alert(r.error || 'Gagal');
    }
  };

  const reject = async (b: Booking) => {
    if (!window.confirm(`Tolak booking ${b.booking_id}?`)) return;
    const r = await apiPost<{ success: boolean }>({
      action: 'rejectBooking',
      booking_id: b.booking_id,
      admin_name: 'Owner',
    });
    if (r.success) {
      setBookings((prev) => prev.map((x) => (x.booking_id === b.booking_id ? { ...x, status: 'REJECTED' } : x)));
    }
  };

  const bankName = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.BANK_NAME) || 'Bank' : 'Bank';
  const rekening = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.REKENING) || '' : '';
  const atasNama = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ATAS_NAMA) || '' : '';

  const filtered = filter === 'ALL' ? bookings : bookings.filter((b) => b.status === filter);

  const exportCsv = () => {
    const headers = ['booking_id', 'nama', 'whatsapp', 'nama_kelas', 'tanggal_sesi', 'waktu_sesi', 'pax', 'total_bayar', 'status'] as const;
    type Header = (typeof headers)[number];

    const getValue = (b: Booking, h: Header): string => {
      switch (h) {
        case 'booking_id': return b.booking_id || '';
        case 'nama': return b.nama || '';
        case 'whatsapp': return b.whatsapp || '';
        case 'nama_kelas': return b.nama_kelas || '';
        case 'tanggal_sesi': return b.tanggal_sesi || '';
        case 'waktu_sesi': return b.waktu_sesi || '';
        case 'pax': return String(b.pax ?? '');
        case 'total_bayar': return String(b.total_bayar ?? '');
        case 'status': return b.status || '';
      }
    };

    const esc = (s: string) => {
      const needsQuotes = s.includes(',') || s.includes('"') || s.includes('\n');
      const safe = s.replace(/"/g, '""');
      return needsQuotes ? `"${safe}"` : safe;
    };

    const rows = filtered.map((b) => headers.map((h) => esc(getValue(b, h))).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-3 pb-8">
      <div className="flex justify-end mb-2">
        <button
          onClick={exportCsv}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-white/10 text-gray-400"
        >
          📥 Export CSV
        </button>
      </div>
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {(['ALL', 'PENDING', 'CONFIRMED', 'REJECTED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border ${
              filter === f
                ? 'bg-green/10 border-green/25 text-green'
                : 'border-white/10 text-gray-500'
            }`}
          >
            {f === 'ALL' ? 'Semua' : f === 'PENDING' ? 'Pending' : f === 'CONFIRMED' ? 'Confirmed' : 'Rejected'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500 text-sm">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm">Tidak ada booking {filter !== 'ALL' ? filter : ''}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const isPending = b.status === 'PENDING';
            const waMsg = encodeURIComponent(
              `Halo ${b.nama}! 🎾\n\nBooking Tennisans kamu sudah DIKONFIRMASI!\n\nID: ${b.booking_id}\nKelas: ${b.nama_kelas}\nTanggal: ${b.tanggal_sesi}\nJumlah: ${b.pax} orang\nTotal: Rp ${(b.total_bayar || 0).toLocaleString('id')}\n\nSilakan transfer ke:\n🏦 ${bankName}\n💳 ${rekening}\n👤 a/n ${atasNama}\n\nKirim bukti transfer ya! 🙏`
            );
            const waLink = `https://wa.me/${(b.whatsapp || '').replace(/\D/g, '')}?text=${waMsg}`;

            return (
              <div key={b.booking_id} className="bg-surface border border-white/10 rounded-xl p-3">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-9 h-9 bg-surface2 rounded-lg flex items-center justify-center">🎾</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{b.nama || '—'}</div>
                    <div className="text-[11px] text-gray-500">📱 {b.whatsapp} {b.instagram ? `· @${b.instagram}` : ''}</div>
                    <div className="text-[9px] font-mono text-gray-600">{b.booking_id}</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.status === 'CONFIRMED'
                        ? 'bg-green/10 text-green border border-green/25'
                        : b.status === 'REJECTED'
                        ? 'bg-red/10 text-red border border-red/25'
                        : 'bg-gold/10 text-gold border border-gold/25'
                    }`}
                  >
                    {b.status === 'CONFIRMED' ? '✅ Confirmed' : b.status === 'REJECTED' ? '❌ Rejected' : '⏳ Pending'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-2 text-[11px]">
                  <div className="bg-surface2 rounded-lg px-2 py-1"><span className="text-gray-500">Kelas</span><div className="font-bold truncate">{b.nama_kelas}</div></div>
                  <div className="bg-surface2 rounded-lg px-2 py-1"><span className="text-gray-500">Tanggal</span><div className="font-bold">{b.tanggal_sesi}</div></div>
                  <div className="bg-surface2 rounded-lg px-2 py-1"><span className="text-gray-500">Total</span><div className="font-bold text-green">{fmtRp(b.total_bayar)}</div></div>
                </div>
                {isPending && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => confirmBooking(b)}
                      className="flex-1 h-9 bg-green text-bg rounded-lg text-xs font-bold"
                    >
                      ✅ Konfirmasi
                    </button>
                    <button
                      onClick={() => reject(b)}
                      className="flex-1 h-9 bg-red/10 text-red border border-red/25 rounded-lg text-xs font-bold"
                    >
                      ❌ Tolak
                    </button>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 h-9 bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 rounded-lg text-xs font-bold flex items-center justify-center"
                    >
                      💬
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
