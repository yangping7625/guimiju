import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDevice, getDeviceHistory, getOrdersByDevice, diagnose, createOrder } from '../services/api';
import type { Device, MetricSeries, Order } from '../types';
import EChart from '../components/EChart';

const STATUS_LABEL: Record<string, string> = { normal: '正常', warning: '警告', fault: '故障', offline: '离线' };
const STATUS_COLOR: Record<string, string> = { fault: '#ff5555', warning: '#ffb86c', offline: '#495670' };

export default function DeviceDetail() {
  const { id } = useParams();
  const deviceId = Number(id);
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [series, setSeries] = useState<MetricSeries[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [diag, setDiag] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDevice(deviceId).then(setDevice).catch(() => {});
    getDeviceHistory(deviceId).then(setSeries);
    getOrdersByDevice(deviceId).then(setOrders).catch(() => {});
  }, [deviceId]);

  const color = device?.scene === 'auto' ? '#57c7ff' : device ? (STATUS_COLOR[device.status] || '#00e396') : '#00e396';

  const runDiag = async () => {
    setBusy(true);
    try { const r = await diagnose(deviceId); setDiag(r); } finally { setBusy(false); }
  };
  const makeOrder = async () => {
    if (!diag) return;
    await createOrder({ device_id: deviceId, title: `AI诊断工单：${device?.name || ''}`, description: diag.diagnosis });
    getOrdersByDevice(deviceId).then(setOrders);
  };

  return (
    <>
      <div className="back" onClick={() => navigate('/')}>‹ 返回监控大屏</div>

      <div className="panel">
        <div className="panel-header">
          {device ? device.name : '设备详情'}
          {device && <span className={`badge badge-${device.status}`}>{STATUS_LABEL[device.status]}</span>}
        </div>
        <div className="panel-body" style={{ padding: 20 }}>
          {device && (
            <div className="detail-grid">
              <div className="detail-item"><div className="k">类型</div><div className="val">{device.type}</div></div>
              <div className="detail-item"><div className="k">位置</div><div className="val">{device.location}</div></div>
              <div className="detail-item"><div className="k">状态</div><div className="val">{STATUS_LABEL[device.status]}</div></div>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">传感器时序（近 24h）</div>
        <div className="panel-body" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {series.map((m) => (
            <EChart key={m.metric} height={220} option={{
              title: { text: `${m.metric} (${m.unit})`, textStyle: { color: '#8892b0', fontSize: 13 } },
              grid: { left: 48, right: 16, top: 36, bottom: 28 },
              tooltip: { trigger: 'axis' },
              xAxis: { type: 'category', data: m.points.map((p) => p.t.slice(11, 16)), axisLabel: { color: '#495670', fontSize: 10 }, axisLine: { lineStyle: { color: '#1a2040' } } },
              yAxis: { type: 'value', scale: true, axisLabel: { color: '#495670', fontSize: 10 }, splitLine: { lineStyle: { color: '#1a2040' } } },
              series: [{ type: 'line', smooth: true, showSymbol: false, data: m.points.map((p) => p.v), lineStyle: { color }, itemStyle: { color }, areaStyle: { color, opacity: 0.08 } }],
            }} />
          ))}
          {series.length === 0 && <div className="empty">暂无传感器数据</div>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          🧠 AI 智能诊断
          <button className="btn btn-primary btn-sm" onClick={runDiag} disabled={busy}>{busy ? '分析中…' : '运行 AI 诊断'}</button>
        </div>
        <div className="panel-body" style={{ padding: 20 }}>
          {!diag && <div className="empty">点击「运行 AI 诊断」，自动读取设备最近传感器数据并给出异常判断与处置建议。</div>}
          {diag && (
            <>
              <div className="summary-grid">
                {diag.summary.map((s: any) => (
                  <div className="summary-item" key={s.metric}>
                    <div className="m">{s.metric}</div>
                    <div className="v">{s.latest}</div>
                    <div className={'tr ' + (s.trend === '上升' ? 'tr-up' : s.trend === '下降' ? 'tr-down' : 'tr-flat')}>{s.trend}（均 {s.avg}）</div>
                  </div>
                ))}
              </div>
              <div className="ai-box">
                <h3>🤖 诊断结果</h3>
                <div className="ai-result">{diag.diagnosis}</div>
                <div className="ai-result" style={{ marginTop: 10, color: 'var(--yellow)' }}>💡 {diag.suggestion}</div>
                <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={makeOrder}>生成维修工单</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">历史工单</div>
        <div className="panel-body">
          <table>
            <thead><tr><th>ID</th><th>标题</th><th>指派人</th><th>状态</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}><td>#{o.id}</td><td>{o.title}</td><td>{o.assignee || '-'}</td><td><span className={`badge badge-${o.status}`}>{o.status}</span></td></tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={4} className="empty">暂无工单</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
