import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Settings,
    ChefHat,
    Flame,
    Heart,
    ShieldOff,
    Crown,
    LogOut,
    UserPlus,
    X,
    Trash2,
    CreditCard,
    CheckCircle2,
    AlertCircle,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { TECHNIQUES, PREFERENCE_TAGS, DISLIKE_TAGS, DIFFICULTY_LEVELS } from '../data/constants';
import SubscriptionModal from '../components/SubscriptionModal';
import LegalModal from '../components/LegalModal';
import { Recipe } from '../types';

export default function ProfileScreen() {
    const {
        state,
        resetOnboarding,
        recipes,
        unlikeRecipe,
        user,
        signOut,
        refreshUserState,
        clearViewHistory,
        updatePreferences
    } = useAppContext();
    const navigate = useNavigate();
    const prefs = state.preferences;

    const [isSubOpen, setIsSubOpen] = useState(false);
    const [subModalInitialState, setSubModalInitialState] = useState<'idle' | 'success'>('idle');
    const [isLikedOpen, setIsLikedOpen] = useState(false);
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
    const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
    const [isManageSubOpen, setIsManageSubOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    // Auto-detect payment parameters from YooKassa redirect URLs
    useEffect(() => {
        const yookassaStatus = searchParams.get('yookassa');

        if (yookassaStatus === 'success') {
            // SUCCESS REDIRECT: YooKassa successfully completed payment and redirected back
            localStorage.setItem('choozi_payment_date', new Date().toISOString());
            refreshUserState();
            setSubModalInitialState('success');
            setIsSubOpen(true);

            // Clean up YooKassa status parameters from address bar
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('yookassa');
            setSearchParams(newParams);
        } else if (yookassaStatus === 'fail') {
            // FAIL REDIRECT: YooKassa failed or was canceled
            setSubModalInitialState('idle');
            setIsSubOpen(true);

            const newParams = new URLSearchParams(searchParams);
            newParams.delete('yookassa');
            setSearchParams(newParams);
        }
    }, [searchParams, setSearchParams, refreshUserState]);

    const isLegalOpen = searchParams.get('legal') === 'true';
    const setIsLegalOpen = (open: boolean) => {
        if (open) {
            setSearchParams({ legal: 'true' });
        } else {
            setSearchParams({});
        }
    };

    const selectedTechniques = TECHNIQUES.filter(t => prefs.technique.includes(t.id));
    const selectedTags = PREFERENCE_TAGS.filter(t => prefs.tags.includes(t.id));
    const selectedDislikes = DISLIKE_TAGS.filter(t => prefs.dislikedTags.includes(t.excludes));
    const selectedDifficulties = DIFFICULTY_LEVELS.filter(d =>
        Array.isArray(prefs.difficulty)
            ? prefs.difficulty.includes(d.id)
            : (prefs.difficulty as any) === d.id
    );

    // Filter recipes that the user has liked (saved in likedRecipes state)
    const likedRecipesList = recipes.filter(r => state.likedRecipes?.includes(r.id));

    // Filter recipes in view history (excluding duplicates already handled by viewRecipe action)
    const viewHistoryList = ((state.viewHistory || []) as string[])
        .map(id => recipes.find(r => r.id === id))
        .filter(Boolean) as Recipe[];

    const handleSettings = () => {
        resetOnboarding();
        navigate('/onboarding');
    };

    return (
        <div className="page bg-background">
            <div className="container pt-10">
                <h1 className="text-3xl font-extrabold mb-6">Профиль</h1>

                {/* Account Type / Header */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-200 mb-3 relative">
                        <ChefHat size={36} className="text-white" />
                        {state.subscription === 'premium' && (
                            <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full shadow border-2 border-white animate-pulse">
                                <Crown size={14} fill="currentColor" />
                            </div>
                        )}
                    </div>
                    {user ? (
                        <p className="text-lg font-bold text-foreground select-all">
                            {user.email}
                        </p>
                    ) : (
                        <>
                            <p className="text-lg font-bold text-foreground">
                                Гостевой профиль
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 select-all">
                                Вход без аккаунта
                            </p>
                        </>
                    )}
                </div>

                {/* Subscription Banner */}
                <div className={`p-6 rounded-[2rem] mb-6 relative overflow-hidden border transition-all ${state.subscription === 'premium' ? 'bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-900 border-emerald-500/30 shadow-xl shadow-emerald-500/5' : 'bg-gradient-to-br from-slate-950 via-amber-950/30 to-slate-900 border-amber-500/30 shadow-xl shadow-amber-500/5'}`}>
                    <div className="absolute -top-4 -right-4 opacity-15 pointer-events-none text-slate-400">
                        <Crown size={120} fill="currentColor" className={state.subscription === 'premium' ? 'text-emerald-400' : 'text-amber-400'} />
                    </div>

                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${state.subscription === 'premium' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
                                {state.subscription === 'premium' ? 'Premium активен 👑' : 'Базовый тариф'}
                            </span>
                            <h3 className="text-xl font-black text-white mt-4 tracking-tight">
                                {state.subscription === 'premium' ? 'Кулинарный Premium' : 'Разблокируйте Premium'}
                            </h3>
                            <p className="text-xs text-white mt-2 max-w-[90%] leading-relaxed font-medium">
                                {state.subscription === 'premium'
                                    ? 'Вам открыт полный доступ ко всему каталогу шеф-рецептов, умному планировщику меню и автогенерации списка покупок!'
                                    : 'Получите доступ ко всему каталогу шеф-рецептов, умному планировщику меню на 7 дней и автосборке списка покупок без ограничений.'}
                            </p>
                        </div>
                    </div>

                    {state.subscription !== 'premium' ? (
                        <button
                            onClick={() => setIsSubOpen(true)}
                            className="w-full mt-5 py-3.5 rounded-2xl text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 hover:opacity-95 shadow-lg shadow-amber-500/15 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                        >
                            <Crown size={14} fill="currentColor" />
                            <span>Активировать от 119 ₽/мес</span>
                        </button>
                    ) : (
                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between text-xs text-emerald-400 font-bold bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                                <span className="flex items-center gap-1.5">
                                    <Crown size={14} fill="currentColor" className="text-amber-400 animate-pulse" />
                                    Тариф: {prefs.subscriptionType === 'year' ? 'Годовой Premium' : 'Месячный Premium'}
                                </span>
                                <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    {prefs.autoRenew !== false ? 'Автопродление' : 'Активен'}
                                </span>
                            </div>

                            <div className="w-full">
                                <button
                                    onClick={() => setIsManageSubOpen(true)}
                                    className="w-full py-3 rounded-2xl text-[11px] font-black bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md shadow-black/10"
                                >
                                    <CreditCard size={12} className="text-emerald-400" />
                                    Управление подпиской
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Favorites and History Action Buttons */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={() => setIsLikedOpen(true)}
                        className="bg-white border border-slate-100 rounded-[1.5rem] p-3.5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3.5 group text-left w-full"
                    >
                        <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                            <Heart size={16} className="fill-current text-red-500" />
                        </div>
                        <span className="text-xs font-black text-slate-800 tracking-tight leading-none">
                            Избранное ({likedRecipesList.length})
                        </span>
                    </button>

                    <button
                        onClick={() => setIsHistoryDrawerOpen(true)}
                        className="bg-white border border-slate-100 rounded-[1.5rem] p-3.5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3.5 group text-left w-full"
                    >
                        <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                            <span className="text-sm">⏱</span>
                        </div>
                        <span className="text-xs font-black text-slate-800 tracking-tight leading-none">
                            История ({viewHistoryList.length})
                        </span>
                    </button>
                </div>

                {/* Current Settings Card */}
                <div className="glass-card p-5 mb-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Flame size={13} /> Техника
                    </h2>
                    <div className="flex flex-wrap gap-2 mb-5">
                        {selectedTechniques.length > 0 ? selectedTechniques.map(t => (
                            <span key={t.id} className="px-3 py-1.5 rounded-full bg-secondary text-primary text-xs font-bold">
                                {t.emoji} {t.label}
                            </span>
                        )) : (
                            <span className="text-xs text-gray-400">Не выбрано</span>
                        )}
                    </div>

                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Heart size={13} /> Предпочтения
                    </h2>
                    <div className="flex flex-wrap gap-2 mb-5">
                        {selectedTags.length > 0 ? selectedTags.map(t => (
                            <span key={t.id} className="px-3 py-1.5 rounded-full bg-secondary text-primary text-xs font-bold">
                                {t.emoji} {t.label}
                            </span>
                        )) : (
                            <span className="text-xs text-gray-400">Не выбрано</span>
                        )}
                    </div>

                    {selectedDislikes.length > 0 && (
                        <>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <ShieldOff size={13} /> Исключения
                            </h2>
                            <div className="flex flex-wrap gap-2 mb-5">
                                {selectedDislikes.map(t => (
                                    <span key={t.id} className="px-3 py-1.5 rounded-full bg-red-50 text-red-500 text-xs font-bold border border-red-200">
                                        {t.emoji} {t.label}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}

                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Сложность
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {selectedDifficulties.length > 0 ? selectedDifficulties.map(d => (
                            <span key={d.id} className="px-3 py-1.5 rounded-full bg-secondary text-primary text-xs font-bold">
                                ⚡ {d.label}
                            </span>
                        )) : (
                            <span className="text-xs text-gray-400">Не выбрано</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <button
                    onClick={handleSettings}
                    className="btn-primary w-full mb-3 flex items-center justify-center gap-2"
                >
                    <Settings size={20} />
                    Настроить предпочтения
                </button>

                {user ? (
                    <button
                        onClick={() => setIsSignOutConfirmOpen(true)}
                        className="w-full py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold mb-3 shadow-sm"
                    >
                        <LogOut size={16} />
                        Выйти из аккаунта
                    </button>
                ) : (
                    <button
                        onClick={signOut}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-600 hover:from-green-100 hover:to-emerald-100 transition-all flex items-center justify-center gap-2 text-sm font-bold mb-3 shadow-sm"
                    >
                        <UserPlus size={16} />
                        Войти или зарегистрировать аккаунт
                    </button>
                )}

                <button
                    onClick={() => setIsLegalOpen(true)}
                    className="w-full py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 text-slate-600 transition-colors flex items-center justify-center gap-2 text-sm font-semibold mb-3 shadow-sm"
                >
                    ⚖️ Правовая информация (Реквизиты, Оплата)
                </button>


            </div>

            {/* Premium Subscription Modal */}
            <SubscriptionModal
                isOpen={isSubOpen}
                onClose={() => {
                    setIsSubOpen(false);
                    setSubModalInitialState('idle');
                }}
                initialState={subModalInitialState}
            />

            {/* Legal Info Modal */}
            <LegalModal
                isOpen={isLegalOpen}
                onClose={() => setIsLegalOpen(false)}
            />

            {/* Manage Subscription Modal */}
            <AnimatePresence>
                {isManageSubOpen && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsManageSubOpen(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', duration: 0.4 }}
                            className="bg-white border border-gray-100 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative z-10 text-gray-800"
                        >
                            <button
                                onClick={() => setIsManageSubOpen(false)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <X size={16} />
                            </button>

                            <div className="flex items-center gap-3 mb-5 border-b border-gray-50 pb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 animate-pulse">
                                    <Crown size={20} fill="currentColor" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 leading-tight">Управление подпиской</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">CHOOZI Premium</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-2.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-semibold">Тарифный план:</span>
                                        <span className="font-extrabold text-gray-900">
                                            {prefs.subscriptionType === 'year' ? '12 месяцев (Годовой)' : '1 месяц (Месячный)'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-semibold">Стоимость:</span>
                                        <span className="font-extrabold text-gray-900">
                                            {prefs.subscriptionType === 'year' ? '999 ₽ / год' : '119 ₽ / мес'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-semibold">Способ оплаты:</span>
                                        <span className="font-extrabold text-gray-900 flex items-center gap-1">
                                            {prefs.autoRenew !== false ? '💳 Карта привязана' : '💳 Не привязана'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-semibold">Статус автопродления:</span>
                                        {prefs.autoRenew !== false ? (
                                            <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                                                <CheckCircle2 size={13} className="text-emerald-500" />
                                                Активно
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 font-extrabold flex items-center gap-1">
                                                <AlertCircle size={13} />
                                                Отключено
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className="text-[11px] text-gray-400 leading-normal">
                                    {prefs.autoRenew !== false
                                        ? 'Следующее списание средств произойдет автоматически. Вы можете в любой момент отключить автопродление подписки.'
                                        : 'Автопродление отключено. Ваши Premium-привилегии останутся полностью активными до конца расчетного периода.'}
                                </p>

                                {prefs.autoRenew !== false ? (
                                    <button
                                        onClick={() => {
                                            updatePreferences({ autoRenew: false });
                                        }}
                                        className="w-full py-3.5 rounded-2xl text-xs font-black bg-rose-50 hover:bg-rose-100/70 border border-rose-100 text-rose-600 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <AlertCircle size={14} />
                                        Отключить автопродление и отвязать карту
                                    </button>
                                ) : (
                                    <div className="w-full py-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[11px] font-bold text-center leading-normal">
                                        ⚠️ Карта успешно отвязана. Для возобновления автопродления потребуется привязать карту при следующей оплате подписки.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



            {/* Liked Recipes Drawer Modal */}
            <AnimatePresence>
                {isLikedOpen && (
                    <>
                        {/* Dark backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsLikedOpen(false)}
                            className="fixed inset-0 bg-black z-[1000]"
                        />

                        {/* Bottom drawer panel */}
                        <motion.div
                            initial={{ y: '100%', x: '-50%' }}
                            animate={{ y: 0, x: '-50%' }}
                            exit={{ y: '100%', x: '-50%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="fixed bottom-0 left-1/2 w-full max-w-md bg-white border-t border-slate-100 rounded-t-[2.5rem] z-[1001] p-6 max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col"
                        >
                            {/* Drag handler handle */}
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                    Вам понравилось ❤️
                                </h3>
                                <button
                                    onClick={() => setIsLikedOpen(false)}
                                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-xs text-slate-400 mb-6 leading-normal">
                                Список рецептов, которые вы сохранили. Нажмите на любой, чтобы открыть пошаговые инструкции по приготовлению.
                            </p>

                            {/* Recipes List */}
                            <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[50vh] scrollbar-hide pr-1">
                                {likedRecipesList.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-14 h-14 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-3 mx-auto">
                                            <Heart size={24} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-700">Список пуст</p>
                                        <p className="text-xs text-slate-400 max-w-[240px] mx-auto mt-1 leading-normal">
                                            Сохраняйте понравившиеся рецепты в избранное (нажав на сердечко внутри рецепта), чтобы они появились здесь!
                                        </p>
                                    </div>
                                ) : (
                                    likedRecipesList.map((recipe: Recipe) => (
                                        <div
                                            key={recipe.id}
                                            className="flex items-center gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all shadow-sm"
                                        >
                                            {/* Thumbnail */}
                                            <div
                                                onClick={() => {
                                                    setIsLikedOpen(false);
                                                    navigate(`/recipe/${recipe.id}`);
                                                }}
                                                className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 border border-slate-100"
                                            >
                                                <img
                                                    src={recipe.imageUrl}
                                                    alt={recipe.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'; }}
                                                />
                                            </div>

                                            {/* Details */}
                                            <div
                                                onClick={() => {
                                                    setIsLikedOpen(false);
                                                    navigate(`/recipe/${recipe.id}`);
                                                }}
                                                className="flex-1 min-w-0 cursor-pointer"
                                            >
                                                <h4 className="font-extrabold text-slate-800 text-sm truncate">
                                                    {recipe.title}
                                                </h4>
                                                <div className="flex gap-2 mt-1 text-[10px] font-bold text-slate-400">
                                                    <span>⏱ {recipe.time} мин</span>
                                                    <span>⚡ {recipe.difficulty}</span>
                                                </div>
                                            </div>

                                            {/* Delete Heart Action */}
                                            <button
                                                onClick={() => unlikeRecipe(recipe.id)}
                                                className="p-2 rounded-xl bg-red-50/50 hover:bg-red-50 text-red-500 hover:text-red-600 transition-all flex items-center justify-center"
                                                title="Удалить из избранного"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={() => setIsLikedOpen(false)}
                                className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center"
                            >
                                Закрыть
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* History Recipes Drawer Modal */}
            <AnimatePresence>
                {isHistoryDrawerOpen && (
                    <>
                        {/* Dark backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHistoryDrawerOpen(false)}
                            className="fixed inset-0 bg-black z-[1000]"
                        />

                        {/* Bottom drawer panel */}
                        <motion.div
                            initial={{ y: '100%', x: '-50%' }}
                            animate={{ y: 0, x: '-50%' }}
                            exit={{ y: '100%', x: '-50%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="fixed bottom-0 left-1/2 w-full max-w-md bg-white border-t border-slate-100 rounded-t-[2.5rem] z-[1001] p-6 max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col"
                        >
                            {/* Drag handler handle */}
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                    История просмотров ⏱
                                </h3>
                                <div className="flex items-center gap-2">
                                    {viewHistoryList.length > 0 && (
                                        <button
                                            onClick={() => {
                                                clearViewHistory();
                                                setIsHistoryDrawerOpen(false);
                                            }}
                                            className="text-[10px] text-red-500 font-black uppercase tracking-wider hover:underline mr-2"
                                        >
                                            Очистить
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsHistoryDrawerOpen(false)}
                                        className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 mb-6 leading-normal">
                                Недавно просмотренные вами рецепты. Нажмите на любой, чтобы вернуться к приготовлению.
                            </p>

                            {/* Recipes List */}
                            <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[50vh] scrollbar-hide pr-1">
                                {viewHistoryList.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-3 mx-auto">
                                            <span>⏱</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700">История пуста</p>
                                        <p className="text-xs text-slate-400 max-w-[240px] mx-auto mt-1 leading-normal">
                                            История просмотров появится после того, как вы откроете любой рецепт из каталога.
                                        </p>
                                    </div>
                                ) : (
                                    viewHistoryList.map((recipe: Recipe) => (
                                        <div
                                            key={recipe.id}
                                            className="flex items-center gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all shadow-sm"
                                        >
                                            {/* Thumbnail */}
                                            <div
                                                onClick={() => {
                                                    setIsHistoryDrawerOpen(false);
                                                    navigate(`/recipe/${recipe.id}`);
                                                }}
                                                className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 border border-slate-100"
                                            >
                                                <img
                                                    src={recipe.imageUrl || ''}
                                                    alt={recipe.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'; }}
                                                />
                                            </div>

                                            {/* Details */}
                                            <div
                                                onClick={() => {
                                                    setIsHistoryDrawerOpen(false);
                                                    navigate(`/recipe/${recipe.id}`);
                                                }}
                                                className="flex-1 min-w-0 cursor-pointer"
                                            >
                                                <h4 className="font-extrabold text-slate-800 text-sm truncate">
                                                    {recipe.title}
                                                </h4>
                                                <div className="flex gap-2 mt-1 text-[10px] font-bold text-slate-400">
                                                    <span>⏱ {recipe.time} мин</span>
                                                    <span>⚡ {recipe.difficulty}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={() => setIsHistoryDrawerOpen(false)}
                                className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center"
                            >
                                Закрыть
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Sign Out Confirmation Modal */}
            <AnimatePresence>
                {isSignOutConfirmOpen && (
                    <>
                        {/* Dark backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSignOutConfirmOpen(false)}
                            className="fixed inset-0 bg-black z-[2000]"
                        />

                        {/* Center Confirmation Card */}
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-[2001] pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl pointer-events-auto border border-slate-100 flex flex-col items-center text-center"
                            >
                                {/* Warning Icon Container */}
                                <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 border border-red-100">
                                    <LogOut size={28} className="translate-x-0.5" />
                                </div>

                                <h3 className="text-xl font-black text-slate-800 mb-2">
                                    Выход из аккаунта
                                </h3>
                                <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-[240px]">
                                    Вы уверены, что хотите выйти? Чтобы войти снова, потребуется ввести email и пароль.
                                </p>

                                {/* Action Buttons */}
                                <div className="w-full space-y-2">
                                    <button
                                        onClick={() => {
                                            setIsSignOutConfirmOpen(false);
                                            signOut();
                                        }}
                                        className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black text-sm rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-500/10 flex items-center justify-center gap-2"
                                    >
                                        Да, выйти
                                    </button>
                                    <button
                                        onClick={() => setIsSignOutConfirmOpen(false)}
                                        className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm rounded-2xl transition-all active:scale-95 flex items-center justify-center"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
