import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { setUserToken, setUserData } from '../../utils/userAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('Tum alanlari doldurun.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError('Sifreler eslesmiyor.');
      return;
    }
    if (form.password.length < 6) {
      setError('Sifre en az 6 karakter olmali.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/users/register', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      setUserToken(res.data.token);
      setUserData(res.data.user);
      navigate('/wallet');
    } catch (err) {
      setError(err.response?.data?.error || 'Kayit basarisiz oldu. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-page">
      <div className="customer-container">
        <div className="auth-header">
          <div className="auth-logo">QR Hesap</div>
          <h1 className="auth-title">Hesap Olustur</h1>
          <p className="auth-subtitle">Cuzdan ozelliklerinden yararlanmak icin kayit olun</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Ad Soyad</label>
            <input
              type="text"
              name="name"
              className="auth-input"
              placeholder="Adiniz Soyadiniz"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
            />
          </div>

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
            <label className="auth-label">Telefon</label>
            <input
              type="tel"
              name="phone"
              className="auth-input"
              placeholder="05XX XXX XX XX"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Sifre</label>
            <input
              type="password"
              name="password"
              className="auth-input"
              placeholder="En az 6 karakter"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Sifre Tekrar</label>
            <input
              type="password"
              name="passwordConfirm"
              className="auth-input"
              placeholder="Sifrenizi tekrar girin"
              value={form.passwordConfirm}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="btn btn-gold btn-full auth-submit"
            disabled={loading}
          >
            {loading ? 'Kayit yapiliyor...' : 'Kayit Ol'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Zaten hesabin var mi? </span>
          <Link to="/login">Giris Yap</Link>
        </div>

        <div className="powered-by">QR Hesap ile guvenli odeme</div>
      </div>
    </div>
  );
}
