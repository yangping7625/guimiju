import axios from 'axios';
import type { Scene, Device, Alert, Order, StatOverview, MetricSeries } from '../types';

const api = axios.create({ baseURL: '' });

const unwrap = <T,>(p: Promise<{ data: { code: number; data: T } }>): Promise<T> =>
  p.then((r) => r.data.data);

export const getStats = (scene: Scene) =>
  unwrap<StatOverview>(api.get(`/api/stats/overview?scene=${scene}`));
export const getDevices = () => unwrap<{ list: Device[]; total: number }>(api.get('/api/devices'));
export const getDevice = (id: number) => unwrap<Device>(api.get(`/api/devices/${id}`));

export const getAlerts = (scene: Scene) => unwrap<Alert[]>(api.get(`/api/alerts?scene=${scene}`));
export const readAlert = (id: number) => api.post(`/api/alerts/${id}/read`);
export const getOrders = (scene: Scene) => unwrap<Order[]>(api.get(`/api/orders?scene=${scene}`));
export const getOrdersByDevice = (device_id: number) =>
  unwrap<Order[]>(api.get(`/api/orders?device_id=${device_id}`));
export const createOrder = (d: Partial<Order>) => api.post('/api/orders', d);
export const updateOrder = (id: number, d: Partial<Order>) => api.put(`/api/orders/${id}`, d);

export const getDeviceHistory = (id: number) => unwrap<MetricSeries[]>(api.get(`/api/stats/device/${id}`));

export const diagnose = (device_id: number) =>
  unwrap<{
    device: string;
    status: string;
    level: string;
    summary: { metric: string; latest: number; avg: number; trend: string }[];
    diagnosis: string;
    suggestion: string;
  }>(api.post('/api/ai/diagnose', { device_id }));
