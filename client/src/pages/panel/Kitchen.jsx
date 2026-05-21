import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import api from '../../utils/api';
import { connectSocket, getSocket } from '../../utils/realtime';

const COLUMNS = [
  { key: 'pending', label: 'Yeni', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'preparing', label: 'Yapılıyor', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'ready', label: 'Hazır', color: '#10b981', bg: '#ecfdf5' },
];

const NEXT_STATUS = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'şimdi';
  if (min < 60) return `${min} dk`;
  const hr = Math.floor(min / 60);
  return `${hr} sa ${min % 60} dk`;
}

function urgencyClass(iso) {
  if (!iso) return '';
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (min > 20) return 'urgency-high';
  if (min > 10) return 'urgency-mid';
  return '';
}

export default function Kitchen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('kds_view') || 'orders');
  const audioRef = useRef(null);
  const tickRef = useRef(0);

  useEffect(() => {
    localStorage.setItem('kds_view', viewMode);
  }, [viewMode]);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/kitchen/items');
      setItems(res.data.items || []);
    } catch (err) {
      console.error('KDS load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const token = localStorage.getItem('token');
    const socket = connectSocket(token);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onAuthOk = () => setConnected(true);

    const onItemsAdded = (payload) => {
      // Yeni siparişler geldi → listeyi yenile + ses
      load();
      if (!muted) playBeep();
    };

    const onStatusChanged = (payload) => {
      setItems((prev) => prev.map((it) => it.id === payload.item_id
        ? { ...it, kitchen_status: payload.status, kitchen_updated_at: payload.at }
        : it
      ));
    };

    const onOrderStatusChanged = () => load();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('auth:ok', onAuthOk);
    socket.on('order:items_added', onItemsAdded);
    socket.on('kitchen:status_changed', onStatusChanged);
    socket.on('kitchen:order_status_changed', onOrderStatusChanged);

    setConnected(socket.connected);

    // Her 5 saniyede bir liste yenile (WebSocket koparsa bile sipariş hızlı düşsün)
    const id = setInterval(load, 5000);
    // Her 5 saniyede bir tick — timeAgo güncellensin
    const tickId = setInterval(() => { tickRef.current++; setItems((p) => [...p]); }, 5000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('auth:ok', onAuthOk);
      socket.off('order:items_added', onItemsAdded);
      socket.off('kitchen:status_changed', onStatusChanged);
      socket.off('kitchen:order_status_changed', onOrderStatusChanged);
      clearInterval(id);
      clearInterval(tickId);
    };
  }, [load, muted]);

  const playBeep = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU')
        audioRef.current.volume = 0.6;
      }
      // Daha iyi ses: Web Audio API ile basit beep
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 250);
    } catch {}
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/kitchen/items/${id}/status`, { status });
      setItems((prev) => prev.map((it) => it.id === id
        ? { ...it, kitchen_status: status, kitchen_updated_at: new Date().toISOString() }
        : it
      ));
    } catch (err) {
      alert('Güncellenemedi: ' + (err.response?.data?.error || err.message));
    }
  };

  // Kalemleri kolonlara grupla (item bazlı görünüm)
  const grouped = useMemo(() => {
    const g = { pending: [], preparing: [], ready: [] };
    for (const it of items) {
      if (g[it.kitchen_status]) g[it.kitchen_status].push(it);
    }
    return g;
  }, [items]);

  // Sipariş bazlı: aynı order_id'deki ürünleri tek karta topla, ana kolon = en geri durumlu item
  const orderGrouped = useMemo(() => {
    const STATUS_RANK = { pending: 0, preparing: 1, ready: 2 };
    const byOrder = new Map();
    for (const it of items) {
      if (!byOrder.has(it.order_id)) {
        byOrder.set(it.order_id, {
          order_id: it.order_id,
          table_number: it.table_number,
          table_name: it.table_name,
          created_at: it.created_at,
          items: [],
        });
      }
      const o = byOrder.get(it.order_id);
      o.items.push(it);
      // en eski created_at'i tut
      if (new Date(it.created_at) < new Date(o.created_at)) o.created_at = it.created_at;
    }
    const g = { pending: [], preparing: [], ready: [] };
    for (const order of byOrder.values()) {
      // Karar: siparişin durumunu en geri kalan kalem belirler
      let minRank = 99;
      for (const it of order.items) {
        const r = STATUS_RANK[it.kitchen_status];
        if (r !== undefined && r < minRank) minRank = r;
      }
      const status = minRank === 0 ? 'pending' : minRank === 1 ? 'preparing' : minRank === 2 ? 'ready' : null;
      if (status) g[status].push(order);
    }
    // Her kolonu eskiden yeniye sırala
    for (const k of Object.keys(g)) {
      g[k].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    return g;
  }, [items]);

  const advanceOrder = async (order, nextStatus) => {
    // Siparişteki uygun kalemleri toplu ilerlet
    const targets = order.items.filter((it) => {
      if (nextStatus === 'preparing') return it.kitchen_status === 'pending';
      if (nextStatus === 'ready') return it.kitchen_status !== 'ready' && it.kitchen_status !== 'served';
      if (nextStatus === 'served') return it.kitchen_status === 'ready';
      return false;
    });
    await Promise.all(targets.map((it) => updateStatus(it.id, nextStatus)));
  };

  if (loading) {
    return <div className="kds-loading">Yükleniyor…</div>;
  }

  return (
    <div className="kds-page">
      <div className="kds-header">
        <div className="kds-title">
          <span className="kds-icon">🍳</span>
          <h1>Mutfak Ekranı</h1>
        </div>
        <div className="kds-meta">
          <div className="kds-view-toggle">
            <button
              className={viewMode === 'orders' ? 'active' : ''}
              onClick={() => setViewMode('orders')}
              title="Aynı masanın tüm siparişleri tek kartta"
            >
              🧾 Sipariş Bazlı
            </button>
            <button
              className={viewMode === 'items' ? 'active' : ''}
              onClick={() => setViewMode('items')}
              title="Her ürün ayrı kartta"
            >
              🍽️ Ürün Bazlı
            </button>
          </div>
          <span className={`kds-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '● Canlı' : '○ Bağlanıyor...'}
          </span>
          <button
            className="kds-mute"
            onClick={() => setMuted((m) => !m)}
            title={muted ? 'Sesi aç' : 'Sesi kapat'}
          >
            {muted ? '🔇' : '🔔'}
          </button>
          <span className="kds-clock">{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <div className="kds-board">
        {COLUMNS.map((col) => (
          <div key={col.key} className="kds-column" style={{ background: col.bg }}>
            <div className="kds-col-header" style={{ color: col.color, borderBottomColor: col.color }}>
              <span>{col.label}</span>
              <span className="kds-col-count">
                {viewMode === 'orders' ? orderGrouped[col.key].length : grouped[col.key].length}
              </span>
            </div>

            <div className="kds-cards">
              {viewMode === 'items' && (
                <>
                  {grouped[col.key].length === 0 && <div className="kds-empty">—</div>}
                  {grouped[col.key].map((it) => (
                    <div key={it.id} className={`kds-card ${urgencyClass(it.created_at)}`}>
                      <div className="kds-card-top">
                        <span className="kds-table">Masa {it.table_number || it.table_name || '-'}</span>
                        <span className="kds-time">{timeAgo(it.created_at)}</span>
                      </div>
                      <div className="kds-item-name">
                        <span className="kds-qty">×{it.quantity}</span>
                        <span>{it.item_name || 'Ürün'}</span>
                      </div>
                      {it.note && <div className="kds-note">📝 {it.note}</div>}
                      <div className="kds-actions">
                        {NEXT_STATUS[col.key] && (
                          <button
                            className="kds-btn primary"
                            onClick={() => updateStatus(it.id, NEXT_STATUS[col.key])}
                          >
                            {col.key === 'pending' && '▶ Başla'}
                            {col.key === 'preparing' && '✓ Hazır'}
                            {col.key === 'ready' && '🍽️ Servis'}
                          </button>
                        )}
                        {col.key === 'pending' && (
                          <button className="kds-btn ghost" onClick={() => updateStatus(it.id, 'cancelled')}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {viewMode === 'orders' && (
                <>
                  {orderGrouped[col.key].length === 0 && <div className="kds-empty">—</div>}
                  {orderGrouped[col.key].map((order) => (
                    <div key={order.order_id} className={`kds-card kds-order-card ${urgencyClass(order.created_at)}`}>
                      <div className="kds-card-top">
                        <span className="kds-table kds-table-big">
                          🪑 Masa {order.table_number || order.table_name || '-'}
                        </span>
                        <span className="kds-time">{timeAgo(order.created_at)}</span>
                      </div>
                      <div className="kds-order-items">
                        {order.items.map((it) => (
                          <div key={it.id} className={`kds-order-item kds-item-${it.kitchen_status}`}>
                            <div className="kds-order-item-main">
                              <span className="kds-qty">×{it.quantity}</span>
                              <span className="kds-order-item-name">{it.item_name || 'Ürün'}</span>
                              <span className="kds-order-item-dot" title={
                                it.kitchen_status === 'pending' ? 'Yeni' :
                                it.kitchen_status === 'preparing' ? 'Yapılıyor' : 'Hazır'
                              }>
                                {it.kitchen_status === 'pending' && '🔵'}
                                {it.kitchen_status === 'preparing' && '🟡'}
                                {it.kitchen_status === 'ready' && '🟢'}
                              </span>
                            </div>
                            {it.note && <div className="kds-order-item-note">📝 {it.note}</div>}
                          </div>
                        ))}
                      </div>
                      <div className="kds-card-summary">
                        {order.items.length} ürün
                      </div>
                      <div className="kds-actions">
                        {col.key === 'pending' && (
                          <button className="kds-btn primary" onClick={() => advanceOrder(order, 'preparing')}>
                            ▶ Tümünü Başlat
                          </button>
                        )}
                        {col.key === 'preparing' && (
                          <button className="kds-btn primary" onClick={() => advanceOrder(order, 'ready')}>
                            ✓ Tümü Hazır
                          </button>
                        )}
                        {col.key === 'ready' && (
                          <button className="kds-btn primary" onClick={() => advanceOrder(order, 'served')}>
                            🍽️ Servis Edildi
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
