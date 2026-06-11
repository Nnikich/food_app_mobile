import { useState } from 'react';
import { X, ChevronDown, Mail, Phone, CreditCard, Shield, FileText, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LegalModal({ isOpen, onClose }: LegalModalProps) {
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? null : section);
    };

    const legalSections = [
        {
            id: 'contacts',
            title: 'Контакты и поддержка',
            icon: <Mail size={18} className="text-emerald-500" />,
            content: (
                <div className="space-y-3 text-xs text-slate-600">
                    <p>Мы всегда на связи и рады помочь вам по любым вопросам работы сервиса CHOOZI.</p>
                    <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <Mail size={16} className="text-slate-400" />
                        <div>
                            <p className="font-extrabold text-slate-700">Электронная почта</p>
                            <a href="mailto:nikita.goltseff@yandex.ru" className="text-primary hover:underline font-semibold">nikita.goltseff@yandex.ru</a>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <Phone size={16} className="text-slate-400" />
                        <div>
                            <p className="font-extrabold text-slate-700">Телефон поддержки</p>
                            <a href="tel:+79182771923" className="text-slate-700 font-semibold">+7 (918) 277-19-23</a>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">Время работы службы поддержки: ежедневно с 09:00 до 21:00 по московскому времени.</p>
                </div>
            )
        },
        {
            id: 'pricing',
            title: 'Описание услуг и тарифы',
            icon: <CreditCard size={18} className="text-emerald-500" />,
            content: (
                <div className="space-y-3 text-xs text-slate-600">
                    <p>CHOOZI — ваш умный кулинарный ассистент.</p>
                    <div className="p-4 bg-gradient-to-tr from-slate-900 via-slate-900 to-emerald-950/20 text-white rounded-2xl border border-emerald-500/10 shadow-md">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">CHOOZI Premium 👑</span>
                        <h4 className="font-black text-sm mt-2">Премиум-подписка на сервис</h4>
                        <p className="text-[11px] text-slate-400 mt-1">Доступ к эксклюзивным пошаговым рецептам шеф-поваров, умному планировщику меню на 7 дней, авто-генерации списков покупок и экспорту.</p>
                        
                        <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[11px] text-slate-300">Тариф «1 Месяц»</span>
                                <span className="font-black text-amber-400">119 ₽</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[11px] text-slate-300">Тариф «12 Месяцев» (Годовой)</span>
                                <span className="font-black text-amber-400">999 ₽ <span className="text-[9px] text-slate-400 font-normal">(83 ₽/мес)</span></span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                        Оплата производится в формате автоматического продления подписки (рекуррентные платежи). Отключить автопродление можно в любой момент в личном кабинете.
                    </p>
                </div>
            )
        },
        {
            id: 'refunds',
            title: 'Условия оплаты и возврата',
            icon: <Shield size={18} className="text-emerald-500" />,
            content: (
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                    <p className="font-extrabold text-slate-700">Безопасность платежей</p>
                    <p>Оплата услуг осуществляется с использованием банковских карт (Visa, Mastercard, МИР) через защищенный шлюз сертифицированного интернет-эквайринга ЮKassa. Все данные шифруются по стандарту PCI DSS.</p>
                    
                    <p className="font-extrabold text-slate-700">Отказ от услуг и отмена подписки</p>
                    <p>Пользователь вправе отказаться от автоматического продления подписки в любой момент в настройках профиля. Доступ к функциям Premium сохраняется до конца уже оплаченного периода.</p>
                    
                    <p className="font-extrabold text-slate-700">Порядок возврата денежных средств</p>
                    <p>Если списание произошло ошибочно или вы хотите запросить возврат за неиспользованный период, напишите на почту <a href="mailto:nikita.goltseff@yandex.ru" className="text-primary hover:underline font-semibold">nikita.goltseff@yandex.ru</a> в течение 14 дней с момента оплаты. Возврат средств производится на ту же банковскую карту, с которой была совершена оплата, в течение 5-10 рабочих дней.</p>
                </div>
            )
        },
        {
            id: 'requisites',
            title: 'Реквизиты организации',
            icon: <Landmark size={18} className="text-emerald-500" />,
            content: (
                <div className="space-y-2 text-xs text-slate-600 select-text bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
                    <p className="font-extrabold text-slate-800 mb-2">Самозанятый гражданин</p>
                    <p><span className="text-slate-400">ФИО:</span> Гольцев Никита Сергеевич</p>
                    <p><span className="text-slate-400">ИНН:</span> 235208985015</p>
                    <p><span className="text-slate-400">Адрес регистрации:</span> г. Москва</p>
                    <p><span className="text-slate-400">Электронная почта:</span> <a href="mailto:nikita.goltseff@yandex.ru" className="text-primary hover:underline">nikita.goltseff@yandex.ru</a></p>
                </div>
            )
        },
        {
            id: 'documents',
            title: 'Публичная оферта и Политика',
            icon: <FileText size={18} className="text-emerald-500" />,
            content: (
                <div className="space-y-3 text-xs text-slate-600 leading-normal">
                    <p>Нажимая кнопку «Оплатить», вы соглашаетесь с условиями официальных документов:</p>
                    <div className="flex flex-col gap-2">
                        <Link 
                            to="/offer" 
                            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between font-extrabold text-slate-700"
                        >
                            <span>📄 Публичная оферта сервиса</span>
                            <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                        </Link>
                        <Link 
                            to="/privacy" 
                            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between font-extrabold text-slate-700"
                        >
                            <span>📄 Политика конфиденциальности</span>
                            <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                        </Link>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                        Документы определяют права и обязанности сторон, порядок оказания информационно-технических услуг и обработки персональных данных.
                    </p>
                </div>
            )
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-[2000]"
                    />

                    {/* Bottom Drawer */}
                    <motion.div
                        initial={{ y: '100%', x: '-50%' }}
                        animate={{ y: 0, x: '-50%' }}
                        exit={{ y: '100%', x: '-50%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className="fixed bottom-0 left-1/2 w-full max-w-md bg-white border-t border-slate-100 rounded-t-[2.5rem] z-[2001] p-6 max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col scrollbar-hide"
                    >
                        {/* Drag Handle */}
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 flex-shrink-0" />

                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="text-xl font-black text-slate-800">
                                Правовая информация ⚖️
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 mb-6 leading-normal flex-shrink-0">
                            Юридические документы, контактные данные, реквизиты и полная информация об оплате сервиса в соответствии с законодательством РФ и требованиями платежных систем.
                        </p>

                        {/* Expandable Accordion List */}
                        <div className="flex-1 space-y-3 overflow-y-auto mb-6 pr-1">
                            {legalSections.map((section) => {
                                const isExpanded = activeSection === section.id;
                                return (
                                    <div
                                        key={section.id}
                                        className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-300"
                                    >
                                        <button
                                            onClick={() => toggleSection(section.id)}
                                            className="w-full p-4 flex items-center justify-between text-left font-extrabold text-slate-700 text-sm hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {section.icon}
                                                <span>{section.title}</span>
                                            </div>
                                            <motion.div
                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="text-slate-400"
                                            >
                                                <ChevronDown size={18} />
                                            </motion.div>
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                    className="overflow-hidden border-t border-slate-50 bg-slate-50/30"
                                                >
                                                    <div className="p-4 bg-white/50">
                                                        {section.content}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl transition-all active:scale-95 flex-shrink-0 flex items-center justify-center shadow-lg"
                        >
                            Понятно
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
