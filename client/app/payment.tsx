import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { X, ShieldCheck } from 'lucide-react-native';
import { useAppContext } from '../context/AppContext';

export default function PaymentScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url: string }>();
  const { activatePremium, refreshUserState } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);

  if (!url) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Ошибка: Ссылка на оплату не найдена.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleNavigationChange = async (navState: WebViewNavigation) => {
    const currentUrl = navState.url;

    // Detect YooKassa success redirect
    if (currentUrl.includes('yookassa=success') || currentUrl.includes('payment/success')) {
      // Success! Grant premium status immediately
      await activatePremium();
      await refreshUserState();
      
      Alert.alert(
        'Успешная оплата! 🎉',
        'Ваша подписка CHOOZI Premium успешно активирована. Добро пожаловать!',
        [{ text: 'Отлично!', onPress: () => router.replace('/profile') }]
      );
    } 
    // Detect YooKassa fail redirect
    else if (currentUrl.includes('yookassa=fail') || currentUrl.includes('payment/fail')) {
      Alert.alert(
        'Оплата отменена',
        'Произошла ошибка при оплате или транзакция была отменена.',
        [{ text: 'Понятно', onPress: () => router.back() }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Safe header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color="#64748b" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <ShieldCheck size={16} color="#10b981" style={{ marginRight: 4 }} />
          <Text style={styles.title}>Безопасная оплата ЮKassa</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.webContainer}>
        <WebView
          source={{ uri: url }}
          onNavigationStateChange={handleNavigationChange}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#f43f5e" />
            <Text style={styles.loadingText}>Загрузка платежного шлюза...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? 24 : 12,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  webContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
