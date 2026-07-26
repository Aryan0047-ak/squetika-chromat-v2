import { useState } from 'react';
import { login } from '../api/auth';
import type { UserInfo } from '../App';

interface Props { onLogin: (user: UserInfo) => void }

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('admin@squetika.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem('auth_token', res.access_token);
      onLogin({
        user_id: res.user_id,
        email: res.email,
        role: res.role,
        full_name: res.full_name,
        lab_id: res.lab_id,
      });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 80px', maxWidth: 520,
      }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <i className="ti ti-flask" style={{ fontSize: 28, color: 'white' }} />
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
            Squetika Chromat
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
            21 CFR Part 11 · EU Annex 11 · GAMP 5 Compliant Demo
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
                border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)',
                background: 'var(--surface)', outline: 'none', fontFamily: 'inherit',
              }}
              placeholder="Enter your email" required
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
                border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)',
                background: 'var(--surface)', outline: 'none', fontFamily: 'inherit',
              }}
              placeholder="Enter your password" required
            />
          </div>
          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, border: '1px solid var(--danger-border)', color: '#991B1B', fontSize: 13 }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
            </div>
          )}
          <button
            type="submit" disabled={loading}
            style={{
              height: 44, borderRadius: 10, border: 'none', background: loading ? 'var(--primary-light)' : 'var(--primary)',
              color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 40, padding: 20, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Demo Credentials</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--sidebar-hover)', borderRadius: 6 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>admin@squetika.com</span>
              <span style={{ color: 'var(--text-muted)' }}>Admin@123 · Full access</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--sidebar-hover)', borderRadius: 6 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>qa@squetika.com</span>
              <span style={{ color: 'var(--text-muted)' }}>QaDemo@123 · QA Manager</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--sidebar-hover)', borderRadius: 6 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>reviewer@squetika.com</span>
              <span style={{ color: 'var(--text-muted)' }}>Review@123 · Reviewer</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--sidebar-hover)', borderRadius: 6 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>analyst@squetika.com</span>
              <span style={{ color: 'var(--text-muted)' }}>Analyst@123 · Analyst</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{
        flex: 1, background: 'linear-gradient(135deg, #0F766E 0%, #0A5C56 50%, #064E3B 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: 80, color: 'white',
      }}>
        <i className="ti ti-shield-check" style={{ fontSize: 64, marginBottom: 24, opacity: 0.9 }} />
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 700, margin: 0, textAlign: 'center' }}>
          Regulatory-Compliant Chromatography Data Management
        </h2>
        <p style={{ fontSize: 14, opacity: 0.8, marginTop: 12, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
          WORM-enforced data · SHA-256 hash chain · Electronic signatures · Multi-lab RLS · 5-stage pipeline
        </p>
        <div style={{ display: 'flex', gap: 24, marginTop: 32 }}>
          {['21 CFR Part 11', 'EU Annex 11', 'GAMP 5', 'ALCOA+'].map(s => (
            <span key={s} style={{
              padding: '6px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 20,
              fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
