import React, { useEffect, useState } from 'react';
import api, { formatTL } from '../../utils/api';
import Loading from '../../components/Loading';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => setStats({ revenue: 0, openTables: 0, totalPayments: 0, recentPayments: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="dashboard">
      <h1 className="panel-page-title">Genel Bakis</h1>
      <p className="panel-page-subtitle">Bugunun ozeti</p>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">&#8378;</span>
          <div>
            <div className="stat-value">{formatTL(stats?.revenue || 0)}</div>
            <div className="stat-label">Bugunun Geliri</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#9632;</span>
          <div>
            <div className="stat-value">{stats?.openTables ?? 0}</div>
            <div className="stat-label">Acik Masa</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">&#10003;</span>
          <div>
            <div className="stat-value">{stats?.totalPayments ?? 0}</div>
            <div className="stat-label">Odeme Sayisi</div>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <h3>Son Odemeler</h3>
        {(!stats?.recentPayments || stats.recentPayments.length === 0) ? (
          <p className="empty-text">Henuz odeme yapilmamis.</p>
        ) : (
          <table className="panel-table">
            <thead>
              <tr>
                <th>Masa</th>
                <th>Tutar</th>
                <th>Tip</th>
                <th>Saat</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPayments.map((p, i) => (
                <tr key={i}>
                  <td>{p.tableName || p.table_name || '-'}</td>
                  <td>{formatTL(p.amount)}</td>
                  <td>{p.type === 'split' ? 'Bolunmus' : 'Tam'}</td>
                  <td>{p.createdAt ? new Date(p.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
