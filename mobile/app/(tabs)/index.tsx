import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsService } from '../../services/products.service';
import { useWishlistStore } from '../../store/wishlistStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Product, Category } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing['2xl'] * 2 - spacing.md) / 2;

// ──────────────────────────────────
// Skeleton placeholder
// ──────────────────────────────────
function SkeletonCard() {
  return (
    <View style={[styles.productCard, { overflow: 'hidden' }]}>
      <View style={[styles.productImage, { backgroundColor: colors.skeleton }]} />
      <View style={styles.productInfo}>
        <View style={{ width: '80%', height: 14, backgroundColor: colors.skeleton, borderRadius: 4 }} />
        <View style={{ width: '50%', height: 12, backgroundColor: colors.skeleton, borderRadius: 4, marginTop: 8 }} />
      </View>
    </View>
  );
}

// ──────────────────────────────────
// Product card
// ──────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { user } = useUser();
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const isInWishlist = useWishlistStore((s) => s.productIds.includes(product.id));

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={0.88}
      accessibilityLabel={`${product.title}, ₹${product.price}`}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.image_url }}
          style={styles.productImage}
          contentFit="cover"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          transition={200}
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
            accessibilityLabel={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <MaterialCommunityIcons
              name={isInWishlist ? 'heart' : 'heart-outline'}
              size={20}
              color={isInWishlist ? colors.error : colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.productPrice}>₹{product.price.toLocaleString()}</Text>
        {product.stock !== undefined && product.stock <= 0 && (
          <Text style={styles.outOfStock}>Out of stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────
// Category chip
// ──────────────────────────────────
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

function CategoryChip({ category, onPress }: { category: Category; onPress: () => void }) {
  const iconName = CATEGORY_ICONS[category.name] || 'tag-outline';
  return (
    <TouchableOpacity style={styles.categoryChip} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.categoryIconContainer}>
        <MaterialCommunityIcons name={iconName as any} size={24} color={colors.primary} />
      </View>
      <Text style={styles.categoryChipText} numberOfLines={1}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────
// Section header
// ──────────────────────────────────
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ──────────────────────────────────
// Home Screen
// ──────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([
        productsService.getCategories(),
        productsService.getAll(),
      ]);
      setCategories(cats);
      setProducts(prods);
      setSaleProducts(prods.filter((p) => p.is_sale));
    } catch (err) {
      if (__DEV__) console.log('Home load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const greeting = user?.firstName ? `Hi, ${user.firstName}` : 'Good health starts here';

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Skeleton greeting */}
        <View style={styles.greetingSection}>
          <View style={{ width: 200, height: 24, backgroundColor: colors.skeleton, borderRadius: 6 }} />
          <View style={{ width: 160, height: 14, backgroundColor: colors.skeleton, borderRadius: 4, marginTop: 8 }} />
        </View>
        {/* Skeleton search */}
        <View style={[styles.searchBar, { backgroundColor: colors.skeleton }]} />
        {/* Skeleton categories */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: spacing['2xl'], marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: 72, height: 88, backgroundColor: colors.skeleton, borderRadius: radius.md }} />
          ))}
        </View>
        {/* Skeleton products */}
        <View style={styles.productGrid}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>{greeting}</Text>
        <Text style={styles.greetingSubtext}>Discover trusted healthcare products</Text>
      </View>

      {/* Search Bar (navigates to search tab) */}
      <View style={{ zIndex: 1, marginTop: -32 }}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.85}
          accessibilityLabel="Search products"
        >
          <MaterialCommunityIcons name="magnify" size={24} color={colors.primary} />
          <Text style={styles.searchPlaceholder}>Search products...</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <>
          <SectionHeader
            title="Categories"
            onSeeAll={() => router.push('/(tabs)/categories')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categories.map((cat) => (
              <CategoryChip
                key={cat.id}
                category={cat}
                onPress={() => router.push(`/category/${cat.name}`)}
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* Featured / Sale Products */}
      {saleProducts.length > 0 && (
        <>
          <SectionHeader title="Featured Deals" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalProductScroll}
          >
            {saleProducts.map((product) => (
              <View key={product.id} style={{ width: CARD_WIDTH, marginRight: spacing.md }}>
                <ProductCard product={product} />
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* All Products */}
      <SectionHeader title="All Products" />
      <View style={styles.productGrid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </View>

      {products.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="package-variant" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No products available</Text>
          <Text style={styles.emptySubtext}>Check back soon for new products</Text>
        </View>
      )}

      {/* Trust Section */}
      <View style={styles.trustSection}>
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="shield-check-outline" size={20} color={colors.primary} />
          <Text style={styles.trustText}>Authentic Products</Text>
        </View>
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="lock-outline" size={20} color={colors.primary} />
          <Text style={styles.trustText}>Secure Checkout</Text>
        </View>
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={20} color={colors.primary} />
          <Text style={styles.trustText}>Order Tracking</Text>
        </View>
      </View>

      <View style={{ height: spacing['3xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 130 },
  greetingSection: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  greetingText: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  greetingSubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing['2xl'],
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    height: 56,
    marginBottom: spacing['2xl'],
    borderWidth: 0,
    ...shadows.md,
  },
  searchPlaceholder: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginLeft: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  seeAllText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  categoryScrollContent: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  categoryChip: {
    alignItems: 'center',
    width: 76,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  horizontalProductScroll: {
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.md,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH * 1.1,
    backgroundColor: colors.skeleton,
  },
  saleBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  saleBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  wishlistButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: spacing.md,
  },
  productTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  productPrice: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  outOfStock: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
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
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing['2xl'],
    marginTop: spacing['2xl'],
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
  },
  trustItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  trustText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.primary,
    textAlign: 'center',
  },
});
