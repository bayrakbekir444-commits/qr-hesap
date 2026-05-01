import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, TextInput, FlatList } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api, { formatPrice } from '../utils/api';

export default function SettingsScreen() {
  const { restaurant, logout } = useAuth();

  // Kampanya state
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campName, setCampName] = useState('');
  const [campDiscountType, setCampDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [campDiscountValue, setCampDiscountValue] = useState('');

  // Yorumlar state
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);

  // Loyalty state
  const [loyaltyCustomers, setLoyaltyCustomers] = useState([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  useEffect(() => {
    loadCampaigns();
    loadReviews();
    loadLoyalty();
  }, []);

  // --- Kampanya ---
  const loadCampaigns = async () => {
    try {
      const res = await api.get('/api/campaigns');
      setCampaigns(res.data || []);
    } catch {}
  };

  const addCampaign = async () => {
    if (!campName || !campDiscountValue) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    try {
      await api.post('/api/campaigns', {
        name: campName,
        discount_type: campDiscountType,
        discount_value: parseFloat(campDiscountValue.replace(',', '.')),
      });
      setCampName('');
      setCampDiscountValue('');
      setCampDiscountType('percentage');
      setShowCampaignModal(false);
      loadCampaigns();
    } catch {
      Alert.alert('Hata', 'Kampanya eklenemedi.');
    }
  };

  const deleteCampaign = (id, name) => {
    Alert.alert('Kampanya Sil', `"${name}" silinsin mi?`, [
      { text: 'İptal' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/campaigns/${id}`);
          loadCampaigns();
        } catch {
          Alert.alert('Hata', 'Kampanya silinemedi.');
        }
      }},
    ]);
  };

  // --- Yorumlar ---
  const loadReviews = async () => {
    try {
      const res = await api.get('/api/reviews');
      const data = res.data || [];
      setReviews(data);
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + (r.rating || 0), 0) / data.length;
        setAverageRating(avg);
      }
    } catch {}
  };

  // --- Sadakat ---
  const loadLoyalty = async () => {
    setLoyaltyLoading(true);
    try {
      const res = await api.get('/api/loyalty');
      setLoyaltyCustomers(res.data || []);
    } catch {}
    finally { setLoyaltyLoading(false); }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating ? '\u2B50' : '\u2606');
    }
    return stars.join('');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Ayarlar</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.restaurantName}>{restaurant?.name || 'Restoran'}</Text>
      </View>

      {/* Kampanyalar Bölümü */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎯 Kampanyalar</Text>
          <TouchableOpacity style={styles.sectionAddBtn} onPress={() => setShowCampaignModal(true)}>
            <Text style={styles.sectionAddBtnText}>+ Kampanya Ekle</Text>
          </TouchableOpacity>
        </View>
        {campaigns.length === 0 ? (
          <Text style={styles.emptyText}>Aktif kampanya yok</Text>
        ) : (
          campaigns.map((camp) => (
            <View key={camp.id} style={styles.campaignItem}>
              <View style={styles.campaignInfo}>
                <Text style={styles.campaignName}>{camp.name}</Text>
                <Text style={styles.campaignDiscount}>
                  {camp.discount_type === 'percentage'
                    ? `%${camp.discount_value} İndirim`
                    : `${camp.discount_value} ₺ İndirim`}
                </Text>
              </View>
              <TouchableOpacity style={styles.campaignDelete} onPress={() => deleteCampaign(camp.id, camp.name)}>
                <Text style={styles.campaignDeleteText}>Sil</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Sadakat Programı */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏆 Sadakat Programı</Text>
        </View>
        {loyaltyLoading ? (
          <Text style={styles.emptyText}>Yükleniyor...</Text>
        ) : loyaltyCustomers.length === 0 ? (
          <Text style={styles.emptyText}>Kayıtlı sadakat müşterisi yok</Text>
        ) : (
          loyaltyCustomers.map((customer, idx) => (
            <View key={customer.id || idx} style={styles.loyaltyItem}>
              <View style={styles.loyaltyLeft}>
                <View style={styles.loyaltyAvatar}>
                  <Text style={styles.loyaltyAvatarText}>
                    {customer.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.loyaltyInfo}>
                  <Text style={styles.loyaltyName}>{customer.name || 'Misafir'}</Text>
                  {customer.phone && <Text style={styles.loyaltyPhone}>{customer.phone}</Text>}
                  {customer.total_orders && (
                    <Text style={styles.loyaltyOrders}>{customer.total_orders} sipariş</Text>
                  )}
                </View>
              </View>
              <View style={styles.loyaltyRight}>
                <Text style={styles.loyaltyPoints}>{customer.points || 0}</Text>
                <Text style={styles.loyaltyPointsLabel}>puan</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Müşteri Yorumları Bölümü */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💬 Müşteri Yorumları</Text>
        </View>
        {reviews.length > 0 && (
          <View style={styles.ratingOverview}>
            <Text style={styles.ratingBig}>{averageRating.toFixed(1)}</Text>
            <Text style={styles.ratingStars}>{renderStars(Math.round(averageRating))}</Text>
            <Text style={styles.ratingCount}>{reviews.length} değerlendirme</Text>
          </View>
        )}
        {reviews.length === 0 ? (
          <Text style={styles.emptyText}>Henüz yorum yok</Text>
        ) : (
          reviews.slice(0, 10).map((review, idx) => (
            <View key={review.id || idx} style={styles.reviewItem}>
              <View style={styles.reviewTop}>
                <Text style={styles.reviewStars}>{renderStars(review.rating)}</Text>
                <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
              </View>
              {review.comment ? (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              ) : (
                <Text style={styles.reviewNoComment}>Yorum yazılmamış</Text>
              )}
              {review.payer_name && (
                <Text style={styles.reviewAuthor}>— {review.payer_name}</Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Uygulama Hakkında</Text>
        <Text style={styles.infoText}>QR Hesap - Restoran Yönetim</Text>
        <Text style={styles.infoText}>Versiyon 1.0.0</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      {/* Kampanya Ekle Modal */}
      <Modal visible={showCampaignModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Kampanya Ekle</Text>
            <TextInput
              style={styles.input}
              placeholder="Kampanya adı"
              placeholderTextColor="#8b8b8b"
              value={campName}
              onChangeText={setCampName}
            />
            <Text style={styles.label}>İndirim Türü</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, campDiscountType === 'percentage' && styles.toggleBtnActive]}
                onPress={() => setCampDiscountType('percentage')}
              >
                <Text style={[styles.toggleBtnText, campDiscountType === 'percentage' && styles.toggleBtnTextActive]}>% Yüzde</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, campDiscountType === 'fixed' && styles.toggleBtnActive]}
                onPress={() => setCampDiscountType('fixed')}
              >
                <Text style={[styles.toggleBtnText, campDiscountType === 'fixed' && styles.toggleBtnTextActive]}>₺ Sabit</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder={campDiscountType === 'percentage' ? 'İndirim yüzdesi (ör: 15)' : 'İndirim tutarı (₺)'}
              placeholderTextColor="#8b8b8b"
              value={campDiscountValue}
              onChangeText={setCampDiscountValue}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setShowCampaignModal(false);
                setCampName('');
                setCampDiscountValue('');
              }}>
                <Text style={styles.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addCampaign}>
                <Text style={styles.saveText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  contentContainer: { paddingBottom: 40 },
  header: { padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  card: { marginHorizontal: 20, marginTop: 10, backgroundColor: '#16213e', borderRadius: 20, padding: 30, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  restaurantName: { fontSize: 22, fontWeight: '800', color: '#FFF' },

  // Section Card
  sectionCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#16213e', borderRadius: 16, padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: '#f5a623', fontSize: 16, fontWeight: '800' },
  sectionAddBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  sectionAddBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  emptyText: { color: '#8b8b8b', fontSize: 14, textAlign: 'center', paddingVertical: 10 },

  // Kampanya items
  campaignItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 8 },
  campaignInfo: { flex: 1 },
  campaignName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  campaignDiscount: { color: '#f5a623', fontSize: 13, fontWeight: '600', marginTop: 3 },
  campaignDelete: { backgroundColor: '#e9456033', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 10 },
  campaignDeleteText: { color: '#e94560', fontWeight: '700', fontSize: 12 },

  // Loyalty
  loyaltyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 8 },
  loyaltyLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  loyaltyAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5a62333', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  loyaltyAvatarText: { color: '#f5a623', fontSize: 18, fontWeight: '900' },
  loyaltyInfo: { flex: 1 },
  loyaltyName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  loyaltyPhone: { color: '#8b8b8b', fontSize: 12, marginTop: 2 },
  loyaltyOrders: { color: '#8b8b8b', fontSize: 11, marginTop: 1 },
  loyaltyRight: { alignItems: 'center' },
  loyaltyPoints: { color: '#f5a623', fontSize: 22, fontWeight: '900' },
  loyaltyPointsLabel: { color: '#8b8b8b', fontSize: 11, marginTop: 2 },

  // Yorumlar
  ratingOverview: { alignItems: 'center', paddingVertical: 12, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  ratingBig: { color: '#f5a623', fontSize: 36, fontWeight: '900' },
  ratingStars: { fontSize: 20, marginTop: 4 },
  ratingCount: { color: '#8b8b8b', fontSize: 13, marginTop: 4 },
  reviewItem: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 8 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewStars: { fontSize: 14 },
  reviewDate: { color: '#8b8b8b', fontSize: 11 },
  reviewComment: { color: '#FFF', fontSize: 14, lineHeight: 20 },
  reviewNoComment: { color: '#555', fontSize: 13, fontStyle: 'italic' },
  reviewAuthor: { color: '#8b8b8b', fontSize: 12, marginTop: 6 },

  // Info & Logout
  infoCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#16213e', borderRadius: 16, padding: 20 },
  infoTitle: { color: '#f5a623', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  infoText: { color: '#8b8b8b', fontSize: 14, marginBottom: 4 },
  logoutBtn: { marginHorizontal: 20, marginTop: 30, backgroundColor: '#e94560', borderRadius: 14, padding: 18, alignItems: 'center' },
  logoutText: { color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#16213e', borderRadius: 20, padding: 24 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 16 },
  label: { color: '#8b8b8b', fontSize: 13, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#f5a623', borderColor: '#f5a623' },
  toggleBtnText: { color: '#8b8b8b', fontWeight: '700', fontSize: 14 },
  toggleBtnTextActive: { color: '#1a1a2e' },
  input: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, fontSize: 15, color: '#FFF', marginBottom: 12, borderWidth: 1, borderColor: '#2a2a4a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', alignItems: 'center' },
  cancelText: { color: '#8b8b8b', fontWeight: '700' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#e94560', alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '700' },
});
