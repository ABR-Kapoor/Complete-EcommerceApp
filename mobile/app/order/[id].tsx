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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'AuraMart',
          headerTransparent: true,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: fonts.headingBold, fontSize: fontSize.xl, color: colors.primary },
          headerTintColor: colors.textPrimary,
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
            <TouchableOpacity style={{
                marginRight: spacing.md,
                width: 38,
                height: 38,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.full,
              }}>
              <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]} showsVerticalScrollIndicator={false}>
        {/* Back to orders shortcut */}
        <TouchableOpacity
          style={styles.backToOrdersRow}
          onPress={() => router.push('/(tabs)/orders')}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={colors.primary} />
          <Text style={styles.backToOrdersText}>Back to Orders</Text>
        </TouchableOpacity>

        {/* Order Header Card */}
        <View style={styles.orderHeaderCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderIdText}>Order #{order.id}</Text>
            <Text style={styles.orderDateText}>
              Placed on {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{order.status.toUpperCase()}</Text>
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
                          {stage.key === 'pending_payment' && 'Your order has been confirmed'}
                          {stage.key === 'confirmed' && `Payment of ₹${order.total_price} received`}
                          {stage.key === 'processing' && 'Your order is being prepared'}
                          {stage.key === 'shipped' && 'Package handed over to delivery partner'}
                          {stage.key === 'delivered' && 'Package delivered to address'}
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
            <TouchableOpacity>
              <Text style={styles.changeAddressText}>Change</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.addressName}>{(order as any).name || 'Customer'}</Text>
          <Text style={styles.addressSubtext}>
            {order.address?.street ? `${order.address.street}, ${order.address.city}, ${order.address.state} - ${order.address.zip_code}` : 'Address details recorded on checkout'}
          </Text>
          <Text style={styles.addressPhone}>+91 {(order as any).phone || '9876543210'}</Text>
        </View>

        {/* Order Items List */}
        <View style={styles.itemsCard}>
          <Text style={styles.itemsCardTitle}>Order Items</Text>
          {(order.order_items || []).map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Image
                source={{ uri: item.products?.image_url }}
                style={styles.itemImage}
                contentFit="contain"
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
  scrollContent: { padding: spacing['2xl'], paddingBottom: 60 },
  backToOrdersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backToOrdersText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
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
