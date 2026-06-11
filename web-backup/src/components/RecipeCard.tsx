import { motion } from 'framer-motion';
import { Clock, ChefHat, Crown } from 'lucide-react';
import { DIFFICULTY_LEVELS } from '../data/constants';
import { Recipe, Ingredient } from '../types';
import { getDisplayIngredientName } from '../utils/ingredientNormalizer';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
  missingIngredients?: Ingredient[];
  hidePremiumText?: boolean;
  subscription?: 'free' | 'premium';
}

export default function RecipeCard({
  recipe,
  onClick,
  missingIngredients,
  hidePremiumText = false,
  subscription = 'free',
}: RecipeCardProps) {
    const difficulty = DIFFICULTY_LEVELS.find(d => d.id === recipe.difficulty);
    const isPremium = recipe.tags?.includes('premium');
    const hasPremiumSub = subscription === 'premium';

    return (
        <motion.div
            className="group relative bg-white border border-slate-100 rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 hover:border-green-500/20"
            onClick={onClick}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            {/* Image Wrapper with Scale Effect */}
            <div className="relative h-56 w-full overflow-hidden">
                <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                    onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'; }}
                />
                
                {/* Elegant Dark/Blur Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

                {/* Floating Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border shadow-sm ${
                        recipe.difficulty === 'easy' 
                            ? 'bg-emerald-500/80 text-white border-emerald-400/20' 
                            : recipe.difficulty === 'hard'
                                ? 'bg-rose-750/85 bg-rose-700/85 text-white border-rose-400/20 shadow-rose-950/10'
                                : 'bg-amber-500/80 text-white border-amber-400/20'
                    }`}>
                        {difficulty?.label}
                    </span>

                    {isPremium && (
                        hidePremiumText ? (
                            // Circle Crown Badge (for Catalog Screen)
                            <span className={`w-8 h-8 rounded-full border shadow-lg flex items-center justify-center transition-all ${
                                hasPremiumSub
                                    ? 'bg-primary text-white border-green-400/20'
                                    : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-amber-300/30 animate-pulse'
                            }`}>
                                <Crown size={14} fill="currentColor" />
                            </span>
                        ) : (
                            // Full Text Badge (for Swipe Screen)
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border shadow-lg transition-all ${
                                hasPremiumSub
                                    ? 'bg-primary text-white border-green-400/20'
                                    : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 border-amber-300/30 animate-pulse'
                            }`}>
                                <Crown size={12} fill="currentColor" /> Premium
                            </span>
                        )
                    )}
                </div>

                {/* Bottom Left Fast Tag */}
                <div className="absolute bottom-4 left-4 z-10 flex gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-800 shadow-sm backdrop-blur-sm">
                        <Clock size={10} className="text-emerald-500" /> {recipe.time} мин
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-800 shadow-sm backdrop-blur-sm">
                        <ChefHat size={10} className="text-emerald-500" /> {recipe.ingredients.length} ингр.
                    </span>
                </div>
            </div>

            {/* Content Details */}
            <div className="p-5 flex flex-col justify-between">
                <div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {recipe.tags.slice(0, 3).filter(t => t !== 'premium').map(tag => (
                            <span 
                                key={tag} 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-100/50 uppercase tracking-wider"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-extrabold text-slate-800 leading-snug line-clamp-2 min-h-[3rem] group-hover:text-primary transition-colors duration-300">
                        {recipe.title}
                    </h3>
                </div>

                {/* Missing Ingredients Warning Banner (US-2) */}
                {missingIngredients && missingIngredients.length > 0 && (
                    <div className="mt-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-100/50 text-[11px] text-amber-800 font-bold flex flex-col gap-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 text-amber-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Нужно докупить ({missingIngredients.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {missingIngredients.map((item) => (
                                <span key={item.name} className="bg-amber-100/70 px-2 py-0.5 rounded-lg text-amber-900 font-extrabold text-[10px]">
                                    {getDisplayIngredientName(item.name)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
