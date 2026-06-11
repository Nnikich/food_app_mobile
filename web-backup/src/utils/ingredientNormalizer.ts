/**
 * Intelligent Ingredient Normalizer & Similarity Matcher
 * Solves word ordering permutations, synonym mappings, and Russian stem variations.
 */

export const SYNONYM_MAP: Record<string, string[]> = {
  'фарш говяжий': [
    'фарш из говядины', 'говяжий фарш', 'фарш говядина'
  ],
  'фарш свиной': [
    'фарш из свинины', 'свиной фарш', 'свинина фарш'
  ],
  'фарш куриный': [
    'фарш из курицы', 'куриный фарш', 'курица фарш'
  ],
  'картофель': [
    'картошка', 'картофель молодой', 'картофелина', 'картофелины', 'молодой картофель'
  ],
  'курица': [
    'куриное филе', 'филе курицы', 'куриная грудка', 'куриные грудки', 
    'грудка куриная', 'куриные бедра', 'куриное бедро', 'цыпленок', 
    'курица филе', 'куриное мясо'
  ],
  'сыр': [
    'сыр пармезан', 'пармезан', 'сыр чеддер', 'чеддер', 
    'твердый сыр', 'сыр твердый', 'моцарелла', 'сыр моцарелла', 
    'творожный сыр', 'сливочный сыр', 'сыр сливочный', 'сыр тертый'
  ],
  'чеснок': [
    'зубчик чеснока', 'чесночные зубчики', 'чеснок зубчики', 'зубчики чеснока'
  ],
  'помидоры': [
    'томат', 'помидоры', 'томаты', 'помидорки', 'помидор', 'черри', 'помидоры черри'
  ],
  'огурцы': [
    'огурец', 'огурчики', 'огурцы свежие'
  ],
  'говяжья вырезка': [
    'говядина вырезка', 'вырезка говяжья', 'говядина вырезки', 'вырезка говядина', 'вырезка из говядины'
  ],
  'свиная вырезка': [
    'свинина вырезка', 'вырезка свиная', 'вырезка свинина', 'вырезка из свинины'
  ],
  'говядина': [
    'филе говядины', 'мякоть говядины', 'стейк из говядины'
  ],
  'яйцо': [
    'куриное яйцо', 'яйца', 'яйцо куриное', 'яйца куриные'
  ],
  'лук репчатый': [
    'репчатый лук', 'лук', 'репчатого лука'
  ],
  'лук красный': [
    'красный лук', 'лук салатный', 'салатный лук', 'красного лука'
  ],
  'лук зеленый': [
    'зеленый лук', 'зеленого лука'
  ],
  'лук-порей': [
    'порей'
  ],
  'зелень': [
    'укроп', 'петрушка', 'кинза', 'свежая зелень'
  ],
  'масло сливочное': [
    'сливочное масло'
  ],
  'масло растительное': [
    'растительное масло', 'подсолнечное масло', 'оливковое масло', 'оливкового масла', 'подсолнечного масла',
    'масло оливковое', 'масло подсолнечное', 'масло растительное', 'растительного масла'
  ]
};

/**
 * Cleans up messy database ingredient names to be beautiful and premium for display
 */
export function getDisplayIngredientName(name: string | undefined | null): string {
  if (!name) return '';
  
  let cleaned = name.trim();
  
  // 1. Remove descriptive text inside parentheses if it contains adjectives, marketing terms, or units
  // e.g. (охлажденная, высшего качества), (упаковка), (цельный кусок), (самая нежная часть), (по вкусу), (любой)
  cleaned = cleaned.replace(/\((охлажденная|высшего|цельный|самая|нежная|любой|упаковка|по вкусу|свежий|свежая|свежие|сушеный|сушеная|молотый|молотая|нарезка|ломтики|крупный|мелкий|дольки|зубчики|часть|качества)[^)]*\)/gi, '');
  
  // 2. If it's a short parenthesis that indicates the cut/type, e.g. "Говядина (вырезка)", keep the text but remove the parentheses
  cleaned = cleaned.replace(/\(([^)]+)\)/g, ' $1 ');
  
  // 3. Remove trailing commas, dots, semicolons, and spaces
  cleaned = cleaned.replace(/[,.;\s]+$/, '').trim();
  
  // 4. Replace multiple spaces with a single space
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  if (!cleaned) return '';
  
  // 5. Capitalize first letter, keep the rest lowercased
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

/**
 * Normalizes an ingredient string by cleaning punctuation and matching synonyms
 */
export function normalizeIngredient(name: string | undefined | null): string {
  if (!name) return '';
  
  // First, clean display name to discard parenthesis garbage
  const cleanDisplay = getDisplayIngredientName(name);
  const clean = cleanDisplay.toLowerCase()
    .replace(/[^а-яёa-z0-9\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ');

  // 1. Check direct synonym match
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    if (clean === canonical) return canonical;
    if (synonyms.some(syn => clean === syn)) {
      return canonical;
    }
  }

  return clean;
}

/**
 * Checks if two ingredient names represent the same physical item
 */
export function areIngredientsCompatible(ingA: string | undefined | null, ingB: string | undefined | null): boolean {
  if (!ingA || !ingB) return false;

  const cleanA = getDisplayIngredientName(ingA).toLowerCase();
  const cleanB = getDisplayIngredientName(ingB).toLowerCase();

  if (cleanA === cleanB) return true;

  // 1. Direct check of normalized terms
  const normA = normalizeIngredient(cleanA);
  const normB = normalizeIngredient(cleanB);

  if (normA === normB) return true;

  // 2. Substring matching
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // 3. Word stem overlap matching (handles permutations like "говяжий фарш" <-> "фарш из говядины")
  const wordsA = cleanA.split(/\s+/).filter(w => w.length > 2);
  const wordsB = cleanB.split(/\s+/).filter(w => w.length > 2);

  const stem = (w: string) => {
    return w
      .replace(/(ый|ое|ая|ова|ий|ых|ов|ам|ами|ах|ом|е|у|а|я|и|ы|ь|с|из|в|на|под)$/, '')
      .replace('говяж', 'говяд')
      .replace('куриц', 'кури')
      .replace('курин', 'кури');
  };

  const stemsA = wordsA.map(stem);
  const stemsB = wordsB.map(stem);

  const commonStems = stemsA.filter(s => stemsB.includes(s));

  if (commonStems.length > 0) {
    const highValueNouns = [
      'фарш', 'филе', 'картоф', 'лук', 'сыр', 'масл', 'кури', 
      'говяд', 'свин', 'чесн', 'яйц', 'помид', 'томат', 'огур'
    ];
    
    if (commonStems.some(s => highValueNouns.some(n => s.includes(n)))) {
      // Avoid mismatching different meats or oil types (e.g. "свиной фарш" vs "куриный фарш")
      const conflictStems = [
        ['свин', 'кури', 'говяд', 'индей', 'рыб', 'краб', 'крев'],
        ['зелен', 'красн', 'репчат'],
        ['сливочн', 'растительн', 'оливков']
      ];
      
      for (const conflicts of conflictStems) {
        const hasA = stemsA.some(s => conflicts.some(c => s.includes(c)));
        const hasB = stemsB.some(s => conflicts.some(c => s.includes(c)));
        if (hasA && hasB) {
          const valA = conflicts.find(c => stemsA.some(s => s.includes(c)));
          const valB = conflicts.find(c => stemsB.some(s => s.includes(c)));
          if (valA !== valB) return false;
        }
      }
      return true;
    }
  }

  return false;
}
