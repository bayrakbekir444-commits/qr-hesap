import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!name || !password) {
      Alert.alert('Hata', 'Restoran adı ve şifre gerekli.');
      return;
    }
    setLoading(true);
    try {
      await login(name, password);
    } catch (e) {
      Alert.alert('Giriş Başarısız', 'Restoran adı veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Hesap</Text>
      <Text style={styles.subtitle}>Restoran Yönetim Paneli</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Restoran Adı"
          placeholderTextColor="#8b8b8b"
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor="#8b8b8b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>GİRİŞ YAP</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 30 },
  emoji: { fontSize: 60, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF', letterSpacing: 2 },
  subtitle: { fontSize: 14, color: '#8b8b8b', marginTop: 8, marginBottom: 40 },
  form: { width: '100%' },
  input: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 16, fontSize: 16,
    color: '#FFF', marginBottom: 14, borderWidth: 1, borderColor: '#2a2a4a',
  },
  button: {
    backgroundColor: '#e94560', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 10,
  },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
});
