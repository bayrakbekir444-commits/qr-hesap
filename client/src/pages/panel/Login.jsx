import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Şifre sıfırlama
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1=name 2=code+password
  const [forgotForm, setForgotForm] = useState({ name: '', code: '', newPassword: '' });
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotErr, setForgotErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      navigate('/panel', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Giris basarisiz. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async () => {
    setForgotErr('');
    if (!forgotForm.name.trim()) {
      setForgotErr('Restoran adı girin.');
      return;
    }
    try {
      const res = await api.post('/auth/forgot', { name: forgotForm.name });
      setForgotMsg(res.data.message || 'Kod gönderildi. Sistem sorumlusundan kodu al.');
      setForgotStep(2);
    } catch {
      setForgotErr('İstek gönderilemedi.');
    }
  };

  const handleForgotReset = async () => {
    setForgotErr('');
    if (!forgotForm.code.trim() || forgotForm.newPassword.length < 6) {
      setForgotErr('Kod ve en az 6 haneli yeni şifre girin.');
      return;
    }
    try {
      await api.post('/auth/reset', {
        name: forgotForm.name,
        code: forgotForm.code,
        newPassword: forgotForm.newPassword,
      });
      setForgotMsg('Şifre güncellendi. Yeni şifrenle giriş yap.');
      setTimeout(() => {
        setForgotOpen(false);
        setForgotStep(1);
        setForgotForm({ name: '', code: '', newPassword: '' });
        setForgotMsg('');
      }, 2000);
    } catch (err) {
      setForgotErr(err.response?.data?.error || 'Sıfırlama başarısız.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>QR Hesap</h1>
          <p>Restoran Yonetim Paneli</p>
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
            <label>Sifre</label>
            <input
              type="password"
              placeholder="Sifreniz"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn btn-accent btn-full" disabled={loading}>
            {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
          </button>

          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              marginTop: '1rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              width: '100%',
            }}>
            Şifremi unuttum
          </button>

        </form>
      </div>

      {forgotOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}>
          <div
            style={{
              background: '#fff',
              padding: '2rem',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '420px',
            }}>
            <h3 style={{ marginTop: 0 }}>🔑 Şifre Sıfırlama</h3>

            {forgotStep === 1 && (
              <>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Restoran adını gir. Sistem sorumlusu sana 6 haneli kod verecek.
                </p>
                <input
                  type="text"
                  placeholder="Restoran adı"
                  value={forgotForm.name}
                  onChange={(e) => setForgotForm({ ...forgotForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
                {forgotErr && <div className="error-message" style={{ marginTop: '0.5rem' }}>{forgotErr}</div>}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-ghost" onClick={() => setForgotOpen(false)}>İptal</button>
                  <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleForgotRequest}>
                    Kod İste
                  </button>
                </div>
              </>
            )}

            {forgotStep === 2 && (
              <>
                {forgotMsg && (
                  <div style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    {forgotMsg}
                  </div>
                )}
                <label style={{ fontSize: '0.85rem' }}>6 haneli kod</label>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={forgotForm.code}
                  onChange={(e) => setForgotForm({ ...forgotForm, code: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '0.5rem' }}
                />
                <label style={{ fontSize: '0.85rem' }}>Yeni şifre (en az 6 karakter)</label>
                <input
                  type="password"
                  placeholder="Yeni şifre"
                  value={forgotForm.newPassword}
                  onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
                {forgotErr && <div className="error-message" style={{ marginTop: '0.5rem' }}>{forgotErr}</div>}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-ghost" onClick={() => { setForgotOpen(false); setForgotStep(1); }}>İptal</button>
                  <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleForgotReset}>
                    Şifreyi Güncelle
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
