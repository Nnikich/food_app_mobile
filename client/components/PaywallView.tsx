import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { Crown, Compass, Sparkles, Zap, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface PaywallViewProps {
  title: string;
  subtitle: string;
  onSubscribe: () => void;
}

export default function PaywallView({ title, subtitle, onSubscribe }: PaywallViewProps) {
  const features = [
    {
      icon: <Crown color="#f59e0b" size={20} fill="#f59e0b" />,
      title: 'Доступ ко всем рецептам шефов',
      desc: 'Откройте эксклюзивные ресторанные блюда с подробным пошаговым руководством.'
    },
    {
      icon: <Compass color="#f59e0b" size={20} />,
      title: 'Полный доступ к каталогу',
      desc: 'Ищите любые рецепты, фильтруйте по ингредиентам и сложности без ограничений.'
    },
    {
      icon: <Sparkles color="#f59e0b" size={20} fill="#f59e0b" />,
      title: 'Умный планировщик меню на 7 дней',
      desc: 'Составляйте план питания на неделю вперед с авто-сборкой списка покупок.'
    },
    {
      icon: <Zap color="#f59e0b" size={20} fill="#f59e0b" />,
      title: 'Умный экспорт в один клик',
      desc: 'Отправляйте сгруппированный список ингредиентов в Telegram/WhatsApp.'
    }
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Decorative Blur Spheres */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.card}>
        {/* Crown Icon Header Badge */}
        <View style={styles.crownContainer}>
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            style={styles.crownBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Crown size={30} color="#ffffff" fill="#ffffff" />
          </LinearGradient>
          <View style={styles.lockBadge}>
            <Lock size={10} color="#0f172a" strokeWidth={3} />
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Feature List */}
        <View style={styles.featuresContainer}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.iconBox}>{f.icon}</View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity onPress={onSubscribe} activeOpacity={0.8} style={{ width: '100%' }}>
          <LinearGradient
            colors={['#f59e0b', '#fb923c', '#ea580c']}
            style={styles.subscribeButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.btnInner}>
              <Text style={styles.subscribeBtnText}>Активировать Premium</Text>
              <Crown size={14} color="#ffffff" fill="#ffffff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.cancelFootnote}>
          Отмена подписки в любой момент. Без скрытых платежей.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  glowTop: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#fef3c7',
    opacity: 0.5,
    zIndex: -1,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#ecfdf5',
    opacity: 0.5,
    zIndex: -1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  crownContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  crownBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 24,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  featureDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 14,
    fontWeight: '500',
  },
  subscribeButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subscribeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  cancelFootnote: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});
