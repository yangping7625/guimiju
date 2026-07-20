export type Scene = 'newenergy' | 'auto';

export interface Device {
  id: number;
  name: string;
  type: string;
  location: string;
  status: string;
  scene: string;
}

export interface Alert {
  id: number;
  device_id: number;
  level: string;
  title: string;
  description: string;
  diagnosis: string;
  is_read: number;
  device_name: string;
  device_type: string;
  created_at: string;
}

export interface Order {
  id: number;
  device_id: number;
  alert_id: number | null;
  title: string;
  description: string;
  status: string;
  assignee: string | null;
  device_name: string;
  created_at: string;
}

export interface StatOverview {
  totalDevices: number;
  onlineRate: number;
  todayAlerts: number;
  pendingOrders: number;
  byStatus: Record<string, number>;
}

export interface SeriesPoint {
  t: string;
  v: number;
}
export interface MetricSeries {
  metric: string;
  unit: string;
  points: SeriesPoint[];
}
