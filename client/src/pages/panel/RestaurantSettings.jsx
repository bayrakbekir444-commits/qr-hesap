import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import Loading from '../../components/Loading';

export default function RestaurantSettings() {
  const [form, setForm] = useState({ logo_url: '', description: '', phone: '', email: '' });
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
      })
      .finally(() => setLoading(false));
  }, []);

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
    </div>
  );
}
