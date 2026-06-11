import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Modal,
  TextInput,
  ScrollView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, X, Gauge, Filter, Plus, Trash2, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { filterRecipes, getRandomRecipe, getMissingIngredients } from '../../utils/filterRecipes';
import { getDisplayIngredientName } from '../../utils/ingredientNormalizer';
import RecipeCard from '../../components/RecipeCard';
import { Recipe } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

export default function HomeScreen() {
  const {
    state,
    setDifficulty,
    recipes,
    resetOnboarding,
    setIngredientsFilter,
    resetIngredientsFilter
  } = useAppContext();
  const router = useRouter();

  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [noRecipesFound, setNoRecipesFound] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);

  // Disliked recipes tracking
  const [dislikedRecipeIds, setDislikedRecipeIds] = useState<string[]>([]);

  // Ingredient filter drawer states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Collect unique list of ingredients for autocompletion
  const allUniqueIngredients = Array.from(
    new Set(
      recipes.flatMap((r) => r.ingredients?.map((i) => getDisplayIngredientName(i.name)) || [])
    )
  )
    .filter(Boolean)
    .sort();

  const suggestions = inputValue.trim()
    ? allUniqueIngredients
        .filter(
          (ing) =>
            ing.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tempFilter.some((added) => getDisplayIngredientName(added).toLowerCase() === ing.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const findNewRecipe = (excludeCurrent = true) => {
    setIsAnimating(true);
    setTimeout(() => {
      let filtered = filterRecipes(recipes, state.preferences, state.ingredientsFilter);
      filtered = filtered.filter((r) => !dislikedRecipeIds.includes(r.id));

      if (filtered.length === 0) {
        setNoRecipesFound(true);
        setCurrentRecipe(null);
        setIsAnimating(false);
        return;
      }

      setNoRecipesFound(false);
      const newRecipe = getRandomRecipe(
        filtered,
        excludeCurrent ? currentRecipe?.id : null,
        !!(state.ingredientsFilter && state.ingredientsFilter.length > 0)
      );
      setCurrentRecipe(newRecipe);
      setIsAnimating(false);
    }, 450);
  };

  useEffect(() => {
    findNewRecipe(false);
  }, [state.preferences, state.ingredientsFilter, recipes, dislikedRecipeIds]);

  const handleSwipeLeft = () => {
    if (currentRecipe) {
      setDislikedRecipeIds((prev) => [...prev, currentRecipe.id]);
    }
    findNewRecipe(true);
  };

  const handleTooHard = () => {
    const difficulty = state.preferences.difficulty;
    const hasMedium = Array.isArray(difficulty) ? difficulty.includes('medium') : (difficulty as any) === 'medium';

    if (hasMedium) {
      setDifficulty(Array.isArray(difficulty) ? ['easy'] : ['easy']);
    } else {
      handleSwipeLeft();
    }
  };

  const handleSelectRecipe = () => {
    if (currentRecipe?.tags?.includes('premium') && state.subscription === 'free') {
      // Show Paywall modal
      setIsSubOpen(true);
    } else if (currentRecipe) {
      router.push(`/recipe/${currentRecipe.id}`);
    }
  };

  const handleAddIngredient = (name: string) => {
    const cleanName = name.trim();
    if (cleanName && !tempFilter.some((added) => added.toLowerCase() === cleanName.toLowerCase())) {
      setTempFilter((prev) => [...prev, cleanName]);
      setInputValue('');
    }
  };

  const handleApplyFilter = () => {
    setIngredientsFilter(tempFilter);
    setDislikedRecipeIds([]);
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    resetIngredientsFilter();
    setTempFilter([]);
    setDislikedRecipeIds([]);
    setIsFilterOpen(false);
  };

  const missingIngredients = currentRecipe
    ? getMissingIngredients(currentRecipe, state.ingredientsFilter)
    : [];

  // Pan gesture tracking for swiper
  const position = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right (Select)
          Animated.timing(position, {
            toValue: { x: SCREEN_WIDTH + 100, y: gestureState.dy },
            duration: 250,
            useNativeDriver: false
          }).start(() => {
            handleSelectRecipe();
            position.setValue({ x: 0, y: 0 });
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left (Skip)
          Animated.timing(position, {
            toValue: { x: -SCREEN_WIDTH - 100, y: gestureState.dy },
            duration: 250,
            useNativeDriver: false
          }).start(() => {
            handleSwipeLeft();
            position.setValue({ x: 0, y: 0 });
          });
        } else {
          // Snap back to center
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false
          }).start();
        }
      }
    })
  ).current;

  // Rotation Interpolations
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp'
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const skipOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Row */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerWelcome}>Привет! 👋</Text>
          <Text style={styles.headerDesc}>Готовы выбрать вкусный ужин?</Text>
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          onPress={() => {
            setTempFilter(state.ingredientsFilter || []);
            setInputValue('');
            setIsFilterOpen(true);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={state.ingredientsFilter && state.ingredientsFilter.length > 0 ? ['#f43f5e', '#ec4899'] : ['#ffffff', '#ffffff']}
            style={[
              styles.filterBtn,
              !(state.ingredientsFilter && state.ingredientsFilter.length > 0) && styles.filterBtnInactive
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Filter size={14} color={state.ingredientsFilter && state.ingredientsFilter.length > 0 ? '#ffffff' : '#64748b'} />
            <Text style={[styles.filterBtnText, state.ingredientsFilter && state.ingredientsFilter.length > 0 ? styles.filterBtnTextActive : styles.filterBtnTextInactive]}>
              Продукты
            </Text>
            {state.ingredientsFilter && state.ingredientsFilter.length > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountBadgeText}>{state.ingredientsFilter.length}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Main card swiper display area */}
      <View style={styles.swiperContainer}>
        {isAnimating ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#f43f5e" />
          </View>
        ) : noRecipesFound ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🤔</Text>
            <Text style={styles.emptyTitle}>Рецепты закончились</Text>
            <Text style={styles.emptyDesc}>
              Под ваши фильтры не подходит ни один рецепт. Попробуйте сбросить историю свайпов и активные ингредиенты.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setDislikedRecipeIds([]);
                resetIngredientsFilter();
              }}
              style={styles.emptyResetBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyResetBtnText}>Сбросить фильтры</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                resetOnboarding();
                router.replace('/onboarding');
              }}
              style={styles.emptyPreferencesBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyPreferencesBtnText}>Изменить предпочтения</Text>
            </TouchableOpacity>
          </View>
        ) : currentRecipe ? (
          <View style={styles.cardContainer}>
            {/* Animated Swipe Card */}
            <Animated.View
              style={[
                styles.animatedCard,
                {
                  transform: [
                    { translateX: position.x },
                    { translateY: position.y },
                    { rotate: rotate }
                  ]
                }
              ]}
              {...panResponder.panHandlers}
            >
              {/* Swipe Label Overlays */}
              <Animated.View style={[styles.swipeLabel, styles.likeLabel, { opacity: likeOpacity }]}>
                <Text style={styles.swipeLabelText}>ХОЧУ!</Text>
              </Animated.View>

              <Animated.View style={[styles.swipeLabel, styles.skipLabel, { opacity: skipOpacity }]}>
                <Text style={styles.swipeLabelText}>ДРУГОЕ</Text>
              </Animated.View>

              <RecipeCard
                recipe={currentRecipe}
                onClick={handleSelectRecipe}
                missingIngredients={missingIngredients}
                subscription={state.subscription}
              />
            </Animated.View>

            {/* Action Buttons deck */}
            <View style={styles.actionButtons}>
              {/* Сложно (Gauge icon) */}
              <TouchableOpacity onPress={handleTooHard} style={styles.actionCircle} activeOpacity={0.7}>
                <Gauge size={22} color="#f59e0b" strokeWidth={2.5} />
                <Text style={styles.actionLabel}>Сложно</Text>
              </TouchableOpacity>

              {/* Хочу! (Sparkles icon) */}
              <TouchableOpacity onPress={handleSelectRecipe} style={styles.actionCircleLarge} activeOpacity={0.7}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.sparkleGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Sparkles size={32} color="#ffffff" fill="#ffffff" />
                </LinearGradient>
                <Text style={styles.actionLabelLarge}>Хочу!</Text>
              </TouchableOpacity>

              {/* Другое (X icon) */}
              <TouchableOpacity onPress={handleSwipeLeft} style={styles.actionCircle} activeOpacity={0.7}>
                <X size={24} color="#ef4444" strokeWidth={2.5} />
                <Text style={styles.actionLabel}>Другое</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      {/* Slide-Up Bottom Drawer Modal for ingredients filtration */}
      <Modal
        visible={isFilterOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawerCard}>
            {/* Grab handle */}
            <View style={styles.drawerHandle} />

            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Ингредиенты дома 🛒</Text>
              <TouchableOpacity onPress={() => setIsFilterOpen(false)} style={styles.closeDrawerButton}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.drawerDesc}>
              Введите продукты, которые у вас есть. Мы покажем рецепты, где они используются, выдвинув лучшие совпадения вверх.
            </Text>

            {/* Search inputs and autocomplete panel */}
            <View style={styles.searchSection}>
              <View style={styles.searchRow}>
                <TextInput
                  placeholder="Курица, сыр, помидоры..."
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                  value={inputValue}
                  onChangeText={setInputValue}
                  onSubmitEditing={() => handleAddIngredient(inputValue)}
                />
                <TouchableOpacity
                  onPress={() => handleAddIngredient(inputValue)}
                  disabled={!inputValue.trim()}
                  style={[styles.searchAddBtn, !inputValue.trim() && styles.searchAddBtnDisabled]}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.searchAddBtnText}>Добавить</Text>
                </TouchableOpacity>
              </View>

              {/* Autocomplete Suggestions dropdown */}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((sug, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleAddIngredient(sug)}
                      style={styles.suggestionRow}
                    >
                      <Text style={styles.suggestionText}>{sug}</Text>
                      <Text style={styles.suggestionBadgeText}>База</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Pills list container */}
            <ScrollView
              contentContainerStyle={styles.drawerPillsContainer}
              style={styles.drawerPillsScroll}
              showsVerticalScrollIndicator={true}
            >
              {tempFilter.length === 0 ? (
                <Text style={styles.emptyPillsText}>В списке пока пусто. Введите продукты выше.</Text>
              ) : (
                tempFilter.map((item) => (
                  <View key={item} style={styles.pillBadge}>
                    <Text style={styles.pillText}>{item}</Text>
                    <TouchableOpacity
                      onPress={() => setTempFilter((prev) => prev.filter((added) => added !== item))}
                      style={styles.deletePillBtn}
                    >
                      <X size={10} color="#64748b" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Bottom Actions footer */}
            <View style={styles.drawerActions}>
              <TouchableOpacity onPress={handleResetFilter} style={styles.drawerResetBtn} activeOpacity={0.8}>
                <Trash2 size={16} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.drawerResetBtnText}>Сбросить</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleApplyFilter} style={{ flex: 1 }} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#f43f5e', '#ec4899']}
                  style={styles.drawerApplyBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Check size={16} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 6 }} />
                  <Text style={styles.drawerApplyBtnText}>Применить</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerWelcome: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterBtnInactive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  filterBtnTextInactive: {
    color: '#64748b',
  },
  filterCountBadge: {
    backgroundColor: '#ffffff',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  filterCountBadgeText: {
    color: '#f43f5e',
    fontSize: 9,
    fontWeight: '900',
  },
  swiperContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '100%',
    maxWidth: 360,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    marginBottom: 24,
  },
  emptyResetBtn: {
    backgroundColor: '#f43f5e',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyResetBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyPreferencesBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 16,
    alignItems: 'center',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  emptyPreferencesBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  animatedCard: {
    width: '100%',
    position: 'relative',
    zIndex: 10,
  },
  swipeLabel: {
    position: 'absolute',
    top: 40,
    zIndex: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 4,
  },
  likeLabel: {
    left: 20,
    borderColor: '#10b981',
    transform: [{ rotate: '-15deg' }],
  },
  skipLabel: {
    right: 20,
    borderColor: '#ef4444',
    transform: [{ rotate: '15deg' }],
  },
  swipeLabelText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 20,
  },
  actionCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCircleLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  sparkleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    position: 'absolute',
    bottom: -18,
  },
  actionLabelLarge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    position: 'absolute',
    bottom: -18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  drawerCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 10,
    maxHeight: '85%',
  },
  drawerHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  closeDrawerButton: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  drawerDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 16,
  },
  searchSection: {
    width: '100%',
    position: 'relative',
    zIndex: 100,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#0f172a',
  },
  searchAddBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchAddBtnDisabled: {
    opacity: 0.3,
  },
  searchAddBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    zIndex: 999,
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  suggestionBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#f43f5e',
    backgroundColor: '#fff1f2',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  drawerPillsScroll: {
    maxHeight: 120,
    width: '100%',
    marginBottom: 16,
  },
  drawerPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  emptyPillsText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  pillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  deletePillBtn: {
    padding: 2,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  drawerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  drawerResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 16,
    width: 120,
  },
  drawerResetBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  drawerApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  drawerApplyBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
});
