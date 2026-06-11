import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, ChefHat, Share2, Plus, Check, Sparkles, Users, Heart, Crown, Play, Pause, Minus, X, Trash2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { DIFFICULTY_LEVELS } from '../data/constants';
import SubscriptionModal from '../components/SubscriptionModal';
import { recipesApi } from '../api';
import { Recipe } from '../types';
import { getDisplayIngredientName } from '../utils/ingredientNormalizer';

export default function RecipeScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
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
        viewRecipe
    } = useAppContext();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPaywall, setIsPaywall] = useState(false);
    
    const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [isAdded, setIsAdded] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);
    const [isSubOpen, setIsSubOpen] = useState(false);

    // Cooking Step Timer States
    const [timerSetup, setTimerSetup] = useState<{
        isOpen: boolean;
        minutes: number;
        stepText: string;
    }>({
        isOpen: false,
        minutes: 0,
        stepText: ''
    });

    const openTimerSetup = (baseMinutes: number, stepText: string) => {
        setTimerSetup({
            isOpen: true,
            minutes: baseMinutes,
            stepText
        });
    };

    const startTimer = () => {
        if (timerSetup.minutes <= 0) return;
        startGlobalTimer(timerSetup.minutes, timerSetup.stepText, id, recipe?.title);
        setTimerSetup(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        let isMounted = true;
        async function fetchRecipe() {
            if (!id) return;
            setLoading(true);
            setError(null);
            setIsPaywall(false);
            try {
                const res = await recipesApi.getById(id);
                if (!isMounted) return;

                if (res.success && res.data) {
                    setRecipe(res.data);
                    viewRecipe(id);
                } else {
                    if (res.error === 'Premium Access Required') {
                        setIsPaywall(true);
                        // Try to find the title from context list for premium screen UX
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
        return () => { isMounted = false; };
    }, [id, state.subscription, recipes]);

    const handleShare = async () => {
        const shareData = {
            title: `Рецепт: ${recipe?.title}`,
            text: `Посмотри этот потрясающий рецепт "${recipe?.title}" в приложении CHOOZI!`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(window.location.href);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 2500);
            } catch (err) {
                console.log('Could not copy text: ', err);
            }
        }
    };

    // US-3/4: Pre-check ingredients that the user already has at home (from active products filter)
    useEffect(() => {
        if (recipe && state.ingredientsFilter && state.ingredientsFilter.length > 0) {
            const preChecked = recipe.ingredients
                .filter(ing => {
                    const ingName = ing.name.toLowerCase();
                    return state.ingredientsFilter.some(owned => {
                        const cleanOwned = owned.trim().toLowerCase();
                        return ingName.includes(cleanOwned) || cleanOwned.includes(ingName);
                    });
                })
                .map(ing => ing.name);
            setCheckedIngredients(preChecked);
        }
    }, [recipe, state.ingredientsFilter]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-primary animate-spin mb-4" />
                <span className="text-sm font-bold text-slate-500">Загрузка рецепта...</span>
            </div>
        );
    }

    if (error || (!recipe && !isPaywall)) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="text-4xl mb-4">😢</div>
                <h3 className="text-xl font-bold text-slate-800">{error || 'Рецепт не найден'}</h3>
                <button onClick={() => navigate(-1)} className="btn-primary mt-4 max-w-xs">
                    Вернуться назад
                </button>
            </div>
        );
    }

    if (isPaywall) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center pt-16 pb-24">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl flex flex-col items-center"
                >
                    <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 animate-pulse">
                        <Crown size={38} fill="currentColor" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-800 mb-3 leading-snug">
                        CHOOZI Premium 👑
                    </h2>
                    
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        Рецепт «<strong>{recipe?.title || 'Избранный рецепт'}</strong>» доступен только Premium-подписчикам. Оформи подписку, чтобы открыть полный доступ!
                    </p>

                    <button
                        onClick={() => setIsSubOpen(true)}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-500/10 active:scale-95 transition-all mb-3 flex items-center justify-center gap-2"
                    >
                        Подключить Premium
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold text-xs rounded-2xl active:scale-95 transition-all"
                    >
                        Вернуться назад
                    </button>
                </motion.div>

                <SubscriptionModal
                    isOpen={isSubOpen}
                    onClose={() => setIsSubOpen(false)}
                />
            </div>
        );
    }

    // Since loading/error/paywall checks are done, recipe is guaranteed to be non-null
    const activeRecipe = recipe!;
    const difficulty = DIFFICULTY_LEVELS.find(d => d.id === activeRecipe.difficulty);
    const isLiked = state.likedRecipes?.includes(activeRecipe.id);
    const getShoppingItem = (ingName: string) => {
        return state.shoppingList.find(item => 
            (item.recipeId === activeRecipe.id || item.recipeTitle === activeRecipe.title) &&
            item.name.toLowerCase().startsWith(ingName.toLowerCase())
        );
    };

    const isRecipeInShoppingList = state.shoppingList.some(item => 
        item.recipeId === activeRecipe.id || item.recipeTitle === activeRecipe.title
    );

    const isIngredientChecked = (ingName: string) => {
        if (isRecipeInShoppingList) {
            const item = getShoppingItem(ingName);
            return !item || item.isChecked;
        } else {
            return checkedIngredients.includes(ingName);
        }
    };

    const toggleIngredient = (ingName: string, quantity: string) => {
        if (isRecipeInShoppingList) {
            const shoppingItem = getShoppingItem(ingName);
            if (shoppingItem) {
                toggleShoppingItem(shoppingItem.id);
            } else {
                addToShoppingList([{
                    name: `${ingName} (${quantity})`,
                    recipeId: activeRecipe.id,
                    recipeTitle: activeRecipe.title
                }]);
            }
        } else {
            if (checkedIngredients.includes(ingName)) {
                setCheckedIngredients(prev => prev.filter(i => i !== ingName));
            } else {
                setCheckedIngredients(prev => [...prev, ingName]);
            }
        }
    };

    const handleAddToList = () => {
        const itemsToAdd: Array<{ name: string; recipeId?: string; recipeTitle?: string }> = [];
        
        activeRecipe.ingredients.forEach(ing => {
            if (isRecipeInShoppingList) {
                const shoppingItem = getShoppingItem(ing.name);
                if (!shoppingItem) {
                    itemsToAdd.push({
                        name: `${ing.name} (${ing.quantity})`,
                        recipeId: activeRecipe.id,
                        recipeTitle: activeRecipe.title
                    });
                } else if (shoppingItem.isChecked) {
                    toggleShoppingItem(shoppingItem.id);
                }
            } else {
                if (!checkedIngredients.includes(ing.name)) {
                    itemsToAdd.push({
                        name: `${ing.name} (${ing.quantity})`,
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

    const toggleStep = (idx: number) => {
        if (completedSteps.includes(idx)) {
            setCompletedSteps(prev => prev.filter(i => i !== idx));
        } else {
            setCompletedSteps(prev => [...prev, idx]);
        }
    };

    return (
        <div className="page bg-background">
            {/* Hero Image Section */}
            <div className="relative h-80 w-full overflow-hidden rounded-b-[2.5rem] shadow-md shadow-slate-100">
                <img
                    src={activeRecipe.imageUrl}
                    alt={activeRecipe.title}
                    className="w-full h-full object-cover"
                    onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'; }}
                />
                
                {/* Visual Gradient Mask */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 rounded-full bg-white/20 hover:bg-white/35 text-white backdrop-blur-md transition-all duration-200 active:scale-95"
                    >
                        <ChevronLeft size={22} strokeWidth={2.5} />
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (isLiked) {
                                    unlikeRecipe(activeRecipe.id);
                                } else {
                                    likeRecipe(activeRecipe.id);
                                }
                            }}
                            className="p-2.5 rounded-full bg-white/20 hover:bg-white/35 text-white backdrop-blur-md transition-all duration-200 active:scale-95 flex items-center justify-center"
                        >
                            <Heart 
                                size={18} 
                                strokeWidth={2.5} 
                                className={isLiked ? 'text-red-500 fill-red-500 animate-pulse' : 'text-white'} 
                            />
                        </button>
                        <button 
                            onClick={handleShare}
                            className="p-2.5 rounded-full bg-white/20 hover:bg-white/35 text-white backdrop-blur-md transition-all duration-200 active:scale-95 flex items-center justify-center"
                            title="Поделиться рецептом"
                        >
                            <Share2 size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Bottom Overlay Title Details */}
                <div className="absolute bottom-6 left-6 right-6">
                    {/* Tags in Hero */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {activeRecipe.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-sm border border-white/10">
                                {tag}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3 text-shadow-sm">
                        {activeRecipe.title}
                    </h1>

                    {/* Stats pills (US-3) */}
                    <div className="flex gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/10 text-white">
                            <Clock size={13} className="text-emerald-400" /> {activeRecipe.time} мин
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/10 text-white">
                            <ChefHat size={13} className="text-emerald-400" /> {difficulty?.label || activeRecipe.difficulty}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/10 text-white">
                            <Users size={13} className="text-emerald-400" /> {activeRecipe.servings || 2} порции
                        </span>
                    </div>
                </div>
            </div>

            <div className="container mt-8">
                {/* Ingredients Card Section */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            Ингредиенты
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                                {activeRecipe.ingredients.length} шт
                            </span>
                        </h2>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 leading-normal">
                        Отметьте ингредиенты, которые у вас есть дома. Остальные будут добавлены в список покупок:
                    </p>

                    {/* Checkbox Items List */}
                    <div className="flex flex-col gap-2.5">
                        {activeRecipe.ingredients.map((ing, idx) => {
                            const isChecked = isIngredientChecked(ing.name);
                            return (
                                <div
                                    key={idx}
                                    onClick={() => toggleIngredient(ing.name, ing.quantity)}
                                    className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                                        isChecked 
                                            ? 'bg-slate-50/50 border-slate-100 opacity-60' 
                                            : 'bg-white border-slate-100 hover:bg-green-50/20 hover:border-green-500/20 shadow-sm'
                                    }`}
                                >
                                    {/* Styled Custom Checkbox indicator */}
                                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 border-2 ${
                                        isChecked 
                                            ? 'bg-primary border-primary text-white' 
                                            : 'border-slate-200 bg-white text-transparent'
                                    }`}>
                                        <Check size={14} strokeWidth={3} />
                                    </div>

                                    {/* Ingredient Details */}
                                    <div className="flex-1 flex justify-between items-center text-sm gap-2">
                                        <span className={`font-semibold text-slate-700 ${isChecked ? 'line-through text-slate-400' : ''}`}>
                                            {getDisplayIngredientName(ing.name)}
                                            {ing.isOptional && (
                                                <span className="ml-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 inline-block whitespace-nowrap">
                                                    опционально
                                                </span>
                                            )}
                                        </span>
                                        <span className="font-bold text-slate-400 shrink-0 whitespace-nowrap text-right pl-2">{ing.quantity}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* US-3 / US-4: Premium Shopping List CTA Button */}
                    <button
                        onClick={handleAddToList}
                        disabled={isAdded}
                        className={`w-full mt-6 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all duration-300 active:scale-[0.98] ${
                            isAdded 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-500/10'
                        }`}
                    >
                        {isAdded ? (
                            <>
                                <Check size={18} strokeWidth={2.5} /> Добавлено в покупки!
                            </>
                        ) : (
                            <>
                                <Plus size={18} strokeWidth={2.5} /> Добавить недостающее в покупки
                            </>
                        )}
                    </button>
                </div>

                {/* Steps Section */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                    <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                        Приготовление
                        <Sparkles size={18} className="text-emerald-500 animate-pulse" />
                    </h2>

                    {/* Timeline with Static Steps and Interactive Timers */}
                    <div className="relative border-l-2 border-dashed border-slate-100 ml-4 pl-6 space-y-6 pb-2">
                        {activeRecipe.steps.map((step, idx) => {
                            const isTupleStep = Array.isArray(step);
                            const stepText = isTupleStep ? step[0] : step;
                            const stepDuration = isTupleStep ? step[1] : null;

                            return (
                                <div key={idx} className="relative group/step">
                                    {/* Static timeline badge */}
                                    <div 
                                        className="absolute -left-[38px] top-3 w-8 h-8 rounded-full flex-shrink-0 text-white font-black text-xs flex items-center justify-center shadow-md select-none ring-4 ring-white bg-gradient-to-tr from-slate-700 to-slate-800"
                                    >
                                        {idx + 1}
                                    </div>

                                    {/* Step details card */}
                                    <div 
                                        className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2 hover:border-emerald-500/10 hover:shadow-md transition-all duration-300"
                                    >
                                        <p className="text-slate-600 leading-relaxed text-sm font-medium">
                                            {stepText}
                                        </p>
                                        {stepDuration && (
                                            <button 
                                                onClick={() => openTimerSetup(stepDuration, stepText)}
                                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg self-start border bg-emerald-50/60 border-emerald-100/50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-200 transition-all duration-200 active:scale-95"
                                            >
                                                <Clock size={11} className="stroke-[3]" />
                                                <span>{stepDuration} мин</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Timer Setup Modal */}
            <AnimatePresence>
                {timerSetup.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                        onClick={() => setTimerSetup(prev => ({ ...prev, isOpen: false }))}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 p-6 flex flex-col items-center text-center gap-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                <Clock size={28} className="stroke-[2.5]" />
                            </div>

                            <div className="space-y-1.5 w-full">
                                <h3 className="text-lg font-black text-slate-800">Установить таймер?</h3>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">для шага</p>
                                <p className="text-sm font-medium text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-24 overflow-y-auto leading-relaxed">
                                    «{timerSetup.stepText}»
                                </p>
                            </div>

                            {/* Adjustment Controls */}
                            <div className="flex items-center justify-center gap-6 bg-slate-50/50 border border-slate-100/50 p-3 rounded-2xl w-full">
                                <button
                                    onClick={() => setTimerSetup(prev => ({ ...prev, minutes: Math.max(1, prev.minutes - 1) }))}
                                    className="w-10 h-10 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all"
                                >
                                    <Minus size={16} strokeWidth={2.5} />
                                </button>
                                
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl font-black text-slate-800 tracking-tight">{timerSetup.minutes}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">минут</span>
                                </div>

                                <button
                                    onClick={() => setTimerSetup(prev => ({ ...prev, minutes: prev.minutes + 1 }))}
                                    className="w-10 h-10 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col gap-2.5 w-full">
                                <button
                                    onClick={startTimer}
                                    className="btn-primary w-full py-3.5 text-sm font-black shadow-lg shadow-emerald-500/20"
                                >
                                    Запустить таймер
                                </button>
                                <button
                                    onClick={() => setTimerSetup(prev => ({ ...prev, isOpen: false }))}
                                    className="w-full py-3 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Отмена
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Share success toast notification */}
            <AnimatePresence>
                {showShareToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-5 py-3.5 rounded-2xl shadow-xl z-[9999] flex items-center gap-2 whitespace-nowrap"
                    >
                        <span className="text-sm">🔗</span> Ссылка скопирована в буфер обмена!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
