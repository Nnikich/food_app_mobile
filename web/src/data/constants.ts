export interface TechniqueItem {
  id: string;
  label: string;
  emoji: string;
  icon: string;
}

export interface PreferenceTagItem {
  id: string;
  label: string;
  emoji: string;
  icon: string;
  type: 'positive' | 'negative';
}

export interface DislikeTagItem {
  id: string;
  label: string;
  emoji: string;
  excludes: string;
  icon: string;
}

export interface DifficultyLevelItem {
  id: 'easy' | 'medium' | 'hard';
  label: string;
  description: string;
  time: string;
  value: number;
  icon: string;
  isPremium?: boolean;
}

export const TECHNIQUES: TechniqueItem[] = [
    { id: 'stove', label: 'Плита', emoji: '🍳', icon: 'Flame' },
    { id: 'oven', label: 'Духовка', emoji: '🔥', icon: 'Waves' },
    { id: 'microwave', label: 'СВЧ', emoji: '📡', icon: 'Microwave' },
    { id: 'blender', label: 'Блендер', emoji: '🥤', icon: 'Wind' },
    { id: 'multicooker', label: 'Мультиварка', emoji: '🍲', icon: 'CookingPot' },
    { id: 'mixer', label: 'Миксер', emoji: '🥄', icon: 'ChefHat' },
    { id: 'grill', label: 'Гриль', emoji: '🍖', icon: 'Beef' },
    { id: 'toaster', label: 'Тостер', emoji: '🍞', icon: 'Utensils' },
];

export const PREFERENCE_TAGS: PreferenceTagItem[] = [
    { id: 'meat', label: 'Мясоед', emoji: '🥩', icon: 'Beef', type: 'positive' },
    { id: 'vegetarian', label: 'Вегетарианец', emoji: '🥗', icon: 'Leaf', type: 'positive' },
    { id: 'spicy', label: 'Острое', emoji: '🌶️', icon: 'Flame', type: 'positive' },
    { id: 'soup', label: 'Супы', emoji: '🍜', icon: 'Soup', type: 'positive' },
    { id: 'asian', label: 'Азиатская', emoji: '', icon: 'UtensilsCrossed', type: 'positive' },
    { id: 'breakfast', label: 'Завтраки', emoji: '🥞', icon: 'Croissant', type: 'positive' },
    { id: 'healthy', label: 'ПП', emoji: '🥑', icon: 'Salad', type: 'positive' },
];

export const DISLIKE_TAGS: DislikeTagItem[] = [
    { id: 'no_fish', label: 'Рыба', emoji: '🐟', excludes: 'fish', icon: 'FishOff' },
    { id: 'no_nuts', label: 'Орехи', emoji: '🥜', excludes: 'nuts', icon: 'NutOff' },
    { id: 'no_gluten', label: 'Глютен', emoji: '🌾', excludes: 'gluten', icon: 'WheatOff' },
    { id: 'no_lactose', label: 'Лактоза', emoji: '🥛', excludes: 'lactose', icon: 'MilkOff' },
    { id: 'no_sugar', label: 'Сахар', emoji: '🍬', excludes: 'sugar', icon: 'CandyOff' },
    { id: 'no_eggs', label: 'Яйца', emoji: '🥚', excludes: 'eggs', icon: 'EggOff' },
];

export const DIFFICULTY_LEVELS: DifficultyLevelItem[] = [
    {
        id: 'easy',
        label: 'Easy',
        description: 'Простые блюда, минимум ингредиентов. Идеально после работы.',
        time: '15-30 мин',
        value: 1,
        icon: 'Clock'
    },
    {
        id: 'medium',
        label: 'Medium',
        description: 'Сбалансированные рецепты. Немного усилий для отличного вкуса.',
        time: '30-60 мин',
        value: 2,
        icon: 'ChefHat'
    },
    {
        id: 'hard',
        label: 'Hard',
        description: 'Ресторанные блюда для особых случаев и гурманов.',
        time: '60+ мин',
        value: 3,
        icon: 'Flame',
        isPremium: true
    },
];

export const DIFFICULTY_ORDER: Record<'easy' | 'medium' | 'hard', number> = { easy: 1, medium: 2, hard: 3 };
