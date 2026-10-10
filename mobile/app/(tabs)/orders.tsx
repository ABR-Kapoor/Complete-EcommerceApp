import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ordersService } from '../../services/orders.service';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Order, OrderStatus } from '../../types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending_payment: { label: 'Pending', color: colors.warning, bg: colors.warningSoft, icon: 'clock-outline' },
  confirmed: { label: 'Confirmed', color: colors.info, bg: colors.infoSoft, icon: 'check-circle-outline' },
  processing: { label: 'Processing', color: colors.info, bg: colors.infoSoft, icon: 'cog-outline' },
  shipped: { label: 'Shipped', color: colors.primary, bg: colors.primarySoft, icon: 'truck-delivery-outline' },
  out_for_delivery: { label: 'Out for Delivery', color: colors.primary, bg: colors.primarySoft, icon: 'map-marker-radius-outline' },
  delivered: { label: 'Delivered', color: colors.success, bg: colors.successSoft, icon: 'check-all' },
  cancelled: { label: 'Cancelled', color: colors.error, bg: colors.errorSoft, icon: 'close-circle-outline' },
  refunded: { label: 'Refunded', color: colors.textSecondary, bg: colors.surfaceAlt, icon: 'cash-refund' },
};

function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment;
  const itemCount = order.order_items?.length || 0;
  const firstItem = order.order_items?.[0];

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/order/${order.id}`)}
      activeOpacity={0.88}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <MaterialCommunityIcons name={config.icon as any} size={14} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      {/* Items preview */}
      {firstItem?.products && (
        <View style={styles.itemPreview}>
          <Image
            source={{ uri: firstItem.products.image_url }}
            style={styles.itemImage}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {firstItem.products.title}
            </Text>
            {itemCount > 1 && (
              <Text style={styles.itemMore}>+{itemCount - 1} more item{itemCount > 2 ? 's' : ''}</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>₹{order.total_price?.toLocaleString()}</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'processing' | 'shipped' | 'delivered'>('all');

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await ordersService.getUserOrders(user.id);
      setOrders(data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = orders.filter((o) => {
    if (filter === 'processing') return o.status === 'processing' || o.status === 'confirmed' || o.status === 'pending_payment';
    if (filter === 'shipped') return o.status === 'shipped' || o.status === 'out_for_delivery';
    if (filter === 'delivered') return o.status === 'delivered';
    return true;
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Title Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {/* Filter Chips Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        <TouchableOpacity
          style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>All ({orders.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, filter === 'processing' && styles.filterPillActive]}
          onPress={() => setFilter('processing')}
        >
          <Text style={[styles.filterPillText, filter === 'processing' && styles.filterPillTextActive]}>Processing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, filter === 'shipped' && styles.filterPillActive]}
          onPress={() => setFilter('shipped')}
        >
          <Text style={[styles.filterPillText, filter === 'shipped' && styles.filterPillTextActive]}>Shipped</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, filter === 'delivered' && styles.filterPillActive]}
          onPress={() => setFilter('delivered')}
        >
          <Text style={[styles.filterPillText, filter === 'delivered' && styles.filterPillTextActive]}>Delivered</Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadOrders(); }}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant" size={56} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptySubtext}>Explore AuraMart and place your order</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerBar: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.xl,
    color: colors.primary,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  filterPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  listContent: { padding: spacing['2xl'], paddingBottom: 130 },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderId: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  orderDate: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    gap: 4,
  },
  statusText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
  },
  itemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.skeleton,
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  itemMore: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  orderTotal: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.primary,
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
});
