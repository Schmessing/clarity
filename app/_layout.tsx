import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0d0d18',
            borderTopColor: '#1f2937',
            borderTopWidth: 1,
            height: 82,
            paddingBottom: 18,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#10b981',
          tabBarInactiveTintColor: '#374151',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="index"        options={{ title: 'Dashboard',    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💳</Text> }} />
        <Tabs.Screen name="transactions" options={{ title: 'Transactions',  tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text> }} />
        <Tabs.Screen name="scan"         options={{ title: 'Scan',          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📷</Text> }} />
        <Tabs.Screen name="budgets"      options={{ title: 'Budgets',       tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎯</Text> }} />
        <Tabs.Screen name="insights"     options={{ title: 'Insights',      tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🤖</Text> }} />
      </Tabs>
    </>
  );
}
