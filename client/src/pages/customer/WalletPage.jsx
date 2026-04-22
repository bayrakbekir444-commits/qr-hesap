import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { formatTL } from '../../utils/api';
import { isLoggedIn, getUserToken, getUserData, logout } from '../../utils/userAuth';
import Loading from '../../components/Loading';

export default function WalletPage() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const userData = getUserData();

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const fetchWallet = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${getUserToken()}` };
      const [walletRes, txRes, notifRes] = await Promise.all([
        api.get('/wallet', { headers }),
        api.get('/wallet/transactions', { headers }),
        api.get('/notifications', { headers }).catch(() => ({ data: [] })),
      ]);
      setBalance(walletRes.data.balance ?? 0);
      setTransactions(txRes.data || []);
      const notifs = notifRes.data || [];
      setUnreadCount(notifs.filter((n) => !n.read).length);
    } catch (err) {
      setError(err.response?.data?.error || 'Cuzdan bilgisi alinamadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn()) fetchWallet();
  }, [fetchWallet]);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      setDepositError('Gecerli bir tutar girin.');
      return;
    }
    setDepositLoading(true);
    setDepositError(null);
    try {
      const headers = { Authorization: `Bearer ${getUserToken()}` };
      await api.post('/wallet/deposit', { amount }, { headers });
      setDepositOpen(false);
      setDepositAmount('');
      await fetchWallet();
    } catch (err) {
      setDepositError(err.response?.data?.error || 'Para yukleme basarisiz.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const PRESET_AMOUNTS = [50, 100, 200, 500];

  if (loading) return <Loading text="Cuzdan yukleniyor..." />;

  if (error) {
    return (
      <div className="customer-page">
        <div className="customer-container">
          <div className="error-card">
            <div className="error-icon">!</div>
            <h2>Hata</h2>
            <p>{error}</p>
            <button className="btn btn-accent" onClick={() => window.location.reload()}>
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page wallet-page">
      <div className="customer-container">
        {/* Top bar */}
        <div className="wallet-topbar">
          <div className="wallet-greeting">
            <span className="wallet-greeting-hi">Merhaba,</span>
            <span className="wallet-greeting-name">{userData?.name || 'Kullanici'}</span>
          </div>
          <div className="wallet-topbar-actions">
            <Link to="/notifications" className="wallet-notif-btn">
              <span className="wallet-notif-icon">&#128276;</span>
              {unreadCount > 0 && (
                <span className="wallet-notif-badge">{unreadCount}</span>
              )}
            </Link>
            <button className="btn-icon" onClick={handleLogout} title="Cikis Yap">
              &#9211;
            </button>
          </div>
        </div>

        {/* Wallet card */}
        <div className="wallet-card">
          <div className="wallet-card-label">Cuzdan Bakiyesi</div>
          <div className="wallet-balance">
            {Number(balance).toFixed(2).replace('.', ',')} &#8378;
          </div>
          <div className="wallet-card-decoration"></div>
        </div>

        {/* Deposit button */}
        <button
          className="btn btn-gold btn-full wallet-deposit-btn"
          onClick={() => setDepositOpen(true)}
        >
          Para Yukle
        </button>

        {/* Deposit modal */}
        {depositOpen && (
          <div className="modal-overlay" onClick={() => setDepositOpen(false)}>
            <div className="deposit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="deposit-modal-header">
                <h2 className="deposit-modal-title">Para Yukle</h2>
                <button
                  className="deposit-modal-close"
                  onClick={() => setDepositOpen(false)}
                >
                  &#10005;
                </button>
              </div>

              <div className="deposit-presets">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    className={`deposit-preset-btn ${depositAmount === String(amt) ? 'active' : ''}`}
                    onClick={() => setDepositAmount(String(amt))}
                  >
                    {amt} &#8378;
                  </button>
                ))}
              </div>

              <div className="deposit-input-row">
                <input
                  type="number"
                  className="deposit-input"
                  placeholder="Tutar girin"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="1"
                  step="0.01"
                />
                <span className="deposit-input-currency">&#8378;</span>
              </div>

              {depositError && <div className="error-message">{depositError}</div>}

              <button
                className="btn btn-gold btn-full"
                onClick={handleDeposit}
                disabled={depositLoading}
              >
                {depositLoading ? 'Yukleniyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className="wallet-section">
          <h3 className="wallet-section-title">Islem Gecmisi</h3>
          {transactions.length === 0 ? (
            <div className="wallet-empty">Henuz islem yok.</div>
          ) : (
            <div className="tx-list">
              {transactions.map((tx, i) => {
                const isPositive = tx.type === 'deposit' || tx.amount > 0;
                const displayAmount = Math.abs(tx.amount);
                return (
                  <div key={tx.id || i} className="tx-item">
                    <div className="tx-left">
                      <div className={`tx-icon ${isPositive ? 'tx-icon-deposit' : 'tx-icon-payment'}`}>
                        {isPositive ? '+' : '-'}
                      </div>
                      <div className="tx-info">
                        <span className="tx-desc">
                          {tx.description || (isPositive ? 'Para Yukleme' : 'Odeme')}
                        </span>
                        <span className="tx-date">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                    </div>
                    <span className={`tx-amount ${isPositive ? 'tx-amount-positive' : 'tx-amount-negative'}`}>
                      {isPositive ? '+' : '-'}{formatTL(displayAmount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="powered-by">QR Hesap ile guvenli odeme</div>
      </div>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        <Link to="/wallet" className="bottom-nav-item active">
          <span className="bottom-nav-icon">&#128179;</span>
          <span className="bottom-nav-label">Cuzdan</span>
        </Link>
        <Link to="/scan" className="bottom-nav-item">
          <span className="bottom-nav-icon">&#128247;</span>
          <span className="bottom-nav-label">QR Tara</span>
        </Link>
        <Link to="/notifications" className="bottom-nav-item">
          <span className="bottom-nav-icon">&#128276;</span>
          <span className="bottom-nav-label">Bildirimler</span>
          {unreadCount > 0 && <span className="bottom-nav-badge">{unreadCount}</span>}
        </Link>
        <button className="bottom-nav-item" onClick={handleLogout}>
          <span className="bottom-nav-icon">&#128100;</span>
          <span className="bottom-nav-label">Cikis</span>
        </button>
      </nav>
    </div>
  );
}
