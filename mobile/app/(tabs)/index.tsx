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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsService } from '../../services/products.service';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { useVoiceSearchStore } from '../../store/voiceSearchStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Product, Category } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_PADDING = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - PAGE_PADDING * 2 - spacing.md) / 2;
const DEAL_CARD_WIDTH = 150;

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

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
  const addToCart = useCartStore((s) => s.addToCart);
  const isInWishlist = useWishlistStore((s) => s.productIds.includes(product.id));
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleQuickAdd = async () => {
    if (!user?.id) {
      router.push((`/product/${product.id}`) as any);
      return;
    }
    if (adding) return;
    setAdding(true);
    try {
      await addToCart(user.id, product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
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

        <View style={styles.cardPriceRow}>
          <Text style={styles.productPrice}>₹{product.price.toLocaleString()}</Text>
          {product.avg_rating ? (
            <View style={styles.ratingInline}>
              <MaterialCommunityIcons name="star" size={12} color="#FFA800" />
              <Text style={styles.ratingInlineText}>{product.avg_rating.toFixed(1)}</Text>
            </View>
          ) : (
            <Text style={styles.noRatingText}>No reviews</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.cardAddToCartBtn, added && { backgroundColor: '#059669' }]}
          onPress={handleQuickAdd}
          activeOpacity={0.85}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={styles.cardAddToCartText}>{added ? 'Added ✓' : 'Add to Cart'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────
// Top deal card
// ──────────────────────────────────
function DealCard({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.dealCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.dealImageWrap}>
        <Image
          source={{ uri: product.image_url }}
          style={styles.dealImage}
          contentFit="cover"
          transition={150}
        />
        <View style={styles.dealBadge}>
          <Text style={styles.dealBadgeText}>SALE</Text>
        </View>
      </View>
      <View style={styles.dealInfo}>
        <Text style={styles.dealTitle} numberOfLines={1}>
          {product.title}
        </Text>
        <Text style={styles.dealPrice}>₹{product.price.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────
// Category chip
// ──────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  'OTC Medicines': 'pill',
  'Prescription Medicines': 'file-document-outline',
  'First Aid': 'medical-bag',
  'Personal Care': 'bottle-tonic-outline',
  'Health Monitoring': 'heart-pulse',
  'Baby Care': 'baby-bottle-outline',
  'Healthcare Devices': 'stethoscope',
  Electronics: 'cellphone',
  Clothing: 'tshirt-crew',
  Home: 'home-outline',
  Books: 'book-open-variant',
};

function CategoryChip({ category, onPress }: { category: Category; onPress: () => void }) {
  const iconName = CATEGORY_ICONS[category.name] || 'tag-outline';
  return (
    <TouchableOpacity style={styles.categoryChip} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.categoryIconContainer}>
        <MaterialCommunityIcons name={iconName as any} size={24} color={colors.primary} />
      </View>
      <Text style={styles.categoryChipText} numberOfLines={2}>
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
  const insets = useSafeAreaInsets();
  const openVoice = useVoiceSearchStore((s) => s.open);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'best_seller' | 'sale'>('all');

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

  const profile = useUserStore((s) => s.profile);
  const fetchProfile = useUserStore((s) => s.fetchProfile);

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    if (user?.id) {
      fetchProfile(user.id);
    }
  }, [loadData, user?.id, fetchProfile]);
  const avatarUrl = profile?.avatar_url || user?.imageUrl;
  const firstName = profile?.name ? profile.name.split(' ')[0] : (user?.firstName || '');
  const greeting = firstName ? `Hi, ${firstName}` : 'Good health starts here';

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Skeleton greeting */}
        <View style={{ paddingHorizontal: PAGE_PADDING, marginVertical: spacing.md }}>
          <View style={{ width: 200, height: 24, backgroundColor: colors.skeleton, borderRadius: 6 }} />
          <View style={{ width: 160, height: 14, backgroundColor: colors.skeleton, borderRadius: 4, marginTop: 8 }} />
        </View>
        {/* Skeleton search */}
        <View style={[styles.searchBar, { backgroundColor: colors.skeleton, marginHorizontal: PAGE_PADDING }]} />
        {/* Skeleton categories */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: PAGE_PADDING, marginBottom: 24 }}>
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

  const filteredProducts = products.filter((p) => {
    if (activeTab === 'sale') return p.is_sale;
    if (activeTab === 'best_seller') return p.sold;
    return true;
  });

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
      {/* Greeting Header */}
      <View style={styles.greetingRow}>
        <View style={styles.greetingTextGroup}>
          <Text style={styles.greetingSubline}>{timeGreeting()}</Text>
          <Text style={styles.greetingTitle} numberOfLines={1}>
            {greeting}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.greetingAvatarBtn}
          onPress={() => router.push('/profile/edit')}
          activeOpacity={0.85}
          accessibilityLabel="Open profile settings"
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.greetingAvatar}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.greetingAvatarFallback}>
              <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Hero Text Search Bar with Mic button */}
      <View style={styles.searchBarWrapper}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.9}
          accessibilityLabel="Search products"
        >
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
          <Text style={styles.searchPlaceholder}>Search or tell your issues   👉🏻</Text>
          <TouchableOpacity
            style={styles.heroMicBtn}
            onPress={(e) => {
              e.stopPropagation();
              openVoice();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Search by voice"
          >
            <MaterialCommunityIcons name="microphone" size={18} color={colors.primary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* Top Deals */}
      {saleProducts.length > 0 && (
        <>
          <SectionHeader title="Top Deals" onSeeAll={() => setActiveTab('sale')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dealScrollContent}
          >
            {saleProducts.map((product) => (
              <DealCard
                key={product.id}
                product={product}
                onPress={() => router.push(`/product/${product.id}`)}
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <>
          <SectionHeader
            title="Shop by Category"
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

      {/* Filter Tabs & Products Grid */}
      <SectionHeader title="Featured Products" />

      {/* Filter Chips Bar */}
      <View style={styles.filterChipsRow}>
        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'all' && styles.filterChipActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.filterChipText, activeTab === 'all' && styles.filterChipTextActive]}>All Items</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'best_seller' && styles.filterChipActive]}
          onPress={() => setActiveTab('best_seller')}
        >
          <Text style={[styles.filterChipText, activeTab === 'best_seller' && styles.filterChipTextActive]}>Best Sellers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'sale' && styles.filterChipActive]}
          onPress={() => setActiveTab('sale')}
        >
          <Text style={[styles.filterChipText, activeTab === 'sale' && styles.filterChipTextActive]}>On Sale</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.productGrid}>
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </View>

      {filteredProducts.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="package-variant" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No products available</Text>
          <Text style={styles.emptySubtext}>Check back soon for new products</Text>
        </View>
      )}

      {/* Vocal for Local Healthcare Delivery Banner */}
      <View style={styles.vocalBannerContainer}>
        <Image
          source={require('../../assets/Vocal for Local Healthcare Delivery.png')}
          style={styles.vocalBannerImage}
          contentFit="contain"
          transition={200}
        />
      </View>

      {/* Trust Section */}
      <View style={styles.trustSection}>
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.primary} />
          <Text style={styles.trustItemTitle}>Genuine Products</Text>
          <Text style={styles.trustItemSub}>Verified suppliers</Text>
        </View>
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="lock-check-outline" size={22} color={colors.primary} />
          <Text style={styles.trustItemTitle}>Secure Payments</Text>
          <Text style={styles.trustItemSub}>Razorpay / UPI</Text>
        </View>
        <View style={styles.trustItem}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={22} color={colors.primary} />
          <Text style={styles.trustItemTitle}>Fast Delivery</Text>
          <Text style={styles.trustItemSub}>Across India</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 80, paddingTop: 0 },
  searchBarWrapper: {
    marginHorizontal: PAGE_PADDING,
    marginTop: 6,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  heroMicBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAGE_PADDING,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  greetingTextGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  greetingSubline: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  greetingTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginTop: 2,
  },
  greetingAvatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  greetingAvatar: {
    width: '100%',
    height: '100%',
  },
  greetingAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealScrollContent: {
    paddingHorizontal: PAGE_PADDING,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  dealCard: {
    width: DEAL_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  dealImageWrap: {
    position: 'relative',
    backgroundColor: colors.surfaceAlt,
  },
  dealImage: {
    width: '100%',
    height: 104,
  },
  dealBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: '#EF4444',
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dealBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  dealInfo: {
    padding: spacing.md,
  },
  dealTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  dealPrice: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PAGE_PADDING,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  seeAllText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  categoryScrollContent: {
    paddingHorizontal: PAGE_PADDING,
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  categoryChip: {
    alignItems: 'center',
    width: 82,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  categoryChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  filterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: PAGE_PADDING,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  horizontalProductScroll: {
    paddingHorizontal: PAGE_PADDING,
    marginBottom: spacing.xl,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PAGE_PADDING,
    gap: spacing.md,
    rowGap: spacing.lg,
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
  wishlistButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
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
    marginBottom: 2,
  },
  productPrice: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  cardPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
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
  noRatingText: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.textTertiary,
  },
  cardAddToCartBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 7,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cardAddToCartText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.xs,
    color: colors.surface,
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
  vocalBannerContainer: {
    width: '100%',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vocalBannerImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  trustItem: {
    alignItems: 'center',
    flex: 1,
  },
  trustItemTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  trustItemSub: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 1,
  },
});
