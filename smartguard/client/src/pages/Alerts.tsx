import { useEffect, useState } from 'react';
import { useScene } from '../scene';
import { getAlerts, readAlert } from '../services/api';
import type { Alert } from '../types';

const LEVEL_ICON: Record<string, string> = { fault: '🔴', critical: '🔴', warning: '🟠', info: '🔵', offline: '⚪' };

export default function Alerts() {
  const { scene } = useScene();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => { getAlerts(scene).then(setAlerts); }, [scene]);

  const markRead = async (id: number) => {
    await readAlert(id);
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, is_read: 1 } : x)));
  };

  return (
    <div className="panel">
      <div className="panel-header">
        报警中心 <span style={{ fontSize: 12, color: 'var(--text4)' }}>{alerts.length} 条</span>
      </div>
      <div className="panel-body">
        {alerts.map((a) => (
          <div className={'alert-item' + (a.is_read ? '' : ' unread')} key={a.id}>
            <span className="alert-icon">{LEVEL_ICON[a.level] || '🟠'}</span>
            <div style={{ flex: 1 }}>
              <div className="alert-title">
                {a.title} <span className={`badge badge-${a.level}`} style={{ marginLeft: 8 }}>{a.level}</span>
              </div>
              <div className="alert-desc">{a.device_name}（{a.device_type}）· {a.description}</div>
              {a.diagnosis && <div className="alert-desc" style={{ color: 'var(--blue)' }}>🧠 {a.diagnosis}</div>}
            </div>
            <span className="alert-time">{a.created_at?.slice(5, 16)}</span>
            {!a.is_read && <button className="btn btn-sm" onClick={() => markRead(a.id)}>标记已读</button>}
          </div>
        ))}
        {alerts.length === 0 && <div className="empty">暂无报警</div>}
      </div>
    </div>
  );
}
