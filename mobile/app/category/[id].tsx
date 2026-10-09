import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsService } from '../../services/products.service';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Product } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing['2xl'] * 2 - spacing.md) / 2;

export default function CategoryProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategoryProducts = useCallback(async () => {
    if (!id) return;
    try {
      const data = await productsService.getAll({ category: id });
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCategoryProducts();
  }, [fetchCategoryProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategoryProducts();
  };

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.88}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.productImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>₹{item.price.toLocaleString()}</Text>
            {item.is_sale && <Text style={styles.saleTag}>SALE</Text>}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [router]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: id ? decodeURIComponent(id) : 'Category',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.heading, fontSize: fontSize.lg },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              style={{ marginRight: spacing.md }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="shape-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtext}>
            There are currently no products under this category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  listContent: { padding: spacing['2xl'], paddingBottom: spacing['4xl'] },
  columnWrapper: { gap: spacing.md, marginBottom: spacing.md },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: colors.skeleton,
  },
  productInfo: { padding: spacing.md },
  productTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  saleTag: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
