import React from 'react';

// Müşteri sayfalarının altında çıkan "QR Hesap ile çalışıyor" rozeti.
// Sadece restoran whitelabel açtıysa gizlenir (pro+ paket).
export default function BrandingFooter({ hide }) {
  if (hide) return null;

  return (
    <div className="branding-footer">
      <a
        href="https://qrhesap.net"
        target="_blank"
        rel="noopener noreferrer"
        className="branding-link"
      >
        <span className="branding-icon">⚡</span>
        <span>
          <span className="branding-text-soft">Bu menü</span>{' '}
          <span className="branding-text-bold">QR Hesap</span>{' '}
          <span className="branding-text-soft">ile çalışıyor</span>
        </span>
        <span className="branding-arrow">›</span>
      </a>
    </div>
  );
}
