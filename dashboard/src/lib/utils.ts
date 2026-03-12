export function fmtRp(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n < 0 ? '-Rp ' : 'Rp ') + (abs / 1e6).toFixed(1) + 'Jt';
  return (n < 0 ? '-Rp ' : 'Rp ') + abs.toLocaleString('id-ID');
}

export function fmtRpK(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n < 0 ? '-' : '') + (abs / 1e6).toFixed(1) + 'Jt';
  return (n < 0 ? '-' : '') + (abs / 1e3).toFixed(0) + 'K';
}

export function getCurrentMonthName(): string {
  const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  const now = new Date();
  return months[now.getMonth()] + ' ' + now.getFullYear();
}

export const MONTH_NAMES = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
