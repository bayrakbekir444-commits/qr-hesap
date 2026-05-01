import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="nf-page">
      <div className="nf-container">
        <div className="nf-emoji">🍽️</div>
        <h1 className="nf-code">404</h1>
        <h2 className="nf-title">Sayfa bulunamadı</h2>
        <p className="nf-desc">
          Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </p>
        <div className="nf-actions">
          <Link to="/" className="lp-btn lp-btn-primary">
            🏠 Ana sayfaya dön
          </Link>
          <Link to="/panel/login" className="lp-btn lp-btn-ghost">
            🔐 Restoran paneli
          </Link>
        </div>
        <div className="nf-hint">
          Yardıma mı ihtiyacın var? Sağ alttaki WhatsApp butonu ile yaz.
        </div>
      </div>
    </div>
  );
}
