import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

export default function KitchenLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      navigate('/panel/kitchen', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Giris basarisiz. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>👨‍🍳 Mutfak Girişi</h1>
          <p>Sipariş takip ekranı (KDS)</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Restoran Adı</label>
            <input
              type="text"
              placeholder="Demo Restoran"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoCapitalize="words"
            />
          </div>
          <div className="form-group">
            <label>Şifre</label>
            <input
              type="password"
              placeholder="Şifreniz"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn btn-accent btn-full" disabled={loading}>
            {loading ? 'Giriş yapılıyor...' : 'Mutfak Ekranını Aç'}
          </button>

          <Link
            to="/panel/login"
            style={{
              display: 'block',
              textAlign: 'center',
              color: '#3b82f6',
              marginTop: '1rem',
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}>
            Yönetici girişi →
          </Link>
        </form>
      </div>
    </div>
  );
}
