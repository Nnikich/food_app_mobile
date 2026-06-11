export interface Ingredient {
  name: string;
  quantity: string;
  isOptional: boolean;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  time: number;
  difficulty: Difficulty;
  techniqueRequired: string[];
  tags: string[];
  ingredients: Ingredient[];
  steps: (string | [string, number])[];
  servings?: number;
}

export interface Preferences {
  technique: string[];
  tags: string[];
  dislikedTags: string[];
  difficulty: Difficulty[];
  autoRenew?: boolean;
  subscriptionType?: 'month' | 'year';
}

export interface ShoppingListItem {
  id: string;
  name: string;
  isChecked: boolean;
  recipeId?: string;
  recipeTitle?: string;
}

export interface AppState {
  onboardingComplete: boolean;
  preferences: Preferences;
  shoppingList: ShoppingListItem[];
  subscription: 'free' | 'premium';
  swipesLeft: number;
  lastSwipeResetDate: string | null;
  ingredientsFilter: string[];
  likedRecipes: string[];
  viewHistory?: string[];
}

export type AppAction =
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'RESET_ONBOARDING' }
  | { type: 'SET_PREFERENCES'; payload: Partial<Preferences> }
  | { type: 'UPDATE_MODE_DIFFICULTY'; payload: Difficulty[] }
  | { type: 'ADD_TO_SHOPPING_LIST'; payload: Array<{ name: string; recipeId?: string; recipeTitle?: string }> }
  | { type: 'TOGGLE_SHOPPING_ITEM'; payload: string }
  | { type: 'REMOVE_SHOPPING_ITEM'; payload: string }
  | { type: 'CLEAR_BOUGHT_ITEMS' }
  | { type: 'CLEAR_SHOPPING_LIST' }
  | { type: 'SYNC_FROM_SUPABASE'; payload: Partial<AppState> }
  | { type: 'ACTIVATE_PREMIUM' }
  | { type: 'DECREMENT_SWIPES' }
  | { type: 'SET_INGREDIENTS_FILTER'; payload: string[] }
  | { type: 'RESET_INGREDIENTS_FILTER' }
  | { type: 'LIKE_RECIPE'; payload: string }
  | { type: 'UNLIKE_RECIPE'; payload: string }
  | { type: 'VIEW_RECIPE'; payload: string }
  | { type: 'CLEAR_VIEW_HISTORY' }
  | { type: 'RESET_SWIPES' };
