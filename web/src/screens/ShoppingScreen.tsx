import React, { useState } from 'react';
import { Trash2, CheckCircle, List, Plus, Share2, Crown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ShoppingListItem } from '../types';
import SubscriptionModal from '../components/SubscriptionModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShoppingScreen() {
    const { state, toggleShoppingItem, removeShoppingItem, clearShoppingList, addToShoppingList } = useAppContext();
    const navigate = useNavigate();
    const [manualItem, setManualItem] = useState('');
    const [isSubOpen, setIsSubOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    const handleAddManualItem = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = manualItem.trim();
        if (trimmed) {
            addToShoppingList([{
                name: trimmed,
                recipeTitle: 'Личные покупки'
            }]);
            setManualItem('');
        }
    };

    const groupedItems = state.shoppingList.reduce<Record<string, ShoppingListItem[]>>((acc, item) => {
        const key = item.recipeTitle || 'Общее';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const hasItems = state.shoppingList.length > 0;

    const handleExport = () => {
        if (state.subscription !== 'premium') {
            setIsSubOpen(true);
            return;
        }

        // Generate clean text list exactly matching requested format
        let text = 'Список покупок from Choozi:\n\n';

        Object.entries(groupedItems).forEach(([category, items]) => {
            const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
            text += `${formattedCategory}:\n`;
            items.forEach(item => {
                text += `  - ${item.name}\n`;
            });
        });

        text += '\nПриятного аппетита!';

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="page bg-background">
            <div className="container pt-10">
                <header className="flex justify-between items-start mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-foreground whitespace-nowrap">
                            Список покупок
                        </h1>
                        <p className="text-xs text-gray-400 mt-1 font-semibold">
                            {state.shoppingList.filter(i => !i.isChecked).length} товаров осталось купить
                        </p>
                    </div>
                    {hasItems && (
                        <div className="shrink-0 mt-1.5">
                            <button
                                onClick={handleExport}
                                className="text-xs text-amber-700 border border-amber-300/60 bg-amber-500/5 hover:bg-amber-500/10 px-4 py-2.5 rounded-full transition-all font-extrabold flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <Share2 size={13} className="text-amber-500 fill-amber-500/20" />
                                <span>Экспорт</span>
                                {state.subscription !== 'premium' && (
                                    <Crown size={12} className="text-amber-500 fill-amber-500" />
                                )}
                            </button>
                        </div>
                    )}
                </header>

                {/* Manual product add input field */}
                <form onSubmit={handleAddManualItem} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        placeholder="Добавить свой товар, например: Молоко..."
                        value={manualItem}
                        onChange={(e) => setManualItem(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary text-sm font-semibold transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!manualItem.trim()}
                        className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-extrabold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                    >
                        <Plus size={14} /> Добавить
                    </button>
                </form>

                {!hasItems ? (
                    <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto text-slate-400">
                            <List size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Список пуст</h3>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">Добавляйте товары вручную или из рецептов, чтобы не забыть купить продукты в магазине.</p>
                        <button onClick={() => navigate('/')} className="btn-primary py-3 px-6 max-w-xs mx-auto text-xs font-black">
                            Найти рецепт
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-6">
                            {Object.entries(groupedItems).map(([category, items]) => {
                                const recipeId = items.find(item => item.recipeId)?.recipeId;
                                return (
                                    <div key={category} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
                                        {recipeId ? (
                                            <button
                                                onClick={() => navigate(`/recipe/${recipeId}`)}
                                                className="font-extrabold text-primary mb-4 text-xs uppercase tracking-widest hover:text-green-600 transition-colors flex items-center gap-1.5 cursor-pointer text-left focus:outline-none"
                                            >
                                                <span>{category}</span>
                                                <span className="text-[9px] text-gray-400 font-bold normal-case bg-slate-50 border border-slate-100/50 rounded-md px-1.5 py-0.5 tracking-normal">
                                                    к рецепту →
                                                </span>
                                            </button>
                                        ) : (
                                            <h3 className="font-extrabold text-primary mb-4 text-xs uppercase tracking-widest">{category}</h3>
                                        )}
                                        <div className="space-y-2.5">
                                            {[...items]
                                                .sort((a, b) => (a.isChecked === b.isChecked ? 0 : a.isChecked ? 1 : -1))
                                                .map(item => (
                                                    <div
                                                        key={item.id}
                                                        className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all border ${item.isChecked
                                                                ? 'bg-slate-50/50 border-slate-100/50 opacity-50'
                                                                : 'bg-white border-slate-100 hover:bg-slate-50/30'
                                                            }`}
                                                    >
                                                        <div
                                                            onClick={() => toggleShoppingItem(item.id)}
                                                            className={`w-5.5 h-5.5 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all ${item.isChecked
                                                                    ? 'bg-primary border-primary text-white'
                                                                    : 'border-slate-200 bg-white text-transparent'
                                                                }`}
                                                        >
                                                            <CheckCircle size={14} className="text-white" />
                                                        </div>

                                                        <span
                                                            onClick={() => toggleShoppingItem(item.id)}
                                                            className={`flex-1 cursor-pointer select-none text-sm font-semibold text-slate-700 ${item.isChecked ? 'line-through text-slate-400' : ''}`}
                                                        >
                                                            {item.name}
                                                        </span>

                                                        <button
                                                            onClick={() => removeShoppingItem(item.id)}
                                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-all"
                                                            title="Удалить позицию"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Clear All Products Button with Confirmation */}
                        <div className="pt-4 flex justify-center">
                            {!confirmClear ? (
                                <button
                                    onClick={() => setConfirmClear(true)}
                                    className="px-6 py-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition-all text-xs font-extrabold flex items-center gap-2 border border-red-100 active:scale-95"
                                >
                                    <Trash2 size={14} /> Очистить список покупок
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-100 p-2 rounded-2xl animate-pulse">
                                    <span className="text-xs font-extrabold text-red-600 px-2">Удалить всё?</span>
                                    <button
                                        onClick={() => {
                                            clearShoppingList();
                                            setConfirmClear(false);
                                        }}
                                        className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black transition-all active:scale-95 shadow-sm shadow-red-500/10"
                                    >
                                        Да, удалить
                                    </button>
                                    <button
                                        onClick={() => setConfirmClear(false)}
                                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-black transition-all active:scale-95"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Subscription Modal */}
            <SubscriptionModal
                isOpen={isSubOpen}
                onClose={() => setIsSubOpen(false)}
            />

            {/* Clipboard Success Toast */}
            <AnimatePresence>
                {copied && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className="fixed bottom-24 left-1/2 bg-slate-900 text-white px-5 py-3.5 rounded-2xl text-xs font-black shadow-xl z-50 flex items-center gap-2 border border-slate-800 whitespace-nowrap"
                    >
                        <span>Список покупок скопирован в буфер!</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
