import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScene } from '../scene';
import { getStats, getDevices, getAlerts } from '../services/api';
import type { StatOverview, Device, Alert } from '../types';
import { socket } from '../services/socket';

const STATUS_LABEL: Record<string, string> = { normal: '正常', warning: '警告', fault: '故障', offline: '离线' };
const LEVEL_ICON: Record<string, string> = { fault: '🔴', critical: '🔴', warning: '🟠', info: '🔵', offline: '⚪' };

export default function Dashboard() {
  const { scene } = useScene();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatOverview | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    getStats(scene).then(setStats);
    getDevices().then((d) => setDevices(d.list.filter((x) => x.scene === scene)));
    getAlerts(scene).then((a) => setAlerts(a.slice(0, 6)));
  }, [scene]);

  // 实时报警：AI 诊断产生异常时后端通过 WebSocket 推送
  useEffect(() => {
    const onNew = (a: any) => setAlerts((prev) => [{ ...a, id: a.id || Date.now() }, ...prev].slice(0, 6));
    socket.on('alert:new', onNew);
    return () => { socket.off('alert:new', onNew); };
  }, []);

  const cards = [
    { label: '📡 设备总数', value: stats?.totalDevices ?? '-', sub: '当前场景接入' },
    { label: '🟢 运行率', value: (stats?.onlineRate ?? '-') + (stats ? '%' : ''), sub: '正常设备占比' },
    { label: '⚠️ 今日报警', value: stats?.todayAlerts ?? '-', sub: '需关注' },
    { label: '🔧 待处理工单', value: stats?.pendingOrders ?? '-', sub: 'pending' },
  ];

  return (
    <>
      <div className="stat-cards">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="label">{c.label}</div>
            <div className="value">{c.value}</div>
            <div className="sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            设备列表 <span style={{ fontSize: 12, color: 'var(--text4)' }}>{devices.length} 台</span>
          </div>
          <div className="panel-body">
            <table>
              <thead>
                <tr><th>名称</th><th>类型</th><th>位置</th><th>状态</th><th>操作</th></tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td style={{ color: 'var(--primary)' }}>{d.name}</td>
                    <td>{d.type}</td>
                    <td>{d.location}</td>
                    <td><span className={`badge badge-${d.status}`}>{STATUS_LABEL[d.status] || d.status}</span></td>
                    <td><span className="clickable" onClick={() => navigate(`/device/${d.id}`)}>查看 ›</span></td>
                  </tr>
                ))}
                {devices.length === 0 && <tr><td colSpan={5} className="empty">暂无设备</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">实时报警 <span className="status-dot" /></div>
          <div className="panel-body">
            {alerts.map((a) => (
              <div className={'alert-item' + (a.is_read ? '' : ' unread')} key={a.id}>
                <span className="alert-icon">{LEVEL_ICON[a.level] || '🟠'}</span>
                <div style={{ flex: 1 }}>
                  <div className="alert-title">{a.title}</div>
                  <div className="alert-desc">{(a.device_name || (a as any).device || '')} · {(a.description || '').slice(0, 36)}</div>
                </div>
                <span className="alert-time">{(a.created_at || (a as any).time || '').slice(5, 16)}</span>
              </div>
            ))}
            {alerts.length === 0 && <div className="empty">暂无报警</div>}
          </div>
        </div>
      </div>
    </>
  );
}
