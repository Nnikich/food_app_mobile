import { DIFFICULTY_ORDER } from '../data/constants';
import { Recipe, Ingredient, Preferences } from '../types';
import { areIngredientsCompatible } from './ingredientNormalizer';

export interface MatchStats {
  matchCount: number;
  hasAll: boolean;
  missingIngredients: Ingredient[];
}

export interface TypedRecipeWithStats extends Recipe {
  _matchStats?: MatchStats;
  _randomScore?: number;
}

// Detailed matching stats helper
export function getMatchStats(recipe: Recipe, ownedIngredients: string[]): MatchStats {
    if (!ownedIngredients || ownedIngredients.length === 0) {
        return { matchCount: 0, hasAll: false, missingIngredients: [] };
    }

    const matchedNames = new Set<string>();
    const missing: Ingredient[] = [];

    recipe.ingredients.forEach(ing => {
        const matchingOwned = ownedIngredients.find(owned => {
            return areIngredientsCompatible(ing.name, owned);
        });

        if (matchingOwned) {
            matchedNames.add(matchingOwned.toLowerCase());
        } else {
            missing.push(ing);
        }
    });

    const uniqueOwnedFound = Array.from(matchedNames).length;
    const hasAll = uniqueOwnedFound === ownedIngredients.length;

    return {
        matchCount: uniqueOwnedFound,
        hasAll,
        missingIngredients: missing
    };
}

// Backwards compatibility helper
export function getMissingIngredients(recipe: Recipe, ownedIngredients: string[]): Ingredient[] {
    return getMatchStats(recipe, ownedIngredients).missingIngredients;
}

export function filterRecipes(
    recipes: Recipe[],
    userPreferences: Preferences,
    ownedIngredients: string[] = []
): Recipe[] {
    const { technique, dislikedTags, difficulty, tags: positiveTags } = userPreferences;
    const activePositiveTags = positiveTags || [];

    // 1. Basic filtering (STRICT only for disliked tags and difficulties)
    let candidates: TypedRecipeWithStats[] = recipes.filter((recipe) => {
        // Filter by difficulty - STRICT
        if (difficulty) {
            if (Array.isArray(difficulty)) {
                if (difficulty.length > 0 && !difficulty.includes(recipe.difficulty)) {
                    return false;
                }
            } else {
                const recipeDiffValue = DIFFICULTY_ORDER[recipe.difficulty];
                const userDiffValue = DIFFICULTY_ORDER[difficulty as 'easy' | 'medium' | 'hard'] || 2;
                if (recipeDiffValue > userDiffValue) return false;
            }
        }

        // Filter by disliked tags (exclusions) - STRICT
        const hasDislikedTag = recipe.tags.some((tag) => dislikedTags.includes(tag));
        if (hasDislikedTag) return false;

        return true;
    });

    // 2. Soft Technique Prioritization (Map and check technique alignment without discarding candidates)
    const userTechniquesRaw = technique || [];
    const TECHNIQUE_MAP: Record<string, string> = {
        stove: 'плита',
        oven: 'духовка',
        microwave: 'свч',
        blender: 'блендер',
        multicooker: 'мультиварка',
        mixer: 'миксер',
        grill: 'гриль',
        toaster: 'тостер'
    };

    const userTechniques = userTechniquesRaw.reduce((acc, tech) => {
        const lower = tech.toLowerCase();
        acc.push(lower);
        if (TECHNIQUE_MAP[lower]) acc.push(TECHNIQUE_MAP[lower]);
        return acc;
    }, [] as string[]);

    candidates = candidates.map(recipe => {
        // If user has no techniques selected, treat all recipes as matching
        const hasAllTechniques = userTechniquesRaw.length === 0 || recipe.techniqueRequired.every((tech) =>
            userTechniques.includes(tech.toLowerCase())
        );
        return {
            ...recipe,
            _hasAllTechniques: hasAllTechniques
        };
    }) as any;

    // 3. Sorting by matching techniques priority, owned ingredients match quality, and user positive preferences
    if (ownedIngredients && ownedIngredients.length > 0) {
        candidates = candidates
            .map(recipe => {
                const stats = getMatchStats(recipe, ownedIngredients);
                const prefScore = recipe.tags.filter(tag => activePositiveTags.includes(tag)).length;
                return { 
                    ...recipe, 
                    _matchStats: stats,
                    _prefScore: prefScore,
                    _randomScore: Math.random()
                };
            })
            // Only keep recipes that contain at least one of the selected ingredients
            .filter(recipe => recipe._matchStats!.matchCount > 0)
            // Sort by:
            // 1. _hasAllTechniques descending (true first)
            // 2. hasAll ingredients match first
            // 3. matchCount descending
            // 4. prefScore descending
            // 5. _randomScore (tie-breaker)
            .sort((a, b) => {
                const aTech = (a as any)._hasAllTechniques ? 1 : 0;
                const bTech = (b as any)._hasAllTechniques ? 1 : 0;
                if (aTech !== bTech) {
                    return bTech - aTech;
                }

                const aStats = a._matchStats!;
                const bStats = b._matchStats!;
                if (aStats.hasAll !== bStats.hasAll) {
                    return aStats.hasAll ? -1 : 1;
                }
                if (aStats.matchCount !== bStats.matchCount) {
                    return bStats.matchCount - aStats.matchCount;
                }
                const aPref = (a as any)._prefScore || 0;
                const bPref = (b as any)._prefScore || 0;
                if (aPref !== bPref) {
                    return bPref - aPref;
                }
                return a._randomScore! - b._randomScore!;
            });
    } else {
        // Sort primarily by matching techniques priority, then by positive preferences match score, and finally shuffle
        candidates = candidates
            .map(recipe => {
                const prefScore = recipe.tags.filter(tag => activePositiveTags.includes(tag)).length;
                return {
                    ...recipe,
                    _prefScore: prefScore,
                    _randomScore: Math.random()
                };
            })
            .sort((a, b) => {
                const aTech = (a as any)._hasAllTechniques ? 1 : 0;
                const bTech = (b as any)._hasAllTechniques ? 1 : 0;
                if (aTech !== bTech) {
                    return bTech - aTech;
                }

                const aPref = (a as any)._prefScore || 0;
                const bPref = (b as any)._prefScore || 0;
                if (aPref !== bPref) {
                    return bPref - aPref;
                }
                return a._randomScore! - b._randomScore!;
            });
    }

    return candidates;
}

export function getRandomRecipe(
    filteredRecipes: Recipe[],
    currentRecipeId: string | null = null,
    hasIngredientsFilter: boolean = false
): Recipe | null {
    if (!filteredRecipes || filteredRecipes.length === 0) return null;

    // Filter out the current recipe to ensure swiping actually changes the dish
    const pool = currentRecipeId
        ? filteredRecipes.filter((r) => r.id !== currentRecipeId)
        : filteredRecipes;

    if (pool.length === 0) return filteredRecipes[0];

    // To prevent the exact same top-matching recipe from always greeting the user
    // on app loads or filter updates, we dynamically select one randomly from the 
    // top-3 highest-relevance recipes. This guarantees fresh variety while keeping relevance top-tier!
    const poolSize = Math.min(pool.length, 3);
    const randomIndex = Math.floor(Math.random() * poolSize);
    return pool[randomIndex];
}
