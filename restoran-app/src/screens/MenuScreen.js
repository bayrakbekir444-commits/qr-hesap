import React, { useState, useCallback } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, RefreshControl, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { formatPrice } from '../utils/api';

export default function MenuScreen() {
  const [menu, setMenu] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [showCatAdd, setShowCatAdd] = useState(false);
  const [catName, setCatName] = useState('');

  const loadMenu = async () => {
    try {
      const res = await api.get('/api/menu');
      setMenu(res.data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadMenu(); }, []));

  const onRefresh = async () => { setRefreshing(true); await loadMenu(); setRefreshing(false); };

  const addCategory = async () => {
    if (!catName) return;
    await api.post('/api/menu/categories', { name: catName });
    setCatName('');
    setShowCatAdd(false);
    loadMenu();
  };

  const addItem = async () => {
    if (!newName || !newPrice || !selectedCat) return;
    const price = Math.round(parseFloat(newPrice.replace(',', '.')) * 100);
    const payload = { category_id: selectedCat, name: newName, price };
    if (newNameEn.trim()) payload.name_en = newNameEn.trim();
    if (newNameAr.trim()) payload.name_ar = newNameAr.trim();
    await api.post('/api/menu/items', payload);
    setNewName('');
    setNewNameEn('');
    setNewNameAr('');
    setNewPrice('');
    setShowAdd(false);
    loadMenu();
  };

  const deleteItem = (id, name) => {
    Alert.alert('Sil', `${name} silinsin mi?`, [
      { text: 'İptal' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await api.delete(`/api/menu/items/${id}`);
        loadMenu();
      }},
    ]);
  };

  const toggleStock = async (itemId, currentActive) => {
    try {
      const newActive = currentActive === 0 ? 1 : 0;
      await api.put(`/api/menu/items/${itemId}`, { active: newActive });
      loadMenu();
    } catch {
      Alert.alert('Hata', 'Stok durumu güncellenemedi.');
    }
  };

  const getLanguageIndicators = (item) => {
    const langs = [];
    if (item.name_en) langs.push('EN');
    if (item.name_ar) langs.push('AR');
    return langs;
  };

  const sections = menu.map((cat) => ({
    title: cat.name,
    catId: cat.id,
    data: cat.items || [],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Menü</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.catBtn} onPress={() => setShowCatAdd(true)}>
            <Text style={styles.catBtnText}>+ Kategori</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Ürün</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const isActive = item.active !== 0;
          const langs = getLanguageIndicators(item);
          return (
            <TouchableOpacity
              style={[styles.item, !isActive && styles.itemInactive]}
              onLongPress={() => deleteItem(item.id, item.name)}
            >
              <View style={styles.itemLeft}>
                <View style={styles.itemNameRow}>
                  <Text style={[styles.itemName, !isActive && styles.itemNameInactive]}>{item.name}</Text>
                  {langs.map((lang) => (
                    <View key={lang} style={styles.langBadge}>
                      <Text style={styles.langBadgeText}>{lang}</Text>
                    </View>
                  ))}
                </View>
                {!isActive && <Text style={styles.outOfStockBadge}>Stokta Yok</Text>}
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemPrice, !isActive && styles.itemPriceInactive]}>{formatPrice(item.price)}</Text>
                <Switch
                  value={isActive}
                  onValueChange={() => toggleStock(item.id, item.active)}
                  trackColor={{ false: '#3a3a4a', true: '#16a34a' }}
                  thumbColor={isActive ? '#FFF' : '#8b8b8b'}
                  style={styles.stockSwitch}
                />
              </View>
            </TouchableOpacity>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Menü boş</Text>}
      />

      {/* Kategori Ekle Modal */}
      <Modal visible={showCatAdd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Kategori Ekle</Text>
            <TextInput style={styles.input} placeholder="Kategori adı" placeholderTextColor="#8b8b8b" value={catName} onChangeText={setCatName} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCatAdd(false)}>
                <Text style={styles.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addCategory}>
                <Text style={styles.saveText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ürün Ekle Modal */}
      <Modal visible={showAdd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Ürün Ekle</Text>
            <Text style={styles.label}>Kategori Seç</Text>
            <View style={styles.catRow}>
              {menu.map((c) => (
                <TouchableOpacity key={c.id} style={[styles.catChip, selectedCat === c.id && styles.catChipActive]} onPress={() => setSelectedCat(c.id)}>
                  <Text style={[styles.catChipText, selectedCat === c.id && styles.catChipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Ürün adı (Türkçe)" placeholderTextColor="#8b8b8b" value={newName} onChangeText={setNewName} />
            <TextInput style={styles.input} placeholder="İngilizce adı (isteğe bağlı)" placeholderTextColor="#8b8b8b" value={newNameEn} onChangeText={setNewNameEn} />
            <TextInput style={styles.input} placeholder="Arapça adı (isteğe bağlı)" placeholderTextColor="#8b8b8b" value={newNameAr} onChangeText={setNewNameAr} />
            <TextInput style={styles.input} placeholder="Fiyat (TL)" placeholderTextColor="#8b8b8b" value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAdd(false); setNewNameEn(''); setNewNameAr(''); }}>
                <Text style={styles.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addItem}>
                <Text style={styles.saveText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 12 },
  headerButtons: { flexDirection: 'row', gap: 10 },
  catBtn: { backgroundColor: '#16213e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#f5a623' },
  catBtnText: { color: '#f5a623', fontWeight: '700', fontSize: 13 },
  addBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  list: { paddingBottom: 30 },
  sectionTitle: { color: '#f5a623', fontSize: 16, fontWeight: '800', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginHorizontal: 16, marginBottom: 6, backgroundColor: '#16213e', borderRadius: 12 },
  itemInactive: { backgroundColor: '#12172a', opacity: 0.6 },
  itemLeft: { flex: 1 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  itemName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  itemNameInactive: { color: '#666', textDecorationLine: 'line-through' },
  outOfStockBadge: { color: '#e94560', fontSize: 11, fontWeight: '700', marginTop: 3 },
  langBadge: { backgroundColor: '#2a2a4a', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  langBadgeText: { color: '#f5a623', fontSize: 10, fontWeight: '800' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemPrice: { color: '#f5a623', fontSize: 15, fontWeight: '700' },
  itemPriceInactive: { color: '#555' },
  stockSwitch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  empty: { color: '#8b8b8b', textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#16213e', borderRadius: 20, padding: 24 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 16 },
  label: { color: '#8b8b8b', fontSize: 13, marginBottom: 8 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a' },
  catChipActive: { backgroundColor: '#e94560', borderColor: '#e94560' },
  catChipText: { color: '#8b8b8b', fontSize: 13 },
  catChipTextActive: { color: '#FFF' },
  input: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, fontSize: 15, color: '#FFF', marginBottom: 12, borderWidth: 1, borderColor: '#2a2a4a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', alignItems: 'center' },
  cancelText: { color: '#8b8b8b', fontWeight: '700' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#e94560', alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '700' },
});
