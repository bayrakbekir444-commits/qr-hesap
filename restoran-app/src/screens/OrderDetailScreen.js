import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, Animated, Image } from 'react-native';
import api, { formatPrice } from '../utils/api';

export default function OrderDetailScreen({ route, navigation }) {
  const { tableId, tableNumber } = route.params;
  const [order, setOrder] = useState(null);
  const [menu, setMenu] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [payments, setPayments] = useState([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // QR Code state
  const [showQR, setShowQR] = useState(false);
  const [menuQrData, setMenuQrData] = useState(null);
  const [paymentQrData, setPaymentQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Merge state
  const [showMerge, setShowMerge] = useState(false);
  const [tables, setTables] = useState([]);
  const [mergeLoading, setMergeLoading] = useState(false);

  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => { loadOrder(); loadMenu(); }, []);

  const loadOrder = async () => {
    try {
      const res = await api.get(`/api/orders/${tableId}`);
      setOrder(res.data);
      if (res.data && res.data.id) {
        const pRes = await api.get(`/api/payments/${res.data.id}`);
        setPayments(pRes.data.payments || []);
      }
    } catch {}
  };

  const loadMenu = async () => {
    try {
      const res = await api.get('/api/menu');
      setMenu(res.data);
    } catch {}
  };

  const showToast = () => {
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  const addItem = async (menuItemId) => {
    try {
      await api.post(`/api/orders/${tableId}/items`, { items: [{ menu_item_id: menuItemId, quantity: 1 }] });
      setShowMenu(false);
      // Track recently added items for visual indicator
      setRecentlyAdded((prev) => [...prev, menuItemId]);
      setTimeout(() => {
        setRecentlyAdded((prev) => prev.filter((id) => id !== menuItemId));
      }, 5000);
      showToast();
      loadOrder();
    } catch (e) {
      Alert.alert('Hata', 'Ürün eklenemedi.');
    }
  };

  const removeItem = (itemId) => {
    Alert.alert('Ürün Sil', 'Bu ürünü kaldırmak istediğinize emin misiniz?', [
      { text: 'İptal' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await api.delete(`/api/orders/${tableId}/items/${itemId}`);
        loadOrder();
      }},
    ]);
  };

  const closeTable = () => {
    Alert.alert('Masayı Kapat', 'Masa kapatılsın mı?', [
      { text: 'İptal' },
      { text: 'Kapat', onPress: async () => {
        await api.put(`/api/orders/${tableId}/close`);
        navigation.goBack();
      }},
    ]);
  };

  // --- QR Code ---
  const loadQR = async () => {
    setQrLoading(true);
    try {
      const [menuRes, paymentRes] = await Promise.all([
        api.get(`/api/tables/${tableId}/menu-qr`),
        api.get(`/api/tables/${tableId}/payment-qr`),
      ]);
      setMenuQrData(menuRes.data);
      setPaymentQrData(paymentRes.data);
      setShowQR(true);
    } catch {
      Alert.alert('Hata', 'QR kodları yüklenemedi.');
    } finally {
      setQrLoading(false);
    }
  };

  // --- Merge ---
  const loadTablesForMerge = async () => {
    try {
      const res = await api.get('/api/tables');
      setTables(res.data.filter((t) => t.id !== tableId));
      setShowMerge(true);
    } catch {
      Alert.alert('Hata', 'Masalar yüklenemedi.');
    }
  };

  const mergeTables = async (targetTableId) => {
    Alert.alert(
      'Masa Birleştir',
      `Siparişler seçilen masaya aktarılsın mı?`,
      [
        { text: 'İptal' },
        {
          text: 'Birleştir',
          onPress: async () => {
            setMergeLoading(true);
            try {
              await api.post('/api/orders/merge', {
                source_table_id: tableId,
                target_table_id: targetTableId,
              });
              setShowMerge(false);
              Alert.alert('Başarılı', 'Masalar birleştirildi.', [
                { text: 'Tamam', onPress: () => navigation.goBack() },
              ]);
            } catch {
              Alert.alert('Hata', 'Birleştirme başarısız oldu.');
            } finally {
              setMergeLoading(false);
            }
          },
        },
      ]
    );
  };

  // --- Receipt ---
  const loadReceipt = async () => {
    if (!order || !order.id) return;
    setReceiptLoading(true);
    try {
      const res = await api.get(`/api/receipts/${order.id}`);
      setReceipt(res.data);
      setShowReceipt(true);
    } catch {
      Alert.alert('Hata', 'Fiş oluşturulamadı.');
    } finally {
      setReceiptLoading(false);
    }
  };

  const total = order?.items?.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) || 0;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount + p.tip, 0);
  const hasPayments = payments.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Masa {tableNumber}</Text>
        <TouchableOpacity onPress={loadQR} disabled={qrLoading}>
          <Text style={styles.qrBtn}>{qrLoading ? '...' : 'QR'}</Text>
        </TouchableOpacity>
      </View>

      {!order || !order.items || order.items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>Sipariş yok</Text>
        </View>
      ) : (
        <FlatList
          data={order.items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isRecent = recentlyAdded.includes(item.menu_item_id);
            return (
              <TouchableOpacity
                style={[styles.item, isRecent && styles.itemRecent]}
                onLongPress={() => removeItem(item.id)}
              >
                <Text style={styles.itemQty}>{item.quantity}x</Text>
                <View style={styles.itemNameRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {isRecent && <Text style={styles.recentBadge}>YENİ</Text>}
                </View>
                <Text style={styles.itemPrice}>{formatPrice(item.unit_price * item.quantity)}</Text>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={() => (
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Toplam</Text>
                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
              </View>
              {totalPaid > 0 && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.paidLabel}>Ödenen</Text>
                    <Text style={styles.paidValue}>{formatPrice(totalPaid)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.remainLabel}>Kalan</Text>
                    <Text style={styles.remainValue}>{formatPrice(total - totalPaid)}</Text>
                  </View>
                </>
              )}
            </View>
          )}
        />
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowMenu(true)}>
          <Text style={styles.addBtnText}>+ Ürün Ekle</Text>
        </TouchableOpacity>
        {order && order.items && order.items.length > 0 && (
          <TouchableOpacity style={styles.closeBtn} onPress={closeTable}>
            <Text style={styles.closeBtnText}>Masayı Kapat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Extra action buttons row */}
      <View style={styles.extraActions}>
        {order && order.items && order.items.length > 0 && (
          <TouchableOpacity style={styles.mergeBtn} onPress={loadTablesForMerge}>
            <Text style={styles.mergeBtnText}>Masa Birleştir</Text>
          </TouchableOpacity>
        )}
        {hasPayments && (
          <TouchableOpacity style={styles.receiptBtn} onPress={loadReceipt} disabled={receiptLoading}>
            <Text style={styles.receiptBtnText}>{receiptLoading ? 'Yükleniyor...' : 'Fiş Oluştur'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mutfak Bildirimi Toast */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
            },
          ]}
        >
          <Text style={styles.toastText}>Mutfağa gönderildi ✓</Text>
        </Animated.View>
      )}

      {/* Menü Modal */}
      <Modal visible={showMenu} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Menü</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {menu.map((cat) => (
                <View key={cat.id}>
                  <Text style={styles.catTitle}>{cat.name}</Text>
                  {cat.items?.filter((item) => item.active !== 0).map((item) => (
                    <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => addItem(item.id)}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuItemPrice}>{formatPrice(item.price)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal visible={showQR} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QR Kodlar - Masa {tableNumber}</Text>
              <TouchableOpacity onPress={() => setShowQR(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.qrDualContainer}>
                {/* Menu QR */}
                <View style={styles.qrCard}>
                  <Text style={styles.qrCardTitle}>Menü QR</Text>
                  <Text style={styles.qrCardDesc}>Müşteri bunu tarayarak menüyü görür ve sipariş verir</Text>
                  <View style={styles.qrCardImageWrap}>
                    {menuQrData?.qr_image ? (
                      <Image
                        source={{ uri: menuQrData.qr_image }}
                        style={styles.qrImageSmall}
                        resizeMode="contain"
                      />
                    ) : menuQrData?.qr_url ? (
                      <View style={styles.qrUrlBox}>
                        <Text style={styles.qrUrlText}>{menuQrData.qr_url}</Text>
                      </View>
                    ) : (
                      <Text style={styles.qrPlaceholder}>QR kodu mevcut değil</Text>
                    )}
                  </View>
                </View>

                {/* Payment QR */}
                <View style={styles.qrCard}>
                  <Text style={styles.qrCardTitle}>Ödeme QR</Text>
                  <Text style={styles.qrCardDesc}>Müşteri bunu tarayarak hesabı görür ve öder</Text>
                  <View style={styles.qrCardImageWrap}>
                    {paymentQrData?.qr_image ? (
                      <Image
                        source={{ uri: paymentQrData.qr_image }}
                        style={styles.qrImageSmall}
                        resizeMode="contain"
                      />
                    ) : paymentQrData?.qr_url ? (
                      <View style={styles.qrUrlBox}>
                        <Text style={styles.qrUrlText}>{paymentQrData.qr_url}</Text>
                      </View>
                    ) : (
                      <Text style={styles.qrPlaceholder}>QR kodu mevcut değil</Text>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.qrPrintInfo}>Yazdırmak için ekran görüntüsü alın veya yazıcıya gönderin</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Merge Modal */}
      <Modal visible={showMerge} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Masa Birleştir</Text>
              <TouchableOpacity onPress={() => setShowMerge(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.mergeInfo}>Masa {tableNumber} siparişlerini hangi masaya aktarmak istiyorsunuz?</Text>
            <ScrollView>
              {tables.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.mergeTableItem}
                  onPress={() => mergeTables(t.id)}
                  disabled={mergeLoading}
                >
                  <Text style={styles.mergeTableNumber}>Masa {t.table_number}</Text>
                  <Text style={styles.mergeTableStatus}>
                    {t.has_open_order ? `${t.item_count || 0} ürün - ${formatPrice(t.order_total || 0)}` : 'Boş'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={showReceipt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dijital Fiş</Text>
              <TouchableOpacity onPress={() => setShowReceipt(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {receipt ? (
              <ScrollView style={styles.receiptScroll}>
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptRestName}>{receipt.restaurant_name || 'Restoran'}</Text>
                  <Text style={styles.receiptDate}>{receipt.date || ''}</Text>
                  <Text style={styles.receiptTableInfo}>Masa: {tableNumber}</Text>
                </View>
                <View style={styles.receiptDivider} />
                {(receipt.items || []).map((item, idx) => (
                  <View key={idx} style={styles.receiptItemRow}>
                    <Text style={styles.receiptItemName}>{item.quantity}x {item.name}</Text>
                    <Text style={styles.receiptItemPrice}>{formatPrice(item.total || item.unit_price * item.quantity)}</Text>
                  </View>
                ))}
                <View style={styles.receiptDivider} />
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>TOPLAM</Text>
                  <Text style={styles.receiptTotalValue}>{formatPrice(receipt.total || 0)}</Text>
                </View>
                {(receipt.payments || []).map((p, idx) => (
                  <View key={idx} style={styles.receiptPaymentRow}>
                    <Text style={styles.receiptPaymentLabel}>{p.payer_name || 'Ödeme'}</Text>
                    <Text style={styles.receiptPaymentValue}>{formatPrice(p.amount || 0)}</Text>
                  </View>
                ))}
                {receipt.tip_total > 0 && (
                  <View style={styles.receiptPaymentRow}>
                    <Text style={styles.receiptPaymentLabel}>Bahşiş</Text>
                    <Text style={styles.receiptTipValue}>{formatPrice(receipt.tip_total)}</Text>
                  </View>
                )}
                <View style={styles.receiptDivider} />
                <Text style={styles.receiptFooter}>Teşekkür ederiz!</Text>
              </ScrollView>
            ) : (
              <Text style={styles.qrPlaceholder}>Fiş bilgisi yüklenemedi</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  back: { color: '#e94560', fontSize: 16, fontWeight: '700' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  qrBtn: { color: '#f5a623', fontSize: 16, fontWeight: '800', backgroundColor: '#16213e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, overflow: 'hidden' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 50, marginBottom: 12 },
  emptyText: { color: '#8b8b8b', fontSize: 16 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#16213e', borderRadius: 14 },
  itemRecent: { borderWidth: 1, borderColor: '#16a34a', backgroundColor: '#162e1e' },
  itemQty: { color: '#f5a623', fontWeight: '800', fontSize: 16, width: 40 },
  itemNameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  recentBadge: { backgroundColor: '#16a34a', color: '#FFF', fontSize: 9, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  itemPrice: { color: '#f5a623', fontSize: 15, fontWeight: '700' },
  footer: { padding: 20, marginHorizontal: 16, marginTop: 8, backgroundColor: '#16213e', borderRadius: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  totalValue: { color: '#f5a623', fontSize: 18, fontWeight: '900' },
  paidLabel: { color: '#16a34a', fontSize: 15, fontWeight: '600' },
  paidValue: { color: '#16a34a', fontSize: 15, fontWeight: '700' },
  remainLabel: { color: '#e94560', fontSize: 15, fontWeight: '600' },
  remainValue: { color: '#e94560', fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  addBtn: { flex: 1, backgroundColor: '#f5a623', borderRadius: 14, padding: 16, alignItems: 'center' },
  addBtnText: { color: '#1a1a2e', fontWeight: '800', fontSize: 16 },
  closeBtn: { flex: 1, backgroundColor: '#e94560', borderRadius: 14, padding: 16, alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  // Extra actions row
  extraActions: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12 },
  mergeBtn: { flex: 1, backgroundColor: '#16213e', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f5a623' },
  mergeBtnText: { color: '#f5a623', fontWeight: '700', fontSize: 14 },
  receiptBtn: { flex: 1, backgroundColor: '#16213e', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#16a34a' },
  receiptBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
  // Toast
  toast: {
    position: 'absolute',
    top: 110,
    left: 40,
    right: 40,
    backgroundColor: '#16a34a',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  toastText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  modalClose: { color: '#e94560', fontSize: 24, fontWeight: '700' },
  catTitle: { color: '#f5a623', fontSize: 16, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: '#1a1a2e', borderRadius: 12, marginBottom: 6 },
  menuItemName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  menuItemPrice: { color: '#f5a623', fontSize: 15, fontWeight: '700' },
  // QR Modal
  qrModalContent: { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  qrDualContainer: { flexDirection: 'row', gap: 12, marginTop: 8 },
  qrCard: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 14, alignItems: 'center' },
  qrCardTitle: { color: '#f5a623', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  qrCardDesc: { color: '#8b8b8b', fontSize: 11, textAlign: 'center', marginBottom: 12, lineHeight: 16 },
  qrCardImageWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 140 },
  qrImageSmall: { width: 140, height: 140 },
  qrUrlBox: { backgroundColor: '#0f0f23', borderRadius: 10, padding: 12 },
  qrUrlText: { color: '#f5a623', fontSize: 11, textAlign: 'center' },
  qrPlaceholder: { color: '#8b8b8b', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  qrPrintInfo: { color: '#8b8b8b', fontSize: 13, textAlign: 'center', marginTop: 16, marginBottom: 8, fontStyle: 'italic' },
  // Merge Modal
  mergeInfo: { color: '#8b8b8b', fontSize: 14, marginBottom: 16 },
  mergeTableItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12, marginBottom: 8 },
  mergeTableNumber: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  mergeTableStatus: { color: '#8b8b8b', fontSize: 13 },
  // Receipt Modal
  receiptModalContent: { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  receiptScroll: { paddingBottom: 20 },
  receiptHeader: { alignItems: 'center', paddingVertical: 16 },
  receiptRestName: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  receiptDate: { color: '#8b8b8b', fontSize: 13, marginTop: 4 },
  receiptTableInfo: { color: '#f5a623', fontSize: 14, fontWeight: '700', marginTop: 4 },
  receiptDivider: { height: 1, backgroundColor: '#2a2a4a', marginVertical: 12 },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  receiptItemName: { color: '#FFF', fontSize: 14, flex: 1 },
  receiptItemPrice: { color: '#f5a623', fontSize: 14, fontWeight: '700' },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  receiptTotalLabel: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  receiptTotalValue: { color: '#f5a623', fontSize: 18, fontWeight: '900' },
  receiptPaymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  receiptPaymentLabel: { color: '#8b8b8b', fontSize: 13 },
  receiptPaymentValue: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  receiptTipValue: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  receiptFooter: { color: '#8b8b8b', fontSize: 14, textAlign: 'center', marginTop: 16, fontStyle: 'italic' },
});
