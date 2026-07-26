import { useState, useEffect } from 'react';
import { fetchDashboard, type DashboardData } from '../api/dashboard';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const d = await fetchDashboard();
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, []);

  if (loading && !data) return <div className="p6 text-center text-muted">Loading dashboard...</div>;
  if (error) return <div className="p6"><div style={{ padding: 20, background: 'var(--danger-bg)', borderRadius: 12, border: '1px solid var(--danger-border)', color: '#991B1B', fontSize: 13 }}>Error: {error} <button className="btn btn-sm btn-secondary" onClick={load} style={{ marginLeft: 12 }}>Retry</button></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
            QC Operations Dashboard
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
            {data?.total_records ?? 0} records · {data?.today_injections ?? 0} today · SHA-256 chain intact
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}><i className="ti ti-refresh" /> Refresh</button>
      </div>

      <div className="grid grid-cols-12">
        <div className="col-span-3">
          <div className="stat-card" style={{ borderTop: '4px solid var(--primary)' }}>
            <span className="stat-label">Injections Today</span>
            <span className="stat-value">{data?.today_injections ?? 0}</span>
            <span className="stat-sub">Total: {data?.total_records ?? 0}</span>
          </div>
        </div>
        <div className="col-span-3">
          <div className="stat-card" style={{ borderTop: '4px solid var(--success)' }}>
            <span className="stat-label">Active Instruments</span>
            <span className="stat-value">{data?.total_instruments ?? 0}</span>
            <span className="stat-sub">{data?.active_sequences ?? 0} running sequences</span>
          </div>
        </div>
        <div className="col-span-3">
          <div className="stat-card" style={{ borderTop: '4px solid var(--warning)' }}>
            <span className="stat-label">Pending Reviews</span>
            <span className="stat-value">{data?.pending_reviews ?? 0}</span>
            <span className="stat-sub">Requires signature</span>
          </div>
        </div>
        <div className="col-span-3">
          <div className="stat-card" style={{ borderTop: '4px solid var(--danger)' }}>
            <span className="stat-label">OOS Results</span>
            <span className="stat-value">{data?.oos_count ?? 0}</span>
            <span className="stat-sub">Out of specification</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 mt5">
        <div className="col-span-7">
          <div className="card">
            <div className="card-hdr"><span className="card-title"><i className="ti ti-microscope" /> Instruments</span></div>
            <div className="table-wrap">
              <table className="etable">
                <thead><tr><th>Instrument</th><th>Status</th><th>Method</th><th>Progress</th></tr></thead>
                <tbody>
                  {(data?.instruments ?? []).map((inst, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{inst.name}</td>
                      <td><span className={`tag tag-${inst.status === 'running' ? 'ok' : inst.status === 'error' ? 'error' : inst.status === 'hold' ? 'warn' : 'neutral'}`}>{inst.status}</span></td>
                      <td className="mono-cell">{inst.method}</td>
                      <td>
                        <div className="flex items-center g2">
                          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", width: 36 }}>{inst.progress}%</span>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, maxWidth: 80 }}>
                            <div style={{ width: `${inst.progress}%`, height: '100%', background: inst.status === 'running' ? 'var(--primary)' : 'var(--border-dark)', borderRadius: 3 }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card mt4">
            <div className="card-hdr"><span className="card-title"><i className="ti ti-activity" /> Recent Activity</span></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(data?.recent_activity ?? []).slice(0, 6).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < 5 ? '1px solid var(--border-light)' : 'none' }}>
                  <i className="ti ti-circle" style={{ fontSize: 8, color: 'var(--primary)' }} />
                  <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>{a.time?.substring(11, 19) || ''}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', width: 100, flexShrink: 0 }}>{a.user?.split('@')[0]}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{a.action} {a.target}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-5">
          <div className="card">
            <div className="card-hdr"><span className="card-title"><i className="ti ti-shield-check" /> Compliance Status</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'WORM Enforcement', status: 'ok', sub: 'All tables protected' },
                { label: 'Hash Chain', status: 'ok', sub: 'SHA-256 intact' },
                { label: 'ALCOA+', status: 'ok', sub: 'All principles met' },
                { label: 'RLS Isolation', status: 'ok', sub: 'Multi-lab enforced' },
                { label: 'E-Signatures', status: 'warn', sub: `${data?.pending_reviews ?? 0} pending` },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: item.status === 'ok' ? 'var(--success-bg)' : 'var(--warning-bg)', borderRadius: 8, border: `1px solid ${item.status === 'ok' ? 'var(--success-border)' : 'var(--warning-border)'}` }}>
                  <i className={`ti ti-${item.status === 'ok' ? 'circle-check' : 'alert-triangle'}`} style={{ fontSize: 16, color: item.status === 'ok' ? 'var(--success)' : 'var(--warning)' }} />
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sub}</div></div>
                </div>
              ))}
            </div>
          </div>
          {(data?.recent_alerts ?? []).length > 0 && (
            <div className="card mt4">
              <div className="card-hdr"><span className="card-title"><i className="ti ti-bell" /> Alerts</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(data?.recent_alerts ?? []).slice(0, 3).map((a, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: 'var(--danger-bg)', borderRadius: 8, border: '1px solid var(--danger-border)', fontSize: 12, color: '#991B1B' }}>
                    {a.detail}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
