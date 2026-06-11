import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import RecipeCard from '../components/RecipeCard';
import { DIFFICULTY_LEVELS } from '../data/constants';
import SubscriptionModal from '../components/SubscriptionModal';
import { Recipe } from '../types';
import { areIngredientsCompatible } from '../utils/ingredientNormalizer';

import PaywallView from '../components/PaywallView';

const ThreeDotsLoader = () => {
    return (
        <div className="flex justify-center items-center gap-1.5 py-8" aria-label="Загрузка">
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }} />
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }} />
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" />
        </div>
    );
};

export default function CatalogScreen() {
    const { recipes, state } = useAppContext();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
    const [isSubOpen, setIsSubOpen] = useState(false);

    // Infinite Scroll Pagination States
    const [visibleLimit, setVisibleLimit] = useState(15);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    if (state.subscription !== 'premium') {
        return (
            <>
                <PaywallView
                    title="Каталог рецептов закрыт"
                    subtitle="Доступ к полной базе из 100+ эксклюзивных рецептов доступен только владельцам Premium подписки"
                    onSubscribe={() => setIsSubOpen(true)}
                />
                <SubscriptionModal
                    isOpen={isSubOpen}
                    onClose={() => setIsSubOpen(false)}
                />
            </>
        );
    }

    const filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = !search.trim() ? true : (
            recipe.title.toLowerCase().includes(search.toLowerCase()) ||
            recipe.ingredients.some(i => areIngredientsCompatible(i.name, search))
        );

        const matchesDifficulty = filterDifficulty === 'all' || recipe.difficulty === filterDifficulty;

        return matchesSearch && matchesDifficulty;
    });

    // Reset visible limit on search or filter change
    useEffect(() => {
        setVisibleLimit(15);
        setIsLoadingMore(false);
    }, [search, filterDifficulty]);

    // Handle trigger for loading more items (memoized)
    const loadMore = useCallback(() => {
        if (isLoadingMore || visibleLimit >= filteredRecipes.length) return;

        setIsLoadingMore(true);
        setTimeout(() => {
            setVisibleLimit(prev => prev + 15);
            setIsLoadingMore(false);
        }, 800); // 800ms of beautiful animated loading feedback
    }, [isLoadingMore, visibleLimit, filteredRecipes.length]);

    // Attach native bulletproof scroll listener
    useEffect(() => {
        const handleScroll = () => {
            if (isLoadingMore || visibleLimit >= filteredRecipes.length) return;

            const threshold = 150; // Trigger 150px before reaching the bottom
            const windowHeight = window.innerHeight;
            const docHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY || document.documentElement.scrollTop;

            if (docHeight - (scrollTop + windowHeight) < threshold) {
                loadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadMore, isLoadingMore, visibleLimit, filteredRecipes.length]);

    const handleRecipeClick = (recipe: Recipe) => {
        if (recipe.tags?.includes('premium') && state.subscription === 'free') {
            setIsSubOpen(true);
        } else {
            navigate(`/recipe/${recipe.id}`);
        }
    };

    return (
        <div className="page">
            <div className="container pt-10">
                <h1 className="text-3xl font-extrabold">Каталог</h1>

                {/* Search & Filters */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-xl pt-4 pb-2.5 z-20 -mx-4 px-4 mb-3 border-b border-gray-100">
                    <div className="search-wrapper">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Найти рецепт или ингредиент..."
                            className="search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setFilterDifficulty('all')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterDifficulty === 'all' ? 'bg-primary border-primary text-white' : 'bg-transparent border-gray-200 text-gray-500'}`}
                        >
                            Все
                        </button>
                        {DIFFICULTY_LEVELS.map(level => (
                            <button
                                key={level.id}
                                onClick={() => setFilterDifficulty(level.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterDifficulty === level.id ? 'bg-primary border-primary text-white' : 'bg-transparent border-gray-200 text-gray-500'}`}
                            >
                                {level.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRecipes.length > 0 ? (
                        filteredRecipes.slice(0, visibleLimit).map(recipe => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                onClick={() => handleRecipeClick(recipe)}
                                hidePremiumText={true}
                                subscription={state.subscription}
                            />
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            Ничего не найдено 😔
                        </div>
                    )}
                </div>

                {/* Loader */}
                {filteredRecipes.length > visibleLimit && (
                    <div className="w-full h-16 flex justify-center items-center mt-4">
                        {isLoadingMore && <ThreeDotsLoader />}
                    </div>
                )}
            </div>

            {/* Premium Subscription Modal */}
            <SubscriptionModal
                isOpen={isSubOpen}
                onClose={() => setIsSubOpen(false)}
            />
        </div>
    );
}
