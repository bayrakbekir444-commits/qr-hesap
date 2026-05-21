import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    password: '',
    password2: '',
    email: '',
    phone: '',
    accepted: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (form.password !== form.password2) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (!form.accepted) {
      setError('Sözleşmeleri onaylamanız gerekiyor.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: form.name,
        password: form.password,
        email: form.email || undefined,
        phone: form.phone || undefined,
      });
      localStorage.setItem('token', res.data.token);
      navigate('/panel', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 460 }}>
        <div className="login-header">
          <h1>🚀 14 Gün Ücretsiz Dene</h1>
          <p>Restoranını dakikalar içinde dijitalleştir</p>
        </div>

        <div className="register-perks">
          <div className="register-perk">✓ Sınırsız masa</div>
          <div className="register-perk">✓ Örnek menüyle hazır panel</div>
          <div className="register-perk">✓ Kredi kartı gerekmez</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Restoran Adı *</label>
            <input
              type="text"
              placeholder="ör. Lezzet Mutfağı"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoCapitalize="words"
              maxLength={60}
            />
          </div>

          <div className="form-group">
            <label>Şifre * <small>(en az 6 karakter)</small></label>
            <input
              type="password"
              placeholder="••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Şifre Tekrar *</label>
            <input
              type="password"
              placeholder="••••••"
              value={form.password2}
              onChange={(e) => setForm({ ...form, password2: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>E-posta <small>(opsiyonel)</small></label>
            <input
              type="email"
              placeholder="ornek@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Telefon <small>(opsiyonel)</small></label>
            <input
              type="tel"
              placeholder="05XX XXX XX XX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <label className="register-terms">
            <input
              type="checkbox"
              checked={form.accepted}
              onChange={(e) => setForm({ ...form, accepted: e.target.checked })}
            />
            <span>
              <Link to="/yasal/kullanim" target="_blank">Kullanım koşulları</Link> ve{' '}
              <Link to="/yasal/kvkk" target="_blank">KVKK aydınlatma metni</Link>'ni okudum, onaylıyorum.
            </span>
          </label>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn btn-accent btn-full" disabled={loading}>
            {loading ? 'Hesap oluşturuluyor...' : 'Hesabımı Oluştur →'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#8b8b8b' }}>
            Zaten hesabın var mı?{' '}
            <Link to="/panel/login" style={{ color: '#f5a623', textDecoration: 'none', fontWeight: 600 }}>
              Giriş Yap
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
