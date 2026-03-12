/**
 * System API client (Google Apps Script Web App).
 * Base URL is read from localStorage tns_system_url.
 */

const STORAGE_KEYS = {
  API_URL: 'tns_system_url',
  BRIDGE_URL: 'tns_bridge_url',
  PIN: 'tns_pin',
  BANK_NAME: 'tns_bank_name',
  REKENING: 'tns_rekening',
  ATAS_NAMA: 'tns_atas_nama',
};

function getApiUrl(): string {
  return typeof window !== 'undefined'
    ? localStorage.getItem(STORAGE_KEYS.API_URL) || ''
    : '';
}

export async function apiGet<T = unknown>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  const base = getApiUrl();
  if (!base || base.length < 30) {
    return mockGet(action) as T;
  }
  const q = new URLSearchParams({ action, _t: String(Date.now()), ...params });
  const res = await fetch(`${base}?${q}`, { cache: 'no-store', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response');
  }
}

export async function apiPost<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const base = getApiUrl();
  if (!base || base.length < 30) {
    return { success: false, error: 'API URL belum diisi' } as T;
  }
  const res = await fetch(`${base}?_t=${Date.now()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    cache: 'no-store',
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response');
  }
}

function mockGet(action: string): unknown {
  if (action === 'getMonths') return { months: [getCurrentMonthName()] };
  if (action === 'getDashboard') {
    return {
      success: true,
      kpi: {
        revenue: 18500000,
        profit: 9200000,
        margin: 49,
        fill_rate: 72,
        total_sessions: 24,
        pending_count: 0,
        revenue_prev: 16000000,
      },
      bookings: [],
      schedule: [],
      financial_monthly: [],
      customers: [],
      config: {},
    };
  }
  return {};
}

function getCurrentMonthName(): string {
  const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  const now = new Date();
  return months[now.getMonth()] + ' ' + now.getFullYear();
}

export { STORAGE_KEYS, getApiUrl };
