import React, { useEffect, useState, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../utils/api';

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function formatAge(createdAt) {
  const sec = Math.floor((Date.now() - new Date(createdAt)) / 1000);
  if (sec < 5) return 'şimdi';
  if (sec < 60) return `${sec} sn önce`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} dk önce`;
  return `${Math.floor(m / 60)} saat önce`;
}

const SEEN_ORDERS_KEY = 'qr_hesap_seen_orders';
const getSeenOrders = () => {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_ORDERS_KEY) || '[]')); }
  catch { return new Set(); }
};
const markSeen = (id) => {
  const set = getSeenOrders();
  set.add(`${id}_${Date.now()}`);
  // 1 saatten eski işaretleri temizle (id_timestamp formatı)
  const fresh = [...set].filter((s) => Date.now() - Number(s.split('_')[1] || 0) < 3600000);
  localStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify(fresh));
};
const isSeen = (id, updatedAt) => {
  const set = getSeenOrders();
  const ts = new Date(updatedAt).getTime();
  return [...set].some((s) => {
    const [seenId, seenTime] = s.split('_');
    return Number(seenId) === id && Number(seenTime) >= ts;
  });
};

function NotificationsBell() {
  const [calls, setCalls] = useState([]);
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const prevCallIdsRef = useRef(new Set());
  const prevOrderKeysRef = useRef(new Set());
  const initializedRef = useRef(false);

  const fetchAll = async () => {
    try {
      const [callsRes, ordersRes] = await Promise.all([
        api.get('/waiter/calls').catch(() => ({ data: [] })),
        api.get('/orders/new-alerts').catch(() => ({ data: [] })),
      ]);
      const callList = callsRes.data || [];
      const orderList = (ordersRes.data || []).filter((o) => !isSeen(o.id, o.updated_at));

      // Yeni geldi mi kontrol — beep
      const callIds = new Set(callList.map((c) => c.id));
      const orderKeys = new Set(orderList.map((o) => `${o.id}_${o.updated_at}`));
      const newCall = [...callIds].some((id) => !prevCallIdsRef.current.has(id));
      const newOrder = [...orderKeys].some((k) => !prevOrderKeysRef.current.has(k));

      if (initializedRef.current && (newCall || newOrder)) beep();
      initializedRef.current = true;

      prevCallIdsRef.current = callIds;
      prevOrderKeysRef.current = orderKeys;
      setCalls(callList);
      setOrders(orderList);
    } catch {}
  };

  useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 6000);
    return () => clearInterval(i);
  }, []);

  const dismissCall = async (id) => {
    try { await api.put(`/waiter/calls/${id}/dismiss`); fetchAll(); } catch {}
  };

  const seenOrder = (order) => {
    markSeen(order.id);
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
  };

  const totalCount = calls.length + orders.length;

  return (
    <div className="waiter-notifier">
      <button
        className={`waiter-bell ${totalCount > 0 ? 'pulsing' : ''}`}
        onClick={() => setOpen(!open)}
        title="Bildirimler"
      >
        <span>&#128276;</span>
        {totalCount > 0 && <span className="waiter-badge">{totalCount}</span>}
      </button>
      {open && (
        <>
          <div className="waiter-dropdown-overlay" onClick={() => setOpen(false)} />
          <div className="waiter-dropdown">
            <div className="waiter-dropdown-header">
              Bildirimler
              <span style={{ float: 'right', opacity: 0.7 }}>{totalCount}</span>
            </div>
            {totalCount === 0 && (
              <div className="waiter-empty">Bekleyen bildirim yok</div>
            )}
            {calls.map((c) => (
              <div key={`call-${c.id}`} className="waiter-call-item notif-call">
                <div>
                  <strong>🚨 Masa {c.table_number} garson çağırdı</strong>
                  <div className="waiter-call-age">{formatAge(c.created_at)}</div>
                </div>
                <button className="waiter-call-dismiss" onClick={() => dismissCall(c.id)}>
                  ✓ Geldim
                </button>
              </div>
            ))}
            {orders.map((o) => (
              <div key={`order-${o.id}_${o.updated_at}`} className="waiter-call-item notif-order">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>🍽️ Masa {o.table_number}</strong>
                  <div className="notif-items">
                    {(o.items || []).slice(-3).map((it, idx) => (
                      <span key={idx} className="notif-item-chip">
                        {it.quantity}× {it.item_name}
                      </span>
                    ))}
                  </div>
                  <div className="waiter-call-age">{formatAge(o.updated_at)}</div>
                </div>
                <button className="waiter-call-dismiss neutral" onClick={() => seenOrder(o)}>
                  ✓ Gördüm
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PanelLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/panel/login', { replace: true });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/panel/login');
  };

  const links = [
    { to: '/panel', label: 'Genel Bakis', icon: '\u2302' },
    { to: '/panel/orders', label: 'Siparisler', icon: '\u2615' },
    { to: '/panel/menu', label: 'Menu Yonetimi', icon: '\u2630' },
    { to: '/panel/tables', label: 'Masa Yonetimi', icon: '\u25A6' },
    { to: '/panel/reports', label: 'Raporlar', icon: '\u2261' },
    { to: '/panel/staff', label: 'Personel', icon: '\u263A' },
    { to: '/panel/coupons', label: 'Kuponlar', icon: '\u1F3AB' },
    { to: '/panel/reviews', label: 'Yorumlar', icon: '\u2b50' },
    { to: '/panel/settings', label: 'Restoran Bilgileri', icon: '\u2699' },
  ];

  return (
    <div className="panel-layout">
      <button className="panel-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>

      <aside className={`panel-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="panel-logo">
          <h2>QR Hesap</h2>
          <span>Restoran Paneli</span>
        </div>
        <nav className="panel-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/panel'}
              className={({ isActive }) => `panel-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="panel-nav-icon">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button className="panel-logout" onClick={handleLogout}>
          Cikis Yap
        </button>
      </aside>

      {sidebarOpen && <div className="panel-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="panel-main">
        <NotificationsBell />
        <Outlet />
      </main>

      {/* Destek WhatsApp butonu */}
      <a
        href="https://wa.me/905436960574?text=Merhaba%2C%20QR%20Hesap%20panelinde%20destek%20istiyorum"
        target="_blank"
        rel="noreferrer"
        className="panel-support-btn"
        title="Destek için WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="panel-support-label">Destek</span>
      </a>
    </div>
  );
}
