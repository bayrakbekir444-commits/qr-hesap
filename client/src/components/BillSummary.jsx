import React from 'react';
import { formatTL } from '../utils/api';

export default function BillSummary({ items = [] }) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="bill-summary">
      <div className="bill-items">
        {items.map((item, i) => (
          <div key={i} className="bill-item">
            <div className="bill-item-left">
              <span className="bill-item-qty">{item.quantity}x</span>
              <div>
                <span className="bill-item-name">{item.name}</span>
                {item.note && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
                    📝 {item.note}
                  </div>
                )}
              </div>
            </div>
            <span className="bill-item-price">{formatTL(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="bill-divider" />
      <div className="bill-total">
        <span>Ara Toplam</span>
        <span className="bill-total-amount">{formatTL(subtotal)}</span>
      </div>
    </div>
  );
}
