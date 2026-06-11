import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Sparkles, X, Gauge, Filter, Plus, Trash2, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { filterRecipes, getRandomRecipe, getMissingIngredients } from '../utils/filterRecipes';
import RecipeCard from '../components/RecipeCard';
import SubscriptionModal from '../components/SubscriptionModal';
import { Recipe } from '../types';
import { getDisplayIngredientName } from '../utils/ingredientNormalizer';

export default function HomeScreen() {
    const { 
        state, 
        setDifficulty, 
        recipes, 
        resetOnboarding, 
        setIngredientsFilter, 
        resetIngredientsFilter
    } = useAppContext();
    const navigate = useNavigate();
    
    const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [noRecipesFound, setNoRecipesFound] = useState(false);
    const [isSubOpen, setIsSubOpen] = useState(false);

    // US-1: Session disliked recipe history
    const [dislikedRecipeIds, setDislikedRecipeIds] = useState<string[]>([]);

    // US-2: Ingredients filter UI panel states
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [tempFilter, setTempFilter] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');


    // All unique ingredients in database for autocompletion, cleaned up elegantly
    const allUniqueIngredients = Array.from(new Set(
        recipes.flatMap(r => r.ingredients.map(i => getDisplayIngredientName(i.name)))
    ))
        .filter(Boolean)
        .sort();

    // Matching autocompletion suggestions
    const suggestions = inputValue.trim()
        ? allUniqueIngredients.filter(ing => 
            ing.toLowerCase().includes(inputValue.toLowerCase()) && 
            !tempFilter.some(added => getDisplayIngredientName(added).toLowerCase() === ing.toLowerCase())
          ).slice(0, 5)
        : [];

    const findNewRecipe = (excludeCurrent = true) => {
        setIsAnimating(true);

        setTimeout(() => {
            // Apply preferences AND active ingredients filters (US-2)
            let filtered = filterRecipes(recipes, state.preferences, state.ingredientsFilter);
            
            // Exclude already swiped-left recipes in this session (US-1)
            filtered = filtered.filter(r => !dislikedRecipeIds.includes(r.id));

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
        }, 400);
    };

    // Trigger recipe find when preferences, recipes, swipes, or active ingredient filter changes
    useEffect(() => {
        findNewRecipe(false);
    }, [state.preferences, state.ingredientsFilter, recipes, dislikedRecipeIds]);

    const handleSwipeLeft = () => {
        if (currentRecipe) {
            setDislikedRecipeIds(prev => [...prev, currentRecipe.id]);
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
            setIsSubOpen(true);
        } else if (currentRecipe) {
            navigate(`/recipe/${currentRecipe.id}`);
        }
    };

    // US-2: Add ingredient to temp list
    const handleAddIngredient = (name: string) => {
        const cleanName = name.trim();
        if (cleanName && !tempFilter.some(added => added.toLowerCase() === cleanName.toLowerCase())) {
            setTempFilter(prev => [...prev, cleanName]);
            setInputValue('');
        }
    };

    // US-2: Apply ingredients filter
    const handleApplyFilter = () => {
        setIngredientsFilter(tempFilter);
        setDislikedRecipeIds([]); // Reset session history when applying new product list
        setIsFilterOpen(false);
    };

    // US-2: Reset ingredients filter
    const handleResetFilter = () => {
        resetIngredientsFilter();
        setTempFilter([]);
        setDislikedRecipeIds([]);
        setIsFilterOpen(false);
    };

    // Calculate missing ingredients for the active recipe (US-2)
    const missingIngredients = currentRecipe 
        ? getMissingIngredients(currentRecipe, state.ingredientsFilter) 
        : [];

    return (
        <div className="page bg-background">
            <div className="container pt-10">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Привет! 👋</h1>
                        <p className="text-xs text-slate-400 font-medium">Готов выбрать идеальный ужин?</p>
                    </div>

                    {/* Filter & Counter Container */}
                    <div className="flex items-center gap-2">
                        {/* US-2 Filter Button */}
                        <button
                            onClick={() => {
                                setTempFilter(state.ingredientsFilter || []);
                                setInputValue('');
                                setIsFilterOpen(true);
                            }}
                            className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all relative ${
                                state.ingredientsFilter && state.ingredientsFilter.length > 0
                                    ? 'bg-primary border-primary text-white shadow-md shadow-green-500/10'
                                    : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <Filter size={13} />
                            <span>Продукты</span>
                            {state.ingredientsFilter && state.ingredientsFilter.length > 0 && (
                                <span className="w-4 h-4 rounded-full bg-white text-primary font-black text-[9px] flex items-center justify-center flex-shrink-0 animate-pulse">
                                    {state.ingredientsFilter.length}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                <main className="flex flex-col items-center justify-center min-h-[60vh] relative">
                    <AnimatePresence mode="wait">
                        {isAnimating ? (
                            <motion.div
                                key="loader"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="absolute inset-0 flex items-center justify-center"
                            >
                                <div className="w-24 h-24 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin" />
                            </motion.div>
                        ) : noRecipesFound ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center p-8 bg-white border border-slate-100 rounded-3xl max-w-sm shadow-sm"
                            >
                                <div className="text-4xl mb-4">🤔</div>
                                <h3 className="text-xl font-extrabold text-slate-800 mb-2">Рецепты закончились</h3>
                                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                                    Под ваши фильтры не подходит ни один рецепт. Попробуйте сбросить историю и активные фильтры продуктов.
                                </p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => {
                                            setDislikedRecipeIds([]);
                                            resetIngredientsFilter();
                                        }}
                                        className="w-full py-3 rounded-xl font-extrabold bg-primary hover:bg-green-600 text-white text-xs shadow-md transition-all active:scale-95"
                                    >
                                        Сбросить фильтры
                                    </button>
                                    <button
                                        onClick={() => {
                                            resetOnboarding();
                                            navigate('/onboarding');
                                        }}
                                        className="w-full py-3 rounded-xl font-extrabold bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 text-xs transition-all active:scale-95"
                                    >
                                        Изменить предпочтения
                                    </button>
                                </div>
                            </motion.div>
                        ) : currentRecipe ? (
                            <SwipeableCardWrapper
                                key={currentRecipe.id}
                                recipe={currentRecipe}
                                onSwipeLeft={handleSwipeLeft}
                                onSwipeRight={handleSelectRecipe}
                                onTooHard={handleTooHard}
                                missingIngredients={missingIngredients}
                                subscription={state.subscription}
                            />
                        ) : null}
                    </AnimatePresence>
                </main>
            </div>

            {/* US-2 Ingredients Filter Slide-Up Panel Modal */}
            <AnimatePresence>
                {isFilterOpen && (
                    <>
                        {/* Dark backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFilterOpen(false)}
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
                                    Ингредиенты дома 🛒
                                </h3>
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-xs text-slate-400 mb-4 leading-normal">
                                Введите продукты, которые у вас уже есть. Лента сначала покажет те рецепты, где есть все выбранные ингредиенты, а затем варианты с частичными совпадениями.
                            </p>

                            {/* Search input with autocompletion list */}
                            <div className="relative mb-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Начните вводить, например: Курица..."
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && inputValue.trim()) {
                                                handleAddIngredient(inputValue);
                                            }
                                        }}
                                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold transition-all"
                                    />
                                    <button
                                        onClick={() => handleAddIngredient(inputValue)}
                                        disabled={!inputValue.trim()}
                                        className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                                    >
                                        <Plus size={14} /> Добавить
                                    </button>
                                </div>

                                {/* Autocompletion Suggestions Dropdown (US-2) */}
                                {suggestions.length > 0 && (
                                    <div className="absolute top-[105%] left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-50 animate-in fade-in slide-in-from-top-1 duration-100">
                                        {suggestions.map((sug, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleAddIngredient(sug)}
                                                className="px-4 py-3 hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer transition-colors flex items-center justify-between"
                                            >
                                                <span>{sug}</span>
                                                <span className="text-[9px] font-black uppercase text-primary tracking-wider bg-green-50 px-1.5 py-0.5 rounded border border-green-100/50">База</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Active ingredient pills list (US-2) */}
                            <div className="min-h-[5rem] border border-dashed border-slate-100 rounded-2xl p-4 mb-6 bg-slate-50/30 flex flex-wrap gap-2 items-start">
                                {tempFilter.length === 0 ? (
                                    <span className="text-slate-400 text-xs font-semibold py-1">Список пуст. Добавьте ингредиенты выше.</span>
                                ) : (
                                    tempFilter.map((item) => (
                                        <span
                                            key={item}
                                            className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-white border border-slate-100 text-slate-700 text-xs font-bold shadow-sm animate-in zoom-in-95 duration-150"
                                        >
                                            {item}
                                            <button
                                                onClick={() => setTempFilter(prev => prev.filter(added => added !== item))}
                                                className="p-0.5 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all"
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </span>
                                    ))
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleResetFilter}
                                    className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Сбросить
                                </button>
                                <button
                                    onClick={handleApplyFilter}
                                    className="flex-1 py-4 rounded-2xl bg-primary hover:bg-green-600 text-white font-black text-sm shadow-lg shadow-green-500/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={16} strokeWidth={2.5} /> Применить
                                </button>
                            </div>
                        </motion.div>
                    </>
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

interface SwipeableCardWrapperProps {
    recipe: Recipe;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    onTooHard: () => void;
    missingIngredients: any[];
    subscription?: 'free' | 'premium';
}

function SwipeableCardWrapper({
    recipe,
    onSwipeLeft,
    onSwipeRight,
    onTooHard,
    missingIngredients,
    subscription
}: SwipeableCardWrapperProps) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const skipOpacity = useTransform(x, [-150, -50], [1, 0]);
    const likeOpacity = useTransform(x, [50, 150], [0, 1]);

    return (
        <motion.div
            key={recipe.id}
            className="w-full max-w-sm relative z-10 cursor-grab active:cursor-grabbing"
            style={{ x, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_e, info) => {
                if (info.offset.x > 100) {
                    onSwipeRight();
                } else if (info.offset.x < -100) {
                    onSwipeLeft();
                }
            }}
            initial={{ opacity: 0, x: 100, rotate: 5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            onAnimationComplete={() => x.set(0)}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
            {/* Swipe Labels */}
            <motion.div
                style={{ opacity: skipOpacity }}
                className="absolute top-12 right-6 z-30 pointer-events-none text-8xl filter drop-shadow-xl select-none rotate-12"
            >
                💔
            </motion.div>
            <motion.div
                style={{ opacity: likeOpacity }}
                className="absolute top-12 left-6 z-30 pointer-events-none text-8xl filter drop-shadow-xl select-none -rotate-12"
            >
                ❤️
            </motion.div>

            <RecipeCard
                recipe={recipe}
                onClick={onSwipeRight}
                missingIngredients={missingIngredients}
                subscription={subscription}
            />

            <div className="flex justify-center items-center gap-6 mt-8">
                {/* Сложно Button */}
                <button
                    onClick={onTooHard}
                    className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-green-600 transition-colors"
                >
                    <div className="w-14 h-14 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-md active:scale-95 transition-all">
                        <Gauge size={22} strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-bold">Сложно</span>
                </button>

                {/* Хочу! Button */}
                <button
                    onClick={onSwipeRight}
                    className="flex flex-col items-center gap-1.5 text-primary active:scale-95 transition-all"
                >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-500 to-green-600 flex items-center justify-center shadow-xl shadow-green-200">
                        <Sparkles size={32} color="white" fill="white" />
                    </div>
                    <span className="text-xs font-black">Хочу!</span>
                </button>

                {/* Другое Button */}
                <button
                    onClick={onSwipeLeft}
                    className="flex flex-col items-center gap-1.5 text-slate-500 hover:text-red-500 transition-colors"
                >
                    <div className="w-14 h-14 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-md active:scale-95 transition-all">
                        <X size={24} strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-bold">Другое</span>
                </button>
            </div>
        </motion.div>
    );
}
