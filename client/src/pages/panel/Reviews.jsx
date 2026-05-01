import React, { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import Loading from '../../components/Loading';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const ts = new Date(dateStr).getTime();
  if (!Number.isFinite(ts)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec} sn önce`;
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} gün önce`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ay önce`;
  return `${Math.floor(mo / 12)} yıl önce`;
}

function Stars({ rating, size = 'normal' }) {
  const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  const cls = `review-stars ${size === 'big' ? 'review-stars-big' : ''}`;
  return (
    <span className={cls} aria-label={`${r} yıldız`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= r ? 'star filled' : 'star'}>
          {i <= r ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 1..5

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews');
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { total: 0, avg: 0, byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const byRating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const k = Number(r.rating);
      if (k >= 1 && k <= 5) byRating[k] = (byRating[k] || 0) + 1;
    });
    return {
      total,
      avg: total > 0 ? sum / total : 0,
      byRating,
    };
  }, [reviews]);

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews;
    const n = Number(filter);
    return reviews.filter((r) => Number(r.rating) === n);
  }, [reviews, filter]);

  if (loading) return <Loading />;

  return (
    <div className="reviews-page">
      <h1 className="panel-page-title">Müşteri Yorumları</h1>

      {/* Üst özet */}
      <div className="panel-card review-summary">
        <div className="review-summary-main">
          <div className="review-avg-num">{stats.avg.toFixed(1)}</div>
          <div className="review-avg-stars">
            <Stars rating={stats.avg} size="big" />
            <div className="review-avg-count">{stats.total} yorum</div>
          </div>
        </div>
        <div className="review-summary-bars">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = stats.byRating[n] || 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={n} className="review-bar-row">
                <span className="review-bar-label">{n} ★</span>
                <div className="review-bar-track">
                  <div className="review-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="review-bar-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtre */}
      <div className="review-filters">
        <button
          className={`review-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tümü ({stats.total})
        </button>
        {[5, 4, 3, 2, 1].map((n) => (
          <button
            key={n}
            className={`review-filter-btn ${filter === n ? 'active' : ''}`}
            onClick={() => setFilter(n)}
          >
            {n} ★ ({stats.byRating[n] || 0})
          </button>
        ))}
      </div>

      {/* Yorum listesi */}
      {filtered.length === 0 ? (
        <div className="panel-card review-empty">
          <div className="review-empty-icon">💬</div>
          <div className="review-empty-text">
            {stats.total === 0 ? 'Henüz yorum yok' : 'Bu filtreye uygun yorum yok'}
          </div>
        </div>
      ) : (
        <div className="review-list">
          {filtered.map((r) => (
            <div key={r.id} className="panel-card review-card">
              <div className="review-card-head">
                <Stars rating={r.rating} />
                <span className="review-card-meta">
                  {r.table_number != null ? `Masa ${r.table_number}` : '—'}
                  {' • '}
                  {formatRelativeTime(r.created_at)}
                </span>
              </div>
              {r.comment ? (
                <div className="review-card-body">"{r.comment}"</div>
              ) : (
                <div className="review-card-body review-no-comment">
                  (Yorum bırakılmamış)
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
