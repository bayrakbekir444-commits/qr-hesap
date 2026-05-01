import React, { useState } from 'react';

function maskCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function maskExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function maskCvc(value) {
  return value.replace(/\D/g, '').slice(0, 4);
}

function detectBrand(number) {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(n)) return 'mastercard';
  if (/^9792/.test(n)) return 'troy';
  if (/^3[47]/.test(n)) return 'amex';
  return 'generic';
}

const BRAND_INFO = {
  visa:       { label: 'VISA',       gradient: 'linear-gradient(135deg, #1a1f71 0%, #2c4ec5 50%, #1a1f71 100%)' },
  mastercard: { label: 'mastercard', gradient: 'linear-gradient(135deg, #eb001b 0%, #f79e1b 100%)' },
  troy:       { label: 'troy',       gradient: 'linear-gradient(135deg, #c8102e 0%, #1a1f71 100%)' },
  amex:       { label: 'AMEX',       gradient: 'linear-gradient(135deg, #2e77bb 0%, #006fcf 100%)' },
  generic:    { label: '',           gradient: 'linear-gradient(135deg, #2c3e50 0%, #16213e 100%)' },
};

export default function CreditCardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [flipped, setFlipped] = useState(false);

  const handleChange = (field) => (e) => {
    let val = e.target.value;
    if (field === 'number') val = maskCardNumber(val);
    else if (field === 'expiry') val = maskExpiry(val);
    else if (field === 'cvc') val = maskCvc(val);
    setCard((prev) => ({ ...prev, [field]: val }));
  };

  const isValid =
    card.number.replace(/\s/g, '').length >= 15 &&
    card.expiry.length === 5 &&
    card.cvc.length >= 3 &&
    card.name.trim().length > 2;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid || loading) return;
    onSubmit({
      cardNumber: card.number.replace(/\s/g, ''),
      expiry: card.expiry,
      cvc: card.cvc,
      cardHolder: card.name,
    });
  };

  const brand = detectBrand(card.number);
  const info = BRAND_INFO[brand];

  return (
    <form className="cc-form" onSubmit={handleSubmit}>
      <div className={`cc-card-3d ${flipped ? 'flipped' : ''}`}>
        <div className="cc-card-face cc-card-front" style={{ background: info.gradient }}>
          <div className="cc-shine" />
          <div className="cc-top-row">
            <div className="cc-chip" />
            <div className="cc-brand">{info.label}</div>
          </div>
          <div className="cc-preview-number">{card.number || '•••• •••• •••• ••••'}</div>
          <div className="cc-preview-bottom">
            <div>
              <span className="cc-label">KART SAHİBİ</span>
              <span className="cc-preview-name">{card.name || 'AD SOYAD'}</span>
            </div>
            <div>
              <span className="cc-label">SON KULLANMA</span>
              <span className="cc-preview-expiry">{card.expiry || 'AA/YY'}</span>
            </div>
          </div>
        </div>
        <div className="cc-card-face cc-card-back" style={{ background: info.gradient }}>
          <div className="cc-magnetic" />
          <div className="cc-cvc-strip">
            <span className="cc-label">CVC</span>
            <div className="cc-cvc-box">{card.cvc || '•••'}</div>
          </div>
          <div className="cc-back-brand">{info.label}</div>
        </div>
      </div>

      <div className="form-group">
        <label>Kart Numarasi</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="xxxx xxxx xxxx xxxx"
          value={card.number}
          onChange={handleChange('number')}
          maxLength={19}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Son Kullanma</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="AA/YY"
            value={card.expiry}
            onChange={handleChange('expiry')}
            maxLength={5}
          />
        </div>
        <div className="form-group">
          <label>CVC</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="***"
            value={card.cvc}
            onChange={handleChange('cvc')}
            onFocus={() => setFlipped(true)}
            onBlur={() => setFlipped(false)}
            maxLength={4}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Kart Uzerindeki Isim</label>
        <input
          type="text"
          placeholder="Ad Soyad"
          value={card.name}
          onChange={handleChange('name')}
          autoComplete="cc-name"
        />
      </div>

      <button type="submit" className="btn btn-accent btn-full" disabled={!isValid || loading}>
        {loading ? (
          <span className="btn-loading">
            <span className="spinner-small" /> Odeniyor...
          </span>
        ) : (
          'Ode'
        )}
      </button>
    </form>
  );
}
