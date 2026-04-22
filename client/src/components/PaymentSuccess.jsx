import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { formatTL } from '../utils/api';

export default function PaymentSuccess({ amount, onClose, qrToken, orderId }) {
  const navigate = useNavigate();
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Digital receipt state
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [copied, setCopied] = useState(false);

  // Post-payment loyalty state
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [loyaltySaved, setLoyaltySaved] = useState(false);

  const handleFetchReceipt = async () => {
    if (receiptLoading) return;
    setReceiptLoading(true);
    setReceiptError(null);
    try {
      const res = await api.get(`/receipts/${orderId}`);
      setReceipt(res.data);
      setShowReceipt(true);
    } catch (err) {
      setReceiptError(err.response?.data?.error || 'Fis alinamadi.');
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!receipt) return;
    const text = [
      receipt.restaurantName || 'Restoran',
      `Tarih: ${receipt.date || new Date().toLocaleDateString('tr-TR')}`,
      `Fis No: ${receipt.receiptNumber || receipt.id || '-'}`,
      '---',
      ...(receipt.items || []).map(
        (i) => `${i.quantity}x ${i.name}  ${formatTL(i.price * i.quantity)}`
      ),
      '---',
      `Toplam: ${formatTL(receipt.total ?? 0)}`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Dijital Fis', text });
        return;
      } catch { /* fallback to copy */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleLoyaltyEarn = async () => {
    if (!loyaltyPhone.trim() || loyaltySaving) return;
    setLoyaltySaving(true);
    try {
      await api.post('/loyalty/earn', {
        phone: loyaltyPhone.trim(),
        orderId,
      });
      setLoyaltySaved(true);
    } catch { /* ignore */ }
    setLoyaltySaving(false);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        qrToken,
        orderId,
        rating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        if (onClose) onClose();
        else navigate(-2);
      }, 1500);
    } catch {
      if (onClose) onClose();
      else navigate(-2);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate(-2);
  };

  if (submitted) {
    return (
      <div className="success-overlay">
        <div className="success-card">
          <div className="review-thank-you-icon">&#9733;</div>
          <h2 className="success-title">Tesekkurler!</h2>
          <p className="success-message">Degerlendirmeniz alindi.</p>
        </div>
      </div>
    );
  }

  // Digital receipt view
  if (showReceipt && receipt) {
    return (
      <div className="success-overlay">
        <div className="success-card receipt-card">
          <h2 className="receipt-title">Dijital Fis</h2>
          <div className="receipt-header">
            <span className="receipt-restaurant">{receipt.restaurantName || 'Restoran'}</span>
            <span className="receipt-date">{receipt.date || new Date().toLocaleDateString('tr-TR')}</span>
          </div>
          <div className="receipt-number">Fis No: {receipt.receiptNumber || receipt.id || '-'}</div>
          <div className="receipt-divider" />
          <div className="receipt-items">
            {(receipt.items || []).map((item, idx) => (
              <div key={idx} className="receipt-item-row">
                <span className="receipt-item-left">
                  <span className="receipt-item-qty">{item.quantity}x</span>
                  <span>{item.name}</span>
                </span>
                <span className="receipt-item-price">{formatTL(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="receipt-divider" />
          <div className="receipt-total-row">
            <span>Toplam</span>
            <span className="receipt-total-value">{formatTL(receipt.total ?? 0)}</span>
          </div>
          <div className="receipt-actions">
            <button className="btn btn-gold btn-full" onClick={handleShareReceipt}>
              {copied ? 'Kopyalandi!' : 'Paylas'}
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => setShowReceipt(false)}>
              Geri
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="success-overlay">
        <div className="success-card review-card">
          <h2 className="review-title">Deneyiminizi Puanlayin</h2>
          <p className="review-subtitle">Gorusunuz bizim icin degerli</p>

          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`star-btn ${star <= (hoverRating || rating) ? 'active' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                type="button"
              >
                &#9733;
              </button>
            ))}
          </div>

          <div className="review-comment-group">
            <textarea
              className="review-textarea"
              placeholder="Yorumunuz (istege bagli)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className="review-actions">
            <button
              className="btn btn-gold btn-full"
              onClick={handleSubmitReview}
              disabled={rating === 0 || submitting}
            >
              {submitting ? 'Gonderiliyor...' : 'Gonder'}
            </button>
            <button
              className="btn btn-ghost btn-full"
              onClick={handleClose}
            >
              Atla
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Post-payment loyalty prompt
  if (showLoyalty && !loyaltySaved) {
    return (
      <div className="success-overlay">
        <div className="success-card">
          <h2 className="review-title">Puan Kazanin</h2>
          <p className="review-subtitle">Bu odemeyle puan kazanmak icin telefon numaranizi girin.</p>
          <div className="loyalty-earn-input-row">
            <input
              type="tel"
              className="loyalty-input"
              placeholder="05XX XXX XX XX"
              value={loyaltyPhone}
              onChange={(e) => setLoyaltyPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoyaltyEarn()}
            />
          </div>
          <div className="review-actions" style={{ marginTop: '1rem' }}>
            <button
              className="btn btn-gold btn-full"
              onClick={handleLoyaltyEarn}
              disabled={!loyaltyPhone.trim() || loyaltySaving}
            >
              {loyaltySaving ? 'Kaydediliyor...' : 'Puan Kazan'}
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => { setShowLoyalty(false); setShowReview(true); }}>
              Atla
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showLoyalty && loyaltySaved) {
    return (
      <div className="success-overlay">
        <div className="success-card">
          <div className="review-thank-you-icon">&#9733;</div>
          <h2 className="success-title">Puan Kaydedildi!</h2>
          <p className="success-message">Tesekkurler, puaniniz hesabiniza eklendi.</p>
          <button className="btn btn-gold" onClick={() => { setShowLoyalty(false); setShowReview(true); }} style={{ marginTop: '1.5rem' }}>
            Devam Et
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="success-overlay">
      <div className="success-card">
        <div className="success-checkmark">
          <svg viewBox="0 0 52 52" className="checkmark-svg">
            <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <h2 className="success-title">Odeme Basarili!</h2>
        {amount && <p className="success-amount">{amount}</p>}
        <p className="success-message">Tesekkur ederiz, odemeniz alindi.</p>

        <div className="success-actions-col">
          <button className="btn btn-outline btn-full btn-sm" onClick={handleFetchReceipt} disabled={receiptLoading}>
            {receiptLoading ? 'Yukleniyor...' : 'Dijital Fis'}
          </button>
          {receiptError && <p className="error-message" style={{ textAlign: 'center' }}>{receiptError}</p>}
          <button className="btn btn-gold btn-full" onClick={() => setShowLoyalty(true)}>
            Devam Et
          </button>
        </div>
      </div>
    </div>
  );
}
