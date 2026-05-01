import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const adminFetch = async (url, opts = {}) => {
  const token = localStorage.getItem('admin_token');
  // url '/api/...' geliyorsa baseURL'a göre düzelt (relative path bypass)
  const fullUrl = url.startsWith('/api/') ? `${API_BASE}${url.slice(4)}` : url;
  return fetch(fullUrl, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
};

const tl = (k) => ((k || 0) / 100).toFixed(2).replace('.', ',') + ' ₺';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', password: '', package_type: 'temel', months: 1 });

  const yukle = async () => {
    try {
      const r = await adminFetch('/api/admin/restaurants');
      if (r.status === 401 || r.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
        return;
      }
      const s = await adminFetch('/api/admin/stats');
      setRestaurants(await r.json());
      setStats(await s.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { yukle(); }, []);

  const paketDegistir = async (id, currentName) => {
    const paket = prompt(`"${currentName}" paketi:\n\n1) temel (400₺/ay, 10 masa)\n2) pro (800₺/ay, 30 masa)\n3) zincir (2000₺/ay, 999 masa)\n\nSeç (1/2/3):`);
    const map = { '1': 'temel', '2': 'pro', '3': 'zincir' };
    if (!map[paket]) return;
    const ay = parseInt(prompt('Kaç ay?', '12'), 10) || 1;
    try {
      const r = await adminFetch(`/api/admin/restaurants/${id}/package`, {
        method: 'PUT',
        body: JSON.stringify({ package_type: map[paket], months: ay }),
      });
      if (!r.ok) {
        const d = await r.json();
        alert(d.error || 'Güncellenemedi.');
        return;
      }
      yukle();
    } catch {}
  };

  const silRestoran = async (id, name) => {
    if (!confirm(`"${name}" VE TÜM VERİLERİ silinecek. Emin misin?`)) return;
    if (!confirm('Bu işlem GERİ ALINAMAZ. Gerçekten silmek istiyor musun?')) return;
    try {
      const r = await adminFetch(`/api/admin/restaurants/${id}`, { method: 'DELETE' });
      if (!r.ok) { alert('Silinemedi.'); return; }
      yukle();
    } catch {}
  };

  const restoranOlustur = async (e) => {
    e.preventDefault();
    if (!newForm.name || !newForm.password) return;
    try {
      const r = await adminFetch('/api/admin/restaurants', {
        method: 'POST',
        body: JSON.stringify(newForm),
      });
      if (!r.ok) {
        const d = await r.json();
        alert(d.error || 'Oluşturulamadı.');
        return;
      }
      setNewForm({ name: '', password: '', package_type: 'temel', months: 1 });
      setShowNew(false);
      yukle();
    } catch {}
  };

  const cikis = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  if (loading) return <div style={{ padding: '2rem' }}>Yükleniyor...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>🔐 Sistem Admin Paneli</h1>
        <button className="btn btn-ghost" onClick={cikis}>Çıkış</button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="panel-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Toplam Restoran</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_restaurants}</div>
          </div>
          <div className="panel-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Toplam Masa</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_tables}</div>
          </div>
          <div className="panel-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Tamamlanan Sipariş</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_orders}</div>
          </div>
          <div className="panel-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Tüm Zamanlar Ciro</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{tl(stats.revenue_all_time)}</div>
          </div>
        </div>
      )}

      <div className="panel-card">
        <div className="card-header-row">
          <h3>Restoranlar ({restaurants.length})</h3>
          <button className="btn btn-accent btn-sm" onClick={() => setShowNew(!showNew)}>
            {showNew ? 'Kapat' : '+ Yeni Restoran'}
          </button>
        </div>

        {showNew && (
          <form onSubmit={restoranOlustur} style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <input placeholder="Restoran Adı" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} required style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }} />
              <input placeholder="Başlangıç Şifresi" type="text" value={newForm.password} onChange={(e) => setNewForm({ ...newForm, password: e.target.value })} required style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }} />
              <select value={newForm.package_type} onChange={(e) => setNewForm({ ...newForm, package_type: e.target.value })} style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}>
                <option value="temel">Temel</option>
                <option value="pro">Pro</option>
                <option value="zincir">Zincir</option>
              </select>
              <input placeholder="Ay" type="number" value={newForm.months} onChange={(e) => setNewForm({ ...newForm, months: e.target.value })} style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }} />
              <button type="submit" className="btn btn-accent btn-sm">Oluştur</button>
            </div>
          </form>
        )}

        <table className="panel-table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Paket</th>
              <th>Bitiş</th>
              <th>Masa</th>
              <th>Sipariş</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id} style={r.expired ? { background: '#fee2e2' } : {}}>
                <td><strong>{r.name}</strong></td>
                <td>
                  <span style={{
                    background: r.package_type === 'temel' ? '#f3f4f6' : r.package_type === 'pro' ? '#ede9fe' : '#fef3c7',
                    color: r.package_type === 'temel' ? '#374151' : r.package_type === 'pro' ? '#6d28d9' : '#92400e',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}>
                    {r.package_label}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem', marginLeft: 8 }}>{r.monthly_fee}₺/ay</span>
                </td>
                <td>
                  {r.package_expires_at || '-'}
                  {r.expired && <span style={{ color: '#dc2626', marginLeft: 6, fontWeight: 700 }}>⚠ Bitti</span>}
                </td>
                <td>{r.table_count} / {r.max_tables}</td>
                <td>{r.total_orders}</td>
                <td>
                  <button className="btn-icon" onClick={() => paketDegistir(r.id, r.name)} title="Paket Değiştir">⚙</button>
                  <button className="btn-icon danger" onClick={() => silRestoran(r.id, r.name)} title="Sil">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {restaurants.length === 0 && <p className="empty-text">Henüz restoran yok.</p>}
      </div>
    </div>
  );
}
