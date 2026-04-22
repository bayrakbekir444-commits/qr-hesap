import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const RENK = {
  temel: '#6b7280',
  pro: '#7c3aed',
  zincir: '#d97706',
};

export default function PackageBadge() {
  const [pkg, setPkg] = useState(null);

  useEffect(() => {
    api.get('/auth/package')
      .then((res) => setPkg(res.data))
      .catch(() => {});
  }, []);

  if (!pkg) return null;

  const usageRatio = pkg.max_tables > 0 ? (pkg.current_tables / pkg.max_tables) : 0;
  const renk = RENK[pkg.type] || '#6b7280';

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, ' + renk + ', ' + renk + 'cc)',
        color: '#fff',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        marginBottom: '1rem',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85, letterSpacing: 1, fontWeight: 700 }}>PAKETİNİZ</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{pkg.label}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            {pkg.monthly_fee}₺/ay · {pkg.current_tables}/{pkg.max_tables} masa
          </div>
        </div>
        {pkg.expires_at && (
          <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
            <div style={{ opacity: 0.85 }}>Bitiş</div>
            <div style={{ fontWeight: 700 }}>{pkg.expires_at}</div>
            {pkg.expired && (
              <div style={{
                background: '#fff',
                color: '#dc2626',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                marginTop: '0.5rem',
                fontWeight: 800,
                fontSize: '0.75rem',
              }}>
                ⚠ SÜRESİ DOLMUŞ
              </div>
            )}
          </div>
        )}
      </div>
      {usageRatio > 0.8 && pkg.type !== 'zincir' && (
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          marginTop: '0.75rem',
          fontSize: '0.85rem',
        }}>
          ⚠ Masa limitine yaklaşıyorsun — Pro pakete yükseltmeyi düşün
        </div>
      )}
    </div>
  );
}
