import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCartStore } from '../../store/cartStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { CartItem } from '../../types';

function CartItemCard({ item }: { item: CartItem }) {
  const { user } = useUser();
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const handleRemove = () => {
    Alert.alert('Remove Item', `Remove ${item.products.title} from cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => user && removeItem(user.id, item.id),
      },
    ]);
  };

  return (
    <View style={styles.cartItem}>
      <Image
        source={{ uri: item.products.image_url }}
        style={styles.itemImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.products.title}
        </Text>
        <Text style={styles.itemPrice}>₹{item.products.price.toLocaleString()}</Text>

        <View style={styles.itemActions}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => {
                if (!user) return;
                if (item.quantity <= 1) {
                  handleRemove();
                } else {
                  updateQuantity(user.id, item.id, item.quantity - 1);
                }
              }}
            >
              <MaterialCommunityIcons name="minus" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => user && updateQuantity(user.id, item.id, item.quantity + 1)}
            >
              <MaterialCommunityIcons name="plus" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { user } = useUser();
  const items = useCartStore((s) => s.items);
  const loading = useCartStore((s) => s.loading);
  const subtotal = useCartStore((s) => s.subtotal());
  const totalItems = useCartStore((s) => s.totalItems());

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Cart' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Cart (${totalItems})` }} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <CartItemCard item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cart-outline" size={56} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtext}>Explore healthcare essentials</Text>
            <TouchableOpacity
              style={styles.exploreCTA}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.85}
            >
              <Text style={styles.exploreCTAText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Summary & Checkout */}
      {items.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => router.push('/checkout/address')}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  listContent: { padding: spacing['2xl'], paddingBottom: spacing['6xl'] },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  itemImage: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.skeleton,
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.lg,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  itemPrice: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['6xl'],
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
  exploreCTA: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    marginTop: spacing['2xl'],
  },
  exploreCTAText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textInverse,
  },
  summaryBar: {
    backgroundColor: colors.surface,
    padding: spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.xl,
    color: colors.primary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkoutText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textInverse,
  },
});
