import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Giriş başarısız.');
        return;
      }
      localStorage.setItem('admin_token', data.token);
      navigate('/admin', { replace: true });
    } catch {
      setError('Bağlantı hatası.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>🔐 Admin Paneli</h1>
          <p>Sistem Sorumlusu Girişi</p>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Şifre</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn btn-accent btn-full">Giriş Yap</button>
        </form>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' }}>
          Kullanıcı adı ve şifre sunucu .env dosyasından ayarlanır.
        </p>
      </div>
    </div>
  );
}
