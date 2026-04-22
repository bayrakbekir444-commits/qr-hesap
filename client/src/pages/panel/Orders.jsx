import React, { useEffect, useState } from 'react';
import api, { formatTL } from '../../utils/api';
import Loading from '../../components/Loading';

export default function Orders() {
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);

  const reloadTables = async () => {
    try {
      const r = await api.get('/tables');
      setTables(r.data);
    } catch {}
  };

  useEffect(() => {
    Promise.all([api.get('/tables'), api.get('/menu')])
      .then(([tRes, mRes]) => {
        setTables(tRes.data);
        const allItems = [];
        (mRes.data || []).forEach((cat) => {
          (cat.items || []).forEach((it) =>
            allItems.push({ ...it, category_name: cat.name })
          );
        });
        setMenuItems(allItems);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Her 5 saniyede bir masaları yenile — yeni sipariş gelirse anında görünsün
    const interval = setInterval(reloadTables, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrder = async (tableId) => {
    setOrderLoading(true);
    try {
      const res = await api.get(`/orders/${tableId}`);
      // backend returns { order, items }
      const data = res.data;
      if (data?.order) {
        setOrder({ ...data.order, items: data.items || [] });
      } else {
        setOrder({ items: [] });
      }
    } catch {
      setOrder({ items: [] });
    } finally {
      setOrderLoading(false);
    }
  };

  const selectTable = (table) => {
    setSelectedTable(table);
    fetchOrder(table.id);
  };

  const addItem = async (menuItem) => {
    if (!selectedTable) return;
    try {
      await api.post(`/orders/${selectedTable.id}/items`, {
        items: [
          {
            menu_item_id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
          },
        ],
      });
      fetchOrder(selectedTable.id);
      const tRes = await api.get('/tables');
      setTables(tRes.data);
    } catch { /* ignore */ }
  };

  const removeItem = async (itemId) => {
    if (!selectedTable) return;
    try {
      await api.delete(`/orders/${selectedTable.id}/items/${itemId}`);
      fetchOrder(selectedTable.id);
    } catch { /* ignore */ }
  };

  const closeTable = async () => {
    if (!selectedTable) return;
    if (!confirm('Masayi kapatmak istediginize emin misiniz?')) return;
    try {
      await api.put(`/orders/${selectedTable.id}/close`);
      setOrder(null);
      setSelectedTable(null);
      const res = await api.get('/tables');
      setTables(res.data);
    } catch { /* ignore */ }
  };

  if (loading) return <Loading />;

  const rawOrderItems = order?.items || [];
  const orderItems = rawOrderItems.map((i) => ({
    ...i,
    name: i.name || i.item_name,
    price: i.price !== undefined ? i.price : i.unit_price,
  }));
  const total = orderItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);

  return (
    <div className="orders-page">
      <h1 className="panel-page-title">Siparisler</h1>

      <div className="orders-layout">
        {/* Tables sidebar */}
        <div className="panel-card orders-tables">
          {/* Açık masalar — sadece gerçek ürün olanlar */}
          {tables.some((t) => t.has_open_order && t.item_count > 0) && (
            <>
              <h3 style={{ color: '#dc2626' }}>
                🔴 Açık Masalar ({tables.filter((t) => t.has_open_order && t.item_count > 0).length})
              </h3>
              <div className="orders-table-list" style={{ marginBottom: '1rem' }}>
                {tables.filter((t) => t.has_open_order && t.item_count > 0).map((t) => (
                  <button
                    key={t.id}
                    className={`orders-table-btn occupied ${selectedTable?.id === t.id ? 'active' : ''}`}
                    onClick={() => selectTable(t)}
                    style={{
                      background: selectedTable?.id === t.id ? '#dc2626' : '#fee2e2',
                      color: selectedTable?.id === t.id ? '#fff' : '#991b1b',
                      border: '2px solid #dc2626',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t.name || `Masa ${t.table_number}`}</span>
                      <span style={{ fontSize: '0.85rem' }}>
                        {t.item_count} ürün · {formatTL(t.order_total || 0)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <h3 style={{ color: '#6b7280' }}>Boş Masalar</h3>
          <div className="orders-table-list">
            {tables.filter((t) => !t.has_open_order || !t.item_count).map((t) => (
              <button
                key={t.id}
                className={`orders-table-btn ${selectedTable?.id === t.id ? 'active' : ''}`}
                onClick={() => selectTable(t)}
              >
                {t.name || `Masa ${t.table_number}`}
              </button>
            ))}
          </div>
        </div>

        {/* Order detail */}
        <div className="orders-detail">
          {!selectedTable ? (
            <div className="panel-card">
              <p className="empty-text">Siparis goruntulemek icin bir masa secin.</p>
            </div>
          ) : orderLoading ? (
            <Loading />
          ) : (
            <>
              <div className="panel-card">
                <div className="card-header-row">
                  <h3>{selectedTable.name || `Masa ${selectedTable.number}`} - Siparis</h3>
                  {orderItems.length > 0 && (
                    <button className="btn btn-ghost btn-sm danger-text" onClick={closeTable}>
                      Masayi Kapat
                    </button>
                  )}
                </div>

                {orderItems.length === 0 ? (
                  <p className="empty-text">Bu masada siparis yok.</p>
                ) : (
                  <>
                    <table className="panel-table">
                      <thead>
                        <tr>
                          <th>Urun</th>
                          <th>Adet</th>
                          <th>Fiyat</th>
                          <th>Islem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map((item, i) => (
                          <tr key={item.id || i}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              {item.note && (
                                <div style={{
                                  fontSize: '0.8rem',
                                  color: '#b45309',
                                  fontStyle: 'italic',
                                  marginTop: '0.25rem',
                                  background: '#fef3c7',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  display: 'inline-block',
                                }}>
                                  📝 {item.note}
                                </div>
                              )}
                            </td>
                            <td>{item.quantity}</td>
                            <td>{formatTL(item.price * item.quantity)}</td>
                            <td>
                              <button className="btn-icon danger" onClick={() => removeItem(item.id)} title="Kaldir">
                                &#10005;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="order-total">
                      <span>Toplam:</span>
                      <span className="order-total-amount">{formatTL(total)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Add Item */}
              <div className="panel-card">
                <h3>Urun Ekle</h3>
                <div className="menu-add-grid">
                  {menuItems.map((item) => (
                    <button key={item.id} className="menu-add-btn" onClick={() => addItem(item)}>
                      <span className="menu-add-name">{item.name}</span>
                      <span className="menu-add-price">{formatTL(item.price)}</span>
                    </button>
                  ))}
                  {menuItems.length === 0 && <p className="empty-text">Menuye urun ekleyin.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
