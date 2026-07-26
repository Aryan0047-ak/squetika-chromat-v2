import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Layout from './components/Layout';

export interface UserInfo {
  user_id: string;
  email: string;
  role: string;
  full_name: string;
  lab_id: string | null;
}

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [page, setPage] = useState('dashboard');

  useEffect(() => {
    const stored = localStorage.getItem('auth_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
  }, []);

  const handleLogin = (userData: UserInfo) => {
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <Layout user={user} page={page} onPageChange={setPage} onLogout={handleLogout} />
  );
}
