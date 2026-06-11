import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
  Platform,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  ChefHat,
  Share2,
  Plus,
  Check,
  Sparkles,
  Users,
  Heart,
  Crown,
  Play,
  Pause,
  Minus,
  X,
  Trash2
} from 'lucide-react-native';
import { useAppContext } from '../../../context/AppContext';
import { DIFFICULTY_LEVELS } from '../../../data/constants';
import { Recipe } from '../../../types';
import { getDisplayIngredientName } from '../../../utils/ingredientNormalizer';
import { apiClient } from '../../../utils/apiClient';

const { width } = Dimensions.get('window');

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const {
    addToShoppingList,
    toggleShoppingItem,
    state,
    likeRecipe,
    unlikeRecipe,
    recipes,
    activeTimer,
    startGlobalTimer,
    pauseGlobalTimer,
    resumeGlobalTimer,
    cancelGlobalTimer,
    viewRecipe,
    isGuest,
    signOut
  } = useAppContext();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaywall, setIsPaywall] = useState(false);
  const [servings, setServings] = useState(2);

  // Checked ingredients state (local checkoff)
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [isAdded, setIsAdded] = useState(false);
  
  // Timer Modal controls
  const [isTimerSetupOpen, setIsTimerSetupOpen] = useState(false);
  const [timerSetupMinutes, setTimerSetupMinutes] = useState(0);
  const [timerSetupStepText, setTimerSetupStepText] = useState('');
  
  // Selected subscription tier for paywall checkout
  const [selectedTier, setSelectedTier] = useState<'month' | 'year'>('year');
  const [isPaying, setIsPaying] = useState(false);

  // Fetch recipe details from API
  useEffect(() => {
    let isMounted = true;
    async function fetchRecipe() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setIsPaywall(false);
      try {
        const res = await apiClient.get(`/api/recipes/${id}`);
        if (!isMounted) return;

        if (res.success && res.data) {
          setRecipe(res.data);
          setServings(res.data.servings || 2);
          viewRecipe(id);
        } else {
          if (res.error === 'Premium Access Required') {
            setIsPaywall(true);
            const cached = recipes?.find((r: Recipe) => r.id === id);
            if (cached) setRecipe(cached);
          } else {
            setError(res.error || 'Ошибка загрузки рецепта');
          }
        }
      } catch (err) {
        if (isMounted) setError('Ошибка подключения к серверу');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchRecipe();
    return () => {
      isMounted = false;
    };
  }, [id, state.subscription, recipes]);

  // Pre-check ingredients user already has at home
  useEffect(() => {
    if (recipe && state.ingredientsFilter && state.ingredientsFilter.length > 0) {
      const preChecked = recipe.ingredients
        .filter((ing) => {
          const ingName = ing.name.toLowerCase();
          return state.ingredientsFilter.some((owned) => {
            const cleanOwned = owned.trim().toLowerCase();
            return ingName.includes(cleanOwned) || cleanOwned.includes(ingName);
          });
        })
        .map((ing) => ing.name);
      setCheckedIngredients(preChecked);
    }
  }, [recipe, state.ingredientsFilter]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f43f5e" />
        <Text style={styles.loadingText}>Загрузка рецепта...</Text>
      </View>
    );
  }

  if (error || (!recipe && !isPaywall)) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.emojiText}>😢</Text>
        <Text style={styles.errorText}>{error || 'Рецепт не найден'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Вернуться назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Paywall Blocker render
  if (isPaywall) {
    const handlePaywallCheckout = async () => {
      if (isGuest) {
        Alert.alert(
          'Регистрация обязательна 🔑',
          'Для покупки Premium подписки необходимо зарегистрироваться, чтобы ваши покупки привязались к аккаунту.',
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Создать аккаунт',
              onPress: () => {
                signOut();
                router.push('/auth');
              }
            }
          ]
        );
        return;
      }

      setIsPaying(true);
      try {
        const res = await apiClient.post('/api/payments/create-session', { tier: selectedTier });
        setIsPaying(false);

        if (res.success && res.paymentUrl) {
          router.push({
            pathname: '/payment',
            params: { url: res.paymentUrl }
          });
        } else {
          Alert.alert('Ошибка', res.error || 'Не удалось создать платеж');
        }
      } catch (err) {
        setIsPaying(false);
        Alert.alert('Ошибка', 'Не удалось подключиться к платежному шлюзу');
      }
    };

    return (
      <SafeAreaView style={styles.paywallContainer}>
        <ScrollView contentContainerStyle={styles.paywallScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.paywallHeaderIcon}>
            <Crown size={42} color="#ffffff" fill="#ffffff" />
          </View>

          <Text style={styles.paywallTitle}>CHOOZI Premium 👑</Text>
          
          <Text style={styles.paywallDescription}>
            Рецепт «<Text style={{ fontWeight: '800', color: '#0f172a' }}>{recipe?.title || 'Эксклюзивный рецепт'}</Text>» доступен только по Premium-подписке.
          </Text>

          {/* Pricing Tiers */}
          <View style={styles.paywallTiers}>
            <TouchableOpacity
              style={[
                styles.paywallTierCard,
                selectedTier === 'month' && styles.paywallTierCardSelected
              ]}
              onPress={() => setSelectedTier('month')}
            >
              <View>
                <Text style={styles.tierName}>1 месяц</Text>
                <Text style={styles.tierDesc}>Списание каждый месяц</Text>
              </View>
              <Text style={styles.tierPrice}>119 ₽</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paywallTierCard,
                selectedTier === 'year' && styles.paywallTierCardSelected
              ]}
              onPress={() => setSelectedTier('year')}
            >
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>Выгодно 30%</Text>
              </View>
              <View>
                <Text style={styles.tierName}>12 месяцев</Text>
                <Text style={styles.tierDesc}>Годовая подписка</Text>
              </View>
              <Text style={styles.tierPrice}>999 ₽</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.paywallSubmitBtn, isPaying && { opacity: 0.7 }]}
            disabled={isPaying}
            onPress={handlePaywallCheckout}
          >
            <Text style={styles.paywallSubmitBtnText}>
              {isPaying ? 'Сессия платежа...' : 'Разблокировать с ЮKassa'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.paywallCancelBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.paywallCancelBtnText}>Вернуться назад</Text>
          </TouchableOpacity>

          <Text style={styles.paywallFootnote}>
            Подписка продлевается автоматически. Отмена в любой момент в профиле. ИП Гольцев Н.С., ИНН 235208985015
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const activeRecipe = recipe!;
  const difficulty = DIFFICULTY_LEVELS.find((d) => d.id === activeRecipe.difficulty);
  const isLiked = state.likedRecipes?.includes(activeRecipe.id);

  // Portion serving factor
  const originalServings = activeRecipe.servings || 2;
  const servingsFactor = servings / originalServings;

  // Scale quantities intelligently
  const scaleQuantity = (quantityStr: string, factor: number): string => {
    if (!quantityStr || quantityStr.toLowerCase().includes('вкус') || quantityStr.toLowerCase().includes('🔒')) {
      return quantityStr;
    }
    return quantityStr.replace(/([0-9]+[.,]?[0-9]*)/g, (match) => {
      const val = parseFloat(match.replace(',', '.'));
      if (isNaN(val)) return match;
      const scaled = val * factor;
      const formatted = Number(scaled.toFixed(1)).toString().replace('.', ',');
      return formatted;
    });
  };

  // Checkbox helpers
  const getShoppingItem = (ingName: string) => {
    return state.shoppingList.find(
      (item) =>
        (item.recipeId === activeRecipe.id || item.recipeTitle === activeRecipe.title) &&
        item.name.toLowerCase().startsWith(ingName.toLowerCase())
    );
  };

  const isRecipeInShoppingList = state.shoppingList.some(
    (item) => item.recipeId === activeRecipe.id || item.recipeTitle === activeRecipe.title
  );

  const isIngredientChecked = (ingName: string) => {
    if (isRecipeInShoppingList) {
      const item = getShoppingItem(ingName);
      return !item || item.isChecked;
    } else {
      return checkedIngredients.includes(ingName);
    }
  };

  const toggleIngredient = (ingName: string, originalQty: string) => {
    if (isRecipeInShoppingList) {
      const shoppingItem = getShoppingItem(ingName);
      if (shoppingItem) {
        toggleShoppingItem(shoppingItem.id);
      } else {
        const scaledQty = scaleQuantity(originalQty, servingsFactor);
        addToShoppingList([
          {
            name: `${ingName} (${scaledQty})`,
            recipeId: activeRecipe.id,
            recipeTitle: activeRecipe.title
          }
        ]);
      }
    } else {
      if (checkedIngredients.includes(ingName)) {
        setCheckedIngredients((prev) => prev.filter((i) => i !== ingName));
      } else {
        setCheckedIngredients((prev) => [...prev, ingName]);
      }
    }
  };

  const handleAddToList = () => {
    const itemsToAdd: Array<{ name: string; recipeId?: string; recipeTitle?: string }> = [];

    activeRecipe.ingredients.forEach((ing) => {
      const scaledQty = scaleQuantity(ing.quantity, servingsFactor);
      if (isRecipeInShoppingList) {
        const shoppingItem = getShoppingItem(ing.name);
        if (!shoppingItem) {
          itemsToAdd.push({
            name: `${ing.name} (${scaledQty})`,
            recipeId: activeRecipe.id,
            recipeTitle: activeRecipe.title
          });
        } else if (shoppingItem.isChecked) {
          toggleShoppingItem(shoppingItem.id);
        }
      } else {
        if (!checkedIngredients.includes(ing.name)) {
          itemsToAdd.push({
            name: `${ing.name} (${scaledQty})`,
            recipeId: activeRecipe.id,
            recipeTitle: activeRecipe.title
          });
        }
      }
    });

    if (itemsToAdd.length > 0) {
      addToShoppingList(itemsToAdd);
    }

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2500);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Посмотри этот потрясающий рецепт "${activeRecipe.title}" в приложении CHOOZI! 🍳`,
        title: `Рецепт: ${activeRecipe.title}`
      });
    } catch (e) {
      console.log('Error sharing:', e);
    }
  };

  const openTimerSetup = (baseMinutes: number, stepText: string) => {
    setTimerSetupMinutes(baseMinutes);
    setTimerSetupStepText(stepText);
    setIsTimerSetupOpen(true);
  };

  const startTimer = () => {
    if (timerSetupMinutes <= 0) return;
    startGlobalTimer(timerSetupMinutes, timerSetupStepText, id, activeRecipe.title);
    setIsTimerSetupOpen(false);
  };

  // Timer matching check
  const isThisRecipeTimerRunning = activeTimer && activeTimer.recipeId === id;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Hero Image Section */}
        <View style={styles.heroSection}>
          <Image source={{ uri: activeRecipe.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroGradient} />

          {/* Top Actions */}
          <View style={styles.heroHeader}>
            <TouchableOpacity style={styles.heroHeaderBtn} onPress={() => router.back()}>
              <ChevronLeft size={22} color="#0f172a" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.heroHeaderBtn}
                onPress={() => {
                  if (isLiked) {
                    unlikeRecipe(activeRecipe.id);
                  } else {
                    likeRecipe(activeRecipe.id);
                  }
                }}
              >
                <Heart size={20} color={isLiked ? '#ef4444' : '#0f172a'} fill={isLiked ? '#ef4444' : 'transparent'} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.heroHeaderBtn} onPress={handleShare}>
                <Share2 size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Floating tags */}
          <View style={styles.heroInfo}>
            <View style={styles.tagsContainer}>
              {activeRecipe.tags.slice(0, 3).map((t) => (
                <View key={t} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{t.toUpperCase()}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.recipeTitle}>{activeRecipe.title}</Text>
          </View>
        </View>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statPill}>
            <Clock size={16} color="#10b981" />
            <Text style={styles.statPillText}>{activeRecipe.time} мин</Text>
          </View>

          <View style={styles.statPill}>
            <ChefHat size={16} color="#10b981" />
            <Text style={styles.statPillText}>{difficulty?.label || activeRecipe.difficulty}</Text>
          </View>

          <View style={styles.statPill}>
            <Users size={16} color="#10b981" />
            <Text style={styles.statPillText}>{originalServings} порц.</Text>
          </View>
        </View>



        {/* Ingredients Box */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ингредиенты</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeRecipe.ingredients.length}</Text>
            </View>
          </View>
          
          <Text style={styles.sectionHint}>
            У вас уже есть дома? Отметьте, чтобы не добавлять в список покупок:
          </Text>

          <View style={styles.ingredientsList}>
            {activeRecipe.ingredients.map((ing, idx) => {
              const isChecked = isIngredientChecked(ing.name);
              const scaledQty = scaleQuantity(ing.quantity, servingsFactor);

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.9}
                  style={[
                    styles.ingredientRow,
                    isChecked && styles.ingredientRowChecked
                  ]}
                  onPress={() => toggleIngredient(ing.name, ing.quantity)}
                >
                  <View style={[
                    styles.checkbox,
                    isChecked && styles.checkboxChecked
                  ]}>
                    {isChecked && <Check size={14} color="#ffffff" />}
                  </View>
                  <Text style={[
                    styles.ingredientName,
                    isChecked && styles.ingredientNameChecked
                  ]}>
                    {getDisplayIngredientName(ing.name)}
                    {ing.isOptional && <Text style={styles.optionalText}> (опционально)</Text>}
                  </Text>
                  <Text style={styles.ingredientQty}>{scaledQty}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.addShoppingBtn,
              isAdded && styles.addShoppingBtnSuccess
            ]}
            onPress={handleAddToList}
            disabled={isAdded}
          >
            {isAdded ? (
              <>
                <Check size={16} color="#065f46" style={{ marginRight: 6 }} />
                <Text style={styles.addShoppingBtnTextSuccess}>Добавлено в список покупок</Text>
              </>
            ) : (
              <>
                <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.addShoppingBtnText}>Добавить в список покупок</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Steps Box */}
        <View style={[styles.sectionCard, { marginBottom: 30 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Приготовление</Text>
            <Sparkles size={16} color="#10b981" />
          </View>

          <View style={styles.stepsTimeline}>
            {activeRecipe.steps.map((step, idx) => {
              const isTupleStep = Array.isArray(step);
              const stepText = isTupleStep ? step[0] : step;
              const stepDuration = isTupleStep ? step[1] : null;

              return (
                <View key={idx} style={styles.stepContainer}>
                  {/* Circle number */}
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>

                  <View style={styles.stepContentBox}>
                    <Text style={styles.stepText}>{stepText}</Text>
                    {stepDuration && (
                      <TouchableOpacity
                        style={styles.stepTimerBtn}
                        onPress={() => openTimerSetup(stepDuration, stepText)}
                      >
                        <Clock size={12} color="#10b981" style={{ marginRight: 4 }} />
                        <Text style={styles.stepTimerBtnText}>{stepDuration} мин</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* Floating global timer overlay for this recipe */}
      {isThisRecipeTimerRunning && activeTimer && (
        <View style={styles.floatingTimer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.floatingTimerLabel} numberOfLines={1}>
              Таймер: {activeTimer.stepText || 'Приготовление'}
            </Text>
            <Text style={styles.floatingTimerTime}>
              {Math.floor(activeTimer.remainingSeconds / 60)}:
              {String(activeTimer.remainingSeconds % 60).padStart(2, '0')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {activeTimer.isRunning ? (
              <TouchableOpacity style={styles.timerControlBtn} onPress={pauseGlobalTimer}>
                <Pause size={14} color="#0f172a" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.timerControlBtn} onPress={resumeGlobalTimer}>
                <Play size={14} color="#0f172a" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.timerCancelBtn} onPress={cancelGlobalTimer}>
              <X size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 1. Timer Setup Modal */}
      <Modal
        visible={isTimerSetupOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTimerSetupOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsTimerSetupOpen(false)}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.modalIconBox}>
              <Clock size={28} color="#ffffff" />
            </View>

            <Text style={styles.modalTitle}>Настройка таймера</Text>
            <Text style={styles.modalSubtitle}>Регулируйте время приготовления по вкусу</Text>

            <View style={styles.timerAdjustBox}>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setTimerSetupMinutes((m) => Math.max(1, m - 1))}
              >
                <Minus size={20} color="#0f172a" />
              </TouchableOpacity>

              <View style={{ alignItems: 'center' }}>
                <Text style={styles.adjustText}>{timerSetupMinutes}</Text>
                <Text style={styles.adjustLabel}>минут</Text>
              </View>

              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setTimerSetupMinutes((m) => m + 1)}
              >
                <Plus size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.timerSubmitBtn} onPress={startTimer}>
              <Text style={styles.timerSubmitBtnText}>Запустить таймер</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
    padding: 24,
    backgroundColor: '#ffffff',
  },
  emojiText: {
    fontSize: 40,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#334155',
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
  paywallContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  paywallScroll: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  paywallHeaderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 30,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  paywallTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  paywallDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  paywallTiers: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  paywallTierCard: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  paywallTierCardSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 10,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  tierName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  tierDesc: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  paywallSubmitBtn: {
    width: '100%',
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 12,
  },
  paywallSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  paywallCancelBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 30,
  },
  paywallCancelBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  paywallFootnote: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroSection: {
    height: 320,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  heroHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  recipeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 28,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 20,
    marginTop: -16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    zIndex: 5,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  multiplierBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
  },
  multiplierLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  servingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHint: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 14,
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  ingredientRowChecked: {
    backgroundColor: '#f8fafc',
    opacity: 0.65,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#f43f5e',
    borderColor: '#f43f5e',
  },
  ingredientName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  ingredientNameChecked: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  optionalText: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '500',
  },
  ingredientQty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 10,
  },
  addShoppingBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  addShoppingBtnSuccess: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    shadowOpacity: 0,
  },
  addShoppingBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  addShoppingBtnTextSuccess: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '800',
  },
  stepsTimeline: {
    position: 'relative',
    marginTop: 10,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  stepContentBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 12,
  },
  stepText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  stepTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  stepTimerBtnText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  floatingTimer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
    zIndex: 100,
  },
  floatingTimerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  floatingTimerTime: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  timerControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 20,
  },
  modalIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  timerAdjustBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    borderRadius: 20,
    width: '100%',
    justifyContent: 'center',
    marginVertical: 20,
  },
  adjustBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
  },
  adjustLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timerSubmitBtn: {
    width: '100%',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  timerSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
