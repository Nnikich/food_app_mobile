import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Crown, Sparkles, Zap, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiClient } from '../utils/apiClient';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialState?: 'idle' | 'processing' | 'success';
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  rotate: number;
}

export default function SubscriptionModal({ isOpen, onClose, initialState }: SubscriptionModalProps) {
    const { activatePremium, state, isGuest, signOut } = useAppContext();
    const [selectedTier, setSelectedTier] = useState<'month' | 'year'>('year');
    const [paymentState, setPaymentState] = useState<'idle' | 'processing' | 'success'>('idle');
    const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showGuestWarning, setShowGuestWarning] = useState(false);

    const isAlreadyPremium = state?.subscription === 'premium';

    // Synchronize initial state prop
    useEffect(() => {
        if (initialState) {
            setPaymentState(initialState);
        }
    }, [initialState]);

    // Generate random confetti particles on payment success
    useEffect(() => {
        if (paymentState === 'success') {
            const particles = Array.from({ length: 60 }).map((_, i) => ({
                id: i,
                x: Math.random() * 360 - 180,
                y: Math.random() * -350 - 80,
                size: Math.random() * 8 + 5,
                color: ['#10B981', '#34D399', '#F59E0B', '#FBBF24', '#EC4899', '#3B82F6', '#8B5CF6'][Math.floor(Math.random() * 7)],
                delay: Math.random() * 0.3,
                rotate: Math.random() * 360
            }));
            setConfetti(particles);
            
            // Set subscription state in context
            activatePremium();
        }
    }, [paymentState, activatePremium]);

    if (!isOpen) return null;

    const handleSubscribe = async () => {
        if (isGuest) {
            setShowGuestWarning(true);
            return;
        }

        setPaymentState('processing');
        setError(null);

        try {
            const res = await apiClient.post('/api/payments/create-session', { tier: selectedTier });
            if (res.success && res.paymentUrl) {
                // Redirect user to the secure Robokassa acquiring page
                window.location.href = res.paymentUrl;
            } else {
                setError(res.error || 'Не удалось создать платежную сессию');
                setPaymentState('idle');
            }
        } catch (err: any) {
            console.error('Payment session creation failed:', err);
            setError(err.message || 'Ошибка подключения к платежному шлюзу');
            setPaymentState('idle');
        }
    };

    const handleClose = () => {
        setPaymentState('idle');
        setError(null);
        setShowGuestWarning(false);
        onClose();
    };

    const features = [
        { 
            icon: <Crown className="text-amber-500" size={20} />, 
            title: 'Доступ ко всем рецептам шефов', 
            shortTitle: 'Рецепты шефов',
            desc: 'Откройте эксклюзивные ресторанные блюда с подробным руководством.' 
        },
        { 
            icon: <Compass className="text-amber-500" size={20} />, 
            title: 'Полный доступ к каталогу', 
            shortTitle: 'Полный каталог',
            desc: 'Ищите любые рецепты, фильтруйте по ингредиентам и сложности без ограничений.' 
        },
        { 
            icon: <Sparkles className="text-amber-500" size={20} />, 
            title: 'Умный планировщик меню на 7 дней', 
            shortTitle: 'Меню на 7 дней',
            desc: 'Составляйте план питания на неделю вперед с авто-сборкой покупок.' 
        },
        { 
            icon: <Zap className="text-amber-500" size={20} />, 
            title: 'Умный экспорт в буфер обмена', 
            shortTitle: 'Умный экспорт',
            desc: 'В один клик отправляйте сгруппированный список ингредиентов в мессенджеры.' 
        }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ scale: 0.9, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 30, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.5 }}
                    className="bg-white border border-gray-100 rounded-[2rem] w-full max-w-md max-h-[90vh] flex flex-col overflow-y-auto scrollbar-hide shadow-2xl relative z-10 text-gray-800"
                >
                    {paymentState !== 'success' && (
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors z-20"
                        >
                            <X size={18} />
                        </button>
                    )}

                    {paymentState === 'idle' && !showGuestWarning && (
                        <div className="flex flex-col h-full">
                            {/* Glow Header Banner */}
                            <div className="p-4 sm:p-6 text-center relative bg-gradient-to-br from-amber-50/20 via-orange-50/10 to-transparent border-b border-gray-100 flex-shrink-0">
                                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                                <motion.div
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                                    className="inline-flex w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 items-center justify-center shadow-lg shadow-amber-500/10 mb-2 sm:mb-3"
                                >
                                    <Crown size={20} className="text-white sm:hidden" fill="currentColor" />
                                    <Crown size={28} className="text-white hidden sm:block" fill="currentColor" />
                                </motion.div>
                                <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 bg-clip-text text-transparent">
                                    CHOOZI Premium
                                </h3>
                                <p className="text-gray-500 text-xs sm:text-sm mt-1">Откройте все возможности шеф-повара на вашей кухне</p>
                            </div>

                            {/* Features List */}
                            <div className="p-4 sm:p-6 overflow-y-auto scrollbar-hide flex-shrink-0">
                                <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-col sm:space-y-4">
                                    {features.map((f, i) => (
                                        <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center sm:items-start text-center sm:text-left p-2.5 sm:p-0 bg-slate-50/60 sm:bg-transparent rounded-2xl border border-slate-100/70 sm:border-0 shadow-sm sm:shadow-none">
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white sm:bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 shadow-sm sm:shadow-none">
                                                <div className="scale-90 sm:scale-100">{f.icon}</div>
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] sm:text-sm font-extrabold text-gray-800 leading-tight">{f.shortTitle}</h4>
                                                <p className="hidden sm:block text-xs text-gray-500 leading-normal mt-0.5">{f.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tiers Pricing Selection */}
                            <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-3 flex-shrink-0">
                                <div className="grid grid-cols-2 gap-2.5">
                                    {/* Monthly */}
                                    <div
                                        onClick={() => setSelectedTier('month')}
                                        className={`p-3 sm:p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative ${selectedTier === 'month' ? 'border-amber-500 bg-amber-50/20 shadow-md shadow-amber-500/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                    >
                                        <div>
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block">1 Месяц</span>
                                            <span className="text-xl sm:text-2xl font-black text-gray-900 mt-1 sm:mt-2 block">119 ₽</span>
                                        </div>
                                        <span className="text-[9px] sm:text-[10px] text-gray-400 mt-1.5 sm:mt-2 block leading-tight">Продлевается ежемесячно</span>
                                    </div>

                                    {/* Yearly */}
                                    <div
                                        onClick={() => setSelectedTier('year')}
                                        className={`p-3 sm:p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${selectedTier === 'year' ? 'border-amber-500 bg-amber-50/20 shadow-md shadow-amber-500/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                    >
                                        <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg shadow-sm">
                                            Выгодно 30%
                                        </div>
                                        <div>
                                            <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block">12 Месяцев</span>
                                            <span className="text-xl sm:text-2xl font-black text-gray-900 mt-1 sm:mt-2 block">999 ₽</span>
                                        </div>
                                        <span className="text-[9px] sm:text-[10px] text-gray-400 mt-1.5 sm:mt-2 block leading-tight">83 ₽ / мес в пересчете</span>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-semibold text-center mt-1">
                                        {error}
                                    </div>
                                )}

                                {/* Checkout CTA */}
                                {isAlreadyPremium ? (
                                    <div className="w-full mt-3 sm:mt-4 p-3 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-100/50 flex flex-col items-center justify-center gap-1 shadow-sm">
                                        <span className="text-emerald-700 font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                                            <Crown size={14} className="text-amber-500 fill-amber-500" />
                                            Ваша подписка CHOOZI Premium активна!
                                        </span>
                                        <span className="text-emerald-600 text-[10px] sm:text-xs font-medium">
                                            Все привилегии и рецепты разблокированы.
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSubscribe}
                                        className="w-full mt-3 sm:mt-4 py-3 sm:py-3.5 rounded-2xl font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white text-xs sm:text-sm transition-all shadow-xl shadow-amber-500/10 hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2"
                                    >
                                        Оформить Premium
                                        <Sparkles size={14} fill="currentColor" />
                                    </button>
                                )}
                                <div className="border-t border-gray-100 mt-3 pt-3 text-[8px] sm:text-[9px] text-gray-400 text-center space-y-1 leading-normal">
                                    <p>
                                        Нажимая кнопку «Оформить Premium», вы соглашаетесь с условиями{' '}
                                        <Link to="/offer" onClick={handleClose} className="text-amber-600 font-semibold hover:underline">
                                            Публичной оферты
                                        </Link>{' '}
                                        и{' '}
                                        <Link to="/privacy" onClick={handleClose} className="text-amber-600 font-semibold hover:underline">
                                            Политики конфиденциальности
                                        </Link>
                                        , а также даете согласие на автопродление подписки.
                                    </p>
                                    <p className="font-semibold text-gray-500">
                                        Гольцев Никита Сергеевич • ИНН 235208985015
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {showGuestWarning && (
                        <div className="p-8 text-center flex flex-col items-center justify-center min-h-[350px]">
                            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-6 text-amber-500 shadow-lg shadow-amber-500/5">
                                <Crown size={32} className="fill-current animate-pulse" />
                            </div>
                            <h4 className="text-xl font-black text-gray-900">Регистрация обязательна</h4>
                            <p className="text-gray-500 text-sm mt-3 max-w-sm leading-relaxed">
                                Для оформления <span className="font-extrabold text-amber-600">CHOOZI Premium</span> необходимо зарегистрировать аккаунт. Это защитит вашу покупку и позволит использовать подписку на любых устройствах.
                            </p>
                            
                            <div className="w-full mt-8 space-y-3">
                                <button
                                    onClick={async () => {
                                        await signOut();
                                        window.location.href = '/auth';
                                    }}
                                    className="w-full py-3.5 rounded-2xl font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white text-sm transition-all shadow-xl shadow-amber-500/10 hover:opacity-95 active:scale-95"
                                >
                                    Создать аккаунт
                                </button>
                                <button
                                    onClick={() => setShowGuestWarning(false)}
                                    className="w-full py-3.5 rounded-2xl font-bold bg-gray-50 hover:bg-gray-100 border border-gray-100 text-gray-500 hover:text-gray-700 text-sm transition-all active:scale-95"
                                >
                                    Назад к тарифам
                                </button>
                            </div>
                        </div>
                    )}

                    {paymentState === 'processing' && (
                        <div className="p-10 flex flex-col items-center justify-center min-h-[350px]">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin" />
                                <Crown size={32} className="absolute inset-0 m-auto text-amber-500 animate-pulse" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Обработка платежа...</h4>
                            <p className="text-sm text-gray-500 text-center mt-2 max-w-xs leading-relaxed">
                                Запуск защищенного соединения 3D Secure. Пожалуйста, не закрывайте окно.
                            </p>
                        </div>
                    )}

                    {paymentState === 'success' && (
                        <div className="p-10 flex flex-col items-center justify-center min-h-[380px] text-center relative overflow-hidden">
                            {/* Simulated Confetti Particles */}
                            {confetti.map(p => (
                                <motion.div
                                    key={p.id}
                                    className="absolute rounded-full"
                                    style={{
                                        left: '50%',
                                        top: '60%',
                                        width: p.size,
                                        height: p.size,
                                        backgroundColor: p.color,
                                    }}
                                    animate={{
                                        x: p.x,
                                        y: p.y,
                                        scale: [0, 1.2, 1, 0.6, 0],
                                        opacity: [0, 1, 1, 0.8, 0],
                                        rotate: [0, p.rotate]
                                    }}
                                    transition={{
                                        duration: Math.random() * 1.2 + 1.0,
                                        delay: p.delay,
                                        ease: 'easeOut'
                                    }}
                                />
                            ))}

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ type: 'spring', damping: 15 }}
                                className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 text-primary shadow-lg shadow-emerald-500/5"
                            >
                                <Check size={40} className="stroke-[3]" />
                            </motion.div>

                            <motion.h4
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"
                            >
                                Покупка успешна! 🎉
                            </motion.h4>
                            
                            <motion.p
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-gray-600 text-sm mt-3 max-w-sm leading-relaxed font-medium"
                            >
                                Добро пожаловать в <span className="font-black text-emerald-600">CHOOZI Premium</span>! Ваши новые привилегии уже активны и синхронизированы в облаке.
                            </motion.p>

                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                onClick={handleClose}
                                className="mt-8 px-8 py-3 rounded-2xl font-bold bg-primary hover:bg-green-600 text-white text-sm shadow-xl shadow-green-500/10 transition-all active:scale-95"
                            >
                                Отлично, поехали!
                            </motion.button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
