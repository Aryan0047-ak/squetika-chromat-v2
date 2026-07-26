import { useState, useEffect } from 'react';
import type { UserInfo } from '../App';
import Dashboard from '../pages/Dashboard';
import Audit from '../pages/Audit';
import ESignature from '../pages/ESignature';
import Sequences from '../pages/Sequences';
import Chromatograms from '../pages/Chromatograms';

interface Props {
  user: UserInfo;
  page: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'chromatograms', label: 'Chromatograms', icon: 'wave-sine' },
  { id: 'sequences', label: 'Sequences', icon: 'list-numbers' },
  { id: 'audit', label: 'Audit Trail', icon: 'clipboard-list' },
  { id: 'esignature', label: 'E-Signatures', icon: 'signature' },
];

const pages: Record<string, React.ReactNode> = {
  dashboard: <Dashboard />,
  chromatograms: <Chromatograms />,
  sequences: <Sequences />,
  audit: <Audit />,
  esignature: <ESignature />,
};

export default function Layout({ user, page, onPageChange, onLogout }: Props) {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const update = () => setUtcTime(new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    update();
    const ci = setInterval(update, 1000);
    return () => clearInterval(ci);
  }, []);

  return (
    <div className="shell">
      <nav className="topnav">
        <div className="brand">
          <div className="brand-icon"><i className="ti ti-flask" /></div>
          <div className="brand-text">
            <span className="name">Squetika Chromat</span>
            <span className="sub">Demo · v2.0</span>
          </div>
        </div>
        <div className="nav-tabs">
          {navItems.map(item => (
            <button key={item.id} className={`ntab ${page === item.id ? 'act' : ''}`} onClick={() => onPageChange(item.id)}>
              <i className={`ti ti-${item.icon}`} /><span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="right">
          <span className="stat-pill"><i className="ti ti-clock" style={{ fontSize: 13 }} />{utcTime}</span>
          <span className="stat-pill"><i className="ti ti-shield-check" style={{ color: 'var(--success)' }} />Demo Mode</span>
          <div className="user-chip" onClick={onLogout} title="Click to logout">
            <div className="avatar">{user.full_name.split(' ').map(s => s[0]).join('')}</div>
            <div className="user-info">
              <span className="name">{user.full_name}</span>
              <span className="role">{user.role} · Click to logout</span>
            </div>
          </div>
        </div>
      </nav>
      <div className="main">
        <aside className="sidebar">
          {[{
            title: 'Navigation', items: navItems,
          }, {
            title: 'User', items: [
              { id: 'logout', label: 'Sign Out', icon: 'logout' },
            ],
          }].map(group => (
            <div className="sgroup" key={group.title}>
              <div className="sg-title">{group.title}</div>
              {group.items.map(item => (
                <button key={item.id} className={`si ${page === item.id ? 'act' : ''}`}
                  onClick={() => item.id === 'logout' ? onLogout() : onPageChange(item.id)}>
                  <i className={`ti ti-${item.icon}`} />
                  <span className="si-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>
        <div className="content">{pages[page] || <Dashboard />}</div>
      </div>
    </div>
  );
}
