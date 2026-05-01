import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api from '../utils/api';

const POLL_MS = 8000;

function elapsedMin(iso) {
  if (!iso) return 0;
  try {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  } catch {
    return 0;
  }
}

function timeAgoLong(iso) {
  if (!iso) return '';
  const m = elapsedMin(iso);
  if (m === 0) return 'az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  return `${h} sa önce`;
}

export default function KitchenScreen() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [readyMap, setReadyMap] = useState({}); // local "Hazır" state — backend yok
  // tick re-render — süre rengini canlı güncellemek için
  const [, setTick] = useState(0);

  const loadItems = async () => {
    try {
      const tablesRes = await api.get('/api/tables');
      const tables = tablesRes.data || [];
      const openTables = tables.filter((t) => t.has_open_order);

      const all = await Promise.all(
        openTables.map(async (t) => {
          try {
            const res = await api.get(`/api/orders/${t.id}`);
            const ord = res.data;
            if (!ord || !ord.items) return [];
            return ord.items
              .filter((it) => {
                // Ödenmiş/kapatılmış kalemleri gizle
                const status = (it.status || '').toLowerCase();
                if (status === 'paid' || status === 'closed' || status === 'cancelled') {
                  return false;
                }
                return true;
              })
              .map((it) => ({
                ...it,
                _key: `${t.id}-${it.id}`,
                table_id: t.id,
                table_number: t.table_number,
                created_at: it.created_at || ord.created_at || ord.opened_at || null,
              }));
          } catch {
            return [];
          }
        })
      );

      const flat = all.flat();
      // En eskiler üstte (mutfak öncelik sırası)
      flat.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
      setItems(flat);
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(loadItems, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  // Süre rengini canlı tutmak için 30 sn'de bir tick
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const toggleReady = async (key) => {
    setReadyMap((m) => ({ ...m, [key]: !m[key] }));
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const renderItem = ({ item }) => {
    const min = elapsedMin(item.created_at);
    const isReady = !!readyMap[item._key];
    let borderColor = '#2a2a4a';
    let urgentLabel = null;
    if (!isReady) {
      if (min >= 10) {
        borderColor = '#e94560';
        urgentLabel = '⚠️ ACİL';
      } else if (min >= 5) {
        borderColor = '#f5a623';
        urgentLabel = '⏱ Geçikiyor';
      }
    } else {
      borderColor = '#1fbf75';
    }

    const name = item.menu_item_name || item.name || 'Ürün';
    const qty = item.quantity || item.qty || 1;
    const note = item.note || item.notes;

    return (
      <View style={[styles.card, { borderColor }, isReady && styles.cardReady]}>
        <View style={styles.cardTop}>
          <View style={styles.tableTag}>
            <Text style={styles.tableTagLabel}>MASA</Text>
            <Text style={styles.tableTagNum}>{item.table_number}</Text>
          </View>
          <View style={styles.timeWrap}>
            {urgentLabel && (
              <Text
                style={[
                  styles.urgent,
                  { color: min >= 10 ? '#e94560' : '#f5a623' },
                ]}
              >
                {urgentLabel}
              </Text>
            )}
            <Text style={styles.timeText}>{timeAgoLong(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.qty}>×{qty}</Text>
          <Text style={[styles.name, isReady && styles.nameStrike]} numberOfLines={3}>
            {name}
          </Text>
        </View>

        {note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>📝 Not:</Text>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.readyBtn, isReady && styles.readyBtnActive]}
          onPress={() => toggleReady(item._key)}
        >
          <Text style={styles.readyBtnText}>
            {isReady ? '✓ Hazır' : '○ Hazır işaretle'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const pendingCount = items.filter((it) => !readyMap[it._key]).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👨‍🍳 Mutfak</Text>
        <View style={styles.headerStats}>
          <Text style={styles.headerStatLabel}>Bekleyen</Text>
          <Text style={styles.headerStatNum}>{pendingCount}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._key}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e94560"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🍳</Text>
            <Text style={styles.empty}>Hazırlanacak sipariş yok</Text>
            <Text style={styles.emptySub}>Mutfak sakin :)</Text>
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
  headerStats: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 90,
  },
  headerStatLabel: { color: '#8b8b8b', fontSize: 11, fontWeight: '700' },
  headerStatNum: { color: '#f5a623', fontSize: 22, fontWeight: '900' },
  list: { padding: 8, paddingBottom: 40 },
  row: { gap: 8 },
  card: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 18,
    padding: 16,
    margin: 6,
    borderWidth: 3,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  cardReady: { backgroundColor: '#102218', opacity: 0.85 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tableTag: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tableTagLabel: { color: '#8b8b8b', fontSize: 10, fontWeight: '700' },
  tableTagNum: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  timeWrap: { alignItems: 'flex-end' },
  urgent: { fontSize: 12, fontWeight: '900' },
  timeText: { color: '#8b8b8b', fontSize: 12, marginTop: 2 },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  qty: {
    color: '#f5a623',
    fontSize: 32,
    fontWeight: '900',
    minWidth: 50,
  },
  name: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    lineHeight: 28,
  },
  nameStrike: { textDecorationLine: 'line-through', color: '#888' },
  noteBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  noteLabel: { color: '#f5a623', fontSize: 11, fontWeight: '800' },
  noteText: { color: '#FFF', fontSize: 14, marginTop: 2 },
  readyBtn: {
    backgroundColor: '#2a2a4a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  readyBtnActive: { backgroundColor: '#1fbf75' },
  readyBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  emptyWrap: { alignItems: 'center', marginTop: 80, width: '100%' },
  emptyIcon: { fontSize: 64, marginBottom: 14 },
  empty: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#8b8b8b', fontSize: 13, marginTop: 6 },
});
