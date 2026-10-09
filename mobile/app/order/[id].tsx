import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ordersService } from '../../services/orders.service';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Order } from '../../types';

const STATUS_STAGES = [
  { key: 'pending_payment', label: 'Order Placed', icon: 'clipboard-check-outline' },
  { key: 'confirmed', label: 'Confirmed', icon: 'check-circle-outline' },
  { key: 'processing', label: 'Processing', icon: 'package-variant' },
  { key: 'shipped', label: 'Shipped', icon: 'truck-delivery-outline' },
  { key: 'delivered', label: 'Delivered', icon: 'home-city-outline' },
];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      if (!user?.id || !id) return;
      try {
        const userOrders = await ordersService.getUserOrders(user.id);
        const match = userOrders.find((o: Order) => o.id.toString() === id);
        setOrder(match || null);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [user?.id, id]);

  const handleCancelOrder = () => {
    if (!order) return;
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await ordersService.cancelOrder(order.id);
              setOrder({ ...order, status: 'cancelled' });
              Alert.alert('Success', 'Order has been cancelled.');
            } catch {
              Alert.alert('Error', 'Unable to cancel order.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStageIndex = (status: string) => {
    const idx = STATUS_STAGES.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.emptyTitle}>Order Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStageIdx = getStageIndex(order.status);
  const isCancelled = order.status === 'cancelled';
  const canCancel = ['pending_payment', 'confirmed'].includes(order.status);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Order #${order.id}`,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.heading, fontSize: fontSize.lg },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card & Timeline */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isCancelled
                    ? colors.errorSoft
                    : order.status === 'delivered'
                    ? colors.primarySoft
                    : colors.accentSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: isCancelled
                      ? colors.error
                      : order.status === 'delivered'
                      ? colors.primary
                      : colors.accent,
                  },
                ]}
              >
                {order.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {isCancelled ? (
            <View style={styles.cancelledBox}>
              <MaterialCommunityIcons name="close-circle-outline" size={24} color={colors.error} />
              <Text style={styles.cancelledText}>This order has been cancelled.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {STATUS_STAGES.map((stage, index) => {
                const isActive = index <= currentStageIdx;
                return (
                  <View key={stage.key} style={styles.timelineStep}>
                    <View
                      style={[
                        styles.timelineIcon,
                        isActive && styles.timelineIconActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={stage.icon as any}
                        size={18}
                        color={isActive ? colors.surface : colors.textTertiary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isActive && styles.timelineLabelActive,
                      ]}
                    >
                      {stage.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ordered Items</Text>
          {(order.order_items || []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Image
                source={{ uri: item.products?.image_url }}
                style={styles.itemImage}
                contentFit="cover"
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.products?.title || 'Product'}
                </Text>
                <Text style={styles.itemMeta}>
                  Qty: {item.quantity} × ₹{item.price.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>
                ₹{(item.quantity * item.price).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment & Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{order.total_price.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>FREE</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Method</Text>
            <Text style={styles.summaryValue}>
              {order.payment_method?.toUpperCase() || 'COD'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{order.total_price.toLocaleString()}</Text>
          </View>
        </View>

        {/* Cancel Button if applicable */}
        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && styles.btnDisabled]}
            onPress={handleCancelOrder}
            disabled={cancelling}
            activeOpacity={0.88}
          >
            {cancelling ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing['2xl'] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing['2xl'],
    marginBottom: spacing['2xl'],
    ...shadows.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSize.xs,
  },
  cancelledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorSoft,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  cancelledText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  timelineStep: { alignItems: 'center', flex: 1 },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  timelineIconActive: { backgroundColor: colors.primary },
  timelineLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  timelineLabelActive: {
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.skeleton,
  },
  itemDetails: { flex: 1 },
  itemTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  itemMeta: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemSubtotal: {
    fontFamily: fonts.heading,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalLabel: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.primary,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  cancelBtnText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.error,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  backBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  backBtnText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.sm,
    color: colors.surface,
  },
});
