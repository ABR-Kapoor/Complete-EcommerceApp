import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';
import { productsService } from '../../services/products.service';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Product } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_PADDING = spacing.md; // 12px
const GAP = spacing.md; // 12px
const CARD_WIDTH = (SCREEN_WIDTH - PAGE_PADDING * 2 - GAP) / 2;

export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { productIds, loading: wishlistLoading, fetchWishlist, toggleWishlist } = useWishlistStore();
  const addToCart = useCartStore((s) => s.addToCart);
  const totalCartItems = useCartStore((s) => s.totalItems());

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback(async () => {
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const all = await productsService.getAll();
      const filtered = all.filter((p) => productIds.includes(p.id));
      setProducts(filtered);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productIds]);

  useEffect(() => {
    if (user?.id) {
      fetchWishlist(user.id);
    }
  }, [user?.id, fetchWishlist]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (user?.id) {
      fetchWishlist(user.id);
    }
    loadProducts();
  }, [user?.id, fetchWishlist, loadProducts]);

  const handleMoveToCart = async (product: Product) => {
    if (!user?.id) return;
    try {
      await addToCart(user.id, product.id, 1);
      Alert.alert('Added to Cart', `${product.title} added to your cart.`, [
        { text: 'Keep Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/cart') },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to add item to cart.');
    }
  };

  const handleMoveAllToCart = async () => {
    if (!user?.id || products.length === 0) return;
    try {
      for (const p of products) {
        await addToCart(user.id, p.id, 1);
      }
      Alert.alert('Success', 'All wishlist items have been added to your cart.', [
        { text: 'Continue', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/cart') },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to add some items to cart.');
    }
  };

  const handleRemove = (product: Product) => {
    if (!user?.id) return;
    toggleWishlist(user.id, product.id);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.88}
        accessibilityLabel={`${item.title}, ₹${item.price}`}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.productImage}
          contentFit="cover"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          transition={200}
        />
        {item.is_sale && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleBadgeText}>SALE</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => handleRemove(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Remove from wishlist"
        >
          <MaterialCommunityIcons name="heart" size={18} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.cardPriceRow}>
          <Text style={styles.productPrice}>₹{item.price.toLocaleString()}</Text>
          {item.avg_rating ? (
            <View style={styles.ratingInline}>
              <MaterialCommunityIcons name="star" size={12} color="#FFA800" />
              <Text style={styles.ratingInlineText}>{item.avg_rating.toFixed(1)}</Text>
            </View>
          ) : (
            <View style={styles.inStockBadge}>
              <Text style={styles.inStockText}>In Stock</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.cardAddToCartBtn}
          onPress={() => handleMoveToCart(item)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="cart-plus" size={15} color={colors.surface} />
          <Text style={styles.cardAddToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const isLoading = (wishlistLoading || loading) && !refreshing;

  return (
    <View style={styles.container}>
      {/* Safe Area Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wishlist</Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => router.push('/cart')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Shopping cart"
        >
          <MaterialCommunityIcons name="shopping-outline" size={22} color={colors.textPrimary} />
          {totalCartItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalCartItems > 9 ? '9+' : totalCartItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Subheader when items exist */}
      {products.length > 0 && (
        <View style={styles.subheaderRow}>
          <Text style={styles.subheaderTitle}>
            Saved Items <Text style={styles.subheaderCount}>({products.length})</Text>
          </Text>
          <TouchableOpacity
            onPress={handleMoveAllToCart}
            activeOpacity={0.8}
            style={styles.moveAllBtn}
          >
            <MaterialCommunityIcons name="cart-arrow-down" size={16} color={colors.primary} />
            <Text style={styles.moveAllText}>Add All to Cart</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && products.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="heart-outline" size={44} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySubtext}>
            Explore our healthcare essentials and tap the heart icon on any product to save it here.
          </Text>
          <TouchableOpacity
            style={styles.exploreCTA}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.85}
          >
            <Text style={styles.exploreCTAText}>Explore Healthcare Items</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
          ]}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textPrimary,
  },
  subheaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  subheaderTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  subheaderCount: {
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  moveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  moveAllText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.sm,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: spacing.md,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: colors.surfaceAlt,
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH * 0.95,
  },
  saleBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: '#EF4444',
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saleBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  heartButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  productInfo: {
    padding: spacing.md,
  },
  productTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  productPrice: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingInlineText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textSecondary,
  },
  inStockBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  inStockText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.primary,
  },
  cardAddToCartBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 7,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  cardAddToCartText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.xs,
    color: colors.surface,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['5xl'],
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing['2xl'],
  },
  exploreCTA: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  exploreCTAText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.surface,
  },
});
