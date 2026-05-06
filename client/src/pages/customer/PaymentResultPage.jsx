import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// iyzico callback'in yönlendirdiği sayfa.
// 3DS iframe içinde açılır; parent window'a postMessage göndererek
// PaymentPage'in polling'ini hızlandırır ve iframe'i kapattırır.
export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || 'unknown';
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    try {
      window.parent?.postMessage(
        { type: 'qrhesap:payment_result', status, paymentId },
        '*'
      );
    } catch {}
  }, [status, paymentId]);

  const isSuccess = status === 'success';
  const isFailed = status === 'failed';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      padding: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        padding: 32,
        borderRadius: 16,
        textAlign: 'center',
        maxWidth: 360,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>
          {isSuccess ? '✅' : isFailed ? '❌' : '⏳'}
        </div>
        <h2 style={{
          margin: '0 0 8px',
          fontSize: 22,
          color: isSuccess ? '#059669' : isFailed ? '#dc2626' : '#374151',
        }}>
          {isSuccess ? 'Ödeme Başarılı' : isFailed ? 'Ödeme Başarısız' : 'İşleniyor'}
        </h2>
        <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
          {isSuccess
            ? 'Ödemeniz tamamlandı. Bu pencereyi kapatabilirsiniz.'
            : isFailed
              ? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'
              : 'Lütfen bekleyin...'}
        </p>
      </div>
    </div>
  );
}
