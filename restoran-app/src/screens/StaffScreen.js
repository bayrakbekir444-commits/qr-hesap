import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../utils/api';

const ROLES = [
  { key: 'garson', label: 'Garson' },
  { key: 'kasiyer', label: 'Kasiyer' },
  { key: 'mutfak', label: 'Mutfak' },
];

export default function StaffScreen() {
  const [staff, setStaff] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('garson');
  const [pin, setPin] = useState('');

  // Assign to table
  const [showAssign, setShowAssign] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState(null);
  const [tables, setTables] = useState([]);

  const loadStaff = async () => {
    try {
      const res = await api.get('/api/staff');
      setStaff(res.data || []);
    } catch {}
  };

  useFocusEffect(useCallback(() => { loadStaff(); }, []));

  const onRefresh = async () => { setRefreshing(true); await loadStaff(); setRefreshing(false); };

  const addStaff = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Personel adı girin.');
      return;
    }
    if (!pin || pin.length < 4) {
      Alert.alert('Hata', 'En az 4 haneli PIN girin.');
      return;
    }
    try {
      await api.post('/api/staff', { name: name.trim(), role, pin });
      setName('');
      setRole('garson');
      setPin('');
      setShowAdd(false);
      loadStaff();
    } catch {
      Alert.alert('Hata', 'Personel eklenemedi.');
    }
  };

  const deleteStaff = (id, staffName) => {
    Alert.alert('Personel Sil', `${staffName} silinsin mi?`, [
      { text: 'İptal' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/staff/${id}`);
          loadStaff();
        } catch {
          Alert.alert('Hata', 'Personel silinemedi.');
        }
      }},
    ]);
  };

  const openAssign = async (staffId) => {
    try {
      const res = await api.get('/api/tables');
      setTables(res.data || []);
      setAssignStaffId(staffId);
      setShowAssign(true);
    } catch {
      Alert.alert('Hata', 'Masalar yüklenemedi.');
    }
  };

  const assignToTable = async (tableId) => {
    try {
      await api.post(`/api/staff/${assignStaffId}/assign`, { table_id: tableId });
      setShowAssign(false);
      setAssignStaffId(null);
      Alert.alert('Başarılı', 'Personel masaya atandı.');
      loadStaff();
    } catch {
      Alert.alert('Hata', 'Atama başarısız.');
    }
  };

  const getRoleLabel = (r) => {
    const found = ROLES.find((x) => x.key === r);
    return found ? found.label : r;
  };

  const getRoleColor = (r) => {
    switch (r) {
      case 'garson': return '#f5a623';
      case 'kasiyer': return '#60a5fa';
      case 'mutfak': return '#e94560';
      default: return '#8b8b8b';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👥 Personel</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
          <Text style={styles.addButtonText}>+ Personel Ekle</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={staff}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.staffItem}
            onPress={() => openAssign(item.id)}
            onLongPress={() => deleteStaff(item.id, item.name)}
          >
            <View style={styles.staffLeft}>
              <View style={[styles.staffAvatar, { backgroundColor: getRoleColor(item.role) + '33' }]}>
                <Text style={[styles.staffAvatarText, { color: getRoleColor(item.role) }]}>
                  {item.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text style={[styles.staffRole, { color: getRoleColor(item.role) }]}>{getRoleLabel(item.role)}</Text>
                {item.assigned_table && (
                  <Text style={styles.staffTable}>Masa {item.assigned_table}</Text>
                )}
              </View>
            </View>
            <Text style={styles.staffAssignHint}>Masaya Ata →</Text>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Henüz personel eklenmemiş</Text>}
      />

      {/* Add Staff Modal */}
      <Modal visible={showAdd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Personel Ekle</Text>
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor="#8b8b8b"
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.label}>Rol</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleChip, role === r.key && styles.roleChipActive]}
                  onPress={() => setRole(r.key)}
                >
                  <Text style={[styles.roleChipText, role === r.key && styles.roleChipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="PIN (en az 4 hane)"
              placeholderTextColor="#8b8b8b"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAdd(false); setName(''); setPin(''); }}>
                <Text style={styles.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addStaff}>
                <Text style={styles.saveText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign to Table Modal */}
      <Modal visible={showAssign} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.assignContent}>
            <View style={styles.assignHeader}>
              <Text style={styles.modalTitle}>Masaya Ata</Text>
              <TouchableOpacity onPress={() => setShowAssign(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={tables}
              keyExtractor={(item) => item.id.toString()}
              numColumns={3}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.assignTableCard} onPress={() => assignToTable(item.id)}>
                  <Text style={styles.assignTableNumber}>{item.table_number}</Text>
                  <Text style={styles.assignTableLabel}>Masa</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.assignGrid}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  addButton: { backgroundColor: '#e94560', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  staffItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#16213e', borderRadius: 14, marginBottom: 8 },
  staffLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  staffAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  staffAvatarText: { fontSize: 20, fontWeight: '900' },
  staffInfo: { flex: 1 },
  staffName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  staffRole: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  staffTable: { color: '#8b8b8b', fontSize: 12, marginTop: 2 },
  staffAssignHint: { color: '#8b8b8b', fontSize: 12 },
  empty: { color: '#8b8b8b', textAlign: 'center', marginTop: 40, fontSize: 16 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#16213e', borderRadius: 20, padding: 24 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 16 },
  label: { color: '#8b8b8b', fontSize: 13, marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  roleChip: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a4a', alignItems: 'center' },
  roleChipActive: { backgroundColor: '#e94560', borderColor: '#e94560' },
  roleChipText: { color: '#8b8b8b', fontWeight: '700', fontSize: 14 },
  roleChipTextActive: { color: '#FFF' },
  input: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, fontSize: 15, color: '#FFF', marginBottom: 12, borderWidth: 1, borderColor: '#2a2a4a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a', alignItems: 'center' },
  cancelText: { color: '#8b8b8b', fontWeight: '700' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#e94560', alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '700' },
  // Assign Modal
  modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  assignContent: { backgroundColor: '#16213e', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', padding: 20 },
  assignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalClose: { color: '#e94560', fontSize: 24, fontWeight: '700' },
  assignGrid: { padding: 8 },
  assignTableCard: { flex: 1, margin: 6, backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, alignItems: 'center', minHeight: 80, justifyContent: 'center', borderWidth: 1, borderColor: '#2a2a4a' },
  assignTableNumber: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  assignTableLabel: { color: '#8b8b8b', fontSize: 11, marginTop: 4 },
});
