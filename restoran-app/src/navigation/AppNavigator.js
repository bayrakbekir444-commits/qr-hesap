import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TablesScreen from '../screens/TablesScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import MenuScreen from '../screens/MenuScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StaffScreen from '../screens/StaffScreen';

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

export default function AppNavigator() {
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
      }}
    >
      <Tab.Screen
        name="Masalar"
        component={TablesStack}
        options={{
          tabBarLabel: 'Masalar',
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🍽️</Text>,
        }}
      />
      <Tab.Screen
        name="Menü"
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menü',
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🍔</Text>,
        }}
      />
      <Tab.Screen
        name="Ödemeler"
        component={PaymentsScreen}
        options={{
          tabBarLabel: 'Ödemeler',
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>💳</Text>,
        }}
      />
      <Tab.Screen
        name="Personel"
        component={StaffScreen}
        options={{
          tabBarLabel: 'Personel',
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="Ayarlar"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ayarlar',
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
