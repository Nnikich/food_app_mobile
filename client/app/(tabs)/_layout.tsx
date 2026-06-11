import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Flame, BookOpen, Calendar, ShoppingCart, User } from 'lucide-react-native';

import { useColorScheme } from '../../components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const activeColor = '#f43f5e'; // Premium Rose 500 branding color
  const inactiveColor = colorScheme === 'dark' ? '#94a3b8' : '#64748b'; // Slate 400 / 500

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#1e293b' : '#f1f5f9',
          backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#ffffff',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
          title: 'Выбор',
          headerTitle: 'CHOOZI',
          tabBarIcon: ({ color, size }) => (
            <Flame color={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Рецепты',
          headerTitle: 'Каталог рецептов',
          tabBarIcon: ({ color, size }) => (
            <BookOpen color={color} size={size ?? 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'План',
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
    </Tabs>
  );
}

