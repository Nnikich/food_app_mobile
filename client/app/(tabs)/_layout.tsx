import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home, Search, Calendar, ShoppingCart, User } from 'lucide-react-native';

import { useColorScheme } from '../../components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = '#f43f5e'; // Premium Rose 500 branding color
  const inactiveColor = colorScheme === 'dark' ? '#94a3b8' : '#6b7280'; // Slate 400 / Gray 500

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#1e293b' : '#e2e8f0',
          backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: colorScheme === 'dark' ? '#1e293b' : '#f1f5f9',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
          color: colorScheme === 'dark' ? '#f8fafc' : '#0f172a',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          headerTitle: 'CHOOZI',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Каталог',
          headerTitle: 'Каталог рецептов',
          tabBarIcon: ({ color, size }) => (
            <Search color={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Меню',
          headerTitle: 'План питания',
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Покупки',
          headerTitle: 'Список покупок',
          tabBarIcon: ({ color, size }) => (
            <ShoppingCart color={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          headerTitle: 'Мой профиль',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipe/[id]"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

