import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  Image,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Trash2, Search, X, ChevronRight, Check, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../../context/AppContext';
import PaywallView from '../../components/PaywallView';
import { Recipe } from '../../types';
import { areIngredientsCompatible } from '../../utils/ingredientNormalizer';

type MealType = 'breakfast' | 'lunch' | 'dinner';

interface DailyPlan {
  breakfast?: string[];
  lunch?: string[];
  dinner?: string[];
}

interface WeeklyPlan {
  [dateString: string]: DailyPlan;
}

interface DayItem {
  dateString: string;
  shortDay: string;
  dayOfMonth: number;
  monthName: string;
  label: string;
  fullLabel: string;
}

const getLocalDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const STORAGE_KEY = 'cook_assistant_weekly_plan';

export default function PlannerScreen() {
  const router = useRouter();
  const { state, recipes, addToShoppingList, activatePremium } = useAppContext();
  const isPremium = state.subscription === 'premium';

  // Generate 7 days dynamically
  const days: DayItem[] = [];
  const weekdayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const monthNames = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateString = getLocalDateString(d);
    const shortDay = weekdayNames[d.getDay()];
    const dayOfMonth = d.getDate();
    const monthName = monthNames[d.getMonth()];

    days.push({
      dateString,
      shortDay,
      dayOfMonth,
      monthName,
      label: i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : `${dayOfMonth} ${monthName}`,
      fullLabel: i === 0 ? `Сегодня (${dayOfMonth} ${monthName})` : i === 1 ? `Завтра (${dayOfMonth} ${monthName})` : `${dayOfMonth} ${monthName} (${shortDay})`
    });
  }

  const [plan, setPlan] = useState<WeeklyPlan>({});
  const [selectedDateString, setSelectedDateString] = useState<string>(days[0].dateString);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<{ dateString: string; mealType: MealType } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load plan from AsyncStorage
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const migrated: WeeklyPlan = {};
          const todayStr = getLocalDateString(new Date());

          Object.entries(parsed).forEach(([dateStr, dailyPlan]: [string, any]) => {
            // Keep only current and future entries
            if (dateStr >= todayStr) {
              migrated[dateStr] = {
                breakfast: Array.isArray(dailyPlan.breakfast) ? dailyPlan.breakfast : dailyPlan.breakfast ? [dailyPlan.breakfast] : [],
                lunch: Array.isArray(dailyPlan.lunch) ? dailyPlan.lunch : dailyPlan.lunch ? [dailyPlan.lunch] : [],
                dinner: Array.isArray(dailyPlan.dinner) ? dailyPlan.dinner : dailyPlan.dinner ? [dailyPlan.dinner] : []
              };
            }
          });
          setPlan(migrated);
        }
      } catch (e) {
        console.error('Failed to load weekly plan', e);
      }
    };
    loadPlan();
  }, []);

  // Save plan on change
  const savePlan = async (updatedPlan: WeeklyPlan) => {
    try {
      setPlan(updatedPlan);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlan));
    } catch (e) {
      console.error('Failed to save weekly plan', e);
    }
  };

  const openRecipePicker = (dateString: string, mealType: MealType) => {
    setPickerSlot({ dateString, mealType });
    setSearchQuery('');
    setPickerOpen(true);
  };

  const selectRecipeForSlot = (recipeId: string) => {
    if (!pickerSlot) return;
    const { dateString, mealType } = pickerSlot;
    const dayPlan = plan[dateString] || {};
    const slotRecipes = dayPlan[mealType] || [];

    if (slotRecipes.includes(recipeId)) {
      setPickerOpen(false);
      return;
    }

    const updatedPlan = {
      ...plan,
      [dateString]: {
        ...dayPlan,
        [mealType]: [...slotRecipes, recipeId]
      }
    };
    savePlan(updatedPlan);
    setPickerOpen(false);
  };

  const removeRecipeFromSlot = (dateString: string, mealType: MealType, recipeId: string) => {
    const dayPlan = plan[dateString] || {};
    const slotRecipes = dayPlan[mealType] || [];
    const updatedPlan = {
      ...plan,
      [dateString]: {
        ...dayPlan,
        [mealType]: slotRecipes.filter((id) => id !== recipeId)
      }
    };
    savePlan(updatedPlan);
  };

  const clearDay = (dateString: string) => {
    const updatedPlan = { ...plan };
    delete updatedPlan[dateString];
    savePlan(updatedPlan);
  };

  // Consolidate ingredients for the 7 days
  const getConsolidatedIngredients = () => {
    const ingredientsMap: Record<string, { quantity: string; recipeTitle: string }[]> = {};

    days.forEach((day) => {
      const dailyPlan = plan[day.dateString];
      if (!dailyPlan) return;

      (['breakfast', 'lunch', 'dinner'] as MealType[]).forEach((mealType) => {
        const recipeIds = dailyPlan[mealType] || [];
        recipeIds.forEach((id) => {
          const recipe = recipes.find((r) => r.id === id);
          if (recipe && recipe.ingredients) {
            recipe.ingredients.forEach((ing) => {
              const name = ing.name.trim();
              const existingKey = Object.keys(ingredientsMap).find((key) =>
                areIngredientsCompatible(key, name)
              );

              const key = existingKey || name;
              if (!ingredientsMap[key]) {
                ingredientsMap[key] = [];
              }
              ingredientsMap[key].push({
                quantity: ing.quantity,
                recipeTitle: recipe.title
              });
            });
          }
        });
      });
    });

    return Object.entries(ingredientsMap).map(([name, sources]) => {
      const quantitySummary = sources.map((s) => s.quantity).join(' + ');
      const recipeTitle = sources
        .map((s) => s.recipeTitle)
        .filter((v, i, self) => self.indexOf(v) === i)
        .join(', ');
      return {
        name,
        quantity: quantitySummary,
        recipeTitle
      };
    });
  };

  const consolidatedIngredients = getConsolidatedIngredients();
  const activeIngredientsCount = consolidatedIngredients.length;

  const handleImportToShopping = () => {
    const itemsToImport = consolidatedIngredients.map((ing) => ({
      name: `${ing.name} (${ing.quantity})`,
      recipeTitle: 'План на неделю'
    }));

    if (itemsToImport.length > 0) {
      addToShoppingList(itemsToImport);
      Alert.alert('Успех 🛒', `Ингредиенты (${itemsToImport.length} поз.) импортированы в список покупок!`);
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const query = searchQuery.toLowerCase();
    return (
      recipe.title.toLowerCase().includes(query) ||
      recipe.ingredients?.some((ing) => ing.name.toLowerCase().includes(query)) ||
      recipe.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const getMealLabel = (mealType: MealType) => {
    switch (mealType) {
      case 'breakfast':
        return 'Завтрак';
      case 'lunch':
        return 'Обед';
      case 'dinner':
        return 'Ужин';
    }
  };

  const selectedDayData = days.find((d) => d.dateString === selectedDateString) || days[0];

  // Paywall screening gate
  if (!isPremium) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <PaywallView
          title="Планировщик меню закрыт"
          subtitle="Составляйте сбалансированный рацион на 7 дней вперед и формируйте общий список покупок в один клик"
          onSubscribe={() => {
            activatePremium();
            Alert.alert('Поздравляем! 🎉', 'Premium успешно активирован!');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Days Tab Bar */}
        <View style={styles.calendarContainer}>
          <Text style={styles.sectionLabel}>Мой рацион на 7 дней</Text>
          <View style={styles.daysGrid}>
            {days.map((day) => {
              const isSelected = selectedDateString === day.dateString;
              const hasPlannedMeals =
                plan[day.dateString] &&
                Object.values(plan[day.dateString]).some((v) => v && v.length > 0);

              return (
                <TouchableOpacity
                  key={day.dateString}
                  onPress={() => setSelectedDateString(day.dateString)}
                  style={[styles.dayButton, isSelected && styles.dayButtonActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayShort, isSelected && styles.dayShortActive]}>
                    {day.shortDay}
                  </Text>
                  <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>
                    {day.dayOfMonth}
                  </Text>
                  {hasPlannedMeals && (
                    <View style={[styles.dot, isSelected ? styles.dotActive : styles.dotInactive]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Plan Header Details */}
        <View style={styles.dayInfoRow}>
          <Text style={styles.dayInfoLabel}>План на {selectedDayData.fullLabel}</Text>
          {Object.values(plan[selectedDateString] || {}).some((v) => v && v.length > 0) && (
            <TouchableOpacity onPress={() => clearDay(selectedDateString)} style={styles.clearBtn}>
              <Trash2 size={12} color="#ef4444" />
              <Text style={styles.clearBtnText}>Очистить день</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meal Slots List */}
        <View style={styles.slotsContainer}>
          {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((mealType) => {
            const slotRecipes = plan[selectedDateString]?.[mealType] || [];
            return (
              <View key={mealType} style={styles.slotCard}>
                <View style={styles.slotHeader}>
                  <Text style={styles.slotTitle}>{getMealLabel(mealType).toUpperCase()}</Text>
                  <TouchableOpacity
                    onPress={() => openRecipePicker(selectedDateString, mealType)}
                    style={styles.addMealBtn}
                  >
                    <Plus size={14} color="#f43f5e" />
                    <Text style={styles.addMealBtnText}>Добавить</Text>
                  </TouchableOpacity>
                </View>

                {slotRecipes.length > 0 ? (
                  <View style={styles.slotRecipes}>
                    {slotRecipes.map((recipeId) => {
                      const recipe = recipes.find((r) => r.id === recipeId);
                      if (!recipe) return null;
                      return (
                        <View key={recipeId} style={styles.recipeItemRow}>
                          <TouchableOpacity
                            onPress={() => router.push(`/recipe/${recipe.id}`)}
                            style={styles.recipeImgWrapper}
                          >
                            <Image
                              source={{ uri: recipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=120' }}
                              style={styles.recipeImg}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => router.push(`/recipe/${recipe.id}`)}
                            style={styles.recipeInfo}
                          >
                            <Text style={styles.recipeTitle} numberOfLines={1}>
                              {recipe.title}
                            </Text>
                            <Text style={styles.recipeMeta}>⏱ {recipe.time} мин</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeRecipeFromSlot(selectedDateString, mealType, recipeId)}
                            style={styles.deleteMealItem}
                          >
                            <Trash2 size={14} color="#94a3b8" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => openRecipePicker(selectedDateString, mealType)}
                    style={styles.emptySlotBtn}
                    activeOpacity={0.7}
                  >
                    <Plus size={16} color="#94a3b8" />
                    <Text style={styles.emptySlotBtnText}>Добавить блюдо</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Consolidated Week Shopping List Preview */}
        {activeIngredientsCount > 0 && (
          <View style={styles.consolidatedCard}>
            <Text style={styles.consolidatedTitle}>Список покупок на неделю</Text>
            <Text style={styles.consolidatedDesc}>
              Все продукты из выбранных блюд будут объединены и подготовлены к отправке
            </Text>

            <View style={styles.ingredientsBox}>
              {consolidatedIngredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <View style={styles.ingredientLeft}>
                    <View style={styles.bullet} />
                    <Text style={styles.ingredientName} numberOfLines={1}>
                      {ing.name}
                    </Text>
                    <Text style={styles.ingredientSource} numberOfLines={1}>
                      ({ing.recipeTitle})
                    </Text>
                  </View>
                  <Text style={styles.ingredientQty}>{ing.quantity}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity onPress={handleImportToShopping} activeOpacity={0.8}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.exportBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.exportBtnText}>
                  Импортировать в Покупки ({activeIngredientsCount} поз.)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Recipe Picker Modal */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCard}>
            {/* Grab handle */}
            <View style={styles.grabHandle} />

            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerHeaderTitle}>Выбрать блюдо</Text>
                {pickerSlot && (
                  <Text style={styles.pickerHeaderSubtitle}>
                    {days.find((d) => d.dateString === pickerSlot.dateString)?.label} — {getMealLabel(pickerSlot.mealType)}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={styles.closePickerBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Search Input inside Picker */}
            <View style={styles.searchWrapper}>
              <Search size={16} color="#94a3b8" style={styles.searchIcon} />
              <TextInput
                placeholder="Поиск по названию или ингредиентам..."
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Picker scrollable list */}
            <FlatList
              data={filteredRecipes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => selectRecipeForSlot(item.id)}
                  style={styles.pickerRow}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=120' }}
                    style={styles.pickerRowImg}
                  />
                  <View style={styles.pickerRowInfo}>
                    <Text style={styles.pickerRowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.pickerRowMeta}>
                      <Text style={styles.pickerRowMetaText}>⏱ {item.time} мин</Text>
                      <View style={styles.pickerRowDifficulty}>
                        <Text style={styles.pickerRowDifficultyText}>{item.difficulty}</Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyPickerBox}>
                  <Text style={styles.emptyPickerText}>Ничего не найдено</Text>
                </View>
              }
            />
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
  scrollContent: {
    paddingBottom: 40,
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: '12%',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayButtonActive: {
    backgroundColor: '#f43f5e',
    borderColor: '#f43f5e',
  },
  dayShort: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  dayShortActive: {
    color: '#ffffff',
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginTop: 2,
  },
  dayNumActive: {
    color: '#ffffff',
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotInactive: {
    backgroundColor: '#10b981',
  },
  dotActive: {
    backgroundColor: '#ffffff',
  },
  dayInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  dayInfoLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  slotsContainer: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 20,
  },
  slotCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
  },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addMealBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f43f5e',
  },
  slotRecipes: {
    gap: 10,
  },
  recipeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  recipeImgWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  recipeImg: {
    width: '100%',
    height: '100%',
  },
  recipeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recipeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  recipeMeta: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  deleteMealItem: {
    padding: 8,
  },
  emptySlotBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#f8fafc',
  },
  emptySlotBtnText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  consolidatedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20,
  },
  consolidatedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  consolidatedDesc: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 12,
  },
  ingredientsBox: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    padding: 8,
    marginBottom: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ingredientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  ingredientName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  ingredientSource: {
    fontSize: 9,
    color: '#94a3b8',
    marginLeft: 4,
    fontWeight: '500',
    flex: 1,
  },
  ingredientQty: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  exportBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 10,
    height: '75%',
  },
  grabHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  pickerHeaderSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  closePickerBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 13,
    color: '#0f172a',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerRowImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  pickerRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pickerRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  pickerRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  pickerRowMetaText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  pickerRowDifficulty: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  pickerRowDifficultyText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#16a34a',
  },
  emptyPickerBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyPickerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
