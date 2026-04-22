import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import Loading from '../../components/Loading';

const ROLES = [
  { key: 'garson', label: 'Garson' },
  { key: 'kasiyer', label: 'Kasiyer' },
  { key: 'mutfak', label: 'Mutfak' },
];

export default function StaffManage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'garson', pin: '' });
  const [err, setErr] = useState('');

  const yukle = async () => {
    try {
      const res = await api.get('/staff');
      setStaff(res.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { yukle(); }, []);

  const rastgelePin = () => String(Math.floor(1000 + Math.random() * 9000));

  const ekle = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) {
      setErr('İsim girin.');
      return;
    }
    const pin = form.pin.trim() || rastgelePin();
    try {
      await api.post('/staff', { name: form.name.trim(), role: form.role, pin });
      setForm({ name: '', role: 'garson', pin: '' });
      setShowForm(false);
      yukle();
    } catch (e) {
      setErr(e.response?.data?.error || 'Eklenemedi.');
    }
  };

  const sil = async (s) => {
    if (!confirm(`"${s.name}" silinsin mi?`)) return;
    try {
      await api.delete(`/staff/${s.id}`);
      yukle();
    } catch {}
  };

  if (loading) return <Loading />;

  return (
    <div className="staff-manage">
      <h1 className="panel-page-title">Personel Yönetimi</h1>

      <div className="panel-card">
        <div className="card-header-row">
          <h3>Personel ({staff.length})</h3>
          <button className="btn btn-accent btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Kapat' : '+ Yeni Personel'}
          </button>
        </div>

        {showForm && (
          <form className="item-form" onSubmit={ekle}>
            <div className="form-group">
              <label>Ad Soyad</label>
              <input
                type="text"
                placeholder="Ahmet Yılmaz"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Görev</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>PIN (boş bırakılırsa rastgele)</label>
                <input
                  type="text"
                  placeholder="1234"
                  maxLength={6}
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                />
              </div>
            </div>
            {err && <div className="error-message">{err}</div>}
            <div className="form-actions">
              <button type="submit" className="btn btn-accent btn-sm">Ekle</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>İptal</button>
            </div>
          </form>
        )}

        {staff.length === 0 ? (
          <p className="empty-text">Henüz personel eklenmemiş.</p>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Görev</th>
                <th>PIN</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{ROLES.find((r) => r.key === s.role)?.label || s.role}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 800 }}>{s.pin || '-'}</td>
                  <td>
                    <button className="btn-icon danger" onClick={() => sil(s)} title="Sil">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '1rem' }}>
          ℹ Her personelin PIN'ini kendisine ver. Mobil app'ten girişte kullanır.
        </p>
      </div>
    </div>
  );
}
