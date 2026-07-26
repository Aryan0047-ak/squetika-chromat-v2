import { get } from './client';

export interface DashboardData {
  total_instruments: number;
  active_sequences: number;
  pending_reviews: number;
  oos_count: number;
  system_uptime: string;
  today_injections: number;
  total_records: number;
  instruments: { name: string; status: string; method: string; progress: number }[];
  recent_activity: { action: string; user: string; target: string; time: string }[];
  recent_alerts: { id: number; action: string; detail: string }[];
}

export async function fetchDashboard(): Promise<DashboardData> {
  return get<DashboardData>('/dashboard');
}
