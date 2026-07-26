import { useState, useEffect } from 'react';
import { get, post } from '../api/client';

interface PendingSig {
  id: string; type: string; submitted_by: string; date: string; status: string; record_id: string;
}

export default function ESignature() {
  const [pending, setPending] = useState<PendingSig[]>([]);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [meaning, setMeaning] = useState('Reviewed and Approved');
  const [msg, setMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    get<PendingSig[]>('/v1/signatures/pending').then(setPending).catch(() => {});
  }, [refreshKey]);

  const handleSign = async (recordId: string) => {
    setMsg('');
    try {
      await post('/v1/signatures', { record_id: recordId, password: pw, meaning });
      setMsg('✅ Signature recorded successfully!');
      setPw('');
      setTimeout(() => { setShowModal(null); setRefreshKey(k => k + 1); }, 1500);
    } catch (e: any) {
      setMsg(`❌ ${e.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Electronic Signatures</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>21 CFR Part 11 §11.100 compliant · Password re-entry required</p>
        </div>
      </div>

      <div className="grid grid-cols-12">
        <div className="col-span-8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pending.length === 0 && <div className="card"><div className="card-body text-center text-muted">No pending signatures</div></div>}
            {pending.map(sig => (
              <div key={sig.id} className="card">
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: sig.status === 'urgent' ? 'var(--danger-bg)' : 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-writing-sign" style={{ fontSize: 20, color: sig.status === 'urgent' ? 'var(--danger)' : 'var(--text-muted)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{sig.type}</div>
                    <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}>{sig.id}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Submitted by {sig.submitted_by} · {sig.date}</div>
                  </div>
                  <span className={`tag tag-${sig.status === 'urgent' ? 'error' : sig.status === 'overdue' ? 'error' : 'warn'}`} style={{ height: 22, fontSize: 11 }}>
                    {sig.status}
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowModal(sig.record_id); setPw(''); setMsg(''); }}>
                    <i className="ti ti-writing-sign" /> Sign
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-4">
          <div className="card">
            <div className="card-hdr"><span className="card-title"><i className="ti ti-info-circle" /> Signature Workflow</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p><strong>1.</strong> Analyst submits data → creates pending signature request</p>
              <p><strong>2.</strong> Reviewer opens request, reviews data</p>
              <p><strong>3.</strong> Reviewer enters password to sign (password re-entry = identity verification per 21 CFR 11.200)</p>
              <p><strong>4.</strong> Signature hash-linked to audit chain</p>
              <p><strong>5.</strong> QA Manager finalizes approval</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowModal(null)}>
          <div className="card" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div className="card-hdr"><span className="card-title"><i className="ti ti-writing-sign" /> Confirm Signature</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>You are about to sign record: <strong>{showModal}</strong></div>
              <input
                placeholder="Enter your password to confirm identity"
                type="password" value={pw} onChange={e => setPw(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                autoFocus
              />
              <select value={meaning} onChange={e => setMeaning(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                <option>Reviewed and Approved</option>
                <option>Reviewed with Comments</option>
                <option>Rejected - Return for Revision</option>
              </select>
              {msg && <div style={{ padding: 8, fontSize: 13, textAlign: 'center' }}>{msg}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleSign(showModal)} disabled={!pw}>
                  <i className="ti ti-writing-sign" /> Sign & Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
