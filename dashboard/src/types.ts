export interface Booking {
  booking_id: string;
  nama_kelas: string;
  tanggal_sesi: string;
  waktu_sesi: string;
  nama: string;
  whatsapp: string;
  pax: number;
  total_bayar: number;
  status: string;
  row_jadwal?: number;
  sheet_jadwal?: string;
  instagram?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  submitted_at?: string;
}

export interface ScheduleItem {
  row: number;
  tanggal: string;
  hari: string;
  waktu: string;
  nama_kelas: string;
  max_pax: number;
  terisi: number;
  sisa: number;
  status: string;
  harga: number;
  coach: string;
  lokasi: string;
  reclub_link?: string;
  fill_rate: number;
  sheet_name: string;
}

export interface FinancialMonth {
  month: string;
  revenue: number;
  variable_cost: number;
  fixed_cost: number;
  total_cost: number;
  profit: number;
  margin: number;
  fill_rate: number;
  total_pax: number;
  total_capacity: number;
  total_sessions: number;
  by_class: Record<string, { sessions: number; revenue: number; cost: number; pax: number; capacity: number; margin?: number; profit?: number }>;
}

export interface Customer {
  whatsapp: string;
  nama: string;
  instagram?: string;
  kelas_terakhir?: string;
  total_booking?: number;
  pertama_booking?: string;
  terakhir_booking?: string;
}

export interface DashboardData {
  success: boolean;
  kpi?: {
    revenue: number;
    profit: number;
    margin: number;
    fill_rate: number;
    total_sessions: number;
    pending_count: number;
    revenue_prev?: number;
    total_pax?: number;
  };
  bookings: Booking[];
  schedule: ScheduleItem[];
  financial_monthly: FinancialMonth[];
  customers: Customer[];
  config: Record<string, number | string>;
}
