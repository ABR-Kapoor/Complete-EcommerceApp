import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsService } from '../../services/products.service';
import { reviewsService } from '../../services/reviews.service';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Product, Review } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half-full' : 'star-outline'}
          size={16}
          color={colors.accent}
        />
      ))}
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const addToCart = useCartStore((s) => s.addToCart);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const isInWishlist = useWishlistStore((s) => s.productIds.includes(Number(id)));

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    const pid = Number(id);
    Promise.all([
      productsService.getById(pid),
      reviewsService.getProductReviews(pid),
    ])
      .then(([prod, revs]) => {
        setProduct(prod);
        setReviews(revs);
        // Load related products from same category
        if (prod?.category) {
          productsService
            .getAll({ category: prod.category })
            .then((all) => setRelatedProducts(all.filter((p) => p.id !== pid).slice(0, 6)));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = useCallback(async () => {
    if (!user?.id || !product) return;
    setAdding(true);
    try {
      await addToCart(user.id, product.id, quantity);
      Alert.alert('Added to Cart', `${product.title} (x${quantity}) added to your cart.`);
    } catch {
      Alert.alert('Error', 'Could not add to cart. Please try again.');
    } finally {
      setAdding(false);
    }
  }, [user, product, quantity]);

  const handleBuyNow = useCallback(async () => {
    if (!user?.id || !product) return;
    setAdding(true);
    try {
      await addToCart(user.id, product.id, quantity);
      router.push('/cart');
    } catch {
      Alert.alert('Error', 'Could not proceed. Please try again.');
    } finally {
      setAdding(false);
    }
  }, [user, product, quantity]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyText}>Product not found</Text>
      </View>
    );
  }

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.title} on AuraMart! Price: ₹${product.price}`,
      });
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Top Safe Area Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.category || 'Product Details'}
        </Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Share"
          >
            <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          {user && (
            <TouchableOpacity
              onPress={() => toggleWishlist(user.id, product.id)}
              style={styles.headerIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Wishlist"
            >
              <MaterialCommunityIcons
                name={isInWishlist ? 'heart' : 'heart-outline'}
                size={20}
                color={isInWishlist ? colors.error : colors.textPrimary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110, paddingTop: spacing.md }}>
        {/* White Card Container for Hero Image */}
        <View style={styles.imageCardContainer}>
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
            contentFit="contain"
            transition={300}
          />
        </View>

        {/* Product Details Section */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.packSizeSubtext}>Category: {product.category}</Text>

          {/* Rating */}
          <View style={styles.ratingBadgeRow}>
            {reviews.length > 0 ? (
              <View style={styles.ratingBadge}>
                <MaterialCommunityIcons name="star" size={14} color="#FFA800" />
                <Text style={styles.ratingBadgeText}>
                  {avgRating.toFixed(1)} ({reviews.length} review{reviews.length > 1 ? 's' : ''})
                </Text>
              </View>
            ) : (
              <View style={[styles.ratingBadge, { backgroundColor: colors.surfaceAlt }]}>
                <MaterialCommunityIcons name="star-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.ratingBadgeText, { color: colors.textSecondary }]}>
                  No reviews yet
                </Text>
              </View>
            )}
          </View>

          {/* Price & Stock Row */}
          <View style={styles.priceRow}>
            <View style={styles.priceGroup}>
              <Text style={styles.price}>₹{product.price.toLocaleString()}</Text>
              <Text style={styles.originalPrice}>₹{Math.round(product.price * 1.15)}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>10% OFF</Text>
              </View>
            </View>

            <View style={styles.inStockPill}>
              <MaterialCommunityIcons name="check-circle" size={14} color={colors.primary} />
              <Text style={styles.inStockText}>In Stock</Text>
            </View>
          </View>

          {/* Quantity & Quick Add Row */}
          <View style={styles.purchaseControlsRow}>
            <View style={styles.quantityPill}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <MaterialCommunityIcons name="minus" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.qtyNumber}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(quantity + 1)}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.mainAddToCartBtn}
              onPress={handleAddToCart}
              disabled={adding}
              activeOpacity={0.88}
            >
              {adding ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.mainAddToCartText}>Add to Cart</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Nav Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navTabsContainer}
        >
          <TouchableOpacity style={[styles.navTab, styles.navTabActive]}>
            <Text style={[styles.navTabText, styles.navTabTextActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navTab}>
            <Text style={styles.navTabText}>Specifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navTab}>
            <Text style={styles.navTabText}>Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navTab}>
            <Text style={styles.navTabText}>Safety Information</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navTab}>
            <Text style={styles.navTabText}>Reviews ({reviews.length})</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* About this product Card */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>About this product</Text>
          <Text style={styles.aboutDescription}>
            {product.description ||
              'Relieves mild to moderate pain and reduces fever. Suitable for adults and children as directed.'}
          </Text>

          <View style={styles.specGrid}>
            <View style={styles.specItem}>
              <MaterialCommunityIcons name="flask-outline" size={20} color={colors.primary} />
              <View style={styles.specContent}>
                <Text style={styles.specLabel}>Composition</Text>
                <Text style={styles.specValue}>Paracetamol 500mg</Text>
              </View>
            </View>

            <View style={styles.specItem}>
              <MaterialCommunityIcons name="pill" size={20} color={colors.primary} />
              <View style={styles.specContent}>
                <Text style={styles.specLabel}>Dosage Form</Text>
                <Text style={styles.specValue}>Tablet</Text>
              </View>
            </View>

            <View style={styles.specItem}>
              <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.primary} />
              <View style={styles.specContent}>
                <Text style={styles.specLabel}>Pack Size</Text>
                <Text style={styles.specValue}>Strip of 15 tablets</Text>
              </View>
            </View>

            <View style={styles.specItem}>
              <MaterialCommunityIcons name="factory" size={20} color={colors.primary} />
              <View style={styles.specContent}>
                <Text style={styles.specLabel}>Manufacturer</Text>
                <Text style={styles.specValue}>GSK Consumer Healthcare</Text>
              </View>
            </View>

            <View style={styles.specItem}>
              <MaterialCommunityIcons name="thermometer" size={20} color={colors.primary} />
              <View style={styles.specContent}>
                <Text style={styles.specLabel}>Storage</Text>
                <Text style={styles.specValue}>Store in a cool, dry place</Text>
              </View>
            </View>

            <View style={styles.specItem}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.primary} />
              <View style={styles.specContent}>
                <Text style={styles.specLabel}>Prescription</Text>
                <Text style={styles.specValue}>Not required</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Similar Products */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Similar Products</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {relatedProducts.map((rp) => (
                <TouchableOpacity
                  key={rp.id}
                  style={styles.relatedCard}
                  onPress={() => router.push(`/product/${rp.id}`)}
                >
                  <Image source={{ uri: rp.image_url }} style={styles.relatedImage} contentFit="contain" />
                  <Text style={styles.relatedName} numberOfLines={1}>{rp.title}</Text>
                  <Text style={styles.relatedPrice}>₹{rp.price.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  emptyText: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.lg },
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
  headerTitle: {
    flex: 1,
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
  },
  imageCardContainer: {
    width: SCREEN_WIDTH - spacing.md * 2,
    height: 260,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    ...shadows.sm,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 20,
    ...shadows.sm,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  packSizeSubtext: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  brandSubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  ratingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  ratingBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: '#9E6800',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  priceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  price: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    color: colors.primary,
  },
  originalPrice: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primary,
  },
  inStockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  inStockText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  purchaseControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  quantityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    height: 46,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyNumber: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
  },
  mainAddToCartBtn: {
    flex: 1,
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainAddToCartText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.surface,
  },
  navTabsContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  navTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  navTabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  navTabTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  aboutCard: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 20,
    ...shadows.sm,
  },
  aboutTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  aboutDescription: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  specGrid: {
    gap: spacing.md,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  specContent: {
    flex: 1,
  },
  specLabel: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  specValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginTop: 1,
  },
  relatedSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  relatedTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  relatedCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  relatedImage: {
    width: 140,
    height: 120,
    backgroundColor: colors.surfaceAlt,
  },
  relatedName: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    padding: spacing.sm,
    paddingBottom: 0,
  },
  relatedPrice: {
    fontFamily: fonts.heading,
    fontSize: fontSize.sm,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
