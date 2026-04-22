import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { formatTL } from '../../utils/api';
import Loading from '../../components/Loading';

export default function SplitBill() {
  const { qrToken, paymentQrToken } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const activeToken = qrToken || paymentQrToken;
  const isPaymentQr = !!paymentQrToken;

  const totalAmount = location.state?.amount || 0;
  const orderId = location.state?.orderId;

  const [splitCount, setSplitCount] = useState(2);
  const [customCount, setCustomCount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [paidShares, setPaidShares] = useState([]);
  const [loading, setLoading] = useState(false);

  const effectiveCount = showCustom ? Number(customCount) || 2 : splitCount;
  const perPerson = totalAmount / effectiveCount;

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    api
      .get(`/payments/${orderId}`)
      .then((res) => {
        const payments = res.data?.payments || res.data || [];
        const paid = payments
          .filter((p) => p.status === 'completed' || p.status === 'success')
          .map((p) => p.shareIndex ?? p.share_index);
        setPaidShares(paid.filter((x) => x !== undefined && x !== null));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleSelectShare = (index) => {
    if (paidShares.includes(index)) return;
    const payPath = isPaymentQr ? `/pay/${paymentQrToken}/checkout` : `/t/${qrToken}/pay`;
    navigate(payPath, {
      state: {
        amount: perPerson,
        orderId,
        type: 'split',
        shareIndex: index,
        splitCount: effectiveCount,
      },
    });
  };

  if (!totalAmount) {
    return (
      <div className="customer-page">
        <div className="customer-container">
          <div className="error-card">
            <div className="error-icon">!</div>
            <p>Hesap bilgisi bulunamadi.</p>
            <button className="btn btn-accent" onClick={() => navigate(isPaymentQr ? `/pay/${paymentQrToken}` : `/t/${qrToken}`)}>
              Geri Don
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page">
      <div className="customer-container">
        <button className="back-btn" onClick={() => navigate(isPaymentQr ? `/pay/${paymentQrToken}` : `/t/${qrToken}`)}>
          &#8592; Geri
        </button>

        <div className="customer-header">
          <h1 className="page-title">Hesabi Bol</h1>
          <p className="page-subtitle">Toplam: {formatTL(totalAmount)}</p>
        </div>

        <div className="card">
          <h3 className="card-title">Kac kisiye bolunecek?</h3>
          <div className="split-options">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                className={`split-btn ${!showCustom && splitCount === n ? 'active' : ''}`}
                onClick={() => {
                  setSplitCount(n);
                  setShowCustom(false);
                }}
              >
                {n} Kisi
              </button>
            ))}
            <button
              className={`split-btn ${showCustom ? 'active' : ''}`}
              onClick={() => setShowCustom(true)}
            >
              Ozel
            </button>
          </div>

          {showCustom && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <input
                type="number"
                min="2"
                max="20"
                placeholder="Kisi sayisi girin"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value)}
                className="custom-count-input"
              />
            </div>
          )}
        </div>

        <div className="per-person-banner">
          <span>Kisi Basi</span>
          <span className="per-person-amount">{formatTL(perPerson)}</span>
        </div>

        {loading ? (
          <Loading text="Odeme durumu kontrol ediliyor..." />
        ) : (
          <div className="card">
            <h3 className="card-title">Payinizi secin</h3>
            <div className="shares-grid">
              {Array.from({ length: effectiveCount }, (_, i) => {
                const isPaid = paidShares.includes(i);
                return (
                  <button
                    key={i}
                    className={`share-card ${isPaid ? 'paid' : ''}`}
                    onClick={() => handleSelectShare(i)}
                    disabled={isPaid}
                  >
                    {isPaid ? (
                      <div className="share-paid-check">&#10003;</div>
                    ) : (
                      <div className="share-person-icon">&#9786;</div>
                    )}
                    <span className="share-label">{i + 1}. Kisi</span>
                    <span className="share-amount">{formatTL(perPerson)}</span>
                    {isPaid && <span className="share-paid-label">Odendi</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="powered-by">QR Hesap ile guvenli odeme</div>
      </div>
    </div>
  );
}
