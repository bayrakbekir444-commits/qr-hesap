import React, { useEffect, useState } from 'react';
import api, { formatTL } from '../../utils/api';
import Loading from '../../components/Loading';

const bugunYYYY = () => new Date().toISOString().split('T')[0];

export default function Reports() {
  const [period, setPeriod] = useState('daily');
  const [date, setDate] = useState(bugunYYYY());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const yukle = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${period}`, { params: { date } });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    yukle();
  }, [period, date]);

  return (
    <div className="reports-page">
      <h1 className="panel-page-title">Raporlar</h1>

      <div className="panel-card">
        <div className="card-header-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn btn-sm ${period === 'daily' ? 'btn-accent' : 'btn-outline'}`}
              onClick={() => setPeriod('daily')}>
              Günlük
            </button>
            <button
              className={`btn btn-sm ${period === 'weekly' ? 'btn-accent' : 'btn-outline'}`}
              onClick={() => setPeriod('weekly')}>
              Haftalık
            </button>
            <button
              className={`btn btn-sm ${period === 'monthly' ? 'btn-accent' : 'btn-outline'}`}
              onClick={() => setPeriod('monthly')}>
              Aylık
            </button>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
          />
          {period === 'daily' && (
            <button
              className="btn btn-outline btn-sm"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch(`/api/reports/daily/pdf?date=${date}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!res.ok) return alert('PDF oluşturulamadı.');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `gunluk-rapor-${date}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  alert('Bağlantı hatası.');
                }
              }}>
              📄 PDF İndir
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : !data ? (
        <div className="panel-card">
          <p className="empty-text">Veri alınamadı.</p>
        </div>
      ) : (
        <>
          {/* Ana Metrikler */}
          <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
            <div className="panel-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Toplam Gelir</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>
                {formatTL(data.totalRevenue || 0)}
              </div>
            </div>
            <div className="panel-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Sipariş Sayısı</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{data.totalOrders || 0}</div>
            </div>
            <div className="panel-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Satılan Ürün</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{data.totalItems || 0}</div>
            </div>
            <div className="panel-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.25rem' }}>Bahşiş</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>
                {formatTL(data.totalTips || 0)}
              </div>
            </div>
          </div>

          {/* Kategori Dağılımı */}
          {data.categoryBreakdown && data.categoryBreakdown.length > 0 && (
            <div className="panel-card">
              <h3>Kategori Bazlı Satış</h3>
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>Kategori</th>
                    <th>Adet</th>
                    <th>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryBreakdown.map((c, i) => (
                    <tr key={i}>
                      <td>{c.category_name}</td>
                      <td>{c.item_count}</td>
                      <td>{formatTL(c.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* En Çok Satanlar */}
          {data.topItems && data.topItems.length > 0 && (
            <div className="panel-card">
              <h3>🏆 En Çok Satan Ürünler</h3>
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Gelir</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((item, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.item_count}</td>
                      <td>{formatTL(item.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(!data.totalOrders || data.totalOrders === 0) && (
            <div className="panel-card">
              <p className="empty-text">Bu dönemde kapatılmış sipariş yok.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
