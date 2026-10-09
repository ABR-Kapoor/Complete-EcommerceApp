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
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';
import { productsService } from '../../services/products.service';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Product } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing['2xl'] * 2 - spacing.md) / 2;

export default function WishlistScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { productIds, loading: wishlistLoading, fetchWishlist, toggleWishlist } = useWishlistStore();
  const addToCart = useCartStore((s) => s.addToCart);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const all = await productsService.getAll();
      const filtered = all.filter((p) => productIds.includes(p.id));
      setProducts(filtered);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
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

  const handleMoveToCart = async (product: Product) => {
    if (!user?.id) return;
    try {
      await addToCart(user.id, product.id, 1);
      Alert.alert('Added to Cart', `${product.title} added to your cart.`);
    } catch {
      Alert.alert('Error', 'Failed to add item to cart.');
    }
  };

  const handleRemove = (product: Product) => {
    if (!user?.id) return;
    toggleWishlist(user.id, product.id);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.88}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.productImage}
          contentFit="cover"
          transition={200}
        />
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => handleRemove(item)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="heart" size={20} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productPrice}>₹{item.price.toLocaleString()}</Text>

        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => handleMoveToCart(item)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="cart-plus" size={16} color={colors.surface} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const isLoading = wishlistLoading || loading;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'My Wishlist',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.heading, fontSize: fontSize.lg },
        }}
      />

      {isLoading && products.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="heart-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySubtext}>
            Save items you like to view or purchase them later.
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.88}
          >
            <Text style={styles.exploreButtonText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
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
  heartButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.full,
    padding: spacing.xs,
  },
  productInfo: { padding: spacing.md },
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
    marginBottom: spacing.md,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  addToCartText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.surface,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  exploreButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.surface,
  },
});
