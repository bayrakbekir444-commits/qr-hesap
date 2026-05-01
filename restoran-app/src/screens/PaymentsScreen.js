import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { formatPrice } from '../utils/api';

export default function PaymentsScreen() {
  const [report, setReport] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyData, setWeeklyData] = useState([]);

  const loadReport = async () => {
    try {
      const res = await api.get(`/api/reports/daily?date=${date}`);
      setReport(res.data);
    } catch {}
  };

  const loadWeeklyReport = async () => {
    try {
      const res = await api.get('/api/reports/weekly');
      setWeeklyData(res.data || []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadReport(); loadWeeklyReport(); }, [date]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadReport(), loadWeeklyReport()]);
    setRefreshing(false);
  };

  const changeDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const formatDate = (d) => {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Weekly chart helpers
  const maxRevenue = weeklyData.length > 0
    ? Math.max(...weeklyData.map((d) => d.revenue || 0), 1)
    : 1;

  const getDayLabel = (dateStr) => {
    if (!dateStr) return '';
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const d = new Date(dateStr);
    return days[d.getDay()] || '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💳 Ödemeler</Text>
      </View>

      {/* Haftalık Grafik */}
      {weeklyData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Son 7 Gün Ciro</Text>
          <View style={styles.chartContainer}>
            {weeklyData.map((day, idx) => {
              const barHeight = maxRevenue > 0 ? ((day.revenue || 0) / maxRevenue) * 120 : 0;
              return (
                <View key={idx} style={styles.chartBarWrapper}>
                  <Text style={styles.chartBarValue}>
                    {day.revenue ? formatPrice(day.revenue) : '0'}
                  </Text>
                  <View style={[styles.chartBar, { height: Math.max(barHeight, 4) }]} />
                  <Text style={styles.chartBarLabel}>{getDayLabel(day.date)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Tarih */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => changeDate(-1)}>
          <Text style={styles.dateArrow}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDate(date)}</Text>
        <TouchableOpacity onPress={() => changeDate(1)}>
          <Text style={styles.dateArrow}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Günlük Özet */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatPrice(report?.total_revenue || 0)}</Text>
          <Text style={styles.statLabel}>Ciro</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValueSmall}>{report?.order_count || 0}</Text>
          <Text style={styles.statLabel}>Sipariş</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValueSmall}>{formatPrice(report?.total_tips || 0)}</Text>
          <Text style={styles.statLabel}>Bahşiş</Text>
        </View>
      </View>

      {/* Ödeme Listesi */}
      <FlatList
        data={report?.payments || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.paymentItem}>
            <View style={styles.paymentLeft}>
              <Text style={styles.paymentName}>{item.payer_name || 'Misafir'}</Text>
              <Text style={styles.paymentMeta}>Masa {item.table_number} • {new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
              {item.card_type ? (
                <Text style={styles.paymentCard}>
                  {item.card_type === 'visa' ? '💳 Visa' : item.card_type === 'mastercard' ? '💳 Mastercard' : item.card_type === 'troy' ? '🇹🇷 Troy' : '💳 Kart'}
                </Text>
              ) : null}
            </View>
            <View style={styles.paymentRight}>
              <Text style={styles.paymentAmount}>{formatPrice(item.amount)}</Text>
              {item.tip > 0 && <Text style={styles.paymentTip}>+{formatPrice(item.tip)} bahşiş</Text>}
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Bu tarihte ödeme yok</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  // Weekly chart
  chartCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#16213e', borderRadius: 16, padding: 16 },
  chartTitle: { color: '#f5a623', fontSize: 14, fontWeight: '800', marginBottom: 12 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingTop: 20 },
  chartBarWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: 28, backgroundColor: '#f5a623', borderRadius: 6, marginBottom: 6 },
  chartBarValue: { color: '#8b8b8b', fontSize: 8, marginBottom: 4, textAlign: 'center' },
  chartBarLabel: { color: '#8b8b8b', fontSize: 11, fontWeight: '700' },
  // Date
  dateRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 16 },
  dateArrow: { color: '#e94560', fontSize: 20, padding: 10 },
  dateText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#16213e', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { color: '#f5a623', fontSize: 20, fontWeight: '900' },
  statValueSmall: { color: '#f5a623', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#8b8b8b', fontSize: 11, marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  paymentItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#16213e', borderRadius: 14, marginBottom: 8 },
  paymentLeft: { flex: 1 },
  paymentName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  paymentMeta: { color: '#8b8b8b', fontSize: 12, marginTop: 4 },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { color: '#f5a623', fontSize: 16, fontWeight: '800' },
  paymentTip: { color: '#16a34a', fontSize: 12, marginTop: 2 },
  paymentCard: { color: '#60a5fa', fontSize: 11, marginTop: 2 },
  empty: { color: '#8b8b8b', textAlign: 'center', marginTop: 40 },
});
