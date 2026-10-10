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

import CheckoutJourneyStepper from '../../components/CheckoutJourneyStepper';

export default function CheckoutReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items: cartItems, subtotal } = useCartStore();
  const { address } = useUserStore();

  const total = subtotal();

  return (
    <View style={styles.container}>
      {/* Safe Area Top Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/checkout/address');
            }
          }}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Review</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Modern Journey Stepper */}
      <CheckoutJourneyStepper currentStep={2} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >

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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
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
