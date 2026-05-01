import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    try {
      const saved = await AsyncStorage.getItem('token');
      const rest = await AsyncStorage.getItem('restaurant');
      if (saved && rest) {
        setToken(saved);
        setRestaurant(JSON.parse(rest));
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const login = async (name, password) => {
    const res = await api.post('/api/auth/login', { name, password });
    const { token: t, restaurant: r } = res.data;
    await AsyncStorage.setItem('token', t);
    await AsyncStorage.setItem('restaurant', JSON.stringify(r));
    setToken(t);
    setRestaurant(r);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('restaurant');
    setToken(null);
    setRestaurant(null);
  };

  return (
    <AuthContext.Provider value={{ token, restaurant, loading, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
