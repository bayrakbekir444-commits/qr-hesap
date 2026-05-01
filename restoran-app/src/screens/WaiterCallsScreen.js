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
import api from '../utils/api';

const POLL_MS = 6000;

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

export default function WaiterCallsScreen({ navigation }) {
  const [calls, setCalls] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissing, setDismissing] = useState({});
  const prevIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  const loadCalls = async () => {
    try {
      const res = await api.get('/api/waiter/calls');
      const list = res.data || [];

      const ids = new Set(list.map((c) => c.id));
      let hasNew = false;
      ids.forEach((id) => {
        if (!prevIds.current.has(id)) hasNew = true;
      });

      if (hasNew && !isFirstLoad.current) {
        // Uzun titreşim için iki haptic ardı ardına
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          }, 250);
        } catch {}
      }

      prevIds.current = ids;
      isFirstLoad.current = false;

      // En yeni üstte
      list.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      setCalls(list);

      // Bottom-tab badge
      navigation.setOptions?.({
        tabBarBadge: list.length > 0 ? list.length : undefined,
      });
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      loadCalls();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(loadCalls, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const dismissCall = async (callId) => {
    if (dismissing[callId]) return;
    setDismissing((d) => ({ ...d, [callId]: true }));
    try {
      await api.put(`/api/waiter/calls/${callId}/dismiss`);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    } catch {
      Alert.alert('Hata', 'Çağrı kapatılamadı.');
    } finally {
      setDismissing((d) => {
        const n = { ...d };
        delete n[callId];
        return n;
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalls();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.tableBadge}>
          <Text style={styles.tableBadgeText}>
            {item.table_number || item.table_id}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>Garson çağrıldı</Text>
          <Text style={styles.subtitle}>
            🔔 {timeAgo(item.created_at) || 'az önce'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.cameButton,
          dismissing[item.id] && styles.cameButtonDisabled,
        ]}
        onPress={() => dismissCall(item.id)}
        disabled={!!dismissing[item.id]}
      >
        <Text style={styles.cameButtonText}>
          {dismissing[item.id] ? '...' : '✓ Geldim'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔔 Garson Çağrıları</Text>
        {calls.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{calls.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={calls}
        keyExtractor={(item) => String(item.id)}
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
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.empty}>Bekleyen çağrı yok</Text>
            <Text style={styles.emptySub}>Tüm masalar memnun görünüyor</Text>
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
  countBadge: {
    backgroundColor: '#e94560',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  countBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  list: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f5a623',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  tableBadge: {
    backgroundColor: '#f5a623',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  tableBadgeText: { color: '#1a1a2e', fontWeight: '900', fontSize: 22 },
  info: { marginLeft: 14, flex: 1 },
  title: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  subtitle: { color: '#8b8b8b', fontSize: 13, marginTop: 4 },
  cameButton: {
    backgroundColor: '#1fbf75',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#1fbf75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cameButtonDisabled: { opacity: 0.5 },
  cameButtonText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 14 },
  empty: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#8b8b8b', fontSize: 13, marginTop: 6 },
});
