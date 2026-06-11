import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Pause, Play, Trash2, Volume2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import BottomNav from './BottomNav';

export default function MainLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { activeTimer, pauseGlobalTimer, resumeGlobalTimer, cancelGlobalTimer } = useAppContext();
    
    // Don't show nav on onboarding
    const showNav = location.pathname !== '/onboarding';

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <main className={`flex-1 w-full max-w-md mx-auto relative ${showNav ? 'pb-20' : ''}`}>
                <Outlet />
                
                {/* Active Global Floating Timer Widget */}
                <AnimatePresence>
                    {activeTimer && (
                        <motion.div
                            initial={{ opacity: 0, y: 100, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: 50, x: '-50%' }}
                            onClick={() => {
                                if (activeTimer.recipeId) {
                                    navigate(`/recipe/${activeTimer.recipeId}`);
                                }
                            }}
                            className={`fixed left-1/2 bg-slate-900/95 backdrop-blur-md text-white rounded-3xl p-4 shadow-2xl border border-slate-850 w-[calc(100%-2rem)] max-w-md z-[9999] flex items-center justify-between gap-4 select-none ${
                                activeTimer.recipeId ? 'cursor-pointer hover:bg-slate-800/90 active:scale-[0.99] transition-all' : ''
                            }`}
                            style={{ 
                                bottom: showNav 
                                    ? 'calc(5rem + env(safe-area-inset-bottom))' 
                                    : 'calc(1.5rem + env(safe-area-inset-bottom))' 
                            }}
                        >
                            <div className="flex items-center gap-3 w-2/3">
                                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center relative ${
                                    activeTimer.isFinished 
                                        ? 'bg-rose-500 text-white animate-bounce' 
                                        : 'bg-emerald-500 text-white'
                                }`}>
                                    {activeTimer.isFinished ? (
                                        <Volume2 size={18} className="animate-pulse" />
                                    ) : (
                                        <Clock size={18} className={activeTimer.isRunning ? 'animate-spin [animation-duration:10s]' : ''} />
                                    )}
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <span className={`text-base font-black tracking-tight ${activeTimer.isFinished ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                                        {activeTimer.isFinished ? 'Время вышло! 🎉' : (
                                            `${Math.floor(activeTimer.remainingSeconds / 60).toString().padStart(2, '0')}:${(activeTimer.remainingSeconds % 60).toString().padStart(2, '0')}`
                                        )}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-300 truncate">
                                        {activeTimer.recipeTitle ? `${activeTimer.recipeTitle} • ` : ''}{activeTimer.stepText}
                                    </span>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                {!activeTimer.isFinished && (
                                    <button
                                        onClick={activeTimer.isRunning ? pauseGlobalTimer : resumeGlobalTimer}
                                        className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition-all"
                                    >
                                        {activeTimer.isRunning ? <Pause size={18} strokeWidth={2.5} /> : <Play size={18} strokeWidth={2.5} />}
                                    </button>
                                )}
                                
                                <button
                                    onClick={cancelGlobalTimer}
                                    className={`p-2 rounded-xl active:scale-95 transition-all ${
                                        activeTimer.isFinished 
                                            ? 'bg-rose-600 text-white hover:bg-rose-700' 
                                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                    }`}
                                >
                                    {activeTimer.isFinished ? 'Ок' : <Trash2 size={18} strokeWidth={2.5} />}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
            {showNav && <BottomNav />}
        </div>
    );
}
