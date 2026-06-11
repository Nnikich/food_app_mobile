import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import { Clock, ChefHat, Crown } from 'lucide-react-native';
import { DIFFICULTY_LEVELS } from '../data/constants';
import { Recipe, Ingredient } from '../types';
import { getDisplayIngredientName } from '../utils/ingredientNormalizer';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
  missingIngredients?: Ingredient[];
  hidePremiumText?: boolean;
  subscription?: 'free' | 'premium';
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';

export default function RecipeCard({
  recipe,
  onClick,
  missingIngredients,
  hidePremiumText = false,
  subscription = 'free',
}: RecipeCardProps) {
  const [imgSrc, setImgSrc] = useState(recipe.imageUrl || FALLBACK_IMAGE);
  const difficulty = DIFFICULTY_LEVELS.find((d) => d.id === recipe.difficulty);
  const isPremium = recipe.tags?.includes('premium');
  const hasPremiumSub = subscription === 'premium';

  // Get difficulty styles
  const getDifficultyBadgeStyle = () => {
    switch (recipe.difficulty) {
      case 'easy':
        return styles.difficultyEasy;
      case 'hard':
        return styles.difficultyHard;
      default:
        return styles.difficultyMedium;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onClick}
      style={styles.card}
    >
      {/* Recipe Image Wrapper */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imgSrc }}
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Shadow Overlay */}
        <View style={styles.imageOverlay} />

        {/* Floating Top Badges */}
        <View style={styles.topBadges}>
          {/* Difficulty Badge */}
          <View style={[styles.badge, getDifficultyBadgeStyle()]}>
            <Text style={styles.badgeText}>{difficulty?.label || 'Средний'}</Text>
          </View>

          {/* Premium Badge */}
          {isPremium && (
            hidePremiumText ? (
              <View style={[styles.premiumIconCircle, hasPremiumSub ? styles.premiumGreen : styles.premiumOrange]}>
                <Crown size={14} color="#ffffff" fill="#ffffff" />
              </View>
            ) : (
              <View style={[styles.premiumBadge, hasPremiumSub ? styles.premiumGreen : styles.premiumOrange]}>
                <Crown size={12} color="#ffffff" fill="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.premiumText}>Premium</Text>
              </View>
            )
          )}
        </View>

        {/* Bottom Floating Stats */}
        <View style={styles.bottomStats}>
          <View style={styles.statTag}>
            <Clock size={11} color="#10b981" style={{ marginRight: 3 }} />
            <Text style={styles.statTagText}>{recipe.time} мин</Text>
          </View>
          <View style={styles.statTag}>
            <ChefHat size={11} color="#10b981" style={{ marginRight: 3 }} />
            <Text style={styles.statTagText}>{recipe.ingredients?.length || 0} ингр.</Text>
          </View>
        </View>
      </View>

      {/* Card Content details */}
      <View style={styles.content}>
        {/* Category Hashtags */}
        <View style={styles.tagsContainer}>
          {recipe.tags?.slice(0, 3).filter(t => t !== 'premium').map((tag) => (
            <View key={tag} style={styles.tagBadge}>
              <Text style={styles.tagText}>#{tag.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* Recipe Title */}
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Missing Ingredients alert box */}
        {missingIngredients && missingIngredients.length > 0 && (
          <View style={styles.missingContainer}>
            <View style={styles.missingHeaderRow}>
              <View style={styles.warningDot} />
              <Text style={styles.missingTitle}>Нужно докупить ({missingIngredients.length}):</Text>
            </View>
            <View style={styles.missingPills}>
              {missingIngredients.map((item) => (
                <View key={item.name} style={styles.missingPill}>
                  <Text style={styles.missingPillText}>
                    {getDisplayIngredientName(item.name)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '100%',
    marginBottom: 4,
  },
  imageContainer: {
    height: 220,
    width: '100%',
    position: 'relative',
    backgroundColor: '#cbd5e1',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  topBadges: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  difficultyEasy: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  difficultyMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  difficultyHard: {
    backgroundColor: 'rgba(225, 29, 72, 0.9)',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  premiumIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  premiumGreen: {
    backgroundColor: '#10b981',
  },
  premiumOrange: {
    backgroundColor: '#f97316',
  },
  premiumText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  bottomStats: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    zIndex: 10,
    gap: 8,
  },
  statTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statTagText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '700',
  },
  content: {
    padding: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#dcfce7',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
  },
  missingContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  missingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
    marginRight: 6,
  },
  missingTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  missingPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  missingPill: {
    backgroundColor: '#fef3c7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  missingPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#78350f',
  },
});
