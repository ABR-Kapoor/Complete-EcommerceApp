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
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerRight: () =>
            user ? (
              <TouchableOpacity
                onPress={() => toggleWishlist(user.id, product.id)}
                style={styles.headerIconButton}
              >
                <MaterialCommunityIcons
                  name={isInWishlist ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isInWishlist ? colors.error : colors.textPrimary}
                />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Product Image */}
        <Image
          source={{ uri: product.image_url }}
          style={styles.productImage}
          contentFit="cover"
          transition={300}
        />

        {/* Sale badge */}
        {product.is_sale && (
          <View style={styles.saleBadge}>
            <Text style={styles.saleBadgeText}>SALE</Text>
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.title}>{product.title}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price.toLocaleString()}</Text>
            {reviews.length > 0 && (
              <View style={styles.ratingRow}>
                <StarRating rating={avgRating} />
                <Text style={styles.ratingText}>
                  {avgRating.toFixed(1)} ({reviews.length})
                </Text>
              </View>
            )}
          </View>

          {/* Stock */}
          {product.stock !== undefined && (
            <View style={styles.stockRow}>
              <MaterialCommunityIcons
                name={product.stock > 0 ? 'check-circle' : 'close-circle'}
                size={16}
                color={product.stock > 0 ? colors.success : colors.error}
              />
              <Text style={[styles.stockText, { color: product.stock > 0 ? colors.success : colors.error }]}>
                {product.stock > 0
                  ? product.stock <= 5
                    ? `Only ${product.stock} left`
                    : 'In Stock'
                  : 'Out of Stock'}
              </Text>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)} activeOpacity={0.85}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text
                style={styles.description}
                numberOfLines={descExpanded ? undefined : 3}
              >
                {product.description}
              </Text>
              <Text style={styles.readMore}>
                {descExpanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Quantity */}
          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <MaterialCommunityIcons name="minus" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text style={styles.reviewsTitle}>Reviews ({reviews.length})</Text>
            {reviews.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>
                    {review.users?.name || 'Customer'}
                  </Text>
                  <StarRating rating={review.rating} />
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Related Products */}
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
                  <Image source={{ uri: rp.image_url }} style={styles.relatedImage} contentFit="cover" />
                  <Text style={styles.relatedName} numberOfLines={1}>{rp.title}</Text>
                  <Text style={styles.relatedPrice}>₹{rp.price.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          disabled={adding || (product.stock !== undefined && product.stock <= 0)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="cart-plus" size={20} color={colors.primary} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buyNowButton, (product.stock !== undefined && product.stock <= 0) && styles.disabledButton]}
          onPress={handleBuyNow}
          disabled={adding || (product.stock !== undefined && product.stock <= 0)}
          activeOpacity={0.85}
        >
          <Text style={styles.buyNowText}>
            {product.stock !== undefined && product.stock <= 0 ? 'Out of Stock' : 'Buy Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  emptyText: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.lg },
  headerIconButton: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: radius.full, marginRight: spacing.sm,
  },
  productImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.85, backgroundColor: colors.skeleton },
  saleBadge: {
    position: 'absolute', top: spacing['6xl'], left: spacing.lg,
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  saleBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: fontSize.xs, color: colors.textPrimary, letterSpacing: 0.5 },
  infoSection: { padding: spacing['2xl'], backgroundColor: colors.surface },
  category: { fontFamily: fonts.bodyMedium, fontSize: fontSize.xs, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontFamily: fonts.headingBold, fontSize: fontSize.xl, color: colors.textPrimary, marginTop: spacing.sm, lineHeight: 28 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  price: { fontFamily: fonts.headingBold, fontSize: fontSize['2xl'], color: colors.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingText: { fontFamily: fonts.body, fontSize: fontSize.xs, color: colors.textSecondary },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  stockText: { fontFamily: fonts.bodyMedium, fontSize: fontSize.sm },
  descriptionLabel: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.textPrimary, marginTop: spacing['2xl'], marginBottom: spacing.sm },
  description: { fontFamily: fonts.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  readMore: { fontFamily: fonts.bodyMedium, fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.xs },
  quantitySection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing['2xl'], paddingTop: spacing['2xl'], borderTopWidth: 1, borderTopColor: colors.divider },
  quantityLabel: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.textPrimary },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  quantityButton: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  quantityValue: { fontFamily: fonts.heading, fontSize: fontSize.lg, color: colors.textPrimary, minWidth: 24, textAlign: 'center' },
  reviewsSection: { padding: spacing['2xl'], backgroundColor: colors.surface, marginTop: spacing.sm },
  reviewsTitle: { fontFamily: fonts.heading, fontSize: fontSize.lg, color: colors.textPrimary, marginBottom: spacing.lg },
  reviewCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  reviewerName: { fontFamily: fonts.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  reviewText: { fontFamily: fonts.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  relatedSection: { padding: spacing['2xl'] },
  relatedTitle: { fontFamily: fonts.heading, fontSize: fontSize.lg, color: colors.textPrimary, marginBottom: spacing.lg },
  relatedCard: { width: 140, backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', ...shadows.sm },
  relatedImage: { width: 140, height: 140, backgroundColor: colors.skeleton },
  relatedName: { fontFamily: fonts.bodyMedium, fontSize: fontSize.xs, color: colors.textPrimary, padding: spacing.sm, paddingBottom: 0 },
  relatedPrice: { fontFamily: fonts.heading, fontSize: fontSize.sm, color: colors.primary, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: spacing.lg, gap: spacing.md,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    ...shadows.lg,
  },
  addToCartButton: {
    flex: 1, flexDirection: 'row', height: 50, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  addToCartText: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.primary },
  buyNowButton: { flex: 1, height: 50, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  buyNowText: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.textInverse },
  disabledButton: { backgroundColor: colors.textTertiary },
});
