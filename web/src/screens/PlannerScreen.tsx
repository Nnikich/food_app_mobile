import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, X, Search, Trash2,
    ChevronRight, Check, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import SubscriptionModal from '../components/SubscriptionModal';
import PaywallView from '../components/PaywallView';
import { areIngredientsCompatible } from '../utils/ingredientNormalizer';

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

// Local helper to format Date to YYYY-MM-DD in local time
const getLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
};

export default function PlannerScreen() {
    const navigate = useNavigate();
    const { state, recipes, addToShoppingList } = useAppContext();
    const isPremium = state.subscription === 'premium';

    // Generate 7 days dynamically starting from today
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

    // State for weekly plan (loaded from localStorage or initialized empty with single-string migration)
    const [plan, setPlan] = useState<WeeklyPlan>(() => {
        const saved = localStorage.getItem('cook_assistant_weekly_plan');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const migrated: WeeklyPlan = {};
                Object.entries(parsed).forEach(([dateStr, dailyPlan]: [string, any]) => {
                    migrated[dateStr] = {
                        breakfast: Array.isArray(dailyPlan.breakfast)
                            ? dailyPlan.breakfast
                            : dailyPlan.breakfast ? [dailyPlan.breakfast] : [],
                        lunch: Array.isArray(dailyPlan.lunch)
                            ? dailyPlan.lunch
                            : dailyPlan.lunch ? [dailyPlan.lunch] : [],
                        dinner: Array.isArray(dailyPlan.dinner)
                            ? dailyPlan.dinner
                            : dailyPlan.dinner ? [dailyPlan.dinner] : []
                    };
                });
                return migrated;
            } catch (e) { console.error(e); }
        }
        return {};
    });

    const [selectedDateString, setSelectedDateString] = useState<string>(days[0].dateString);

    // Recipe picker states
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerSlot, setPickerSlot] = useState<{ dateString: string; mealType: MealType } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubOpen, setIsSubOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    // Save states to localStorage on changes
    useEffect(() => {
        localStorage.setItem('cook_assistant_weekly_plan', JSON.stringify(plan));
    }, [plan]);

    // Clean up old entries in plan that are older than today to keep storage optimal and avoid stale ingredients
    useEffect(() => {
        const cleanedPlan = { ...plan };
        const todayStr = getLocalDateString(new Date());

        let needsSave = false;
        Object.keys(cleanedPlan).forEach(dateStr => {
            if (dateStr < todayStr) {
                delete cleanedPlan[dateStr];
                needsSave = true;
            }
        });

        if (needsSave) {
            setPlan(cleanedPlan);
        }
    }, []);

    // Plan management
    const openRecipePicker = (dateString: string, mealType: MealType) => {
        setPickerSlot({ dateString, mealType });
        setSearchQuery('');
        setPickerOpen(true);
    };

    const selectRecipeForSlot = (recipeId: string) => {
        if (!pickerSlot) return;
        const { dateString, mealType } = pickerSlot;
        setPlan(prev => {
            const dayPlan = prev[dateString] || {};
            const slotRecipes = dayPlan[mealType] || [];

            // Add only if not already present
            if (slotRecipes.includes(recipeId)) {
                setPickerOpen(false);
                return prev;
            }

            const updatedPlan = {
                ...prev,
                [dateString]: {
                    ...dayPlan,
                    [mealType]: [...slotRecipes, recipeId]
                }
            };
            setPickerOpen(false);
            return updatedPlan;
        });
    };

    // Consolidate ingredients for the active 7 days to generate shopping list exports
    const getConsolidatedIngredients = () => {
        const ingredientsMap: Record<string, { quantity: string; recipeTitle: string }[]> = {};

        // Only consolidate ingredients for the 7 days currently in the planner view
        days.forEach(day => {
            const dailyPlan = plan[day.dateString];
            if (!dailyPlan) return;

            (['breakfast', 'lunch', 'dinner'] as MealType[]).forEach(mealType => {
                const recipeIds = dailyPlan[mealType] || [];
                recipeIds.forEach(id => {
                    const recipe = recipes.find(r => r.id === id);
                    if (recipe) {
                        recipe.ingredients.forEach(ing => {
                            const name = ing.name.trim();
                            // Find existing compatible ingredient name in map keys
                            const existingKey = Object.keys(ingredientsMap).find(key => 
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
            // Group quantities or format beautifully
            const quantitySummary = sources.map(s => s.quantity).join(' + ');
            const recipeTitle = sources.map(s => s.recipeTitle).filter((v, i, self) => self.indexOf(v) === i).join(', ');
            return {
                name,
                quantity: quantitySummary,
                recipeTitle
            };
        });
    };

    const consolidatedIngredients = getConsolidatedIngredients();
    const activeIngredientsCount = consolidatedIngredients.length;

    // Handle batch import into the main shopping list screen
    const handleImportToShopping = () => {
        const itemsToImport = consolidatedIngredients.map(ing => ({
            name: `${ing.name} (${ing.quantity})`,
            recipeTitle: 'План на неделю'
        }));

        if (itemsToImport.length > 0) {
            addToShoppingList(itemsToImport);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 2500);
        }
    };

    // Search and display for recipe selector
    const filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

        return matchesSearch;
    });

    const getMealLabel = (mealType: MealType) => {
        switch (mealType) {
            case 'breakfast': return 'Завтрак';
            case 'lunch': return 'Обед';
            case 'dinner': return 'Ужин';
        }
    };

    const selectedDayData = days.find(d => d.dateString === selectedDateString) || days[0];

    // Paywall screen gating for non-subscribers
    if (!isPremium) {
        return (
            <>
                <PaywallView
                    title="Планировщик меню закрыт"
                    subtitle="Составляйте сбалансированный рацион на 7 дней вперед и автоматически формируйте объединенный список покупок"
                    onSubscribe={() => setIsSubOpen(true)}
                />
                <SubscriptionModal
                    isOpen={isSubOpen}
                    onClose={() => setIsSubOpen(false)}
                />
            </>
        );
    }

    return (
        <div className="page bg-background">
            <div className="container pt-10">
                {/* Header */}
                <header className="mb-6">
                    <h1 className="text-3xl font-extrabold text-foreground whitespace-nowrap">
                        Планировщик меню
                    </h1>
                    <p className="text-xs text-gray-400 mt-1 font-semibold">
                        Составьте сбалансированный рацион на 7 дней
                    </p>
                </header>

                {/* 7-Days Nav Pills in a beautiful grid (No horizontal scrolling) */}
                <div className="grid grid-cols-7 gap-1.5 mb-6">
                    {days.map((day) => {
                        const isSelected = selectedDateString === day.dateString;
                        const hasPlannedMeals = plan[day.dateString] &&
                            Object.values(plan[day.dateString]).some(v => v !== undefined && v.length > 0);

                        return (
                            <button
                                key={day.dateString}
                                onClick={() => setSelectedDateString(day.dateString)}
                                className={`flex flex-col items-center justify-center py-2.5 rounded-2xl border transition-all relative ${isSelected
                                        ? 'bg-gradient-to-tr from-green-500 to-emerald-600 border-green-500 text-white shadow-md shadow-green-500/10 scale-105 z-10'
                                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                    {day.shortDay}
                                </span>
                                <span className="text-sm font-black mt-0.5">
                                    {day.dayOfMonth}
                                </span>
                                {hasPlannedMeals && (
                                    <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Day Header Label */}
                <div className="bg-slate-50 border border-slate-100/50 rounded-2xl px-4 py-3 mb-6 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-700">
                        План на {selectedDayData.fullLabel}
                    </span>
                    {Object.values(plan[selectedDateString] || {}).some(v => v !== undefined && v.length > 0) && (
                        <button
                            onClick={() => {
                                setPlan(prev => {
                                    const next = { ...prev };
                                    delete next[selectedDateString];
                                    return next;
                                });
                            }}
                            className="text-[10px] text-red-500 hover:text-red-600 font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                            <Trash2 size={11} /> Очистить день
                        </button>
                    )}
                </div>

                {/* Meal Slots list (Breakfast, Lunch, Dinner) */}
                <div className="space-y-4 mb-8">
                    {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((mealType) => {
                        const slotRecipes = plan[selectedDateString]?.[mealType] || [];
                        return (
                            <div key={mealType} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">
                                        {getMealLabel(mealType)}
                                    </h3>
                                    <button
                                        onClick={() => openRecipePicker(selectedDateString, mealType)}
                                        className="text-[10px] text-primary hover:text-green-600 font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <Plus size={12} /> Добавить блюдо
                                    </button>
                                </div>

                                {slotRecipes.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {slotRecipes.map((recipeId) => {
                                            const recipe = recipes.find(r => r.id === recipeId);
                                            if (!recipe) return null;
                                            return (
                                                <div
                                                    key={recipeId}
                                                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div
                                                        onClick={() => navigate(`/recipe/${recipe.id}`)}
                                                        className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                                                    >
                                                        <img
                                                            src={recipe.imageUrl}
                                                            alt={recipe.title}
                                                            className="w-full h-full object-cover"
                                                            onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'; }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4
                                                            onClick={() => navigate(`/recipe/${recipe.id}`)}
                                                            className="font-bold text-slate-700 text-xs truncate cursor-pointer hover:text-primary transition-colors"
                                                        >
                                                            {recipe.title}
                                                        </h4>
                                                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                                                            ⏱ {recipe.time} мин
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setPlan(prev => {
                                                                const dayPlan = prev[selectedDateString] || {};
                                                                const slot = dayPlan[mealType] || [];
                                                                return {
                                                                    ...prev,
                                                                    [selectedDateString]: {
                                                                        ...dayPlan,
                                                                        [mealType]: slot.filter(id => id !== recipeId)
                                                                    }
                                                                };
                                                            });
                                                        }}
                                                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-full transition-all"
                                                        title="Удалить из плана"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => openRecipePicker(selectedDateString, mealType)}
                                        className="border border-dashed border-slate-200 hover:border-primary/45 rounded-2xl py-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-slate-400 hover:text-primary transition-all bg-slate-50/20"
                                    >
                                        <Plus size={16} className="text-slate-300 group-hover:text-primary shrink-0" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Добавить блюдо</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Import/Consolidate All Ingredients into Shopping List section */}
                {activeIngredientsCount > 0 && (
                    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                        <div className="mb-4">
                            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">
                                Список покупок на неделю
                            </h3>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                Все продукты из выбранных блюд будут объединены и добавлены в ваш список покупок
                            </p>
                        </div>

                        {/* List preview */}
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-6 border border-slate-50 rounded-2xl p-2.5 scrollbar-thin">
                            {consolidatedIngredients.map((ing, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50/50 border border-slate-50 text-slate-700"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="font-semibold truncate">
                                            {ing.name}
                                        </span>
                                        <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider max-w-[120px] truncate">
                                            ({ing.recipeTitle})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-right font-bold shrink-0">
                                        <span className="text-slate-500">{ing.quantity}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Export Action CTA */}
                        <button
                            onClick={handleImportToShopping}
                            className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-500/10"
                        >
                            Сформировать список покупок ({activeIngredientsCount} поз.)
                        </button>
                    </div>
                )}
            </div>

            {/* Recipe Picker Overlay Modal */}
            <AnimatePresence>
                {pickerOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex flex-col justify-end sm:justify-center p-0 sm:p-4"
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg mx-auto flex flex-col h-[85vh] sm:h-[75vh] shadow-2xl overflow-hidden border border-slate-100"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-base">
                                        Выбрать блюдо
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                                        {pickerSlot ? `${days.find(d => d.dateString === pickerSlot.dateString)?.label} — ${getMealLabel(pickerSlot.mealType)}` : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPickerOpen(false)}
                                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search bar */}
                            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Поиск по названию или тегам..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary text-sm font-semibold transition-all bg-white"
                                    />
                                </div>
                            </div>

                            {/* Recipes List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-slate-50/30">
                                {filteredRecipes.length > 0 ? (
                                    filteredRecipes.map((recipe) => (
                                        <div
                                            key={recipe.id}
                                            onClick={() => selectRecipeForSlot(recipe.id)}
                                            className="flex gap-4 p-3 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-green-50/10 transition-all cursor-pointer group shadow-sm bg-white"
                                        >
                                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                                                <img
                                                    src={recipe.imageUrl}
                                                    alt={recipe.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'; }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors truncate">
                                                    {recipe.title}
                                                </h4>
                                                <div className="flex gap-2.5 mt-1.5">
                                                    <span className="text-[10px] font-bold text-slate-400">⏱ {recipe.time} мин</span>
                                                    <span className="text-[10px] font-bold text-primary bg-green-50 px-1.5 py-0.5 rounded-md">{recipe.difficulty}</span>
                                                </div>
                                            </div>
                                            <div className="self-center p-2 rounded-xl bg-slate-50 group-hover:bg-primary group-hover:text-white transition-all text-slate-400 shrink-0">
                                                <ChevronRight size={15} />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <BookOpen size={32} className="mx-auto mb-3 text-slate-300 animate-pulse" />
                                        <p className="text-xs font-semibold">Рецепты не найдены</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Toast */}
            <AnimatePresence>
                {showSuccessToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className="fixed bottom-24 left-1/2 bg-slate-900 text-white px-5 py-3.5 rounded-2xl text-xs font-black shadow-xl z-[9999] flex items-center gap-2 border border-slate-800 whitespace-nowrap"
                    >
                        <span>🛒 Список покупок сформирован и обновлен!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Subscription Modal */}
            <SubscriptionModal
                isOpen={isSubOpen}
                onClose={() => setIsSubOpen(false)}
            />
        </div>
    );
}
