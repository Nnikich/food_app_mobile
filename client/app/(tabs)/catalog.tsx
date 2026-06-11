import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Crown, X } from 'lucide-react-native';
import { useAppContext } from '../../context/AppContext';
import RecipeCard from '../../components/RecipeCard';
import PaywallView from '../../components/PaywallView';
import { DIFFICULTY_LEVELS } from '../../data/constants';
import { Recipe } from '../../types';
import { areIngredientsCompatible } from '../../utils/ingredientNormalizer';
import { LinearGradient } from 'expo-linear-gradient';

export default function CatalogScreen() {
  const { recipes, state, activatePremium } = useAppContext();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [isSubOpen, setIsSubOpen] = useState(false);

  // Pagination states
  const [visibleLimit, setVisibleLimit] = useState(15);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Paywall Subscribe Modal bypass inside catalog
  const handleOpenSubscribe = () => {
    setIsSubOpen(true);
  };

  // If user is not premium, render Paywall View
  if (state.subscription !== 'premium') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <PaywallView
          title="Каталог рецептов закрыт"
          subtitle="Доступ к полной базе из 100+ эксклюзивных рецептов доступен только владельцам Premium подписки"
          onSubscribe={() => {
            activatePremium();
            Alert.alert('Поздравляем! 🎉', 'Premium успешно активирован!');
          }}
        />
      </SafeAreaView>
    );
  }

  // Filter recipes
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = !search.trim()
      ? true
      : recipe.title.toLowerCase().includes(search.toLowerCase()) ||
        recipe.ingredients?.some((i) => areIngredientsCompatible(i.name, search));

    const matchesDifficulty = filterDifficulty === 'all' || recipe.difficulty === filterDifficulty;

    return matchesSearch && matchesDifficulty;
  });

  // Reset pagination on search change
  useEffect(() => {
    setVisibleLimit(15);
    setIsLoadingMore(false);
  }, [search, filterDifficulty]);

  // Load more pages
  const handleLoadMore = () => {
    if (isLoadingMore || visibleLimit >= filteredRecipes.length) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleLimit((prev) => prev + 15);
      setIsLoadingMore(false);
    }, 600);
  };

  const handleRecipeClick = (recipe: Recipe) => {
    router.push(`/recipe/${recipe.id}`);
  };

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#f43f5e" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky header filter row */}
      <View style={styles.headerFilters}>
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            placeholder="Найти рецепт или ингредиент..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>

        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.difficultyTabs}
          >
            <TouchableOpacity
              onPress={() => setFilterDifficulty('all')}
              style={[styles.tabButton, filterDifficulty === 'all' && styles.tabButtonActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, filterDifficulty === 'all' && styles.tabButtonTextActive]}>
                Все
              </Text>
            </TouchableOpacity>

            {DIFFICULTY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.id}
                onPress={() => setFilterDifficulty(level.id)}
                style={[styles.tabButton, filterDifficulty === level.id && styles.tabButtonActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabButtonText, filterDifficulty === level.id && styles.tabButtonTextActive]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Grid List */}
      <FlatList
        data={filteredRecipes.slice(0, visibleLimit)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <RecipeCard
              recipe={item}
              onClick={() => handleRecipeClick(item)}
              hidePremiumText={true}
              subscription={state.subscription}
            />
          </View>
        )}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Ничего не найдено 😔</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerFilters: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
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
  difficultyTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabButtonActive: {
    backgroundColor: '#f43f5e',
    borderColor: '#f43f5e',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
  },
});
