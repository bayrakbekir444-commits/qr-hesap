import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import Loading from '../../components/Loading';

export default function RestaurantSettings() {
  const [form, setForm] = useState({ logo_url: '', description: '', phone: '', email: '' });
  const [hideBranding, setHideBranding] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState('');
  const [aiWaiter, setAiWaiter] = useState(true);
  const [aiWaiterMsg, setAiWaiterMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/auth/restaurant')
      .then((res) => {
        setForm({
          logo_url: res.data.logo_url || '',
          description: res.data.description || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
        });
        setHideBranding(res.data.hide_branding === 1);
        setAiWaiter(res.data.ai_waiter_enabled !== 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleAiWaiter = async () => {
    const next = !aiWaiter;
    try {
      await api.put('/auth/restaurant/ai-waiter', { enabled: next });
      setAiWaiter(next);
      setAiWaiterMsg(next ? '✓ AI Garson açıldı' : '✓ AI Garson kapatıldı');
      setTimeout(() => setAiWaiterMsg(''), 3000);
    } catch (e) {
      setAiWaiterMsg(e?.response?.data?.error || 'Güncellenemedi.');
    }
  };

  const toggleBranding = async () => {
    const next = !hideBranding;
    try {
      await api.put('/auth/restaurant/branding', { hide_branding: next });
      setHideBranding(next);
      setBrandingMsg(next ? '✓ QR Hesap rozeti gizlendi' : '✓ QR Hesap rozeti görünür');
      setTimeout(() => setBrandingMsg(''), 3000);
    } catch (e) {
      setBrandingMsg(e?.response?.data?.error || 'Güncellenemedi.');
    }
  };

  const kaydet = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      await api.put('/auth/restaurant', form);
      setMsg('✓ Kaydedildi');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setErr('Kaydedilemedi.');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="restaurant-settings">
      <h1 className="panel-page-title">Restoran Bilgileri</h1>

      <form className="panel-card" onSubmit={kaydet} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label>🖼 Logo URL</label>
          <input
            type="url"
            placeholder="https://.../logo.png"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          />
          <small style={{ color: '#6b7280' }}>Müşteri ekranında üstte görünür. Imgur/Cloudinary linkleri önerilir.</small>
          {form.logo_url && (
            <div style={{ marginTop: '0.5rem' }}>
              <img src={form.logo_url} alt="Logo önizleme" style={{ maxHeight: '80px', borderRadius: '8px' }} />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>🌐 Hakkımızda</label>
          <textarea
            placeholder="Restoranımız 2020'den beri sizlere hizmet veriyor..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
          />
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>📞 Telefon</label>
            <input
              type="tel"
              placeholder="0212 XXX XX XX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>📧 E-posta</label>
            <input
              type="email"
              placeholder="restoran@mail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>

        {msg && <div style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '8px' }}>{msg}</div>}
        {err && <div className="error-message">{err}</div>}

        <button type="submit" className="btn btn-accent">Kaydet</button>
      </form>

      <div className="panel-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>🤖 AI Garson</h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Müşteri menüde "Garsona Sor" butonuna basıp AI'ya sorabilir: yemek önerisi, alerjen bilgisi, bütçe kombinasyonu vs.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={aiWaiter}
              onChange={toggleAiWaiter}
            />
            <span>AI Garson aktif</span>
          </label>
        </div>
        {aiWaiterMsg && (
          <div style={{ marginTop: '0.75rem', background: '#eff6ff', color: '#1e40af', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
            {aiWaiterMsg}
          </div>
        )}
      </div>

      <div className="panel-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>✨ Beyaz Etiket</h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Müşteri menüsünün altındaki "QR Hesap ile çalışıyor" yazısını gizler.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hideBranding}
              onChange={toggleBranding}
            />
            <span>QR Hesap rozetini gizle</span>
          </label>
        </div>
        {brandingMsg && (
          <div style={{ marginTop: '0.75rem', background: '#eff6ff', color: '#1e40af', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
            {brandingMsg}
          </div>
        )}
      </div>
    </div>
  );
}
