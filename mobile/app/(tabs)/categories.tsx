import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsService } from '../../services/products.service';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Category } from '../../types';

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: 'cellphone',
  Clothing: 'tshirt-crew',
  Home: 'home-outline',
  Books: 'book-open-variant',
  Ayurveda: 'leaf',
  Wellness: 'heart-pulse',
  Medicines: 'pill',
  'Healthcare Devices': 'medical-bag',
  'Personal Care': 'face-woman-shimmer',
  Nutrition: 'food-apple-outline',
};

const CATEGORY_COLORS = [
  colors.primarySoft,
  colors.accentSoft,
  colors.infoSoft,
  colors.successSoft,
  colors.warningSoft,
  colors.errorSoft,
];

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsService.getCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      numColumns={2}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.columnWrapper}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.centered}>
          <MaterialCommunityIcons name="tag-off-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No categories found</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const iconName = CATEGORY_ICONS[item.name] || 'tag-outline';
        const bgColor = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/category/${item.name}`)}
            activeOpacity={0.85}
            accessibilityLabel={`Category: ${item.name}`}
          >
            <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
              <MaterialCommunityIcons name={iconName as any} size={32} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{item.name}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  listContent: { padding: spacing['2xl'], paddingBottom: 130 },
  columnWrapper: { gap: spacing.md, marginBottom: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
});
