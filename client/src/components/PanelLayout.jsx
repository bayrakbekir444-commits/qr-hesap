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
    </div>
  );
}
