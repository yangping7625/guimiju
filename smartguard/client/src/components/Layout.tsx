import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useScene } from '../scene';
import { THEME, type SceneKey } from '../theme';

const NAV = [
  { to: '/', icon: '📊', label: '监控大屏', end: true },
  { to: '/alerts', icon: '⚠️', label: '报警中心' },
  { to: '/orders', icon: '📋', label: '工单管理' },
];

export default function Layout() {
  const { scene, setScene } = useScene();
  const [backendDown, setBackendDown] = useState(false);

  useEffect(() => {
    const onDown = () => setBackendDown(true);
    window.addEventListener('sg:backend-down', onDown);
    return () => window.removeEventListener('sg:backend-down', onDown);
  }, []);

  return (
    <div className="app" data-scene={scene}>
      {backendDown && (
        <div
          style={{
            gridColumn: '1 / -1',
            background: '#3a2a00',
            color: '#ffd479',
            padding: '8px 14px',
            fontSize: 13,
            borderBottom: '1px solid #5a4400',
          }}
        >
          ⚠️ 演示后端未连接：本地运行 <code>npm start</code>（localhost:3001），或将后端部署到 Render 后前端即可加载实时数据。
        </div>
      )}
      <aside className="sidebar">
        <div className="logo">🛡️ 智维通 <span style={{ fontSize: 12, color: 'var(--text4)' }}>SmartGuard</span></div>
        <div className="nav-section">导航</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="icon">{n.icon}</span>{n.label}
          </NavLink>
        ))}
      </aside>

      <div className="main">
        <div className="scene-tabs">
          {(['newenergy', 'auto'] as SceneKey[]).map((s) => (
            <div
              key={s}
              className={'scene-tab' + (scene === s ? ' active' : '')}
              onClick={() => setScene(s)}
            >
              <span className="dot" style={{ background: THEME[s].primary }} />
              {THEME[s].icon} {THEME[s].label}
            </div>
          ))}
        </div>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
