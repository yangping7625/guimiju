import { useEffect, useState } from 'react';
import { useScene } from '../scene';
import { getOrders, getDevices, updateOrder, createOrder } from '../services/api';
import type { Order, Device } from '../types';

const STATUS_LABEL: Record<string, string> = { pending: '待处理', processing: '处理中', done: '已完成' };

export default function Orders() {
  const { scene } = useScene();
  const [orders, setOrders] = useState<Order[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState({ device_id: '', title: '', description: '' });

  useEffect(() => {
    getOrders(scene).then(setOrders);
    getDevices().then((d) => setDevices(d.list.filter((x) => x.scene === scene)));
  }, [scene]);

  const changeStatus = async (id: number, status: string) => {
    await updateOrder(id, { status });
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  const submit = async () => {
    if (!form.device_id || !form.title) return;
    await createOrder({ device_id: Number(form.device_id), title: form.title, description: form.description });
    setForm({ device_id: '', title: '', description: '' });
    getOrders(scene).then(setOrders);
  };

  return (
    <>
      <div className="panel">
        <div className="panel-header">新建工单</div>
        <div className="panel-body" style={{ padding: 20 }}>
          <div className="form-row">
            <div>
              <label>设备</label>
              <select value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })}>
                <option value="">请选择</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>标题</label>
              <input style={{ width: '100%' }} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="工单标题" />
            </div>
            <button className="btn btn-primary" onClick={submit}>创建工单</button>
          </div>
          <div>
            <label>描述</label>
            <textarea style={{ width: '100%' }} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="处置描述（可选）" />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          工单列表 <span style={{ fontSize: 12, color: 'var(--text4)' }}>{orders.length} 条</span>
        </div>
        <div className="panel-body">
          <table>
            <thead><tr><th>ID</th><th>设备</th><th>标题</th><th>指派人</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.device_name}</td>
                  <td>{o.title}</td>
                  <td>{o.assignee || '-'}</td>
                  <td><span className={`badge badge-${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                  <td>
                    <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} style={{ minWidth: 120, padding: '4px 8px', fontSize: 12 }}>
                      <option value="pending">待处理</option>
                      <option value="processing">处理中</option>
                      <option value="done">已完成</option>
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6} className="empty">暂无工单</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
