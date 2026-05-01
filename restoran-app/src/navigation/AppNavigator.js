import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TablesScreen from '../screens/TablesScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import MenuScreen from '../screens/MenuScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StaffScreen from '../screens/StaffScreen';
import OrdersScreen from '../screens/OrdersScreen';
import WaiterCallsScreen from '../screens/WaiterCallsScreen';
import KitchenScreen from '../screens/KitchenScreen';

import api from '../utils/api';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TablesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TablesList" component={TablesScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}

// Siparişler sekmesi de OrderDetail'e geçiş yapabilsin diye stack
function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersList" component={OrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  // Çağrı sekmesinin badge'i için global poll (sekme açık olmasa bile güncel)
  const [callCount, setCallCount] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const fetchCalls = async () => {
      try {
        const res = await api.get('/api/waiter/calls');
        if (isMounted.current) {
          setCallCount((res.data || []).length);
        }
      } catch {}
    };
    fetchCalls();
    const interval = setInterval(fetchCalls, 8000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#16213e',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#8b8b8b',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarBadgeStyle: { backgroundColor: '#e94560', fontSize: 10, fontWeight: '800' },
      }}
    >
      <Tab.Screen
        name="Masalar"
        component={TablesStack}
        options={{
          tabBarLabel: 'Masalar',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>{focused ? '🍽️' : '🍽️'}</Text>,
        }}
      />
      <Tab.Screen
        name="Siparişler"
        component={OrdersStack}
        options={{
          tabBarLabel: 'Siparişler',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="Çağrılar"
        component={WaiterCallsScreen}
        options={{
          tabBarLabel: 'Çağrılar',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>🔔</Text>,
          tabBarBadge: callCount > 0 ? callCount : undefined,
        }}
      />
      <Tab.Screen
        name="Mutfak"
        component={KitchenScreen}
        options={{
          tabBarLabel: 'Mutfak',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>👨‍🍳</Text>,
        }}
      />
      <Tab.Screen
        name="Menü"
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menü',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>🍔</Text>,
        }}
      />
      <Tab.Screen
        name="Ödemeler"
        component={PaymentsScreen}
        options={{
          tabBarLabel: 'Ödemeler',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>💳</Text>,
        }}
      />
      <Tab.Screen
        name="Personel"
        component={StaffScreen}
        options={{
          tabBarLabel: 'Personel',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="Ayarlar"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ayarlar',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
