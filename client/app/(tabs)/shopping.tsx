import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Share,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2, Plus, Share2, Crown, CheckSquare, Square, ShoppingBag, ArrowRight } from 'lucide-react-native';
import { useAppContext } from '../../context/AppContext';
import { ShoppingListItem } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';

export default function ShoppingScreen() {
  const router = useRouter();
  const {
    state,
    toggleShoppingItem,
    removeShoppingItem,
    clearShoppingList,
    addToShoppingList,
    activatePremium
  } = useAppContext();

  const [manualItem, setManualItem] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const handleAddManualItem = () => {
    const trimmed = manualItem.trim();
    if (trimmed) {
      addToShoppingList([
        {
          name: trimmed,
          recipeTitle: 'Личные покупки'
        }
      ]);
      setManualItem('');
    }
  };

  // Group shopping list items by recipe title
  const groupedItems = state.shoppingList.reduce<Record<string, ShoppingListItem[]>>((acc, item) => {
    const key = item.recipeTitle || 'Общее';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const hasItems = state.shoppingList.length > 0;

  const handleExport = async () => {
    if (state.subscription !== 'premium') {
      Alert.alert(
        'Premium функция 👑',
        'Экспорт списка покупок доступен только владельцам Premium подписки. Хотите активировать?',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Активировать',
            onPress: () => {
              activatePremium();
              Alert.alert('Поздравляем! 🎉', 'Premium успешно активирован!');
            }
          }
        ]
      );
      return;
    }

    // Format shopping list for export
    let text = 'Список покупок из приложения Choozi 🛒\n\n';

    Object.entries(groupedItems).forEach(([category, items]) => {
      const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
      text += `${formattedCategory}:\n`;
      items.forEach((item) => {
        const checkbox = item.isChecked ? '[x]' : '[ ]';
        text += `  ${checkbox} ${item.name}\n`;
      });
    });

    text += '\nПриятного аппетита! 🍳';

    try {
      await Share.share({
        message: text,
        title: 'Мой список покупок Choozi'
      });
    } catch (error) {
      console.error('Sharing failed', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Список покупок</Text>
          <Text style={styles.headerSubtitle}>
            {state.shoppingList.filter((i) => !i.isChecked).length} товаров осталось купить
          </Text>
        </View>
        {hasItems && (
          <TouchableOpacity onPress={handleExport} style={styles.exportBtn} activeOpacity={0.8}>
            <Share2 size={13} color="#b45309" style={{ marginRight: 4 }} />
            <Text style={styles.exportBtnText}>Поделиться</Text>
            {state.subscription !== 'premium' && (
              <Crown size={11} color="#f59e0b" fill="#f59e0b" style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Manual Item Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Например: Сливки 20%, помидоры..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={manualItem}
          onChangeText={setManualItem}
          onSubmitEditing={handleAddManualItem}
        />
        <TouchableOpacity
          onPress={handleAddManualItem}
          disabled={!manualItem.trim()}
          style={[styles.addBtn, !manualItem.trim() && styles.addBtnDisabled]}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Добавить</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!hasItems ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <ShoppingBag size={28} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>Список пуст</Text>
            <Text style={styles.emptyDesc}>
              Добавляйте товары вручную или планируйте рацион на вкладке Планировщик меню.
            </Text>
            <TouchableOpacity onPress={() => router.push('/')} style={styles.findRecipeBtn}>
              <Text style={styles.findRecipeBtnText}>Перейти к свайпам</Text>
              <ArrowRight size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {Object.entries(groupedItems).map(([category, items]) => {
              const sampleItemWithRecipe = items.find((item) => item.recipeId);
              const recipeId = sampleItemWithRecipe?.recipeId;

              return (
                <View key={category} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle} numberOfLines={1}>
                      {category}
                    </Text>
                    {recipeId && (
                      <TouchableOpacity
                        onPress={() => router.push(`/recipe/${recipeId}`)}
                        style={styles.recipeLink}
                      >
                        <Text style={styles.recipeLinkText}>к рецепту →</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.itemsList}>
                    {[...items]
                      .sort((a, b) => (a.isChecked === b.isChecked ? 0 : a.isChecked ? 1 : -1))
                      .map((item) => (
                        <View
                          key={item.id}
                          style={[styles.itemRow, item.isChecked && styles.itemRowChecked]}
                        >
                          <TouchableOpacity
                            onPress={() => toggleShoppingItem(item.id)}
                            style={styles.checkboxTouch}
                          >
                            {item.isChecked ? (
                              <CheckSquare size={20} color="#10b981" fill="#ecfdf5" />
                            ) : (
                              <Square size={20} color="#cbd5e1" />
                            )}
                          </TouchableOpacity>

                          <Text
                            onPress={() => toggleShoppingItem(item.id)}
                            style={[styles.itemName, item.isChecked && styles.itemNameChecked]}
                          >
                            {item.name}
                          </Text>

                          <TouchableOpacity
                            onPress={() => removeShoppingItem(item.id)}
                            style={styles.deleteItemBtn}
                          >
                            <Trash2 size={14} color="#cbd5e1" />
                          </TouchableOpacity>
                        </View>
                      ))}
                  </View>
                </View>
              );
            })}

            {/* Clear All List Actions Row */}
            <View style={styles.clearSection}>
              {!confirmClear ? (
                <TouchableOpacity
                  onPress={() => setConfirmClear(true)}
                  style={styles.clearAllBtn}
                  activeOpacity={0.8}
                >
                  <Trash2 size={13} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.clearAllBtnText}>Очистить список покупок</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.confirmClearBox}>
                  <Text style={styles.confirmClearText}>Удалить всё?</Text>
                  <View style={styles.confirmClearActions}>
                    <TouchableOpacity
                      onPress={() => {
                        clearShoppingList();
                        setConfirmClear(false);
                      }}
                      style={styles.confirmYesBtn}
                    >
                      <Text style={styles.confirmYesText}>Да, удалить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setConfirmClear(false)}
                      style={styles.confirmNoBtn}
                    >
                      <Text style={styles.confirmNoText}>Отмена</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fde047',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  input: {
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
  addBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.3,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 20,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyDesc: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    marginBottom: 20,
  },
  findRecipeBtn: {
    backgroundColor: '#f43f5e',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 6,
  },
  findRecipeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  groupsContainer: {
    gap: 16,
  },
  groupCard: {
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
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    paddingBottom: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f43f5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  recipeLink: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  recipeLinkText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  itemsList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  itemRowChecked: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
    opacity: 0.6,
  },
  checkboxTouch: {
    marginRight: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  deleteItemBtn: {
    padding: 6,
  },
  clearSection: {
    alignItems: 'center',
    marginTop: 10,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  clearAllBtnText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '800',
  },
  confirmClearBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  confirmClearText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
  },
  confirmClearActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmYesBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  confirmYesText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  confirmNoBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  confirmNoText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
  },
});
