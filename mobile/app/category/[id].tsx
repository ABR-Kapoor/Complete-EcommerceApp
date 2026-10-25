import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsService } from '../../services/products.service';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useNotification } from '../../context/NotificationContext';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Product } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - spacing.md) / 2;

const CATEGORY_ICONS: Record<string, string> = {
  'OTC Medicines': 'pill',
  'Prescription Medicines': 'file-document-outline',
  'First Aid': 'medical-bag',
  'Personal Care': 'bottle-tonic-outline',
  'Health Monitoring': 'heart-pulse',
  'Baby Care': 'baby-bottle-outline',
  'Healthcare Devices': 'stethoscope',
};

function CategoryProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { user } = useUser();
  const addToCart = useCartStore((s) => s.addToCart);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const isInWishlist = useWishlistStore((s) => s.productIds.includes(product.id));
  const { showToast } = useNotification();
  const [adding, setAdding] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleQuickAdd = async () => {
    if (!user?.id) {
      router.push(`/product/${product.id}`);
      return;
    }
    setAdding(true);
    try {
      await addToCart(user.id, product.id, 1);
      showToast('Added to Cart', `${product.title} has been added to your cart.`);
    } catch {
      // Handled in store
    } finally {
      setAdding(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={0.88}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imgError || !product.image_url ? 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80' : product.image_url }}
          style={styles.productImage}
          contentFit="cover"
          transition={200}
          onError={() => setImgError(true)}
        />
        {product.is_sale && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleBadgeText}>SALE</Text>
          </View>
        )}
        {user && (
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={() => toggleWishlist(user.id, product.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name={isInWishlist ? 'heart' : 'heart-outline'}
              size={18}
              color={isInWishlist ? colors.error : colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.title}
        </Text>

        <View style={styles.cardPriceRow}>
          <Text style={styles.productPrice}>₹{product.price.toLocaleString()}</Text>
          {product.avg_rating ? (
            <View style={styles.ratingInline}>
              <MaterialCommunityIcons name="star" size={12} color={colors.accent} />
              <Text style={styles.ratingInlineText}>{product.avg_rating.toFixed(1)}</Text>
            </View>
          ) : (
            <Text style={styles.noRatingText}>★ New</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.cardAddToCartBtn, adding && { opacity: 0.7 }]}
          onPress={handleQuickAdd}
          disabled={adding}
          activeOpacity={0.85}
        >
          {adding ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <MaterialCommunityIcons name="cart-plus" size={14} color={colors.surface} />
              <Text style={styles.cardAddToCartText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function CategoryProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const totalCartItems = useCartStore((s) => s.totalItems());

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categoryName = id ? decodeURIComponent(id) : 'Category';
  const categoryIcon = CATEGORY_ICONS[categoryName] || 'pill';

  const fetchCategoryProducts = useCallback(async () => {
    if (!id) return;
    try {
      const data = await productsService.getAll({ category: categoryName });
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryName]);

  useEffect(() => {
    fetchCategoryProducts();
  }, [fetchCategoryProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategoryProducts();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Safe Area Top Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/categories');
            }
          }}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.push('/cart')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="cart-outline" size={22} color={colors.textPrimary} />
          {totalCartItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalCartItems > 99 ? '99+' : totalCartItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Overview Strip */}
      <View style={styles.categoryBanner}>
        <View style={styles.bannerIconBox}>
          <MaterialCommunityIcons name={categoryIcon as any} size={20} color={colors.primary} />
        </View>
        <View style={styles.bannerTextBox}>
          <Text style={styles.bannerTitle}>{categoryName}</Text>
          <Text style={styles.bannerCount}>
            {loading ? 'Searching products...' : `${products.length} product${products.length === 1 ? '' : 's'} available`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading medicines & healthcare products...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="pill-off" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Products Found</Text>
          <Text style={styles.emptySubtext}>
            There are currently no products listed under {categoryName}. Check back soon or browse other categories!
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.replace('/(tabs)/categories')}
            activeOpacity={0.88}
          >
            <Text style={styles.browseBtnText}>Browse Other Categories</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <CategoryProductCard product={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + spacing['2xl'] },
          ]}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: spacing.sm,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md + 1,
    color: colors.textPrimary,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  cartBadgeText: {
    color: colors.surface,
    fontSize: 9,
    fontFamily: fonts.bodyBold,
  },
  categoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  bannerTextBox: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
  },
  bannerCount: {
    fontSize: fontSize.xs,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  columnWrapper: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.95,
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  saleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  saleBadgeText: {
    fontSize: 9,
    fontFamily: fonts.headingBold,
    color: colors.surface,
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  productInfo: {
    padding: spacing.sm,
  },
  productTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs + 1,
    color: colors.textPrimary,
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 4,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  productPrice: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.sm + 1,
    color: colors.primary,
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingInlineText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.textSecondary,
  },
  noRatingText: {
    fontSize: 10,
    fontFamily: fonts.bodyMedium,
    color: colors.textTertiary,
  },
  cardAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  cardAddToCartText: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.xs,
    color: colors.surface,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  browseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  browseBtnText: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.sm,
    color: colors.surface,
  },
});
