import { motion } from 'framer-motion';
import { Crown, Compass, Sparkles, Zap, Lock } from 'lucide-react';

interface PaywallViewProps {
  title: string;
  subtitle: string;
  onSubscribe: () => void;
}

export default function PaywallView({ title, subtitle, onSubscribe }: PaywallViewProps) {
  const features = [
    {
      icon: <Crown className="text-amber-500" size={20} />,
      title: 'Доступ ко всем рецептам шефов',
      desc: 'Откройте эксклюзивные ресторанные блюда с подробным руководством.'
    },
    {
      icon: <Compass className="text-amber-500" size={20} />,
      title: 'Полный доступ к каталогу',
      desc: 'Ищите любые рецепты, фильтруйте по ingredients и сложности без ограничений.'
    },
    {
      icon: <Sparkles className="text-amber-500" size={20} />,
      title: 'Умный планировщик меню на 7 дней',
      desc: 'Составляйте план питания на неделю вперед с авто-сборкой покупок.'
    },
    {
      icon: <Zap className="text-amber-500" size={20} />,
      title: 'Умный экспорт в буфер обмена',
      desc: 'В один клик отправляйте сгруппированный список ингредиентов в мессенджеры.'
    }
  ];

  return (
    <div className="page pb-24 bg-gradient-to-b from-background to-green-50/20 flex items-center justify-center min-h-[85vh]">
      <div className="container px-4 py-8 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="w-full max-w-md bg-white border border-slate-100 shadow-xl shadow-green-950/5 rounded-[2.5rem] p-8 text-center relative overflow-hidden"
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          {/* Lock/Crown Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 mx-auto mb-6 relative">
            <Crown size={32} fill="currentColor" className="animate-pulse" />
            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg border border-amber-100 shadow-sm text-slate-800">
              <Lock size={12} className="stroke-[3]" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight leading-tight">
            {title}
          </h2>

          <p className="text-xs text-slate-400 font-semibold mb-6 leading-relaxed max-w-[300px] mx-auto">
            {subtitle}
          </p>

          {/* Features List */}
          <div className="space-y-4 mb-8 text-left bg-slate-50/55 p-5 rounded-[2rem] border border-slate-100/50">
            {features.map((f, i) => (
              <div key={i} className="flex gap-3.5 items-start">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">{f.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-normal font-semibold mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA button */}
          <button
            onClick={onSubscribe}
            className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:opacity-95 text-slate-950 text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>Активировать Premium от 119 ₽</span>
            <Crown size={16} fill="currentColor" />
          </button>

          <p className="text-[10px] text-slate-400 mt-4 leading-normal font-semibold">
            Отмена подписки в любой момент в один клик. Никаких скрытых платежей.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
