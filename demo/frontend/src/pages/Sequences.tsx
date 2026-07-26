import { useState, useEffect } from 'react';
import { get } from '../api/client';

interface Seq {
  id: string; instrument: string; method: string; batch: string;
  progress: number; total: number; status: string; analyst: string;
}

const statusStyles: Record<string, {variant: string; label: string}> = {
  running: {variant: 'ok', label: 'Running'},
  hold: {variant: 'warn', label: 'On Hold'},
  scheduled: {variant: 'neutral', label: 'Scheduled'},
  error: {variant: 'error', label: 'Error'},
  pending: {variant: 'warn', label: 'Pending QA'},
  ready: {variant: 'info', label: 'Ready'},
};

export default function Sequences() {
  const [sequences, setSequences] = useState<Seq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<Seq[]>('/v1/sequences').then(d => { setSequences(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Sequences</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>{sequences.length} sequences · {sequences.filter(s => s.status === 'running').length} running</p>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="etable">
            <thead><tr><th>Sequence ID</th><th>Instrument</th><th>Method</th><th>Batch</th><th>Progress</th><th>Analyst</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted">Loading...</td></tr>
              ) : sequences.map(s => {
                const cfg = statusStyles[s.status] || {variant: 'neutral', label: s.status};
                return (
                  <tr key={s.id}>
                    <td className="mono-cell" style={{ fontWeight: 600 }}>{s.id}</td>
                    <td>{s.instrument}</td>
                    <td className="mono-cell">{s.method}</td>
                    <td className="mono-cell">{s.batch}</td>
                    <td>
                      {s.total > 0 ? (
                        <div className="flex items-center g2">
                          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", width: 50 }}>{s.progress}/{s.total}</span>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, maxWidth: 80 }}>
                            <div style={{ width: `${(s.progress / s.total) * 100}%`, height: '100%', background: s.status === 'running' ? 'var(--primary)' : 'var(--border-dark)', borderRadius: 3 }} />
                          </div>
                        </div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>{s.analyst}</td>
                    <td><span className={`tag tag-${cfg.variant}`} style={{ height: 22, fontSize: 11 }}>{cfg.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
