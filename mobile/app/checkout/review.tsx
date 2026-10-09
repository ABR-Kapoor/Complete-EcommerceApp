import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';

export default function CheckoutReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items: cartItems, subtotal } = useCartStore();
  const { address } = useUserStore();

  const total = subtotal();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Step 2: Review Order',
          headerTransparent: true,
          headerShadowVisible: false,
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
        }}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step 2 of 3</Text>
        </View>

        {/* Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => router.push('/checkout/address')}>
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>
          </View>

          {address ? (
            <View style={styles.addressInfo}>
              <Text style={styles.addressText}>{address.street}</Text>
              <Text style={styles.addressText}>
                {address.city}, {address.state} - {address.zip_code}
              </Text>
              <Text style={styles.phoneText}>Phone: {address.phone}</Text>
            </View>
          ) : (
            <Text style={styles.noAddress}>No address selected</Text>
          )}
        </View>

        {/* Items Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Items ({cartItems.length})</Text>

          {cartItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Image
                source={{ uri: item.products.image_url }}
                style={styles.itemImage}
                contentFit="cover"
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.products.title}
                </Text>
                <Text style={styles.itemMeta}>
                  Qty: {item.quantity} × ₹{item.products.price.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>
                ₹{(item.quantity * item.products.price).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Total Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{total.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping Charges</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>FREE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => router.push('/checkout/payment')}
          activeOpacity={0.88}
        >
          <View style={styles.btnRow}>
            <Text style={styles.nextButtonText}>Proceed to Payment</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={colors.surface} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing['2xl'], paddingBottom: 60 },
  stepIndicator: { marginBottom: spacing.md },
  stepText: { fontFamily: fonts.bodyBold, fontSize: fontSize.xs, color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing['2xl'],
    marginBottom: spacing['2xl'],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  changeLink: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  addressInfo: { gap: 2 },
  addressText: { fontFamily: fonts.body, fontSize: fontSize.md, color: colors.textPrimary },
  phoneText: { fontFamily: fonts.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  noAddress: { fontFamily: fonts.body, fontSize: fontSize.sm, color: colors.error },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.skeleton,
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontFamily: fonts.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  itemMeta: { fontFamily: fonts.body, fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  itemSubtotal: { fontFamily: fonts.heading, fontSize: fontSize.sm, color: colors.textPrimary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { fontFamily: fonts.body, fontSize: fontSize.sm, color: colors.textSecondary },
  summaryValue: { fontFamily: fonts.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  totalLabel: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.textPrimary },
  totalValue: { fontFamily: fonts.heading, fontSize: fontSize.lg, color: colors.primary },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nextButtonText: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.surface },
});
