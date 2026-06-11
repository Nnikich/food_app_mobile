import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { authApi, recipesApi, userStateApi } from '../api';
import { RECIPES } from '../data/recipes';
import { Recipe, AppState, AppAction, Preferences, Difficulty } from '../types';

interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface ActiveTimer {
  endTime: number;
  durationSeconds: number;
  stepText: string;
  isRunning: boolean;
  isFinished: boolean;
  remainingSeconds: number;
  recipeId?: string;
  recipeTitle?: string;
}

interface AppContextValue {
  state: AppState;
  recipes: Recipe[];
  isLoadingRecipes: boolean;
  isSupabaseConnected: boolean;
  userId: string;
  user: User | null;
  authLoading: boolean;
  isGuest: boolean;
  seedDatabase: () => Promise<{ success: boolean; message?: string; error?: string }>;
  signUp: (email: string, password: string, confirmPassword?: string) => Promise<{ success: boolean; data?: any; error?: string; requiresVerification?: boolean; email?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; data?: any; error?: string; email?: string }>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  signOut: () => Promise<void>;
  setGuestMode: () => void;
  activatePremium: () => void;
  decrementSwipes: () => void;
  resetSwipes: () => void;
  completeOnboarding: () => void;
  updatePreferences: (prefs: Partial<Preferences>) => void;
  setDifficulty: (level: Difficulty[]) => void;
  addToShoppingList: (items: Array<{ name: string; recipeId?: string; recipeTitle?: string }>) => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  clearBoughtItems: () => void;
  clearShoppingList: () => void;
  resetOnboarding: () => void;
  setIngredientsFilter: (filter: string[]) => void;
  resetIngredientsFilter: () => void;
  likeRecipe: (id: string) => void;
  unlikeRecipe: (id: string) => void;
  viewRecipe: (id: string) => void;
  clearViewHistory: () => void;
  resetApp: () => void;
  refreshUserState: () => Promise<void>;
  
  // Persistent Global Cooking Timer states & control actions
  activeTimer: ActiveTimer | null;
  startGlobalTimer: (minutes: number, stepText: string, recipeId?: string, recipeTitle?: string) => void;
  pauseGlobalTimer: () => void;
  resumeGlobalTimer: () => void;
  cancelGlobalTimer: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const initialState: AppState = {
    onboardingComplete: false,
    preferences: {
        technique: [],
        tags: [],
        dislikedTags: [],
        difficulty: ['easy', 'medium'],
    },
    shoppingList: [],
    subscription: 'free',
    swipesLeft: 5,
    lastSwipeResetDate: null,
    ingredientsFilter: [],
    likedRecipes: [],
    viewHistory: [],
};

// Load state from localStorage
const loadState = (): AppState => {
    try {
        const saved = localStorage.getItem('cook_assistant_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...initialState,
                ...parsed,
                preferences: {
                    ...initialState.preferences,
                    ...(parsed.preferences || {})
                },
                likedRecipes: parsed.likedRecipes || [],
                viewHistory: parsed.viewHistory || []
            };
        }
    } catch (e) {
        console.error('Failed to load state', e);
    }
    return initialState;
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'COMPLETE_ONBOARDING':
            return { ...state, onboardingComplete: true };

        case 'RESET_ONBOARDING':
            return { ...state, onboardingComplete: false };

        case 'SET_PREFERENCES':
            return {
                ...state,
                preferences: { ...state.preferences, ...action.payload },
            };

        case 'UPDATE_MODE_DIFFICULTY':
            return {
                ...state,
                preferences: { ...state.preferences, difficulty: action.payload }
            };

        case 'ADD_TO_SHOPPING_LIST':
            const filteredNewItems = action.payload
                .filter(newItem => {
                    const exists = state.shoppingList.some(existing => {
                        const sameName = existing.name.toLowerCase().trim() === newItem.name.toLowerCase().trim();
                        const sameRecipe = (existing.recipeId && existing.recipeId === newItem.recipeId) ||
                                           (existing.recipeTitle && existing.recipeTitle === newItem.recipeTitle) ||
                                           (!existing.recipeId && !newItem.recipeId && !existing.recipeTitle && !newItem.recipeTitle);
                        return sameName && sameRecipe;
                    });
                    return !exists;
                })
                .map(item => ({
                    ...item,
                    id: Date.now() + Math.random().toString(),
                    isChecked: false
                }));

            if (filteredNewItems.length === 0) {
                return state;
            }

            return {
                ...state,
                shoppingList: [...state.shoppingList, ...filteredNewItems],
            };

        case 'TOGGLE_SHOPPING_ITEM':
            return {
                ...state,
                shoppingList: state.shoppingList.map((item) =>
                    item.id === action.payload ? { ...item, isChecked: !item.isChecked } : item
                ),
            };

        case 'REMOVE_SHOPPING_ITEM':
            return {
                ...state,
                shoppingList: state.shoppingList.filter((item) => item.id !== action.payload),
            };

        case 'CLEAR_BOUGHT_ITEMS':
            return {
                ...state,
                shoppingList: state.shoppingList.filter((item) => !item.isChecked),
            };

        case 'CLEAR_SHOPPING_LIST':
            return { ...state, shoppingList: [] };

        case 'SYNC_FROM_SUPABASE':
            return {
                ...state,
                onboardingComplete: action.payload.onboardingComplete ?? state.onboardingComplete,
                preferences: action.payload.preferences ?? state.preferences,
                shoppingList: action.payload.shoppingList ?? state.shoppingList,
                subscription: action.payload.subscription ?? state.subscription,
            };

        case 'ACTIVATE_PREMIUM':
            return {
                ...state,
                subscription: 'premium',
            };

        case 'DECREMENT_SWIPES':
            return {
                ...state,
                swipesLeft: Math.max(0, state.swipesLeft - 1),
            };

        case 'SET_INGREDIENTS_FILTER':
            return {
                ...state,
                ingredientsFilter: action.payload,
            };

        case 'RESET_INGREDIENTS_FILTER':
            return {
                ...state,
                ingredientsFilter: [],
            };

        case 'LIKE_RECIPE':
            const currentLiked = state.likedRecipes || [];
            if (currentLiked.includes(action.payload)) return state;
            return {
                ...state,
                likedRecipes: [...currentLiked, action.payload],
            };

        case 'UNLIKE_RECIPE':
            const currentLiked2 = state.likedRecipes || [];
            return {
                ...state,
                likedRecipes: currentLiked2.filter(id => id !== action.payload),
            };

        case 'VIEW_RECIPE':
            const currentHistory = state.viewHistory || [];
            const filteredHistory = currentHistory.filter(id => id !== action.payload);
            const newHistory = [action.payload, ...filteredHistory].slice(0, 15);
            return {
                ...state,
                viewHistory: newHistory,
            };

        case 'CLEAR_VIEW_HISTORY':
            return {
                ...state,
                viewHistory: [],
            };

        case 'RESET_SWIPES':
            return {
                ...state,
                swipesLeft: 5,
                lastSwipeResetDate: new Date().toDateString(),
            };

        default:
            return state;
    }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, initialState, loadState);
    const [recipes, setRecipes] = useState<Recipe[]>(RECIPES);
    const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
    const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);

    // Auth States
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isGuest, setIsGuest] = useState<boolean>(() => {
        return localStorage.getItem('cook_assistant_guest') === 'true';
    });

    // Generate or load unique anonymous client User ID
    const [anonymousId] = useState<string>(() => {
        let id = localStorage.getItem('cook_assistant_user_id');
        if (!id) {
            id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
            localStorage.setItem('cook_assistant_user_id', id);
        }
        return id;
    });

    // Dynamic UserId
    const activeUserId = user ? user.id : anonymousId;

    // Persistent Global Cooking Timer states & control actions
    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

    // Sweet melody alarm audio generator
    const playAlarmSound = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playChime = (time: number, freq: number) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, time);
                
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
                
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(time);
                osc.stop(time + 0.8);
            };
            
            const now = audioCtx.currentTime;
            playChime(now, 880); // A5
            playChime(now + 0.15, 1046.5); // C6
            playChime(now + 0.3, 1318.5); // E6
            playChime(now + 0.6, 880);
            playChime(now + 0.75, 1046.5);
            playChime(now + 0.9, 1318.5);
        } catch (e) {
            console.error('Failed to play alarm sound:', e);
        }
    };

    // Load persistent timer on mount and synchronize across tabs
    useEffect(() => {
        // 1. Initial restore on mount
        try {
            const saved = localStorage.getItem('choozi_active_timer');
            if (saved) {
                const parsed = JSON.parse(saved);
                const remaining = Math.max(0, Math.ceil((parsed.endTime - Date.now()) / 1000));
                
                if (parsed.isRunning && remaining > 0) {
                    setActiveTimer({
                        ...parsed,
                        remainingSeconds: remaining,
                        isFinished: false
                    });
                } else if (remaining <= 0 && parsed.isRunning) {
                    setActiveTimer({
                        ...parsed,
                        remainingSeconds: 0,
                        isFinished: true,
                        isRunning: false
                    });
                } else {
                    setActiveTimer({
                        ...parsed,
                        remainingSeconds: parsed.remainingSeconds,
                        isFinished: parsed.isFinished
                    });
                }
            }
        } catch (e) {
            console.error('Failed to restore active timer', e);
        }

        // 2. Listen to changes in localStorage from other tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'choozi_active_timer') {
                if (e.newValue) {
                    const parsed = JSON.parse(e.newValue);
                    const remaining = Math.max(0, Math.ceil((parsed.endTime - Date.now()) / 1000));
                    
                    if (parsed.isRunning && remaining > 0) {
                        setActiveTimer({
                            ...parsed,
                            remainingSeconds: remaining,
                            isFinished: false
                        });
                    } else if (remaining <= 0 && parsed.isRunning) {
                        setActiveTimer({
                            ...parsed,
                            remainingSeconds: 0,
                            isFinished: true,
                            isRunning: false
                        });
                    } else {
                        setActiveTimer({
                            ...parsed,
                            remainingSeconds: parsed.remainingSeconds,
                            isFinished: parsed.isFinished
                        });
                    }
                } else {
                    setActiveTimer(null);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Sync persistent timer state
    useEffect(() => {
        if (activeTimer) {
            localStorage.setItem('choozi_active_timer', JSON.stringify(activeTimer));
        } else {
            localStorage.removeItem('choozi_active_timer');
        }
    }, [activeTimer]);

    // Global timer ticking interval
    useEffect(() => {
        if (!activeTimer || !activeTimer.isRunning || activeTimer.remainingSeconds <= 0) {
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const nextRemaining = Math.max(0, Math.ceil((activeTimer.endTime - now) / 1000));
            
            if (nextRemaining <= 0) {
                clearInterval(interval);
                playAlarmSound();
                setActiveTimer(prev => prev ? {
                    ...prev,
                    remainingSeconds: 0,
                    isFinished: true,
                    isRunning: false
                } : null);
            } else {
                setActiveTimer(prev => prev ? {
                    ...prev,
                    remainingSeconds: nextRemaining
                } : null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [activeTimer?.isRunning, activeTimer?.endTime]);

    const startGlobalTimer = (minutes: number, stepText: string, recipeId?: string, recipeTitle?: string) => {
        if (minutes <= 0) return;
        const totalSeconds = minutes * 60;
        const endTime = Date.now() + totalSeconds * 1000;
        setActiveTimer({
            endTime,
            durationSeconds: totalSeconds,
            remainingSeconds: totalSeconds,
            isRunning: true,
            stepText,
            isFinished: false,
            recipeId,
            recipeTitle
        });
    };

    const pauseGlobalTimer = () => {
        setActiveTimer(prev => {
            if (!prev) return null;
            return {
                ...prev,
                isRunning: false
            };
        });
    };

    const resumeGlobalTimer = () => {
        setActiveTimer(prev => {
            if (!prev) return null;
            const newEndTime = Date.now() + prev.remainingSeconds * 1000;
            return {
                ...prev,
                endTime: newEndTime,
                isRunning: true
            };
        });
    };

    const cancelGlobalTimer = () => {
        setActiveTimer(null);
    };

    // Listen to Auth State changes on mount
    useEffect(() => {
        const token = localStorage.getItem('cook_assistant_token');
        if (!token) {
            setAuthLoading(false);
            return;
        }

        async function fetchMe() {
            try {
                const res = await authApi.getMe();
                if (res.success && res.user) {
                    setUser(res.user);
                    setIsGuest(false);
                    localStorage.setItem('cook_assistant_guest', 'false');
                    
                    // Sync database subscription type to local preferences state immediately
                    if ((res.user as any).subscriptionType) {
                        dispatch({
                            type: 'SET_PREFERENCES',
                            payload: { subscriptionType: (res.user as any).subscriptionType }
                        });
                    }
                } else {
                    localStorage.removeItem('cook_assistant_token');
                    setUser(null);
                }
            } catch (err) {
                console.error('Failed to authenticate on load:', err);
                setUser(null);
            } finally {
                setAuthLoading(false);
            }
        }

        fetchMe();
    }, []);

    // Refresh user state when tab becomes visible or window receives focus
    // (Helps immediately sync premium status after returning from bank apps or YooKassa checkout sheets)
    useEffect(() => {
        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible' && !isGuest && user) {
                refreshUserState();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, [activeUserId, isGuest, user]);

    // 1. Reset daily swipes for free users
    useEffect(() => {
        const today = new Date().toDateString();
        if (state.lastSwipeResetDate !== today) {
            dispatch({ type: 'RESET_SWIPES' });
        }
    }, [state.lastSwipeResetDate]);

    // 2. Load recipes from Backend
    useEffect(() => {
        async function fetchRecipes() {
            setIsLoadingRecipes(true);
            try {
                const res = await recipesApi.getAll();
                if (res.success && res.data && res.data.length > 0) {
                    const mappedRecipes = res.data.map(r => ({
                        id: r.id,
                        title: r.title,
                        description: r.description,
                        imageUrl: r.imageUrl,
                        time: r.time,
                        difficulty: r.difficulty,
                        techniqueRequired: r.techniqueRequired,
                        tags: r.tags,
                        ingredients: r.ingredients,
                        steps: r.steps
                    }));
                    setRecipes(mappedRecipes);
                    setIsSupabaseConnected(true);
                } else if (!res.success) {
                    setIsSupabaseConnected(false);
                }
            } catch (e) {
                console.error('Failed to load recipes from Backend, using local fallback:', e);
                setIsSupabaseConnected(false);
            } finally {
                setIsLoadingRecipes(false);
            }
        }
        fetchRecipes();
    }, [state.subscription]);

    // 3. Fetch user state from Backend on userId changes
    useEffect(() => {
        async function fetchUserState() {
            try {
                const res = await userStateApi.get(activeUserId);
                if (res.success && res.data) {
                    dispatch({
                        type: 'SYNC_FROM_SUPABASE',
                        payload: {
                            onboardingComplete: res.data.onboardingComplete,
                            preferences: res.data.preferences,
                            shoppingList: res.data.shoppingList,
                            subscription: res.data.subscription || 'free',
                        }
                    });
                    setIsSupabaseConnected(true);
                }
            } catch (e) {
                console.error('Failed to fetch user state from Backend:', e);
                setIsSupabaseConnected(false);
            }
        }
        fetchUserState();
    }, [activeUserId]);

    // 4. Local persistence & Backend background syncing on state changes
    useEffect(() => {
        localStorage.setItem('cook_assistant_state', JSON.stringify(state));

        async function syncToBackend() {
            try {
                const res = await userStateApi.save(activeUserId, {
                    preferences: state.preferences,
                    shoppingList: state.shoppingList,
                    onboardingComplete: state.onboardingComplete,
                    subscription: state.subscription,
                } as any);
                if (res.success) {
                    setIsSupabaseConnected(true);
                    
                    // If the backend returned updated subscription status (e.g. from webhook), update local state
                    const resData = (res as any).data;
                    if (resData && resData.subscription && resData.subscription !== state.subscription) {
                        dispatch({
                            type: 'SYNC_FROM_SUPABASE',
                            payload: {
                                onboardingComplete: resData.onboardingComplete,
                                preferences: resData.preferences,
                                shoppingList: resData.shoppingList,
                                subscription: resData.subscription,
                            }
                        });
                        
                        if ((res as any).token) {
                            localStorage.setItem('cook_assistant_token', (res as any).token);
                        }
                    }
                } else {
                    setIsSupabaseConnected(false);
                }
            } catch (e) {
                console.error('Failed to sync state to Backend:', e);
                setIsSupabaseConnected(false);
            }
        }

        const timer = setTimeout(() => {
            syncToBackend();
        }, 1000);

        return () => clearTimeout(timer);
    }, [state, activeUserId]);

    // Seed database with local recipes if empty
    const seedDatabase = async () => {
        try {
            const res = await recipesApi.seed();
            if (res.success) {
                const fetchRes = await recipesApi.getAll();
                if (fetchRes.success && fetchRes.data) {
                    setRecipes(fetchRes.data);
                }
                return { success: true, message: res.message || 'Все 15 рецептов успешно импортированы!' };
            } else {
                return { success: false, error: res.error || 'Ошибка при импорте.' };
            }
        } catch (e: any) {
            console.error('Failed to seed backend:', e);
            return { success: false, error: e.message };
        }
    };

    // Custom Auth Methods
    const signUp = async (email: string, password: string, confirmPassword?: string) => {
        try {
            const res = await authApi.register(email, password, confirmPassword);
            if (res.success) {
                if (res.requiresVerification) {
                    return { success: true, requiresVerification: true, email };
                }
                const token = res.token;
                if (token) {
                    localStorage.setItem('cook_assistant_token', token);
                }
                setUser(res.user || null);
                setIsGuest(false);
                localStorage.setItem('cook_assistant_guest', 'false');
                return { success: true, data: res.user };
            } else {
                return { success: false, error: res.error };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const res = await authApi.login(email, password);
            if (res.success && res.user) {
                const token = res.token;
                if (token) {
                    localStorage.setItem('cook_assistant_token', token);
                }
                setUser(res.user);
                setIsGuest(false);
                localStorage.setItem('cook_assistant_guest', 'false');
                return { success: true, data: res.user };
            } else {
                if (res.error === 'EMAIL_UNVERIFIED') {
                    return { success: false, error: 'EMAIL_UNVERIFIED', email };
                }
                return { success: false, error: res.error };
            }
        } catch (err: any) {
            const apiErr = err.response?.data?.error;
            if (apiErr === 'EMAIL_UNVERIFIED') {
                return { success: false, error: 'EMAIL_UNVERIFIED', email };
            }
            return { success: false, error: err.message };
        }
    };

    const verifyEmail = async (email: string, code: string) => {
        try {
            const res = await authApi.verify(email, code);
            if (res.success && res.user) {
                const token = res.token;
                if (token) {
                    localStorage.setItem('cook_assistant_token', token);
                }
                setUser(res.user);
                setIsGuest(false);
                localStorage.setItem('cook_assistant_guest', 'false');
                
                // Fetch updated user preferences/state on verification complete
                if (res.user.id) {
                    try {
                        const stateRes = await userStateApi.get(res.user.id);
                        if (stateRes.success && stateRes.data) {
                            dispatch({
                                type: 'SYNC_FROM_SUPABASE',
                                payload: {
                                    onboardingComplete: stateRes.data.onboardingComplete,
                                    preferences: stateRes.data.preferences,
                                    shoppingList: stateRes.data.shoppingList,
                                    subscription: stateRes.data.subscription || 'free',
                                }
                            });
                        }
                    } catch (e) {
                        console.error('Error fetching state for verified user:', e);
                    }
                }
                return { success: true, data: res.user };
            } else {
                return { success: false, error: res.error };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const resendVerification = async (email: string) => {
        try {
            const res = await authApi.resendCode(email);
            if (res.success) {
                return { success: true, message: res.message || 'Код успешно отправлен повторно' };
            } else {
                return { success: false, error: res.error };
            }
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const signOut = async () => {
        dispatch({ type: 'SYNC_FROM_SUPABASE', payload: initialState });
        localStorage.removeItem('cook_assistant_token');
        localStorage.removeItem('cook_assistant_state');
        localStorage.removeItem('cook_assistant_user_id');
        localStorage.removeItem('cook_assistant_guest');
        setUser(null);
        setIsGuest(false);
        window.location.reload();
    };

    const setGuestMode = () => {
        setIsGuest(true);
        localStorage.setItem('cook_assistant_guest', 'true');
    };

    const activatePremium = async () => {
        dispatch({ type: 'ACTIVATE_PREMIUM' });
        try {
            await userStateApi.save(activeUserId, {
                preferences: state.preferences,
                shoppingList: state.shoppingList,
                onboardingComplete: state.onboardingComplete,
                subscription: 'premium',
            } as any);
            
            // Instantly fetch uncensored premium recipes with premium access token
            const res = await recipesApi.getAll();
            if (res.success && res.data && res.data.length > 0) {
                const mappedRecipes = res.data.map(r => ({
                    id: r.id,
                    title: r.title,
                    description: r.description,
                    imageUrl: r.imageUrl,
                    time: r.time,
                    difficulty: r.difficulty,
                    techniqueRequired: r.techniqueRequired,
                    tags: r.tags,
                    ingredients: r.ingredients,
                    steps: r.steps
                }));
                setRecipes(mappedRecipes);
            }
        } catch (e) {
            console.error('Failed to instantly activate and fetch premium recipes:', e);
        }
    };

    const refreshUserState = async () => {
        try {
            const res = await userStateApi.get(activeUserId);
            if (res.success && res.data) {
                dispatch({
                    type: 'SYNC_FROM_SUPABASE',
                    payload: {
                        onboardingComplete: res.data.onboardingComplete,
                        preferences: res.data.preferences,
                        shoppingList: res.data.shoppingList,
                        subscription: res.data.subscription || 'free',
                    }
                });
                setIsSupabaseConnected(true);
            }
        } catch (e) {
            console.error('Failed to refresh user state:', e);
        }
    };

    const value: AppContextValue = {
        state,
        recipes,
        isLoadingRecipes,
        isSupabaseConnected,
        userId: activeUserId,
        user,
        authLoading,
        isGuest,
        seedDatabase,
        signUp,
        signIn,
        verifyEmail,
        resendVerification,
        signOut,
        setGuestMode,
        activatePremium,
        refreshUserState,
        decrementSwipes: () => dispatch({ type: 'DECREMENT_SWIPES' }),
        resetSwipes: () => dispatch({ type: 'RESET_SWIPES' }),
        completeOnboarding: () => dispatch({ type: 'COMPLETE_ONBOARDING' }),
        updatePreferences: (prefs) => dispatch({ type: 'SET_PREFERENCES', payload: prefs }),
        setDifficulty: (level) => dispatch({ type: 'UPDATE_MODE_DIFFICULTY', payload: level }),
        addToShoppingList: (items) => dispatch({ type: 'ADD_TO_SHOPPING_LIST', payload: items }),
        toggleShoppingItem: (id) => dispatch({ type: 'TOGGLE_SHOPPING_ITEM', payload: id }),
        removeShoppingItem: (id) => dispatch({ type: 'REMOVE_SHOPPING_ITEM', payload: id }),
        clearBoughtItems: () => dispatch({ type: 'CLEAR_BOUGHT_ITEMS' }),
        clearShoppingList: () => dispatch({ type: 'CLEAR_SHOPPING_LIST' }),
        resetOnboarding: () => dispatch({ type: 'RESET_ONBOARDING' }),
        setIngredientsFilter: (filter) => dispatch({ type: 'SET_INGREDIENTS_FILTER', payload: filter }),
        resetIngredientsFilter: () => dispatch({ type: 'RESET_INGREDIENTS_FILTER' }),
        likeRecipe: (id) => dispatch({ type: 'LIKE_RECIPE', payload: id }),
        unlikeRecipe: (id) => dispatch({ type: 'UNLIKE_RECIPE', payload: id }),
        viewRecipe: (id) => dispatch({ type: 'VIEW_RECIPE', payload: id }),
        clearViewHistory: () => dispatch({ type: 'CLEAR_VIEW_HISTORY' }),
        resetApp: () => {
            localStorage.removeItem('cook_assistant_token');
            localStorage.removeItem('cook_assistant_state');
            localStorage.removeItem('cook_assistant_user_id');
            localStorage.removeItem('cook_assistant_guest');
            localStorage.removeItem('choozi_active_timer');
            window.location.reload();
        },
        
        // Expose persistent global cooking timer states & actions
        activeTimer,
        startGlobalTimer,
        pauseGlobalTimer,
        resumeGlobalTimer,
        cancelGlobalTimer
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
}
