import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { formatTL } from '../../utils/api';
import BillSummary from '../../components/BillSummary';
import Loading from '../../components/Loading';

export default function PaymentView() {
  const { paymentQrToken } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);

  // Loyalty state
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState(null);

  const fetchData = useCallback(() => {
    return api
      .get(`/tables/payment/${paymentQrToken}/public`)
      .then((res) => {
        setData(res.data);
        const orderId = res.data?.order?.id || res.data?.orderId;
        if (orderId) {
          api.get(`/payments/${orderId}`)
            .then((pRes) => {
              const p = pRes.data?.payments || pRes.data || [];
              setPayments(p.filter((x) => x.status === 'completed' || x.status === 'success'));
            })
            .catch(() => {});
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Hesap bilgisi alinamadi.'));
  }, [paymentQrToken]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleLoyaltyCheck = async () => {
    if (!loyaltyPhone.trim()) return;
    setLoyaltyLoading(true);
    setLoyaltyError(null);
    try {
      const res = await api.get(`/loyalty/${encodeURIComponent(loyaltyPhone.trim())}`);
      setLoyaltyData(res.data);
    } catch (err) {
      setLoyaltyError(err.response?.data?.error || 'Puan bilgisi alinamadi.');
      setLoyaltyData(null);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  if (loading) return <Loading text="Hesabiniz yukleniyor..." />;

  if (error) {
    return (
      <div className="customer-page">
        <div className="customer-container">
          <div className="error-card">
            <div className="error-icon">!</div>
            <h2>Hata</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const items = data?.order?.items || data?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tableName = data?.table?.name || data?.tableName || `Masa ${data?.table?.number || ''}`;
  const restaurantName = data?.restaurant?.name || data?.restaurantName || 'Restoran';
  const orderId = data?.order?.id || data?.orderId;

  const paidTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remainingTotal = Math.max(0, subtotal - paidTotal);

  return (
    <div className="customer-page">
      <div className="customer-container">
        {/* Header */}
        <div className="customer-header">
          <div className="restaurant-badge">
            <span className="restaurant-icon">&#9733;</span>
          </div>
          <h1 className="restaurant-name">{restaurantName}</h1>
          <div className="table-badge">{tableName}</div>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <p>Bu masa icin henuz siparis bulunmuyor.</p>
          </div>
        ) : (
          <>
            {/* Bill detail */}
            <div className="card">
              <h3 className="card-title">Hesap Detayi</h3>
              <BillSummary items={items} />
            </div>

            {/* Paid payments */}
            {payments.length > 0 && (
              <div className="pv-payments-section">
                <h3 className="pv-payments-title">Yapilan Odemeler</h3>
                <div className="pv-payments-list">
                  {payments.map((p, i) => (
                    <div key={i} className="pv-payment-row">
                      <div className="pv-payment-left">
                        <span className="pv-payment-check">&#10003;</span>
                        <span className="pv-payment-info">
                          {p.cardHolder || p.card_holder || `Odeme ${i + 1}`}
                          {p.type === 'split' && (
                            <span className="pv-payment-split-label"> (Bolunmus)</span>
                          )}
                        </span>
                      </div>
                      <span className="pv-payment-amount">{formatTL(p.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="pv-remaining-row">
                  <span>Kalan Tutar</span>
                  <span className="pv-remaining-amount">{formatTL(remainingTotal)}</span>
                </div>
              </div>
            )}

            {/* Total banner */}
            <div className="total-banner">
              <span>Toplam</span>
              <span className="total-amount">{formatTL(subtotal)}</span>
            </div>

            {/* Actions */}
            {remainingTotal > 0 && (
              <div className="customer-actions">
                <button
                  className="btn btn-accent btn-full"
                  onClick={() =>
                    navigate(`/pay/${paymentQrToken}/checkout`, {
                      state: { amount: remainingTotal, orderId, type: 'full' },
                    })
                  }
                >
                  Tamamini Ode {payments.length > 0 ? `(${formatTL(remainingTotal)})` : ''}
                </button>
                <button
                  className="btn btn-outline btn-full"
                  onClick={() =>
                    navigate(`/pay/${paymentQrToken}/split`, {
                      state: { amount: remainingTotal, orderId, items },
                    })
                  }
                >
                  Hesabi Bol
                </button>
              </div>
            )}

            {remainingTotal <= 0 && payments.length > 0 && (
              <div className="pv-paid-banner">
                <span className="pv-paid-icon">&#10003;</span>
                <span>Hesap tamamen odendi</span>
              </div>
            )}
          </>
        )}

        {/* Loyalty section */}
        <div className="loyalty-section">
          <button
            className="loyalty-toggle"
            onClick={() => setLoyaltyOpen(!loyaltyOpen)}
          >
            <span className="loyalty-toggle-text">Sadakat Karti</span>
            <span className={`menu-order-arrow ${loyaltyOpen ? 'open' : ''}`}>&#9660;</span>
          </button>

          {loyaltyOpen && (
            <div className="loyalty-content">
              <p className="loyalty-desc">Telefon numaranizi girerek puan durumunuzu ogrenin.</p>
              <div className="loyalty-input-row">
                <input
                  type="tel"
                  className="loyalty-input"
                  placeholder="05XX XXX XX XX"
                  value={loyaltyPhone}
                  onChange={(e) => setLoyaltyPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoyaltyCheck()}
                />
                <button
                  className="btn btn-gold btn-sm"
                  onClick={handleLoyaltyCheck}
                  disabled={loyaltyLoading}
                >
                  {loyaltyLoading ? 'Sorgulaniyor...' : 'Sorgula'}
                </button>
              </div>

              {loyaltyError && (
                <div className="error-message" style={{ marginTop: '0.5rem' }}>{loyaltyError}</div>
              )}

              {loyaltyData && (
                <div className="loyalty-result">
                  <div className="loyalty-stat">
                    <span className="loyalty-stat-label">Mevcut Puan</span>
                    <span className="loyalty-stat-value loyalty-points">{loyaltyData.points ?? 0}</span>
                  </div>
                  <div className="loyalty-stat">
                    <span className="loyalty-stat-label">Toplam Harcama</span>
                    <span className="loyalty-stat-value">{formatTL(loyaltyData.totalSpent ?? 0)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="powered-by">QR Hesap ile guvenli odeme</div>
      </div>
    </div>
  );
}
