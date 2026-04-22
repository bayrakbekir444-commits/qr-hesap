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

export default function CreditCardForm({ onSubmit, loading }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });

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

  return (
    <form className="cc-form" onSubmit={handleSubmit}>
      <div className="cc-card-preview">
        <div className="cc-chip" />
        <div className="cc-preview-number">{card.number || 'xxxx xxxx xxxx xxxx'}</div>
        <div className="cc-preview-bottom">
          <div>
            <span className="cc-label">KART SAHIBI</span>
            <span className="cc-preview-name">{card.name || 'AD SOYAD'}</span>
          </div>
          <div>
            <span className="cc-label">SON KULLANMA</span>
            <span className="cc-preview-expiry">{card.expiry || 'AA/YY'}</span>
          </div>
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
