import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { setUserToken, setUserData } from '../../utils/userAuth';

export default function UserLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.email || !form.password) {
      setError('E-posta ve sifre gerekli.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/users/login', {
        email: form.email,
        password: form.password,
      });
      setUserToken(res.data.token);
      setUserData(res.data.user);
      navigate('/wallet');
    } catch (err) {
      setError(err.response?.data?.error || 'Giris basarisiz. E-posta veya sifre hatali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-page">
      <div className="customer-container">
        <div className="auth-header">
          <div className="auth-logo">QR Hesap</div>
          <h1 className="auth-title">Giris Yap</h1>
          <p className="auth-subtitle">Cuzdanina eris ve odemelerini yonet</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">E-posta</label>
            <input
              type="email"
              name="email"
              className="auth-input"
              placeholder="ornek@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Sifre</label>
            <input
              type="password"
              name="password"
              className="auth-input"
              placeholder="Sifreniz"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="btn btn-gold btn-full auth-submit"
            disabled={loading}
          >
            {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Hesabin yok mu? </span>
          <Link to="/register">Kayit Ol</Link>
        </div>

        <div className="powered-by">QR Hesap ile guvenli odeme</div>
      </div>
    </div>
  );
}
