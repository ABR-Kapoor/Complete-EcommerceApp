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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  const items = useCartStore((s) => s.items);
  const loading = useCartStore((s) => s.loading);
  const subtotal = useCartStore((s) => s.subtotal());
  const totalItems = useCartStore((s) => s.totalItems());
  const clearLocal = useCartStore((s) => s.clearLocal);

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
      <Stack.Screen
        options={{
          headerTitle: 'AuraMart',
          headerTransparent: true,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.headingBold, fontSize: fontSize.xl, color: colors.primary },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              style={{
                marginLeft: spacing.md,
                width: 38,
                height: 38,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.full,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')} style={{
                marginRight: spacing.md,
                width: 38,
                height: 38,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.full,
              }}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Stepper Progress Bar */}
      <View style={[styles.stepperContainer, { paddingTop: insets.top + 60 }]}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <MaterialCommunityIcons name="cart-outline" size={14} color={colors.surface} />
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Cart</Text>
        </View>

        <View style={styles.stepLine} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
          <Text style={styles.stepLabel}>Checkout</Text>
        </View>

        <View style={styles.stepLine} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNumber}>3</Text>
          </View>
          <Text style={styles.stepLabel}>Payment</Text>
        </View>

        <View style={styles.stepLine} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNumber}>4</Text>
          </View>
          <Text style={styles.stepLabel}>Confirmation</Text>
        </View>
      </View>

      {/* Cart Subheader */}
      {items.length > 0 && (
        <View style={styles.cartSubheader}>
          <Text style={styles.cartSubheaderTitle}>
            Your Cart <Text style={{ color: colors.textSecondary, fontFamily: fonts.body }}>({totalItems} items)</Text>
          </Text>
          <TouchableOpacity onPress={() => user && clearLocal()}>
            <Text style={styles.clearCartText}>Clear Cart</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Sticky Bottom Bar */}
      {items.length > 0 && (
        <View style={styles.summaryBar}>
          <TouchableOpacity
            style={styles.continueShoppingBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => router.push('/checkout/address')}
            activeOpacity={0.88}
          >
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          </TouchableOpacity>

          {/* Razorpay Trust Badge */}
          <View style={styles.trustBadgeRow}>
            <MaterialCommunityIcons name="shield-check" size={14} color={colors.primary} />
            <Text style={styles.trustBadgeText}>Secured by </Text>
            <Text style={[styles.trustBadgeText, { fontFamily: fonts.headingBold, color: colors.textPrimary }]}>Razorpay</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
              <MaterialCommunityIcons name="credit-card-outline" size={16} color={colors.textSecondary} />
              <MaterialCommunityIcons name="bank" size={16} color={colors.textSecondary} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  stepLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  stepLabelActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  cartSubheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  cartSubheaderTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  clearCartText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.error,
  },
  listContent: { paddingHorizontal: spacing['2xl'], paddingBottom: 140 },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  itemImage: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
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
    marginTop: spacing.xs,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    minWidth: 16,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['5xl'],
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
    borderRadius: radius.full,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.lg,
  },
  continueShoppingBtn: {
    paddingVertical: 4,
  },
  continueShoppingText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 50,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textInverse,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trustBadgeText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
  },
});
