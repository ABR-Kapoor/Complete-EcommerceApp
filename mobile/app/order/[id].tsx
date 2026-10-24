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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStageIdx = getStageIndex(order.status);
  const isCancelled = order.status === 'cancelled';
  const canCancel = ['pending_payment', 'confirmed'].includes(order.status);

  const createdDate = new Date(order.created_at);
  const totalItemCount = (order.order_items || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Safe Area Top Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/orders');
            }
          }}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Track Order #{order.id}</Text>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + spacing['3xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Verified Shipment Status Card (From Database) */}
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryBadgeRow}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryLabelText}>Shipment Status</Text>
              <Text style={styles.deliveryDateText}>
                {isCancelled ? 'Order Cancelled' : `Status: ${order.status.replace('_', ' ').toUpperCase()}`}
              </Text>
            </View>
            <View style={[styles.onTimeBadge, isCancelled && { backgroundColor: colors.error }]}>
              <Text style={styles.onTimeText}>{order.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.deliverySubtext}>
            AuraMart Pharmacy Delivery • {totalItemCount} item{totalItemCount > 1 ? 's' : ''} in package
          </Text>
        </View>

        {/* Order Header Summary */}
        <View style={styles.orderHeaderCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderIdText}>Order #{order.id}</Text>
            <Text style={styles.orderDateText}>
              Placed on {createdDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.statusPill, isCancelled && { backgroundColor: colors.errorSoft }]}>
            <Text style={[styles.statusPillText, isCancelled && { color: colors.error }]}>
              {order.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Vertical Timeline Card */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineCardTitle}>Order Tracking</Text>

          {isCancelled ? (
            <View style={styles.cancelledBox}>
              <MaterialCommunityIcons name="close-circle-outline" size={24} color={colors.error} />
              <Text style={styles.cancelledText}>This order has been cancelled.</Text>
            </View>
          ) : (
            <View style={styles.verticalTimelineContainer}>
              {STATUS_STAGES.map((stage, index) => {
                const isActive = index <= currentStageIdx;
                const isCurrent = index === currentStageIdx;
                const isLast = index === STATUS_STAGES.length - 1;

                return (
                  <View key={stage.key} style={styles.timelineRow}>
                    <View style={styles.timelineLeftColumn}>
                      <View style={[styles.nodeCircle, isActive && styles.nodeCircleActive]}>
                        <MaterialCommunityIcons
                          name={isActive ? "check" : "circle-outline"}
                          size={14}
                          color={isActive ? colors.surface : colors.textTertiary}
                        />
                      </View>
                      {!isLast && <View style={[styles.verticalLine, isActive && styles.verticalLineActive]} />}
                    </View>

                    <View style={styles.timelineContent}>
                      <Text style={[styles.stageTitle, isCurrent && styles.stageTitleCurrent]}>
                        {stage.label}
                      </Text>
                      {isActive && (
                        <Text style={styles.stageSubtitle}>
                          {stage.key === 'pending_payment' && 'Your order has been placed successfully'}
                          {stage.key === 'confirmed' && `Payment of ₹${order.total_price} verified`}
                          {stage.key === 'processing' && 'Pharmacy team is packing your items'}
                          {stage.key === 'shipped' && 'Handed over to courier delivery partner'}
                          {stage.key === 'delivered' && 'Package delivered to your address'}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Delivery Address Card */}
        <View style={styles.addressCard}>
          <View style={styles.addressCardHeader}>
            <Text style={styles.addressCardTitle}>Delivery Address</Text>
          </View>
          <Text style={styles.addressName}>{(order as any).name || user?.fullName || 'Customer'}</Text>
          <Text style={styles.addressSubtext}>
            {order.address?.street
              ? `${order.address.street}${order.address.city ? `, ${order.address.city}` : ''}${order.address.state ? `, ${order.address.state}` : ''}${order.address.zip_code ? ` - ${order.address.zip_code}` : ''}`
              : 'Delivery Address on file'}
          </Text>
          {((order as any).phone || user?.primaryPhoneNumber?.phoneNumber) ? (
            <Text style={styles.addressPhone}>
              {(order as any).phone ? `+91 ${(order as any).phone}` : user?.primaryPhoneNumber?.phoneNumber}
            </Text>
          ) : null}
        </View>

        {/* Order Items & Product Delivery List */}
        <View style={styles.itemsCard}>
          <Text style={styles.itemsCardTitle}>Items in this Shipment ({totalItemCount})</Text>
          {(order.order_items || []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Image
                source={{ uri: item.products?.image_url }}
                style={styles.itemImage}
                contentFit="cover"
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemCategory}>{item.products?.category || 'Healthcare'}</Text>
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

        {/* Cancel Action Button */}
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  scrollContent: { padding: spacing.lg, paddingBottom: 80 },
  deliveryCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(18, 70, 56, 0.12)',
    ...shadows.sm,
  },
  deliveryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  deliveryLabelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryDateText: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginTop: 1,
  },
  onTimeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  onTimeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.surface,
  },
  deliverySubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orderHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  orderIdText: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  orderDateText: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: '#ED6C02',
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  timelineCardTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  verticalTimelineContainer: {
    paddingLeft: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: spacing.md,
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  verticalLineActive: {
    backgroundColor: colors.primary,
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stageTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  stageTitleCurrent: {
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
  },
  stageSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addressCardTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  changeAddressText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  addressName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  addressSubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  addressPhone: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  itemsCardTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
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
    backgroundColor: colors.surfaceAlt,
  },
  itemDetails: { flex: 1 },
  itemCategory: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.lg,
  },
  backBtnText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.sm,
    color: colors.surface,
  },
});
