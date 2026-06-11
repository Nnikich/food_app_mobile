import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ChefHat, Sparkles, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function AuthScreen() {
    const { signIn, signUp, verifyEmail, resendVerification, setGuestMode } = useAppContext();
    const navigate = useNavigate();

    const [isLoginTab, setIsLoginTab] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // States for verification flow
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    // States for status
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Resend code timer countdown
    React.useEffect(() => {
        if (resendTimer > 0) {
            const interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [resendTimer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanEmail = email.trim();
        
        if (!cleanEmail || !password || (!isLoginTab && !confirmPassword)) {
            setError('Пожалуйста, заполните все поля');
            return;
        }
        
        // Валидация email на клиенте (избегаем багов браузера)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            setError('Пожалуйста, введите корректный email адрес');
            return;
        }

        if (password.length < 6) {
            setError('Пароль должен быть не менее 6 символов');
            return;
        }

        if (!isLoginTab && password !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        setError(null);
        setSuccessMsg(null);
        setLoading(true);

        try {
            if (isLoginTab) {
                // Login Flow
                const res = await signIn(cleanEmail, password);
                if (!res.success) {
                    if (res.error === 'EMAIL_UNVERIFIED' && res.email) {
                        setVerificationEmail(res.email);
                        setIsVerifying(true);
                        setError(null);
                        setSuccessMsg('Ваша почта еще не подтверждена. Мы отправили вам свежий код подтверждения.');
                        
                        // Automatically resend code to trigger fresh delivery
                        resendVerification(res.email);
                        setResendTimer(60);
                    } else {
                        setError(res.error || 'Неверный email или пароль');
                    }
                } else {
                    navigate('/');
                }
            } else {
                // Signup Flow
                const res = await signUp(cleanEmail, password, confirmPassword);
                if (!res.success) {
                    setError(res.error || 'Ошибка при регистрации');
                } else {
                    if (res.requiresVerification && res.email) {
                        setVerificationEmail(res.email);
                        setIsVerifying(true);
                        setError(null);
                        setSuccessMsg('Регистрация прошла успешно! Код подтверждения отправлен на вашу почту.');
                        setResendTimer(60);
                    } else {
                        navigate('/');
                    }
                }
            }
        } catch (err) {
            setError('Что-то пошло не так. Пожалуйста, попробуйте снова.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = verificationCode.trim();
        if (!code || code.length !== 6) {
            setError('Пожалуйста, введите корректный 6-значный код');
            return;
        }

        setError(null);
        setSuccessMsg(null);
        setLoading(true);

        try {
            const res = await verifyEmail(verificationEmail, code);
            if (!res.success) {
                setError(res.error || 'Неверный код подтверждения');
            } else {
                setSuccessMsg('Почта успешно подтверждена! Добро пожаловать!');
                setTimeout(() => {
                    navigate('/onboarding');
                }, 1200);
            }
        } catch (err) {
            setError('Ошибка верификации. Попробуйте еще раз.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendTimer > 0) return;
        setError(null);
        setSuccessMsg(null);
        try {
            const res = await resendVerification(verificationEmail);
            if (res.success) {
                setSuccessMsg('Код успешно отправлен повторно!');
                setResendTimer(60);
            } else {
                setError(res.error || 'Не удалось отправить код повторно');
            }
        } catch (err) {
            setError('Ошибка повторной отправки кода');
        }
    };

    const handleGuestBypass = () => {
        setGuestMode();
        navigate('/onboarding');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-green-200/20 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-100/30 rounded-full blur-3xl -z-10 animate-pulse delay-75" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', duration: 0.8 }}
                        className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-600 items-center justify-center shadow-lg shadow-green-500/10 mb-4"
                    >
                        <ChefHat size={32} className="text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-2">
                        CHOOZI <Sparkles size={20} className="text-primary animate-bounce" />
                    </h1>
                    <p className="text-gray-550 mt-2 text-sm">Ваш умный гид в мире быстрых и вкусных решений</p>
                </div>

                {/* Main Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xl"
                >
                    {/* Messages Banners */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-red-50 border border-red-100 text-red-750 p-3 rounded-xl flex items-start gap-2 text-xs mb-4"
                            >
                                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                        {successMsg && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-green-50 border border-green-100 text-green-800 p-3 rounded-xl flex items-start gap-2 text-xs mb-4"
                            >
                                <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                                <span>{successMsg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isVerifying ? (
                        <motion.div
                            key="verificationForm"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-2">
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Подтверждение почты</h2>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                    Код отправлен на <strong className="text-slate-700 font-bold">{verificationEmail}</strong>.<br />
                                    Введите 6-значный код для активации аккаунта.
                                </p>
                            </div>

                            <form onSubmit={handleVerifySubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                                        Код подтверждения
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        required
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        placeholder="000000"
                                        className="w-full text-center tracking-[0.7em] text-2xl font-black py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-300"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl font-bold bg-primary hover:bg-green-600 text-white text-sm transition-all shadow-lg shadow-green-500/10 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-4"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Подтвердить и войти</span>
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="space-y-3 pt-3 text-center border-t border-slate-100">
                                <button
                                    type="button"
                                    disabled={resendTimer > 0}
                                    onClick={handleResendCode}
                                    className="text-xs font-bold text-primary disabled:text-gray-400 hover:underline transition-all block w-full text-center"
                                >
                                    {resendTimer > 0 
                                        ? `Отправить повторно через ${resendTimer} с` 
                                        : 'Отправить код повторно'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsVerifying(false);
                                        setError(null);
                                        setSuccessMsg(null);
                                        setVerificationCode('');
                                    }}
                                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors block w-full text-center mt-2"
                                >
                                    Назад к форме входа
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="authTabs"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Tab Selector */}
                            <div className="flex bg-gray-50 p-1 rounded-xl mb-6 relative border border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => { setIsLoginTab(true); setError(null); setSuccessMsg(null); setConfirmPassword(''); }}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10 ${isLoginTab ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {isLoginTab && (
                                        <motion.div
                                            layoutId="activeTabGlow"
                                            className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-sm"
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    Вход
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsLoginTab(false); setError(null); setSuccessMsg(null); setConfirmPassword(''); }}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10 ${!isLoginTab ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {!isLoginTab && (
                                        <motion.div
                                            layoutId="activeTabGlow"
                                            className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-sm"
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    Регистрация
                                </button>
                            </div>

                            {/* Auth Form */}
                            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        Email адрес
                                    </label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type="email"
                                            required
                                            placeholder="your-name@example.com"
                                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-300"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        Пароль
                                    </label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        <input
                                            type="password"
                                            required
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-300"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {!isLoginTab && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                Подтвердите пароль
                                            </label>
                                            <div className="relative">
                                                <Lock size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
                                                <input
                                                    type="password"
                                                    required
                                                    placeholder="••••••••"
                                                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-300"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl font-bold bg-primary hover:bg-green-600 text-white text-sm transition-all shadow-lg shadow-green-500/10 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-6"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {isLoginTab ? 'Войти в аккаунт' : 'Создать аккаунт'}
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </motion.div>

                {/* Continue as Guest */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-center mt-6"
                >
                    <button
                        onClick={handleGuestBypass}
                        className="w-full py-3.5 rounded-xl font-bold bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100/80 text-emerald-800 text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center"
                    >
                        <span className="underline">Войти без регистрации (как гость)</span>
                    </button>
                </motion.div>

                {/* Legal Info Footnote for Acquiring Review */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    transition={{ delay: 0.4 }}
                    className="text-center mt-8 text-[10px] text-slate-400 space-y-2 leading-relaxed"
                >
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 font-bold text-slate-500">
                        <Link to="/offer" className="hover:underline hover:text-primary transition-colors">
                            📄 Публичная оферта
                        </Link>
                        <span className="text-slate-300">•</span>
                        <Link to="/privacy" className="hover:underline hover:text-primary transition-colors">
                            📄 Политика конфиденциальности
                        </Link>
                    </div>
                    <p className="text-slate-400">
                        CHOOZI Premium кулинарный сервис.<br />
                        Самозанятый Гольцев Никита Сергеевич • ИНН 235208985015
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
