import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState as RNAppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

import { authApi, recipesApi, userStateApi } from '../api';
import { RECIPES } from '../data/recipes';
import { Recipe, AppState, AppAction, Preferences, Difficulty } from '../types';
import { initAuthCredentials, setAuthCredentials } from '../utils/apiClient';

interface User {
  id: string;
  email: string;
  createdAt: string;
  subscriptionType?: string;
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
  notificationId?: string; // Push notification reference to cancel if needed
}

interface AppContextValue {
  state: AppState;
  recipes: Recipe[];
  isLoadingRecipes: boolean;
  isSupabaseConnected: boolean; // Keep for backward compatibility with server state connection
  userId: string;
  user: User | null;
  authLoading: boolean;
  isGuest: boolean;
  isStorageLoaded: boolean;
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

// Notification handler configuration
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    } as any),
});

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

// Reducer logic
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

        case 'SYNC_FROM_STORAGE':
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
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [recipes, setRecipes] = useState<Recipe[]>(RECIPES);
    const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
    const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
    const [isStorageLoaded, setIsStorageLoaded] = useState(false);

    // Auth States
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isGuest, setIsGuest] = useState<boolean>(false);
    const [anonymousId, setAnonymousId] = useState<string>('');
    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

    // Dynamic UserId
    const activeUserId = user ? user.id : anonymousId;

    // Sweet melody alarm audio generator (fallback/native audio helper)
    const playAlarmSound = async () => {
        try {
            // Expo-av audio load and playback
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/sounds/alarm.mp3'),
                { shouldPlay: true }
            );
            await sound.playAsync();
            // Automatically unload sound from memory when done
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (e) {
            console.warn('Alarm audio file not found or failed to play in foreground. Fallback to system chime.', e);
        }
    };

    // Request notifications permission on mount
    useEffect(() => {
        async function requestNotificationPermissions() {
            if (Platform.OS !== 'web') {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== 'granted') {
                    console.log('Permission to show push notifications was denied.');
                }
            }
        }
        requestNotificationPermissions();
    }, []);

    // Load persistent state, tokens, timers, and ids on mount (AsyncStorage replacement)
    useEffect(() => {
        async function bootstrapAppState() {
            try {
                // Initialize apiClient's in-memory token cache
                await initAuthCredentials();
                
                const savedState = await AsyncStorage.getItem('cook_assistant_state');
                const token = await AsyncStorage.getItem('cook_assistant_token');
                const guestFlag = await AsyncStorage.getItem('cook_assistant_guest');
                let savedUserId = await AsyncStorage.getItem('cook_assistant_user_id');

                // Restore preferences & shopping list state
                if (savedState) {
                    const parsed = JSON.parse(savedState);
                    dispatch({
                        type: 'SYNC_FROM_STORAGE',
                        payload: {
                            ...initialState,
                            ...parsed,
                            preferences: {
                                ...initialState.preferences,
                                ...(parsed.preferences || {})
                            },
                            likedRecipes: parsed.likedRecipes || [],
                            viewHistory: parsed.viewHistory || []
                        }
                    });
                }

                // Restore Guest mode
                if (guestFlag === 'true') {
                    setIsGuest(true);
                }

                // Restore or generate anonymousId
                if (!savedUserId) {
                    savedUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
                    await AsyncStorage.setItem('cook_assistant_user_id', savedUserId);
                    // Sync to client credentials cache
                    await setAuthCredentials(token, savedUserId);
                }
                setAnonymousId(savedUserId);

                // Restore Active Timer state
                const savedTimer = await AsyncStorage.getItem('choozi_active_timer');
                if (savedTimer) {
                    const parsed = JSON.parse(savedTimer);
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

                // Validate JWT token with backend if present
                if (token) {
                    try {
                        const res = await authApi.getMe();
                        if (res.success && res.user) {
                            setUser(res.user);
                            setIsGuest(false);
                            await AsyncStorage.setItem('cook_assistant_guest', 'false');
                            
                            if (res.user.subscriptionType) {
                                dispatch({
                                    type: 'SET_PREFERENCES',
                                    payload: { subscriptionType: res.user.subscriptionType as any }
                                });
                            }
                        } else {
                            await AsyncStorage.removeItem('cook_assistant_token');
                            setUser(null);
                        }
                    } catch (err) {
                        console.error('Failed to validate JWT on startup:', err);
                        // Offline capability: Keep cached user profiles if verification fails due to connection issues
                        setUser(null);
                    }
                }
            } catch (e) {
                console.error('Bootstrapping app state failed:', e);
            } finally {
                setIsStorageLoaded(true);
                setAuthLoading(false);
            }
        }

        bootstrapAppState();
    }, []);

    // Sync app preferences state to storage on modifications
    useEffect(() => {
        if (!isStorageLoaded) return;
        
        const saveState = async () => {
            try {
                await AsyncStorage.setItem('cook_assistant_state', JSON.stringify(state));
            } catch (e) {
                console.error('Failed to persist preferences state:', e);
            }
        };

        saveState();

        // Sync to backend with debounce (background sync)
        const syncToBackend = async () => {
            try {
                const res = await userStateApi.save(activeUserId, {
                    preferences: state.preferences,
                    shoppingList: state.shoppingList,
                    onboardingComplete: state.onboardingComplete,
                    subscription: state.subscription,
                } as any);

                if (res.success) {
                    setIsSupabaseConnected(true);
                    const resData = res.data;
                    if (resData && resData.subscription && resData.subscription !== state.subscription) {
                        dispatch({
                            type: 'SYNC_FROM_STORAGE',
                            payload: {
                                onboardingComplete: resData.onboardingComplete,
                                preferences: resData.preferences,
                                shoppingList: resData.shoppingList,
                                subscription: resData.subscription,
                            }
                        });
                        if (res.token) {
                            await AsyncStorage.setItem('cook_assistant_token', res.token);
                        }
                    }
                } else {
                    setIsSupabaseConnected(false);
                }
            } catch (e) {
                console.error('Backend state synchronization error:', e);
                setIsSupabaseConnected(false);
            }
        };

        const timer = setTimeout(() => {
            syncToBackend();
        }, 1000);

        return () => clearTimeout(timer);
    }, [state, activeUserId, isStorageLoaded]);

    // Timer persistence syncing
    useEffect(() => {
        const syncTimer = async () => {
            try {
                if (activeTimer) {
                    await AsyncStorage.setItem('choozi_active_timer', JSON.stringify(activeTimer));
                } else {
                    await AsyncStorage.removeItem('choozi_active_timer');
                }
            } catch (e) {
                console.error('Failed to persist active timer:', e);
            }
        };
        syncTimer();
    }, [activeTimer]);

    // Global timer countdown ticking interval
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

    // Listen to Mobile app visibility change events to sync user subscription statuses (replaces focus/visibilitychange listeners)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && !isGuest && user) {
                refreshUserState();
            }
        };
        
        const subscription = RNAppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [activeUserId, isGuest, user]);

    // Reset daily swipes for free users
    useEffect(() => {
        const today = new Date().toDateString();
        if (state.lastSwipeResetDate !== today) {
            dispatch({ type: 'RESET_SWIPES' });
        }
    }, [state.lastSwipeResetDate]);

    // Fetch recipes from Backend
    useEffect(() => {
        async function fetchRecipes() {
            setIsLoadingRecipes(true);
            try {
                const res = await recipesApi.getAll();
                if (res.success && res.data && res.data.length > 0) {
                    setRecipes(res.data);
                    setIsSupabaseConnected(true);
                } else if (!res.success) {
                    setIsSupabaseConnected(false);
                }
            } catch (e) {
                console.error('Failed to load recipes from Backend, using static local fallback:', e);
                setIsSupabaseConnected(false);
            } finally {
                setIsLoadingRecipes(false);
            }
        }
        fetchRecipes();
    }, [state.subscription]);

    // Sync state from Backend on userId change
    useEffect(() => {
        if (!activeUserId) return;
        async function fetchUserState() {
            try {
                const res = await userStateApi.get(activeUserId);
                if (res.success && res.data) {
                    dispatch({
                        type: 'SYNC_FROM_STORAGE',
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
                console.error('Failed to fetch user state on mount:', e);
                setIsSupabaseConnected(false);
            }
        }
        fetchUserState();
    }, [activeUserId]);

    // Timer management methods
    const startGlobalTimer = async (minutes: number, stepText: string, recipeId?: string, recipeTitle?: string) => {
        if (minutes <= 0) return;
        const totalSeconds = minutes * 60;
        const endTime = Date.now() + totalSeconds * 1000;

        let notificationId = undefined;
        try {
            // Schedule native OS local push notification
            notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Кулинарный таймер CHOOZI 🍳",
                    body: `Время вышло! Шаг: ${stepText}`,
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: totalSeconds,
                } as any,
            });
        } catch (err) {
            console.error('Failed to schedule background push notification:', err);
        }

        setActiveTimer({
            endTime,
            durationSeconds: totalSeconds,
            remainingSeconds: totalSeconds,
            isRunning: true,
            stepText,
            isFinished: false,
            recipeId,
            recipeTitle,
            notificationId
        });
    };

    const pauseGlobalTimer = async () => {
        if (activeTimer?.notificationId) {
            try {
                await Notifications.cancelScheduledNotificationAsync(activeTimer.notificationId);
            } catch (e) {
                console.error('Failed to cancel push notification:', e);
            }
        }
        setActiveTimer(prev => {
            if (!prev) return null;
            return {
                ...prev,
                isRunning: false,
                notificationId: undefined
            };
        });
    };

    const resumeGlobalTimer = async () => {
        if (!activeTimer) return;
        const remaining = activeTimer.remainingSeconds;
        const newEndTime = Date.now() + remaining * 1000;

        let notificationId = undefined;
        try {
            notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Кулинарный таймер CHOOZI 🍳",
                    body: `Время вышло! Шаг: ${activeTimer.stepText}`,
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: remaining,
                } as any,
            });
        } catch (err) {
            console.error('Failed to reschedule background push notification:', err);
        }

        setActiveTimer(prev => {
            if (!prev) return null;
            return {
                ...prev,
                endTime: newEndTime,
                isRunning: true,
                notificationId
            };
        });
    };

    const cancelGlobalTimer = async () => {
        if (activeTimer?.notificationId) {
            try {
                await Notifications.cancelScheduledNotificationAsync(activeTimer.notificationId);
            } catch (e) {
                console.error('Failed to cancel push notification:', e);
            }
        }
        setActiveTimer(null);
    };

    // User authentication status checker
    const refreshUserState = async () => {
        if (!activeUserId) return;
        try {
            const res = await userStateApi.get(activeUserId);
            if (res.success && res.data) {
                dispatch({
                    type: 'SYNC_FROM_STORAGE',
                    payload: {
                        onboardingComplete: res.data.onboardingComplete,
                        preferences: res.data.preferences,
                        shoppingList: res.data.shoppingList,
                        subscription: res.data.subscription || 'free',
                    }
                });
            }
        } catch (e) {
            console.error('Failed to sync profile subscriptions manually:', e);
        }
    };

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

    const signUp = async (email: string, password: string, confirmPassword?: string) => {
        try {
            const res = await authApi.register(email, password, confirmPassword);
            if (res.success) {
                if (res.requiresVerification) {
                    return { success: true, requiresVerification: true, email };
                }
                const token = res.token || null;
                await setAuthCredentials(token, res.user?.id || null);
                setUser(res.user || null);
                setIsGuest(false);
                await AsyncStorage.setItem('cook_assistant_guest', 'false');
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
                const token = res.token || null;
                await setAuthCredentials(token, res.user.id);
                setUser(res.user);
                setIsGuest(false);
                await AsyncStorage.setItem('cook_assistant_guest', 'false');
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
                const token = res.token || null;
                await setAuthCredentials(token, res.user.id);
                setUser(res.user);
                setIsGuest(false);
                await AsyncStorage.setItem('cook_assistant_guest', 'false');
                
                if (res.user.id) {
                    try {
                        const stateRes = await userStateApi.get(res.user.id);
                        if (stateRes.success && stateRes.data) {
                            dispatch({
                                type: 'SYNC_FROM_STORAGE',
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
        // Cancel any pending notifications on sign out
        if (activeTimer?.notificationId) {
            try {
                await Notifications.cancelScheduledNotificationAsync(activeTimer.notificationId);
            } catch (e) {
                // Ignore
            }
        }
        dispatch({ type: 'SYNC_FROM_STORAGE', payload: initialState });
        await setAuthCredentials(null, null);
        await AsyncStorage.removeItem('cook_assistant_state');
        await AsyncStorage.removeItem('cook_assistant_guest');
        await AsyncStorage.removeItem('choozi_active_timer');
        setUser(null);
        setIsGuest(false);
        setActiveTimer(null);
    };

    const setGuestMode = async () => {
        setIsGuest(true);
        await AsyncStorage.setItem('cook_assistant_guest', 'true');
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
            
            const res = await recipesApi.getAll();
            if (res.success && res.data && res.data.length > 0) {
                setRecipes(res.data);
            }
        } catch (e) {
            console.error('Failed to sync premium activation to backend:', e);
        }
    };

    const decrementSwipes = () => dispatch({ type: 'DECREMENT_SWIPES' });
    const resetSwipes = () => dispatch({ type: 'RESET_SWIPES' });
    const completeOnboarding = () => dispatch({ type: 'COMPLETE_ONBOARDING' });
    const updatePreferences = (prefs: Partial<Preferences>) => dispatch({ type: 'SET_PREFERENCES', payload: prefs });
    const setDifficulty = (level: Difficulty[]) => dispatch({ type: 'UPDATE_MODE_DIFFICULTY', payload: level });
    const addToShoppingList = (items: Array<{ name: string; recipeId?: string; recipeTitle?: string }>) => dispatch({ type: 'ADD_TO_SHOPPING_LIST', payload: items });
    const toggleShoppingItem = (id: string) => dispatch({ type: 'TOGGLE_SHOPPING_ITEM', payload: id });
    const removeShoppingItem = (id: string) => dispatch({ type: 'REMOVE_SHOPPING_ITEM', payload: id });
    const clearBoughtItems = () => dispatch({ type: 'CLEAR_BOUGHT_ITEMS' });
    const clearShoppingList = () => dispatch({ type: 'CLEAR_SHOPPING_LIST' });
    const resetOnboarding = () => dispatch({ type: 'RESET_ONBOARDING' });
    const setIngredientsFilter = (filter: string[]) => dispatch({ type: 'SET_INGREDIENTS_FILTER', payload: filter });
    const resetIngredientsFilter = () => dispatch({ type: 'RESET_INGREDIENTS_FILTER' });
    const likeRecipe = (id: string) => dispatch({ type: 'LIKE_RECIPE', payload: id });
    const unlikeRecipe = (id: string) => dispatch({ type: 'UNLIKE_RECIPE', payload: id });
    const viewRecipe = (id: string) => dispatch({ type: 'VIEW_RECIPE', payload: id });
    const clearViewHistory = () => dispatch({ type: 'CLEAR_VIEW_HISTORY' });

    const resetApp = async () => {
        if (activeTimer?.notificationId) {
            try {
                await Notifications.cancelScheduledNotificationAsync(activeTimer.notificationId);
            } catch (e) {
                // Ignore
            }
        }
        dispatch({ type: 'SYNC_FROM_STORAGE', payload: initialState });
        await AsyncStorage.removeItem('cook_assistant_state');
        await AsyncStorage.removeItem('choozi_active_timer');
        setActiveTimer(null);
    };

    return (
        <AppContext.Provider value={{
            state,
            recipes,
            isLoadingRecipes,
            isSupabaseConnected,
            userId: activeUserId,
            user,
            authLoading,
            isGuest,
            isStorageLoaded,
            seedDatabase,
            signUp,
            signIn,
            verifyEmail,
            resendVerification,
            signOut,
            setGuestMode,
            activatePremium,
            decrementSwipes,
            resetSwipes,
            completeOnboarding,
            updatePreferences,
            setDifficulty,
            addToShoppingList,
            toggleShoppingItem,
            removeShoppingItem,
            clearBoughtItems,
            clearShoppingList,
            resetOnboarding,
            setIngredientsFilter,
            resetIngredientsFilter,
            likeRecipe,
            unlikeRecipe,
            viewRecipe,
            clearViewHistory,
            resetApp,
            refreshUserState,
            activeTimer,
            startGlobalTimer,
            pauseGlobalTimer,
            resumeGlobalTimer,
            cancelGlobalTimer
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}
