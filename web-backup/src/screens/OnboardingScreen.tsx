import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { TECHNIQUES, PREFERENCE_TAGS, DISLIKE_TAGS, DIFFICULTY_LEVELS } from '../data/constants';
import SubscriptionModal from '../components/SubscriptionModal';
import {
    ChevronLeft,
    Check,
    Flame,
    Waves,
    Microwave,
    Wind,
    CookingPot,
    ChefHat,
    Beef,
    Utensils,
    Leaf,
    Soup,
    UtensilsCrossed,
    Croissant,
    Salad,
    FishOff,
    NutOff,
    WheatOff,
    MilkOff,
    CandyOff,
    EggOff,
    Clock,
    Lock,
    EggFried,
    LucideIcon
} from 'lucide-react';
import { Difficulty } from '../types';

// Icon mapping
const IconMap: Record<string, LucideIcon> = {
    Flame, Waves, Microwave, Wind, CookingPot, ChefHat, Beef, Utensils,
    Leaf, Soup, UtensilsCrossed, Croissant, Salad,
    FishOff, NutOff, WheatOff, MilkOff, CandyOff, EggOff,
    Clock, EggFried
};

const RenderIcon = ({ name, size = 24, className }: { name: string; size?: number; className?: string }) => {
    const Icon = IconMap[name] || ChefHat;
    return <Icon size={size} className={className} />;
};

export default function OnboardingScreen() {
    const { updatePreferences, completeOnboarding, state } = useAppContext();
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [isSubOpen, setIsSubOpen] = useState(false);
    const [formData, setFormData] = useState({
        technique: state.preferences?.technique || [],
        tags: state.preferences?.tags || [],
        dislikedTags: state.preferences?.dislikedTags || [],
        difficulty: state.preferences?.difficulty || ['medium'] as Difficulty[],
    });

    const totalSteps = 3;

    const handleNext = () => {
        if (step === 2 && formData.difficulty.length === 0) {
            alert('Пожалуйста, выберите хотя бы один уровень сложности.');
            return;
        }
        if (step < totalSteps - 1) {
            setStep(step + 1);
        } else {
            updatePreferences(formData);
            completeOnboarding();
            navigate('/');
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const toggleSelection = (field: 'technique' | 'tags' | 'dislikedTags' | 'difficulty', value: any) => {
        setFormData(prev => {
            const current = prev[field] as any[];
            const isSelected = current.includes(value);
            return {
                ...prev,
                [field]: isSelected
                    ? current.filter(item => item !== value)
                    : [...current, value]
            };
        });
    };

    const ProgressBar = () => (
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden mx-4">
            <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
        </div>
    );

    const Step1_Appliance = () => (
        <div className="grid grid-cols-2 gap-4 pt-1">
            {TECHNIQUES.map(item => {
                const isSelected = formData.technique.includes(item.id);
                return (
                    <div
                        key={item.id}
                        onClick={() => toggleSelection('technique', item.id)}
                        className={`checkbox-card ${isSelected ? 'selected' : ''}`}
                    >
                        <div className={`p-3 rounded-full ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <RenderIcon name={item.icon} size={28} />
                        </div>
                        <span className="font-semibold text-sm text-center">{item.label}</span>

                        {isSelected && (
                            <div className="check-icon">
                                <Check size={14} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    const Step2_Tastes = () => (
        <div className="space-y-8 pt-1">
            {/* Positive Tags */}
            <div className="space-y-4">
                <h2 className="text-sm font-bold text-gray-455 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-red-500">❤️</span> Что вы любите?
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {PREFERENCE_TAGS.map(tag => {
                        const isSelected = formData.tags.includes(tag.id);
                        return (
                            <div
                                key={tag.id}
                                onClick={() => toggleSelection('tags', tag.id)}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all gap-2
                                    ${isSelected
                                        ? 'border-primary bg-secondary text-primary'
                                        : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                            >
                                <RenderIcon name={tag.icon} size={24} />
                                <span className="font-medium text-sm">{tag.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Negative Tags */}
            <div className="space-y-4">
                <h2 className="text-sm font-bold text-gray-455 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-gray-400">🚫</span> Есть исключения?
                </h2>
                <div className="flex flex-wrap gap-2">
                    {DISLIKE_TAGS.map(tag => {
                        const isSelected = formData.dislikedTags.includes(tag.excludes);
                        return (
                            <button
                                key={tag.id}
                                onClick={() => toggleSelection('dislikedTags', tag.excludes)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border border-gray-100 text-sm font-medium transition-all
                                    ${isSelected
                                        ? 'bg-red-50 border-red-200 text-red-500'
                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                <RenderIcon name={tag.icon} size={16} />
                                {tag.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const Step3_Difficulty = () => {
        const isPremiumActive = state.subscription === 'premium';

        return (
            <div className="flex flex-col gap-4 pt-1">
                {DIFFICULTY_LEVELS.map(level => {
                    const isSelected = formData.difficulty.includes(level.id as Difficulty);
                    const isDisabled = level.isPremium && !isPremiumActive;

                    return (
                        <div
                            key={level.id}
                            onClick={() => {
                                if (isDisabled) {
                                    setIsSubOpen(true);
                                } else {
                                    toggleSelection('difficulty', level.id as Difficulty);
                                }
                            }}
                            className={`relative flex items-start p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white
                                ${isSelected
                                    ? 'border-primary bg-secondary/30'
                                    : 'border-gray-100 hover:border-gray-200'}
                                ${isDisabled ? 'opacity-60 border-dashed cursor-not-allowed hover:border-amber-200' : ''}
                            `}
                        >
                            {/* Premium Badge */}
                            {level.isPremium && (
                                <div className={`absolute -top-3 right-4 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm z-10 ${isPremiumActive ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}>
                                    <Lock size={10} />
                                    {isPremiumActive ? 'АКТИВЕН' : 'PREMIUM'}
                                </div>
                            )}

                            {/* Icon Box */}
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 mr-4
                                ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}
                            `}>
                                <RenderIcon name={level.icon} size={24} />
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="font-bold text-gray-900">{level.label}</h3>
                                    {level.time && (
                                        <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded">
                                            {level.time}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    {level.description}
                                </p>
                            </div>

                            {/* Selection Checkbox */}
                            <div className={`w-6 h-6 rounded border-2 ml-4 flex items-center justify-center shrink-0 transition-colors
                                ${isSelected ? 'bg-primary border-primary' : 'border-gray-200 bg-white'}
                            `}>
                                {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="page flex flex-col h-[100dvh] bg-background overflow-hidden relative">
            {/* Unified Fixed Header */}
            <div className="bg-background border-b border-slate-100/80 z-20">
                <header className="px-6 pt-6 pb-3 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className={`p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors ${step === 0 ? 'invisible' : ''}`}
                    >
                        <ChevronLeft size={24} className="text-slate-700" />
                    </button>

                    <ProgressBar />

                    {step < totalSteps - 1 ? (
                        <button
                            onClick={() => {
                                setStep(step + 1);
                            }}
                            className="text-xs font-extrabold text-slate-400 hover:text-slate-600 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-50"
                        >
                            Пропустить
                        </button>
                    ) : (
                        <div className="w-[80px]" />
                    )}
                </header>

                {/* Animated Step Title and Description */}
                <div className="px-6 pb-4 text-center md:text-left">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.15 }}
                        >
                            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                                {step === 0 && 'Техника на кухне'}
                                {step === 1 && 'Вкусы и ограничения'}
                                {step === 2 && 'Ваш уровень готовки'}
                            </h1>
                            <p className="mt-1.5 text-slate-500 text-sm leading-relaxed">
                                {step === 0 && 'Отметьте, что у вас есть, чтобы мы подобрали подходящие рецепты.'}
                                {step === 1 && 'Помогите нам составить идеальное меню под ваши предпочтения.'}
                                {step === 2 && 'Выберите одну или несколько категорий сложности, которые подходят вашему ритму жизни.'}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Content (Scrollable Choices) */}
            <main className="flex-1 overflow-y-auto px-6 py-5 pb-36 scrollbar-hide">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -15 }}
                        transition={{ duration: 0.2 }}
                    >
                        {step === 0 && <Step1_Appliance />}
                        {step === 1 && <Step2_Tastes />}
                        {step === 2 && <Step3_Difficulty />}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-slate-100 z-20 pb-safe">
                <div className="container">
                    <button
                        onClick={handleNext}
                        className="btn-primary w-full py-4 text-lg shadow-lg shadow-green-500/20"
                    >
                        {step === 2 ? 'Завершить настройку' : 'Далее'}
                    </button>
                </div>
            </div>

            {/* Premium Subscription Modal */}
            <SubscriptionModal
                isOpen={isSubOpen}
                onClose={() => setIsSubOpen(false)}
            />
        </div>
    );
}
