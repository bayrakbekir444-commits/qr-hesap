import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api, { formatPrice } from '../utils/api';

const POLL_MS = 8000;

function timeAgo(iso) {
  if (!iso) return '';
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((now - then) / 1000));
    if (diff < 60) return `${diff} sn önce`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m} dk önce`;
    const h = Math.floor(m / 60);
    return `${h} sa önce`;
  } catch {
    return '';
  }
}

function summarizeItems(items = []) {
  if (!items || items.length === 0) return '—';
  const first = items.slice(0, 3).map((it) => {
    const name = it.menu_item_name || it.name || it.title || 'Ürün';
    const qty = it.quantity || it.qty || 1;
    return `${qty}× ${name}`;
  });
  const rest = items.length > 3 ? ` +${items.length - 3}` : '';
  return first.join(', ') + rest;
}

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const prevOrderIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  const loadOrders = async () => {
    try {
      // 1. Tüm masa+sipariş durumu — açık siparişlerin tablo eşlemesi için
      const tablesRes = await api.get('/api/tables');
      const tables = tablesRes.data || [];
      const openTables = tables.filter((t) => t.has_open_order);

      // 2. Her açık masa için sipariş detayını çek
      const detailed = await Promise.all(
        openTables.map(async (t) => {
          try {
            const res = await api.get(`/api/orders/${t.id}`);
            const ord = res.data;
            if (!ord) return null;
            return {
              order_id: ord.id,
              table_id: t.id,
              table_number: t.table_number,
              total: ord.total != null ? ord.total : t.order_total,
              item_count: ord.items?.length ?? t.item_count ?? 0,
              items: ord.items || [],
              created_at: ord.created_at || ord.opened_at || null,
            };
          } catch {
            return {
              order_id: null,
              table_id: t.id,
              table_number: t.table_number,
              total: t.order_total,
              item_count: t.item_count || 0,
              items: [],
              created_at: null,
            };
          }
        })
      );
      const filtered = detailed.filter(Boolean);

      // Yeni sipariş tespiti
      const ids = new Set(filtered.map((o) => o.order_id || `t-${o.table_id}`));
      if (!isFirstLoad.current) {
        let hasNew = false;
        ids.forEach((id) => {
          if (!prevOrderIds.current.has(id)) hasNew = true;
        });
        if (hasNew) {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
          setNewOrderCount((c) => c + 1);
        }
      }
      prevOrderIds.current = ids;
      isFirstLoad.current = false;

      // En yeni sipariş üstte
      filtered.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setOrders(filtered);
    } catch (e) {
      // sessizce geç — kullanıcıyı poll hataları rahatsız etmesin
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(loadOrders, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const clearBadge = () => setNewOrderCount(0);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        clearBadge();
        navigation.navigate('OrderDetail', {
          tableId: item.table_id,
          tableNumber: item.table_number,
        });
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.tableBadge}>
          <Text style={styles.tableBadgeText}>{item.table_number}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.cardTotal}>
            {item.total != null ? formatPrice(item.total) : '—'}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(item.created_at) || ''}</Text>
        </View>
      </View>
      <Text style={styles.cardSummary} numberOfLines={2}>
        {summarizeItems(item.items)}
      </Text>
      <Text style={styles.cardCount}>{item.item_count} ürün</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Siparişler</Text>
        {newOrderCount > 0 && (
          <TouchableOpacity style={styles.newBadge} onPress={clearBadge}>
            <Text style={styles.newBadgeText}>{newOrderCount} yeni ✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) =>
          (item.order_id ? `o-${item.order_id}` : `t-${item.table_id}`) + ''
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e94560"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.empty}>Henüz sipariş yok</Text>
            <Text style={styles.emptySub}>Yeni siparişler burada görünecek</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  newBadge: {
    backgroundColor: '#e94560',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newBadgeText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  list: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tableBadge: {
    backgroundColor: '#e94560',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  tableBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 18 },
  cardHeaderRight: { alignItems: 'flex-end' },
  cardTotal: { color: '#f5a623', fontWeight: '900', fontSize: 18 },
  cardTime: { color: '#8b8b8b', fontSize: 12, marginTop: 2 },
  cardSummary: { color: '#FFF', fontSize: 15, lineHeight: 21 },
  cardCount: { color: '#8b8b8b', fontSize: 12, marginTop: 6 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 14 },
  empty: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#8b8b8b', fontSize: 13, marginTop: 6 },
});
