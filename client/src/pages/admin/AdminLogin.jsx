import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/admin/login', form);
      localStorage.setItem('admin_token', res.data.token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Bağlantı hatası.');
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
