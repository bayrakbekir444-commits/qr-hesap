import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { formatPrice, API_URL } from '../utils/api';

export default function TablesScreen({ navigation }) {
  const [tables, setTables] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [paymentAlerts, setPaymentAlerts] = useState([]);
  const [newOrderBadge, setNewOrderBadge] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevAlertIds = useRef(new Set());
  const prevPaymentAlertIds = useRef(new Set());

  const loadTables = async () => {
    try {
      const res = await api.get('/api/tables');
      setTables(res.data);
    } catch (e) {
      Alert.alert('Hata', 'Masalar yüklenemedi.');
    }
  };

  const loadWaiterCalls = async () => {
    try {
      const res = await api.get('/api/waiter/calls');
      setWaiterCalls(res.data || []);
    } catch {}
  };

  const dismissCall = async (callId) => {
    try {
      await api.put(`/api/waiter/calls/${callId}/dismiss`);
      setWaiterCalls((prev) => prev.filter((c) => c.id !== callId));
    } catch {
      Alert.alert('Hata', 'Bildirim kapatılamadı.');
    }
  };

  const loadPaymentAlerts = async () => {
    try {
      const res = await api.get('/api/payments/alerts');
      const alerts = res.data || [];
      const newIds = alerts.map((a) => a.id);
      const hasNew = newIds.some((id) => !prevPaymentAlertIds.current.has(id));

      if (hasNew && prevPaymentAlertIds.current.size > 0) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        loadTables();
      }

      prevPaymentAlertIds.current = new Set(newIds);
      setPaymentAlerts(alerts);
    } catch {}
  };

  const dismissPaymentAlert = async (alertId) => {
    try {
      await api.put(`/api/payments/alerts/${alertId}/dismiss`);
      setPaymentAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      Alert.alert('Hata', 'Bildirim kapatılamadı.');
    }
  };

  // Poll new order alerts
  const checkNewAlerts = async () => {
    try {
      const res = await api.get('/api/orders/new-alerts');
      const alerts = res.data || [];
      const newIds = alerts.map((a) => a.id || a.order_id);
      const hasNew = newIds.some((id) => !prevAlertIds.current.has(id));

      if (hasNew && prevAlertIds.current.size > 0) {
        // Vibrate on new order
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }

      prevAlertIds.current = new Set(newIds);
      setNewOrderBadge(alerts.length);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    loadTables();
    loadWaiterCalls();
    loadPaymentAlerts();
    checkNewAlerts();
  }, []));

  // Poll waiter calls every 10 seconds
  useEffect(() => {
    const interval = setInterval(loadWaiterCalls, 10000);
    return () => clearInterval(interval);
  }, []);

  // Poll payment alerts every 8 seconds
  useEffect(() => {
    const interval = setInterval(loadPaymentAlerts, 8000);
    return () => clearInterval(interval);
  }, []);

  // Poll new order alerts every 15 seconds
  useEffect(() => {
    const interval = setInterval(checkNewAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation for waiter call banner
  useEffect(() => {
    if (waiterCalls.length > 0) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.85, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [waiterCalls.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTables(), loadWaiterCalls(), loadPaymentAlerts(), checkNewAlerts()]);
    setRefreshing(false);
  };

  const addTable = async () => {
    try {
      await api.post('/api/tables');
      loadTables();
    } catch (e) {
      Alert.alert('Hata', 'Masa eklenemedi.');
    }
  };

  const [downloading, setDownloading] = useState(false);

  const downloadQrPdf = async (type) => {
    if (tables.length === 0) {
      Alert.alert('Bilgi', 'Önce masa ekleyin.');
      return;
    }
    setDownloading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const fileUri = `${FileSystem.documentDirectory}qr-kodlar-${type}-${Date.now()}.pdf`;
      const { uri, status } = await FileSystem.downloadAsync(
        `${API_URL}/api/tables/qr-pdf?type=${type}`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'QR Kodları PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('İndirildi', `PDF kaydedildi: ${uri}`);
      }
    } catch (e) {
      Alert.alert('Hata', 'PDF indirilemedi.');
    } finally {
      setDownloading(false);
    }
  };

  const askQrType = () => {
    Alert.alert(
      'QR Kodları İndir',
      'Hangi QR türünü yazdırmak istiyorsun?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sipariş', onPress: () => downloadQrPdf('main') },
        { text: 'Menü', onPress: () => downloadQrPdf('menu') },
        { text: 'Ödeme', onPress: () => downloadQrPdf('payment') },
      ]
    );
  };

  // Expose badge count via navigation params so AppNavigator can read it
  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarBadge: newOrderBadge > 0 ? newOrderBadge : undefined,
    });
  }, [newOrderBadge, navigation]);

  const renderTable = ({ item }) => {
    const hasOrder = item.has_open_order;
    const hasCall = waiterCalls.some((c) => c.table_id === item.id);
    return (
      <TouchableOpacity
        style={[styles.tableCard, hasOrder && styles.tableActive, hasCall && styles.tableCallActive]}
        onPress={() => navigation.navigate('OrderDetail', { tableId: item.id, tableNumber: item.table_number })}
        onLongPress={() => {
          Alert.alert('Masa Sil', `Masa ${item.table_number} silinsin mi?`, [
            { text: 'İptal' },
            { text: 'Sil', style: 'destructive', onPress: async () => {
              await api.delete(`/api/tables/${item.id}`);
              loadTables();
            }},
          ]);
        }}
      >
        {hasCall && <Text style={styles.callBadge}>🔔</Text>}
        <Text style={styles.tableNumber}>{item.table_number}</Text>
        <Text style={styles.tableLabel}>Masa</Text>
        {hasOrder ? (
          <View style={styles.orderInfo}>
            <Text style={styles.orderTotal}>{formatPrice(item.order_total)}</Text>
            <Text style={styles.orderItems}>{item.item_count} ürün</Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>Boş</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍽️ Masalar</Text>
        <View style={styles.headerRight}>
          {newOrderBadge > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{newOrderBadge} yeni</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.pdfButton, downloading && styles.pdfButtonDisabled]}
            onPress={askQrType}
            disabled={downloading}
          >
            <Text style={styles.pdfButtonText}>{downloading ? '...' : '📄 QR PDF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={addTable}>
            <Text style={styles.addButtonText}>+ Masa Ekle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ödeme Bildirimleri */}
      {paymentAlerts.length > 0 && (
        <View style={styles.paidBanner}>
          {paymentAlerts.map((alert) => (
            <View key={alert.id} style={styles.callItem}>
              <Text style={styles.paidText}>
                ✅ Masa {alert.table_number} hesabı ödedi
                {alert.total_amount ? ` · ${formatPrice(alert.total_amount)}` : ''}
              </Text>
              <TouchableOpacity style={styles.callDismiss} onPress={() => dismissPaymentAlert(alert.id)}>
                <Text style={styles.callDismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Garson Çağrı Bildirimleri */}
      {waiterCalls.length > 0 && (
        <Animated.View style={[styles.callBanner, { opacity: pulseAnim }]}>
          {waiterCalls.map((call) => (
            <View key={call.id} style={styles.callItem}>
              <Text style={styles.callText}>
                🔔 Masa {call.table_number || call.table_id} garson çağırıyor!
              </Text>
              <TouchableOpacity style={styles.callDismiss} onPress={() => dismissCall(call.id)}>
                <Text style={styles.callDismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Animated.View>
      )}

      <FlatList
        data={tables}
        renderItem={renderTable}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
        ListEmptyComponent={<Text style={styles.empty}>Henüz masa eklenmemiş</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addButton: { backgroundColor: '#e94560', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  pdfButton: { backgroundColor: '#2a5298', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  pdfButtonDisabled: { opacity: 0.5 },
  pdfButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  alertBadge: { backgroundColor: '#f5a623', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  alertBadgeText: { color: '#1a1a2e', fontSize: 12, fontWeight: '800' },
  grid: { padding: 10 },
  tableCard: {
    flex: 1, margin: 8, backgroundColor: '#16213e', borderRadius: 18, padding: 20,
    alignItems: 'center', minHeight: 140, justifyContent: 'center',
    borderWidth: 2, borderColor: '#2a2a4a',
  },
  tableActive: { borderColor: '#f5a623', backgroundColor: '#1a2740' },
  tableCallActive: { borderColor: '#f5a623', backgroundColor: '#3a2a10' },
  callBadge: { position: 'absolute', top: 8, right: 8, fontSize: 18 },
  tableNumber: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  tableLabel: { fontSize: 12, color: '#8b8b8b', marginTop: 4 },
  orderInfo: { marginTop: 12, alignItems: 'center' },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#f5a623' },
  orderItems: { fontSize: 11, color: '#8b8b8b', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#555', marginTop: 12 },
  empty: { color: '#8b8b8b', textAlign: 'center', marginTop: 40, fontSize: 16 },
  // Ödeme Banner (yeşil)
  paidBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1fbf75',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#1fbf75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  paidText: {
    color: '#0b2e1f',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  // Garson Çağrı Banner
  callBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#f5a623',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  callItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  callText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  callDismiss: {
    backgroundColor: 'rgba(26,26,46,0.2)',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  callDismissText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '900',
  },
});
