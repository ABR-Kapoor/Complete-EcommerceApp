import { useEffect } from 'react';
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
import { useUser } from '@clerk/expo';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';

import CheckoutJourneyStepper from '../../components/CheckoutJourneyStepper';

export default function CheckoutReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { items: cartItems, subtotal } = useCartStore();
  const { address, profile, fetchAddress } = useUserStore();

  useEffect(() => {
    if (!address) {
      fetchAddress(user?.id || 'guest');
    }
  }, [address, user?.id, fetchAddress]);

  const total = subtotal();
  const displayPhone =
    address?.phone || profile?.phone || user?.primaryPhoneNumber?.phoneNumber || '';

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

      {/* Modern Journey Timeline Stepper */}
      <CheckoutJourneyStepper currentStep={2} addressDone={true} />

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
              <Text style={styles.phoneText}>
                Phone: {displayPhone || 'Not provided (tap Change)'}
              </Text>
            </View>
          ) : (
            <Text style={styles.noAddress}>No address selected</Text>
          )}
        </View>

        {/* Items Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Items ({cartItems.length})</Text>

          {cartItems.map((item) => {
            const title = item.products?.title || (item as any).title || 'Product';
            const price = Number(item.products?.price ?? (item as any).price ?? 0);
            const imageUrl = item.products?.image_url || (item as any).image_url || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80';
            return (
              <View key={item.id} style={styles.itemRow}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {title}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Qty: {item.quantity} × ₹{price.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>
                  ₹{(item.quantity * price).toLocaleString()}
                </Text>
              </View>
            );
          })}
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
    paddingHorizontal: spacing.md,
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
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 40 },
  stepIndicator: { marginBottom: spacing.md },
  stepText: { fontFamily: fonts.bodyBold, fontSize: fontSize.xs, color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
