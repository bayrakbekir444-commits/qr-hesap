import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { formatTL } from '../../utils/api';
import CreditCardForm from '../../components/CreditCardForm';
import PaymentSuccess from '../../components/PaymentSuccess';

const TIP_OPTIONS = [
  { label: '%0', value: 0 },
  { label: '%5', value: 0.05 },
  { label: '%10', value: 0.10 },
  { label: '%15', value: 0.15 },
];

export default function PaymentPage() {
  const { qrToken, paymentQrToken } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const activeToken = qrToken || paymentQrToken;
  const isPaymentQr = !!paymentQrToken;

  const baseAmount = location.state?.amount || 0;
  const orderId = location.state?.orderId;
  const paymentType = location.state?.type || 'full';
  const shareIndex = location.state?.shareIndex;
  const splitCount = location.state?.splitCount;
  const rawItems = location.state?.items || [];
  const items = rawItems.map((it) => ({
    ...it,
    name: it.name || it.item_name || 'Ürün',
    price: it.price ?? it.unit_price ?? 0,
  }));

  const [tipRate, setTipRate] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [tipMode, setTipMode] = useState('rate'); // 'rate' or 'custom'
  const [cardType, setCardType] = useState('visa');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const CARD_TYPES = [
    { id: 'visa', name: 'Visa', icon: '���' },
    { id: 'mastercard', name: 'Mastercard', icon: '💳' },
    { id: 'troy', name: 'Troy', icon: '🇹🇷' },
  ];

  const tipAmount = tipMode === 'custom'
    ? (parseFloat(String(customTip).replace(',', '.')) || 0)
    : (baseAmount * tipRate);
  const totalAmount = baseAmount + tipAmount;

  const handlePay = async (cardData) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/payments', {
        orderId,
        qrToken: activeToken,
        amount: totalAmount,
        tip: tipAmount,
        type: paymentType,
        shareIndex,
        splitCount,
        cardHolder: cardData.cardHolder,
        lastFour: cardData.cardNumber.slice(-4),
        card_type: cardType,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Odeme islemi basarisiz oldu. Lutfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const backPath = isPaymentQr ? `/pay/${paymentQrToken}` : `/t/${qrToken}`;
    return <PaymentSuccess amount={formatTL(totalAmount)} onClose={() => navigate(backPath)} qrToken={activeToken} orderId={orderId} />;
  }

  if (!baseAmount) {
    return (
      <div className="customer-page">
        <div className="customer-container">
          <div className="error-card">
            <div className="error-icon">!</div>
            <p>Odeme bilgisi bulunamadi.</p>
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
        <button className="back-btn" onClick={() => navigate(-1)}>
          &#8592; Geri
        </button>

        <div className="customer-header">
          <h1 className="page-title">Odeme</h1>
          {paymentType === 'split' && (
            <p className="page-subtitle">{(shareIndex ?? 0) + 1}. kisinin payi</p>
          )}
        </div>

        {paymentType === 'full' && items.length > 0 && (
          <div className="card">
            <h3 className="card-title">🍽️ Sipariş Detayı</h3>
            <div className="bill-items">
              {items.map((item, i) => (
                <div key={i} className="bill-item">
                  <div className="bill-item-left">
                    <span className="bill-item-qty">{item.quantity}x</span>
                    <span className="bill-item-name">{item.name}</span>
                  </div>
                  <span className="bill-item-price">{formatTL(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="payment-amount-row">
            <span>Tutar</span>
            <span>{formatTL(baseAmount)}</span>
          </div>

          <h3 className="card-title" style={{ marginTop: '1rem' }}>💝 Bahşiş Ekle</h3>
          <div className="tip-options">
            {TIP_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`tip-btn ${tipMode === 'rate' && tipRate === t.value ? 'active' : ''}`}
                onClick={() => { setTipMode('rate'); setTipRate(t.value); setCustomTip(''); }}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              className={`tip-btn ${tipMode === 'custom' ? 'active' : ''}`}
              onClick={() => { setTipMode('custom'); setTipRate(0); }}
            >
              Özel
            </button>
          </div>
          {tipMode === 'custom' && (
            <div className="tip-custom-row">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Bahşiş tutarı (₺)"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                min="0"
                step="0.5"
                className="tip-custom-input"
              />
              <span className="tip-custom-unit">₺</span>
            </div>
          )}

          {tipRate > 0 && (
            <div className="payment-amount-row tip-row">
              <span>Bahsis</span>
              <span>{formatTL(tipAmount)}</span>
            </div>
          )}

          <div className="payment-total-row">
            <span>Toplam</span>
            <span className="payment-total-value">{formatTL(totalAmount)}</span>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Kart Tipi</h3>
          <div className="tip-options" style={{ marginBottom: '1rem' }}>
            {CARD_TYPES.map((ct) => (
              <button
                key={ct.id}
                className={`tip-btn ${cardType === ct.id ? 'active' : ''}`}
                onClick={() => setCardType(ct.id)}
                style={{ flex: 1 }}
              >
                {ct.icon} {ct.name}
              </button>
            ))}
          </div>
          <h3 className="card-title">Kart Bilgileri</h3>
          <CreditCardForm onSubmit={handlePay} loading={loading} />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="powered-by">256-bit SSL ile guvenli odeme</div>
      </div>
    </div>
  );
}
