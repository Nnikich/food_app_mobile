import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  Switch,
  Platform,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Settings,
  Flame,
  Heart,
  Crown,
  LogOut,
  UserPlus,
  X,
  Trash2,
  CreditCard,
  Check,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Info
} from 'lucide-react-native';
import { useAppContext } from '../../context/AppContext';
import { TECHNIQUES, PREFERENCE_TAGS, DISLIKE_TAGS, DIFFICULTY_LEVELS } from '../../data/constants';
import { Recipe } from '../../types';
import { apiClient } from '../../utils/apiClient';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const {
    state,
    resetOnboarding,
    recipes,
    unlikeRecipe,
    user,
    signOut,
    refreshUserState,
    clearViewHistory,
    updatePreferences,
    isGuest,
    activatePremium
  } = useAppContext();

  const prefs = state.preferences;

  // Modal and state flags
  const [selectedTier, setSelectedTier] = useState<'month' | 'year'>('year');
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isLikedOpen, setIsLikedOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [isManageSubOpen, setIsManageSubOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const isAlreadyPremium = state.subscription === 'premium';

  // Map user selections
  const selectedTechniques = TECHNIQUES.filter((t) => prefs.technique.includes(t.id));
  const selectedTags = PREFERENCE_TAGS.filter((t) => prefs.tags.includes(t.id));
  const selectedDislikes = DISLIKE_TAGS.filter((t) => prefs.dislikedTags.includes(t.excludes));
  const selectedDifficulties = DIFFICULTY_LEVELS.filter((d) =>
    Array.isArray(prefs.difficulty)
      ? prefs.difficulty.includes(d.id)
      : (prefs.difficulty as any) === d.id
  );

  // Filter lists
  const likedRecipesList = recipes.filter((r) => state.likedRecipes?.includes(r.id));
  const viewHistoryList = ((state.viewHistory || []) as string[])
    .map((id) => recipes.find((r) => r.id === id))
    .filter(Boolean) as Recipe[];

  const handleSettingsReset = () => {
    resetOnboarding();
    router.push('/onboarding');
  };

  const handleCreatePaymentSession = async () => {
    if (isGuest) {
      Alert.alert(
        'Регистрация обязательна 🔑',
        'Для покупки Premium подписки необходимо войти или зарегистрироваться, чтобы ваши покупки сохранялись в профиле.',
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
        setIsSubModalOpen(false);
        // Route to Webview payment screen
        router.push({
          pathname: '/payment',
          params: { url: res.paymentUrl }
        });
      } else {
        Alert.alert('Ошибка', res.error || 'Не удалось создать платежную сессию');
      }
    } catch (err: any) {
      setIsPaying(false);
      Alert.alert('Ошибка', 'Не удалось подключиться к платежному шлюзу');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBg}>
              <Text style={styles.avatarText}>🍳</Text>
            </View>
            {isAlreadyPremium && (
              <View style={styles.premiumBadge}>
                <Crown size={12} color="#ffffff" fill="#ffffff" />
              </View>
            )}
          </View>
          
          <Text style={styles.profileName}>
            {user ? user.email : 'Гостевой профиль'}
          </Text>
          <Text style={styles.profileSubtitle}>
            {user ? 'Зарегистрирован' : 'Вход без аккаунта'}
          </Text>
        </View>

        {/* Premium Subscription banner card */}
        <View style={[
          styles.subCard, 
          isAlreadyPremium ? styles.subCardPremium : styles.subCardFree
        ]}>
          <View style={styles.subCardHeader}>
            <View style={[
              styles.subBadge,
              isAlreadyPremium ? styles.subBadgePremium : styles.subBadgeFree
            ]}>
              <Text style={[
                styles.subBadgeText,
                isAlreadyPremium ? styles.subBadgeTextPremium : styles.subBadgeTextFree
              ]}>
                {isAlreadyPremium ? 'PREMIUM АКТИВЕН 👑' : 'БАЗОВЫЙ ТАРИФ'}
              </Text>
            </View>
            <Crown size={22} color={isAlreadyPremium ? '#10b981' : '#f59e0b'} fill={isAlreadyPremium ? '#10b981' : '#f59e0b'} />
          </View>

          <Text style={styles.subTitle}>
            {isAlreadyPremium ? 'Кулинарный Premium' : 'Разблокируйте Premium'}
          </Text>
          
          <Text style={styles.subDescription}>
            {isAlreadyPremium
              ? 'Вам открыт полный доступ к шеф-рецептам, планировщику меню на 7 дней и умному экспорту списка покупок.'
              : 'Получите доступ к ресторанным рецептам от шефов, планированию рациона на 7 дней и бесконечным свайпам.'}
          </Text>

          {!isAlreadyPremium ? (
            <TouchableOpacity
              style={styles.subBtn}
              activeOpacity={0.8}
              onPress={() => setIsSubModalOpen(true)}
            >
              <Text style={styles.subBtnText}>Активировать от 119 ₽/мес</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.manageBtn}
              activeOpacity={0.8}
              onPress={() => setIsManageSubOpen(true)}
            >
              <CreditCard size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.manageBtnText}>Управление подпиской</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Saved & History Drawer buttons */}
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={styles.actionBlock}
            activeOpacity={0.8}
            onPress={() => setIsLikedOpen(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
              <Heart size={16} color="#ef4444" fill="#ef4444" />
            </View>
            <View>
              <Text style={styles.actionBlockTitle}>Избранное</Text>
              <Text style={styles.actionBlockSubtitle}>{likedRecipesList.length} рецептов</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBlock}
            activeOpacity={0.8}
            onPress={() => setIsHistoryOpen(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f8fafc' }]}>
              <BookOpen size={16} color="#475569" />
            </View>
            <View>
              <Text style={styles.actionBlockTitle}>История</Text>
              <Text style={styles.actionBlockSubtitle}>{viewHistoryList.length} просмотров</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Selected Preferences Display Box */}
        <View style={styles.prefsCard}>
          <View style={styles.prefsCardHeader}>
            <Settings size={16} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={styles.prefsCardTitle}>Ваш кулинарный профиль</Text>
          </View>

          {/* Techniques */}
          <Text style={styles.prefsSectionTitle}>Доступная техника</Text>
          <View style={styles.tagsContainer}>
            {selectedTechniques.length > 0 ? (
              selectedTechniques.map((t) => (
                <View key={t.id} style={styles.prefTag}>
                  <Text style={styles.prefTagText}>{t.emoji} {t.label}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTagsText}>Не выбрано</Text>
            )}
          </View>

          {/* Preferences */}
          <Text style={styles.prefsSectionTitle}>Предпочтения в еде</Text>
          <View style={styles.tagsContainer}>
            {selectedTags.length > 0 ? (
              selectedTags.map((t) => (
                <View key={t.id} style={styles.prefTag}>
                  <Text style={styles.prefTagText}>{t.emoji} {t.label}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTagsText}>Не выбрано</Text>
            )}
          </View>

          {/* Dislikes / Excludes */}
          {selectedDislikes.length > 0 && (
            <>
              <Text style={styles.prefsSectionTitle}>Исключить ингредиенты</Text>
              <View style={styles.tagsContainer}>
                {selectedDislikes.map((t) => (
                  <View key={t.id} style={[styles.prefTag, styles.excludeTag]}>
                    <Text style={[styles.prefTagText, styles.excludeTagText]}>
                      {t.emoji} {t.label}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Difficulty */}
          <Text style={styles.prefsSectionTitle}>Сложность приготовления</Text>
          <View style={styles.tagsContainer}>
            {selectedDifficulties.length > 0 ? (
              selectedDifficulties.map((d) => (
                <View key={d.id} style={styles.prefTag}>
                  <Text style={styles.prefTagText}>⚡ {d.label}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTagsText}>Не выбрано</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.changePrefsBtn}
            activeOpacity={0.8}
            onPress={handleSettingsReset}
          >
            <Text style={styles.changePrefsBtnText}>Изменить предпочтения</Text>
            <ChevronRight size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Authentication Actions */}
        {user ? (
          <TouchableOpacity
            style={styles.signOutBtn}
            activeOpacity={0.8}
            onPress={() => setIsSignOutConfirmOpen(true)}
          >
            <LogOut size={16} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.signOutBtnText}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.signInBtn}
            activeOpacity={0.8}
            onPress={() => {
              signOut();
              router.push('/auth');
            }}
          >
            <UserPlus size={16} color="#10b981" style={{ marginRight: 8 }} />
            <Text style={styles.signInBtnText}>Войти или создать аккаунт</Text>
          </TouchableOpacity>
        )}

        {/* Legal documents */}
        <TouchableOpacity
          style={styles.legalBtn}
          activeOpacity={0.8}
          onPress={() => setIsLegalOpen(true)}
        >
          <Info size={14} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.legalBtnText}>Правовая информация, Оферта, Оплата</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* 1. SUBSCRIPTION BUY MODAL */}
      <Modal
        visible={isSubModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSubModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsSubModalOpen(false)}
            >
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.modalTitleContainer}>
              <View style={styles.modalIconBox}>
                <Crown size={28} color="#ffffff" fill="#ffffff" />
              </View>
              <Text style={styles.modalTitle}>CHOOZI Premium</Text>
              <Text style={styles.modalSubtitle}>Разблокируйте всё кулинарное волшебство</Text>
            </View>

            {/* Plans List Selection */}
            <View style={styles.plansContainer}>
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedTier === 'month' && styles.planCardSelected
                ]}
                activeOpacity={0.9}
                onPress={() => setSelectedTier('month')}
              >
                <View>
                  <Text style={styles.planName}>1 месяц</Text>
                  <Text style={styles.planDesc}>Продлевается ежемесячно</Text>
                </View>
                <Text style={styles.planPrice}>119 ₽</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedTier === 'year' && styles.planCardSelected
                ]}
                activeOpacity={0.9}
                onPress={() => setSelectedTier('year')}
              >
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>Выгодно 30%</Text>
                </View>
                <View>
                  <Text style={styles.planName}>12 месяцев</Text>
                  <Text style={styles.planDesc}>83 ₽ / мес в пересчете</Text>
                </View>
                <Text style={styles.planPrice}>999 ₽</Text>
              </TouchableOpacity>
            </View>

            {/* Checkout CTA */}
            <TouchableOpacity
              style={[styles.checkoutBtn, isPaying && { opacity: 0.7 }]}
              disabled={isPaying}
              onPress={handleCreatePaymentSession}
            >
              <Text style={styles.checkoutBtnText}>
                {isPaying ? 'Подготовка платежа...' : 'Оформить Premium подписку'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.offerText}>
              Нажимая кнопку, вы соглашаетесь с условиями Публичной оферты и Политики конфиденциальности, а также даете согласие на автопродление.
            </Text>
            <Text style={styles.requisitesText}>
              ИП Гольцев Никита Сергеевич • ИНН 235208985015
            </Text>
          </View>
        </View>
      </Modal>

      {/* 2. MANAGE SUBSCRIPTION MODAL */}
      <Modal
        visible={isManageSubOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsManageSubOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsManageSubOpen(false)}
            >
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>

            <Text style={styles.modalInnerTitle}>Управление подпиской</Text>
            
            <View style={styles.manageInfoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Текущий тариф:</Text>
                <Text style={styles.infoValue}>
                  {prefs.subscriptionType === 'year' ? '12 месяцев (Годовой)' : '1 месяц (Месячный)'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Стоимость:</Text>
                <Text style={styles.infoValue}>
                  {prefs.subscriptionType === 'year' ? '999 ₽' : '119 ₽'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Автопродление:</Text>
                <Text style={[
                  styles.infoValue, 
                  prefs.autoRenew !== false ? { color: '#10b981' } : { color: '#f59e0b' }
                ]}>
                  {prefs.autoRenew !== false ? 'Включено' : 'Отключено'}
                </Text>
              </View>
            </View>

            <Text style={styles.manageHint}>
              {prefs.autoRenew !== false
                ? 'Вы можете в любой момент отключить автопродление подписки. Доступ останется до конца оплаченного периода.'
                : 'Автопродление отключено. Premium привилегии активны до окончания расчетного периода.'}
            </Text>

            {prefs.autoRenew !== false ? (
              <TouchableOpacity
                style={styles.cancelSubBtn}
                onPress={() => {
                  updatePreferences({ autoRenew: false });
                  Alert.alert('Готово', 'Автопродление успешно отключено, карта отвязана.');
                }}
              >
                <Text style={styles.cancelSubBtnText}>Отключить автопродление</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.cancelledBox}>
                <Text style={styles.cancelledText}>Карта успешно отвязана.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 3. LIKED RECIPES DRAWER MODAL */}
      <Modal
        visible={isLikedOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLikedOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.dragHandle} />
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Вам понравилось ❤️</Text>
              <TouchableOpacity onPress={() => setIsLikedOpen(false)} style={styles.drawerClose}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.drawerList}>
              {likedRecipesList.length === 0 ? (
                <View style={styles.drawerEmpty}>
                  <Text style={styles.drawerEmptyText}>Список избранного пуст</Text>
                  <Text style={styles.drawerEmptySub}>Свайпайте карточки вправо, чтобы сохранять рецепты здесь.</Text>
                </View>
              ) : (
                likedRecipesList.map((recipe) => (
                  <View key={recipe.id} style={styles.recipeRow}>
                    <TouchableOpacity
                      style={styles.recipeRowContent}
                      onPress={() => {
                        setIsLikedOpen(false);
                        router.push(`/recipe/${recipe.id}`);
                      }}
                    >
                      <Image source={{ uri: recipe.imageUrl }} style={styles.recipeRowImage} />
                      <View style={styles.recipeRowDetails}>
                        <Text style={styles.recipeRowTitle} numberOfLines={1}>
                          {recipe.title}
                        </Text>
                        <Text style={styles.recipeRowMeta}>
                          ⏱ {recipe.time} мин • ⚡ {recipe.difficulty}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => unlikeRecipe(recipe.id)}
                      style={styles.recipeRowDelete}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. VIEW HISTORY DRAWER MODAL */}
      <Modal
        visible={isHistoryOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHistoryOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.dragHandle} />
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>История просмотров ⏱</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {viewHistoryList.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      clearViewHistory();
                      setIsHistoryOpen(false);
                      Alert.alert('Успех', 'История просмотров очищена.');
                    }}
                    style={{ marginRight: 12 }}
                  >
                    <Text style={styles.clearHistoryText}>Очистить</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsHistoryOpen(false)} style={styles.drawerClose}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.drawerList}>
              {viewHistoryList.length === 0 ? (
                <View style={styles.drawerEmpty}>
                  <Text style={styles.drawerEmptyText}>История просмотров пуста</Text>
                  <Text style={styles.drawerEmptySub}>Здесь будут отображаться рецепты, которые вы открывали.</Text>
                </View>
              ) : (
                viewHistoryList.map((recipe) => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={styles.recipeRow}
                    onPress={() => {
                      setIsHistoryOpen(false);
                      router.push(`/recipe/${recipe.id}`);
                    }}
                  >
                    <View style={styles.recipeRowContent}>
                      <Image source={{ uri: recipe.imageUrl }} style={styles.recipeRowImage} />
                      <View style={styles.recipeRowDetails}>
                        <Text style={styles.recipeRowTitle} numberOfLines={1}>
                          {recipe.title}
                        </Text>
                        <Text style={styles.recipeRowMeta}>
                          ⏱ {recipe.time} мин • ⚡ {recipe.difficulty}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. LEGAL INFO MODAL */}
      <Modal
        visible={isLegalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLegalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.dragHandle} />
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Правовая информация ⚖️</Text>
              <TouchableOpacity onPress={() => setIsLegalOpen(false)} style={styles.drawerClose}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.legalScroll}>
              <Text style={styles.legalMainTitle}>ИП Гольцев Никита Сергеевич</Text>
              
              <View style={styles.legalBox}>
                <Text style={styles.legalLabel}>ИНН:</Text>
                <Text style={styles.legalValue}>235208985015</Text>
              </View>
              <View style={styles.legalBox}>
                <Text style={styles.legalLabel}>ОГРНИП:</Text>
                <Text style={styles.legalValue}>324237500330960</Text>
              </View>
              <View style={styles.legalBox}>
                <Text style={styles.legalLabel}>Email поддержки:</Text>
                <Text style={styles.legalValue}>support@choozi.ru</Text>
              </View>

              <Text style={styles.legalHeading}>Оплата банковскими картами</Text>
              <Text style={styles.legalParagraph}>
                Оплата услуг производится с помощью платежного шлюза ЮKassa (ООО НКО «ЮМани»). К оплате принимаются карты МИР, Visa, Mastercard, а также СБП. Все транзакции защищены 3D Secure и соответствуют стандарту PCI DSS.
              </Text>

              <Text style={styles.legalHeading}>Возврат средств и условия отмены</Text>
              <Text style={styles.legalParagraph}>
                Пользователь может в любой момент отключить автопродление подписки в настройках личного кабинета приложения. При отмене подписки денежные средства за уже начавшийся оплаченный период не возвращаются, а доступ к Premium функциям сохраняется до окончания расчетного периода.
              </Text>

              <Text style={styles.legalHeading}>Правила рекуррентных платежей</Text>
              <Text style={styles.legalParagraph}>
                Оформляя Premium подписку, вы соглашаетесь на списание абонентской платы раз в месяц (119 рублей) или раз в год (999 рублей) в автоматическом режиме с привязанной карты. Вы можете отвязать карту в любой момент.
              </Text>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 6. SIGN OUT CONFIRM MODAL */}
      <Modal
        visible={isSignOutConfirmOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsSignOutConfirmOpen(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.signOutBox}>
            <LogOut size={32} color="#ef4444" style={{ marginBottom: 16 }} />
            <Text style={styles.signOutTitle}>Выход из аккаунта</Text>
            <Text style={styles.signOutDesc}>
              Вы уверены, что хотите выйти из профиля? Вы сможете зайти снова в любой момент с вашей почтой.
            </Text>

            <View style={styles.signOutActions}>
              <TouchableOpacity
                style={styles.signOutYesBtn}
                onPress={async () => {
                  setIsSignOutConfirmOpen(false);
                  await signOut();
                  router.replace('/auth');
                }}
              >
                <Text style={styles.signOutYesText}>Да, выйти</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signOutNoBtn}
                onPress={() => setIsSignOutConfirmOpen(false)}
              >
                <Text style={styles.signOutNoText}>Отмена</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarText: {
    fontSize: 34,
  },
  premiumBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 14,
    padding: 5,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  profileSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  subCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  subCardFree: {
    backgroundColor: '#1e293b', // Sleek dark card for marketing
    borderColor: '#334155',
    shadowColor: '#000000',
  },
  subCardPremium: {
    backgroundColor: '#064e3b', // Sleek forest green card for premium
    borderColor: '#065f46',
    shadowColor: '#047857',
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  subBadgeFree: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  subBadgePremium: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  subBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subBadgeTextFree: {
    color: '#fbbf24',
  },
  subBadgeTextPremium: {
    color: '#34d399',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 6,
  },
  subDescription: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
    marginBottom: 16,
    fontWeight: '500',
  },
  subBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  subBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '900',
  },
  manageBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  manageBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBlock: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBlockTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  actionBlockSubtitle: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 1,
  },
  prefsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  prefsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    paddingBottom: 10,
    marginBottom: 12,
  },
  prefsCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  prefsSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  prefTag: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  prefTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  excludeTag: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  excludeTagText: {
    color: '#ef4444',
  },
  noTagsText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
  changePrefsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 12,
    marginTop: 10,
  },
  changePrefsBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '800',
  },
  signOutBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signOutBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
  },
  signInBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signInBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  legalBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 8,
    marginBottom: 10,
  },
  legalBtnText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalContentLarge: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    height: '80%',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  modalTitleContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  modalIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  plansContainer: {
    marginVertical: 20,
    gap: 12,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  planCardSelected: {
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
  planName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  planDesc: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  checkoutBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginTop: 10,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  offerText: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 11,
  },
  requisitesText: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  modalInnerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 16,
  },
  manageInfoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '800',
  },
  manageHint: {
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 14,
    marginVertical: 16,
    textAlign: 'center',
  },
  cancelSubBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelSubBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
  },
  cancelledBox: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelledText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  drawerClose: {
    padding: 4,
  },
  clearHistoryText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },
  drawerList: {
    paddingBottom: 24,
    gap: 12,
  },
  drawerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  drawerEmptyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  drawerEmptySub: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    padding: 8,
    gap: 10,
  },
  recipeRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  recipeRowImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  recipeRowDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  recipeRowTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  recipeRowMeta: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  recipeRowDelete: {
    padding: 8,
  },
  legalScroll: {
    paddingBottom: 40,
  },
  legalMainTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
  },
  legalBox: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  legalLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    width: 120,
  },
  legalValue: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '800',
    flex: 1,
  },
  legalHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginTop: 16,
    marginBottom: 6,
  },
  legalParagraph: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
    marginBottom: 10,
  },
  signOutBox: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    width: width - 40,
    maxWidth: 340,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  signOutTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  signOutDesc: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  signOutActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  signOutYesBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  signOutYesText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  signOutNoBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  signOutNoText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
});
