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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsService } from '../../services/products.service';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Category } from '../../types';

const CATEGORY_DETAILS: Record<string, { icon: string; subtitle: string }> = {
  'OTC Medicines': { icon: 'pill', subtitle: 'Everyday non-prescription essentials' },
  'Prescription Medicines': { icon: 'file-document-outline', subtitle: 'Prescription & specialized medicines' },
  'First Aid': { icon: 'medical-bag', subtitle: 'Essential medical supplies & bandages' },
  'Personal Care': { icon: 'bottle-tonic-outline', subtitle: 'Skincare, hygiene & wellness' },
  'Health Monitoring': { icon: 'heart-pulse', subtitle: 'Monitors, testers & diagnostic devices' },
  'Baby Care': { icon: 'baby-bottle-outline', subtitle: 'Gentle care for your little one' },
  'Healthcare Devices': { icon: 'stethoscope', subtitle: 'Better living & medical equipment' },
};

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={[styles.listContent, { paddingTop: insets.top + spacing.sm }]}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.centered}>
          <MaterialCommunityIcons name="tag-off-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No categories found</Text>
        </View>
      }
      renderItem={({ item }) => {
        const details = CATEGORY_DETAILS[item.name] || {
          icon: 'tag-outline',
          subtitle: 'Explore products in this category',
        };
        return (
          <TouchableOpacity
            style={styles.categoryRowCard}
            onPress={() => router.push(`/category/${item.name}`)}
            activeOpacity={0.85}
            accessibilityLabel={`Category: ${item.name}`}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name={details.icon as any} size={24} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{details.subtitle}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  listContent: { padding: spacing['2xl'], paddingBottom: 130 },
  categoryRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
});
