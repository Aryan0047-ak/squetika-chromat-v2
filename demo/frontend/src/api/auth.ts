import { post } from './client';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  email: string;
  role: string;
  full_name: string;
  lab_id: string | null;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/auth/login', { email, password });
}

export async function logout(): Promise<void> {
  try { await post('/auth/logout'); } catch {}
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}
