import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import Loading from '../../components/Loading';

export default function TableManage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', number: '' });
  const [showForm, setShowForm] = useState(false);

  const fetchTables = async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTables(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.post('/tables', { name: form.name, number: form.number || undefined });
      setForm({ name: '', number: '' });
      setShowForm(false);
      fetchTables();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu masayi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/tables/${id}`);
      fetchTables();
    } catch { /* ignore */ }
  };

  const getQrUrl = (table) => {
    const token = table.qrToken || table.qr_token;
    return `${window.location.origin}/t/${token}`;
  };

  const downloadQr = (table) => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getQrUrl(table))}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `masa-${table.name || table.number}-qr.png`;
    a.target = '_blank';
    a.click();
  };

  const downloadAllPdf = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tables/qr-pdf?type=main', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        alert('PDF oluşturulamadı.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tum-masalar-qr.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Bağlantı hatası.');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="table-manage">
      <h1 className="panel-page-title">Masa Yonetimi</h1>

      <div className="panel-card">
        <div className="card-header-row">
          <h3>Masalar ({tables.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {tables.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={downloadAllPdf}>
                📄 Tüm QR'ları PDF İndir
              </button>
            )}
            <button className="btn btn-accent btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Kapat' : '+ Yeni Masa'}
            </button>
          </div>
        </div>

        {showForm && (
          <form className="inline-form" onSubmit={handleAdd} style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Masa adi (ornek: Bahce 1)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="number"
              placeholder="No"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              style={{ maxWidth: '80px' }}
            />
            <button type="submit" className="btn btn-accent btn-sm">Ekle</button>
          </form>
        )}

        {tables.length === 0 ? (
          <p className="empty-text">Henuz masa eklenmemis.</p>
        ) : (
          <div className="tables-grid">
            {tables.map((table) => (
              <div key={table.id} className="table-card">
                <div className="table-card-header">
                  <h4>{table.name || `Masa ${table.number}`}</h4>
                  <span className={`table-status ${table.status === 'open' || table.status === 'occupied' ? 'occupied' : 'free'}`}>
                    {table.status === 'open' || table.status === 'occupied' ? 'Dolu' : 'Bos'}
                  </span>
                </div>

                <div className="table-qr-section">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getQrUrl(table))}`}
                    alt="QR Kod"
                    className="table-qr-img"
                  />
                  <p className="table-qr-url">{getQrUrl(table)}</p>
                </div>

                <div className="table-card-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => {
                    const yeniAd = prompt('Yeni masa adı:', table.name || `Masa ${table.number || table.table_number}`);
                    if (yeniAd !== null && yeniAd.trim()) {
                      api.put(`/tables/${table.id}`, { name: yeniAd.trim() }).then(fetchTables);
                    }
                  }}>
                    ✎ İsim
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => downloadQr(table)}>
                    QR
                  </button>
                  <button className="btn btn-ghost btn-sm danger-text" onClick={() => handleDelete(table.id)}>
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
