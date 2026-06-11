import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Check,
  Flame,
  Waves,
  Microwave,
  Wind,
  CookingPot,
  ChefHat,
  Beef,
  Utensils,
  Leaf,
  Soup,
  UtensilsCrossed,
  Croissant,
  Salad,
  FishOff,
  NutOff,
  WheatOff,
  MilkOff,
  CandyOff,
  EggOff,
  Clock,
  Lock,
  Sparkles,
  X
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../context/AppContext';
import { TECHNIQUES, PREFERENCE_TAGS, DISLIKE_TAGS, DIFFICULTY_LEVELS } from '../data/constants';
import { Difficulty } from '../types';

// Map icons to Lucide components
const IconMap: Record<string, any> = {
  Flame, Waves, Microwave, Wind, CookingPot, ChefHat, Beef, Utensils,
  Leaf, Soup, UtensilsCrossed, Croissant, Salad,
  FishOff, NutOff, WheatOff, MilkOff, CandyOff, EggOff,
  Clock
};

const RenderIcon = ({ name, size = 24, color = '#64748b' }: { name: string; size?: number; color?: string }) => {
  const IconComponent = IconMap[name] || ChefHat;
  return <IconComponent size={size} color={color} />;
};

export default function OnboardingScreen() {
  const { updatePreferences, completeOnboarding, state, activatePremium } = useAppContext();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [formData, setFormData] = useState({
    technique: state.preferences?.technique || [],
    tags: state.preferences?.tags || [],
    dislikedTags: state.preferences?.dislikedTags || [],
    difficulty: state.preferences?.difficulty || ['easy', 'medium'] as Difficulty[],
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (step === 2 && formData.difficulty.length === 0) {
      Alert.alert('Внимание', 'Пожалуйста, выберите хотя бы один уровень сложности.');
      return;
    }
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      updatePreferences(formData);
      completeOnboarding();
      router.replace('/(tabs)');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const toggleSelection = (field: 'technique' | 'tags' | 'dislikedTags' | 'difficulty', value: any) => {
    setFormData((prev) => {
      const current = prev[field] as any[];
      const isSelected = current.includes(value);
      return {
        ...prev,
        [field]: isSelected
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const isPremiumActive = state.subscription === 'premium';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Navigation and Progress */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backButton, step === 0 && { opacity: 0 }]}
          disabled={step === 0}
        >
          <ChevronLeft size={24} color="#334155" />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((step + 1) / totalSteps) * 100}%` },
            ]}
          />
        </View>

        {step < totalSteps - 1 ? (
          <TouchableOpacity onPress={() => setStep(step + 1)} style={styles.skipButton}>
            <Text style={styles.skipText}>Пропустить</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {/* Screen Title & Header Desc */}
      <View style={styles.titleContainer}>
        <Text style={styles.stepTitle}>
          {step === 0 && 'Техника на кухне'}
          {step === 1 && 'Вкусы и ограничения'}
          {step === 2 && 'Уровень готовки'}
        </Text>
        <Text style={styles.stepDesc}>
          {step === 0 && 'Отметьте, что у вас есть, чтобы мы подобрали рецепты.'}
          {step === 1 && 'Помогите нам составить идеальное меню под ваши предпочтения.'}
          {step === 2 && 'Выберите сложности рецептов, которые подходят вашему темпу.'}
        </Text>
      </View>

      {/* Main Form Fields */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          // STEP 1: TECHNIQUES
          <View style={styles.grid}>
            {TECHNIQUES.map((item) => {
              const isSelected = formData.technique.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleSelection('technique', item.id)}
                  activeOpacity={0.7}
                  style={[styles.gridCard, isSelected && styles.gridCardActive]}
                >
                  <View style={[styles.iconContainer, isSelected ? styles.iconContainerActive : styles.iconContainerInactive]}>
                    <RenderIcon name={item.icon} size={26} color={isSelected ? '#ffffff' : '#64748b'} />
                  </View>
                  <Text style={styles.gridCardLabel}>{item.label}</Text>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={10} color="#ffffff" strokeWidth={4} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {step === 1 && (
          // STEP 2: TASTES & INGREDIENT RESTRICTIONS
          <View style={styles.stepTwoContainer}>
            {/* Preferred Tastes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>❤️ Что вы любите?</Text>
              <View style={styles.grid}>
                {PREFERENCE_TAGS.map((tag) => {
                  const isSelected = formData.tags.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      onPress={() => toggleSelection('tags', tag.id)}
                      activeOpacity={0.7}
                      style={[styles.tagGridCard, isSelected && styles.tagGridCardActive]}
                    >
                      <RenderIcon name={tag.icon} size={22} color={isSelected ? '#f43f5e' : '#64748b'} />
                      <Text style={[styles.tagGridLabel, isSelected && styles.tagGridLabelActive]}>{tag.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Dislikes */}
            <View style={[styles.section, { marginTop: 12 }]}>
              <Text style={styles.sectionTitle}>🚫 Есть исключения?</Text>
              <View style={styles.flexWrapContainer}>
                {DISLIKE_TAGS.map((tag) => {
                  const isSelected = formData.dislikedTags.includes(tag.excludes);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      onPress={() => toggleSelection('dislikedTags', tag.excludes)}
                      activeOpacity={0.7}
                      style={[styles.pillCard, isSelected && styles.pillCardActive]}
                    >
                      <RenderIcon name={tag.icon} size={14} color={isSelected ? '#ef4444' : '#64748b'} />
                      <Text style={[styles.pillLabel, isSelected && styles.pillLabelActive]}>{tag.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          // STEP 3: DIFFICULTY LEVELS
          <View style={styles.stepThreeContainer}>
            {DIFFICULTY_LEVELS.map((level) => {
              const isSelected = formData.difficulty.includes(level.id as Difficulty);
              const isDisabled = level.isPremium && !isPremiumActive;

              return (
                <TouchableOpacity
                  key={level.id}
                  onPress={() => {
                    if (isDisabled) {
                      setIsSubOpen(true);
                    } else {
                      toggleSelection('difficulty', level.id as Difficulty);
                    }
                  }}
                  activeOpacity={0.8}
                  style={[styles.difficultyRow, isSelected && styles.difficultyRowActive, isDisabled && styles.difficultyRowDisabled]}
                >
                  {/* Premium indicator badge */}
                  {level.isPremium && (
                    <View style={[styles.premiumBadge, isPremiumActive ? styles.premiumBadgeActive : styles.premiumBadgeLocked]}>
                      <Lock size={8} color="#ffffff" style={{ marginRight: 2 }} />
                      <Text style={styles.premiumBadgeText}>{isPremiumActive ? 'АКТИВЕН' : 'PREMIUM'}</Text>
                    </View>
                  )}

                  {/* Difficulty Icon */}
                  <View style={[styles.diffIconWrapper, isSelected ? styles.diffIconActive : styles.diffIconInactive]}>
                    <RenderIcon name={level.icon} size={22} color={isSelected ? '#ffffff' : '#64748b'} />
                  </View>

                  {/* Level text details */}
                  <View style={styles.diffContent}>
                    <View style={styles.diffHeaderRow}>
                      <Text style={styles.diffLabel}>{level.label}</Text>
                      {level.time && (
                        <View style={styles.diffTimeTag}>
                          <Text style={styles.diffTimeText}>{level.time}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.diffDesc}>{level.description}</Text>
                  </View>

                  {/* Native Custom Checkbox */}
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={12} color="#ffffff" strokeWidth={4} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer navigation */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.8} style={{ width: '100%' }}>
          <LinearGradient
            colors={['#f43f5e', '#ec4899']}
            style={styles.nextButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.nextButtonText}>
              {step === totalSteps - 1 ? 'Завершить настройку' : 'Далее'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Subscription Premium Paywall Modal */}
      <Modal
        visible={isSubOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSubOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity onPress={() => setIsSubOpen(false)} style={styles.closeModalButton}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>

            <LinearGradient
              colors={['#f43f5e', '#ec4899']}
              style={styles.modalHeroGlow}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Sparkles size={32} color="#ffffff" />
              <Text style={styles.modalHeroTitle}>Разблокируйте PREMIUM</Text>
              <Text style={styles.modalHeroDesc}>
                Получите доступ к сложным ресторанным рецептам, персональному планировщику питания и неограниченным свайпам!
              </Text>
            </LinearGradient>

            <View style={styles.modalDetails}>
              <Text style={styles.modalPriceText}>Подписка CHOOZI • 199 ₽ / месяц</Text>
              <Text style={styles.modalFootnoteText}>
                Доступ к рецептам уровня "Шеф-повар", автоматический список покупок, отключение ограничений дневных лимитов.
              </Text>

              <TouchableOpacity
                onPress={() => {
                  activatePremium();
                  setIsSubOpen(false);
                  Alert.alert('Поздравляем! 🎉', 'Premium успешно активирован!');
                }}
                activeOpacity={0.8}
                style={{ width: '100%', marginTop: 16 }}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.buyButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buyButtonText}>Активировать за 199 ₽</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'android' ? 24 : 8,
    height: 56,
  },
  backButton: {
    padding: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f43f5e',
    borderRadius: 3,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  stepDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 18,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  gridCardActive: {
    borderColor: '#f43f5e',
    backgroundColor: '#fff1f2',
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainerInactive: {
    backgroundColor: '#f8fafc',
  },
  iconContainerActive: {
    backgroundColor: '#f43f5e',
  },
  gridCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f43f5e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTwoContainer: {
    width: '100%',
  },
  section: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  tagGridCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  tagGridCardActive: {
    borderColor: '#f43f5e',
    backgroundColor: '#fff1f2',
  },
  tagGridLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tagGridLabelActive: {
    color: '#e11d48',
    fontWeight: '700',
  },
  flexWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  pillCardActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pillLabelActive: {
    color: '#dc2626',
    fontWeight: '700',
  },
  stepThreeContainer: {
    width: '100%',
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  difficultyRowActive: {
    borderColor: '#f43f5e',
    backgroundColor: '#fff1f2',
  },
  difficultyRowDisabled: {
    opacity: 0.65,
    borderStyle: 'dashed',
  },
  premiumBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBadgeLocked: {
    backgroundColor: '#f97316',
  },
  premiumBadgeActive: {
    backgroundColor: '#10b981',
  },
  premiumBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  diffIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  diffIconInactive: {
    backgroundColor: '#f8fafc',
  },
  diffIconActive: {
    backgroundColor: '#f43f5e',
  },
  diffContent: {
    flex: 1,
  },
  diffHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  diffLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  diffTimeTag: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  diffTimeText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  diffDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: '#f43f5e',
    borderColor: '#f43f5e',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  nextButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    position: 'relative',
  },
  closeModalButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
  },
  modalHeroGlow: {
    padding: 24,
    paddingTop: 36,
    alignItems: 'center',
  },
  modalHeroTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 12,
  },
  modalHeroDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  modalDetails: {
    padding: 20,
    alignItems: 'center',
  },
  modalPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalFootnoteText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
  },
  buyButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
