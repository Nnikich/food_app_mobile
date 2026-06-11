import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from './context/AppContext';

import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import RecipeScreen from './screens/RecipeScreen';
import ShoppingScreen from './screens/ShoppingScreen';
import CatalogScreen from './screens/CatalogScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import OfferScreen from './screens/OfferScreen';
import PlannerScreen from './screens/PlannerScreen';
import MainLayout from './components/MainLayout';

export default function App() {
    const { state, user, authLoading, isGuest } = useAppContext();
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        
        // Track page view in Yandex.Metrika on SPA route changes
        try {
            if (typeof (window as any).ym === 'function') {
                (window as any).ym(109599533, 'hit', location.pathname + location.search);
            }
        } catch (e) {
            console.error('Yandex.Metrika tracking error:', e);
        }
    }, [location.pathname, location.search]);

    // 1. Show a beautiful full-screen loader during session validation
    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    const hasSession = user !== null || isGuest;
    const isPublicRoute = 
        location.pathname === '/privacy' || 
        location.pathname === '/privacy/' ||
        location.pathname === '/offer' ||
        location.pathname === '/offer/';

    // 2. Auth gating (bypass for public routes)
    if (!hasSession && location.pathname !== '/auth' && !isPublicRoute) {
        return <Navigate to="/auth" replace />;
    }

    if (hasSession && location.pathname === '/auth') {
        return <Navigate to="/" replace />;
    }

    // 3. Onboarding gating (bypass for public routes)
    if (hasSession && !isPublicRoute) {
        if (!state.onboardingComplete && location.pathname !== '/onboarding') {
            return <Navigate to="/onboarding" replace />;
        }
        if (state.onboardingComplete && location.pathname === '/onboarding') {
            return <Navigate to="/" replace />;
        }
    }

    return (
        <Routes>
            <Route path="/auth" element={<AuthScreen />} />
            <Route path="/privacy" element={<PrivacyScreen />} />
            <Route path="/offer" element={<OfferScreen />} />
            <Route element={<MainLayout />}>
                <Route path="/onboarding" element={<OnboardingScreen />} />
                <Route path="/" element={<HomeScreen />} />
                <Route path="/recipe/:id" element={<RecipeScreen />} />
                <Route path="/shopping" element={<ShoppingScreen />} />
                <Route path="/catalog" element={<CatalogScreen />} />
                <Route path="/planner" element={<PlannerScreen />} />
                <Route path="/profile" element={<ProfileScreen />} />
            </Route>
        </Routes>
    );
}
