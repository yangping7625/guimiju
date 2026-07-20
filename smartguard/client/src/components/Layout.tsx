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

  return (
    <div className="app" data-scene={scene}>
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
