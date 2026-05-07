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
  const audioRef = useRef(null);
  const tickRef = useRef(0);

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

  // Kalemleri kolonlara grupla
  const grouped = useMemo(() => {
    const g = { pending: [], preparing: [], ready: [] };
    for (const it of items) {
      if (g[it.kitchen_status]) g[it.kitchen_status].push(it);
    }
    return g;
  }, [items]);

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
              <span className="kds-col-count">{grouped[col.key].length}</span>
            </div>

            <div className="kds-cards">
              {grouped[col.key].length === 0 && (
                <div className="kds-empty">—</div>
              )}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
