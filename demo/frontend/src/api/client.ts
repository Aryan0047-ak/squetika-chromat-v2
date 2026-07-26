const BASE_URL = window.location.origin;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api${path.startsWith('/') ? path : '/' + path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 423) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.hash = '#login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export function get<T>(path: string): Promise<T> { return request<T>('GET', path); }
export function post<T>(path: string, body?: unknown): Promise<T> { return request<T>('POST', path, body); }
export function del<T>(path: string): Promise<T> { return request<T>('DELETE', path); }
