import { useState, useEffect } from 'react';
import { get } from '../api/client';

interface AuditEntry {
  id: number; event_time_utc: string; user_id: string; user_email: string;
  action: string; module: string; detail: string; outcome: string;
  record_id: string; ip_address: string; row_hash: string;
}

export default function Audit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [chainStatus, setChainStatus] = useState<{chain_valid: boolean; chain_tip: string; total_entries: number} | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [auditRes, chainRes] = await Promise.all([
        get<{items: AuditEntry[]; total: number; page: number; page_size: number}>('/audit?page=1&page_size=20'),
        get<any>('/audit/chain-verify'),
      ]);
      setEntries(auditRes.items);
      setTotal(auditRes.total);
      setChainStatus(chainRes);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Audit Trail</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>{total} records · SHA-256 chain {chainStatus?.chain_valid ? '✅ intact' : '⚠️ broken'}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}><i className="ti ti-refresh" /> Refresh</button>
      </div>

      {chainStatus && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: '12px 16px', background: chainStatus.chain_valid ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 12, border: `1px solid ${chainStatus.chain_valid ? 'var(--success-border)' : 'var(--danger-border)'}`, alignItems: 'center' }}>
          <i className={`ti ti-${chainStatus.chain_valid ? 'shield-check' : 'alert-triangle'}`} style={{ fontSize: 20, color: chainStatus.chain_valid ? 'var(--success)' : 'var(--danger)' }} />
          <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}>
            Chain tip: {chainStatus.chain_tip} · {chainStatus.total_entries} chain entries
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: chainStatus.chain_valid ? 'var(--success)' : 'var(--danger)' }}>
            {chainStatus.chain_valid ? 'Verified' : 'BROKEN'}
          </span>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="etable">
            <thead><tr><th>Time (UTC)</th><th>User</th><th>Action</th><th>Module</th><th>Detail</th><th>Outcome</th><th>Hash</th></tr></thead>
            <tbody>
              {loading && entries.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted">Loading...</td></tr>
              ) : entries.map(e => (
                <tr key={e.id} style={e.outcome === 'FAILURE' ? { background: 'var(--danger-bg)' } : {}}>
                  <td className="mono-cell" style={{ fontSize: 11 }}>{e.event_time_utc?.substring(11, 19) || ''}</td>
                  <td><span style={{ fontSize: 12, fontWeight: 500 }}>{e.user_email?.split('@')[0]}</span></td>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{e.action}</td>
                  <td><span className="tag tag-neutral" style={{ height: 20, fontSize: 10 }}>{e.module}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</td>
                  <td><span className={`tag tag-${e.outcome === 'SUCCESS' ? 'ok' : 'error'}`} style={{ height: 20, fontSize: 10 }}>{e.outcome}</span></td>
                  <td className="mono-cell" style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.row_hash?.substring(0, 16) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
