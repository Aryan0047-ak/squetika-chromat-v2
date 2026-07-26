import { useState, useEffect } from 'react';
import { get } from '../api/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface ChromSummary {
  record_id: string; event_id: string; connector_id: string; source_system: string;
  instrument: string; method: string; sample: string; batch_number: string;
  product_license_no: string; manufacturing_site: string; received_at_utc: string;
  peak_count: number; record_hash: string;
}

interface SignalPoint { time: number; intensity: number; }

interface Annotation { rt: number; label: string; area: number; is_passing: boolean; }

interface ChromDetail {
  record_id: string; event_id: string; connector_id: string; source_system: string;
  metadata: Record<string, string>; batch_number: string; product_license_no: string;
  manufacture_date: string; expiry_date: string; manufacturing_site: string;
  received_at_utc: string; record_hash: string; previous_hash: string;
  signal: SignalPoint[]; annotations: Annotation[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}>
        <div style={{ fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>RT: {label} min</div>
        <div style={{ color: '#2563EB' }}>Intensity: {Number(payload[0].value).toLocaleString()}</div>
      </div>
    );
  }
  return null;
}

export default function Chromatograms() {
  const [list, setList] = useState<ChromSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChromDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    get<ChromSummary[]>('/chromatograms')
      .then(d => { setList(d); if (d.length > 0) setSelected(d[0].record_id); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDetailLoading(true);
    setDetail(null);
    get<ChromDetail>(`/chromatograms/${selected}`)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selected]);

  if (loading) return <div className="p6 text-center text-muted">Loading chromatograms...</div>;
  if (error) return <div className="p6"><div className="card" style={{ padding: 20, color: '#991B1B' }}>Error: {error}</div></div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
            Chromatogram Viewer
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
            {list.length} records · Select a record to view its chromatogram trace
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12">
        <div className="col-span-4">
          <div className="card">
            <div className="card-hdr"><span className="card-title"><i className="ti ti-list" /> Records</span></div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {list.map(r => (
                <div key={r.record_id} onClick={() => setSelected(r.record_id)}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', background: selected === r.record_id ? 'var(--primary-bg)' : 'transparent', borderLeft: selected === r.record_id ? '3px solid var(--primary)' : '3px solid transparent', transition: 'all 0.1s' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{r.record_id}</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{r.sample}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{r.instrument}</span>
                    <span>{r.peak_count} peak{r.peak_count !== 1 ? 's' : ''}</span>
                    <span>{r.received_at_utc?.substring(0, 10)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-8">
          {detailLoading && <div className="card"><div className="card-body text-center text-muted">Loading chromatogram...</div></div>}
          {!detailLoading && !detail && <div className="card"><div className="card-body text-center text-muted">Select a record to view</div></div>}
          {!detailLoading && detail && (
            <>
              <div className="card">
                <div className="card-hdr">
                  <span className="card-title">
                    <i className="ti ti-wave-sine" /> {detail.record_id}
                    <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 8, color: 'var(--text-muted)' }}>
                      {detail.metadata?.instrument} · {detail.metadata?.method}
                    </span>
                  </span>
                </div>
                <div className="card-body" style={{ height: 340, padding: '12px 4px 4px 4px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={detail.signal} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }} label={{ value: 'Retention Time (min)', position: 'insideBottom', offset: -4, style: { fontSize: 10, fill: '#94a3b8' } }} />
                      <YAxis tick={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }} label={{ value: 'Intensity (mV)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="intensity" stroke="#2563EB" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card mt4">
                <div className="card-hdr"><span className="card-title"><i className="ti ti-table" /> Peak Table</span></div>
                <div className="table-wrap">
                  <table className="etable">
                    <thead>
                      <tr><th>#</th><th>Peak Name</th><th>Retention Time (min)</th><th>Area</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {detail.annotations.map((p, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{p.label}</td>
                          <td className="mono-cell">{p.rt.toFixed(2)}</td>
                          <td className="mono-cell">{p.area.toLocaleString()}</td>
                          <td><span className={`tag tag-${p.is_passing ? 'ok' : 'error'}`}>{p.is_passing ? 'Pass' : 'OOS'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card mt4">
                <div className="card-hdr"><span className="card-title"><i className="ti ti-info-circle" /> Record Details</span></div>
                <div className="card-body" style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Batch:</span> <span style={{ fontWeight: 500 }}>{detail.batch_number}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>License:</span> <span style={{ fontWeight: 500 }}>{detail.product_license_no}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Site:</span> <span style={{ fontWeight: 500 }}>{detail.manufacturing_site}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Manufactured:</span> <span style={{ fontWeight: 500 }}>{detail.manufacture_date}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Expires:</span> <span style={{ fontWeight: 500 }}>{detail.expiry_date}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Received:</span> <span style={{ fontWeight: 500 }}>{detail.received_at_utc}</span></div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Hash Chain:</span>
                    <span className="mono-cell" style={{ marginLeft: 8, fontSize: 11 }}>{detail.record_hash?.substring(0, 32)}...</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
