import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import Loading from '../../components/Loading';

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
  });
  const [err, setErr] = useState('');

  const yukle = async () => {
    try {
      const res = await api.get('/campaigns');
      setCoupons(res.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { yukle(); }, []);

  const rastgeleKod = () => {
    const h = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let k = '';
    for (let i = 0; i < 6; i++) k += h[Math.floor(Math.random() * h.length)];
    return k;
  };

  const ekle = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim() || !form.code.trim()) {
      setErr('İsim ve kod gerekli.');
      return;
    }
    try {
      await api.post('/campaigns', {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
      });
      setForm({ name: '', code: '', discount_type: 'percentage', discount_value: 10 });
      setShowForm(false);
      yukle();
    } catch (e) {
      setErr(e.response?.data?.error || 'Oluşturulamadı.');
    }
  };

  const sil = async (id) => {
    if (!confirm('Bu kuponu silmek istiyor musun?')) return;
    try {
      await api.delete(`/campaigns/${id}`);
      yukle();
    } catch {}
  };

  if (loading) return <Loading />;

  return (
    <div className="coupons">
      <h1 className="panel-page-title">Kuponlar & İndirimler</h1>

      <div className="panel-card">
        <div className="card-header-row">
          <h3>Aktif Kuponlar ({coupons.length})</h3>
          <button className="btn btn-accent btn-sm" onClick={() => {
            setForm({ ...form, code: rastgeleKod() });
            setShowForm(!showForm);
          }}>
            {showForm ? 'Kapat' : '+ Yeni Kupon'}
          </button>
        </div>

        {showForm && (
          <form className="item-form" onSubmit={ekle}>
            <div className="form-group">
              <label>Kupon Adı (iç kullanım için)</label>
              <input
                type="text"
                placeholder="Hoşgeldin İndirimi"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Kupon Kodu (müşteriye verilecek)</label>
                <input
                  type="text"
                  placeholder="WELCOME10"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  maxLength={12}
                  style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: 1 }}
                />
              </div>
              <div className="form-group">
                <label>İndirim Türü</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
                  <option value="percentage">Yüzde (%)</option>
                  <option value="fixed">Sabit Tutar (₺)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Değer</label>
                <input
                  type="number"
                  min="1"
                  max={form.discount_type === 'percentage' ? 100 : 99999}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                />
              </div>
            </div>
            {err && <div className="error-message">{err}</div>}
            <div className="form-actions">
              <button type="submit" className="btn btn-accent btn-sm">Oluştur</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>İptal</button>
            </div>
          </form>
        )}

        {coupons.length === 0 ? (
          <p className="empty-text">Henüz kupon yok.</p>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>İndirim</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: 1 }}>
                    {c.code || '(kod yok)'}
                  </td>
                  <td>{c.name}</td>
                  <td>
                    {c.discount_type === 'percentage'
                      ? `%${c.discount_value}`
                      : `${(c.discount_value / 100).toFixed(2).replace('.', ',')}₺`}
                  </td>
                  <td>
                    <button className="btn-icon danger" onClick={() => sil(c.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
