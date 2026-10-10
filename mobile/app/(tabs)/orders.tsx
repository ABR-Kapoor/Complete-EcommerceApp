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
import { useCartStore } from '../../store/cartStore';
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
  const items = order.order_items || [];
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const firstItem = items[0];

  const createdDate = new Date(order.created_at);

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push(`/order/${order.id}`)}
      activeOpacity={0.88}
    >
      {/* Header Row */}
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.orderIdText}>Order #{order.id}</Text>
          <Text style={styles.orderDateText}>
            Placed on {createdDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <MaterialCommunityIcons name={config.icon as any} size={14} color={config.color} />
          <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      {/* Items Preview */}
      <View style={styles.itemsPreviewContainer}>
        {items.length > 0 ? (
          items.slice(0, 2).map((item, idx) => (
            <View key={item.id || idx} style={styles.itemPreviewRow}>
              <Image
                source={{ uri: item.products?.image_url || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae' }}
                style={styles.itemImage}
                contentFit="cover"
                transition={150}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemCategory}>{item.products?.category || 'Healthcare'}</Text>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.products?.title || 'Healthcare Product'}
                </Text>
                <Text style={styles.itemQtyPrice}>
                  Qty: {item.quantity || 1} • ₹{Number(item.price || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.itemPreviewRow}>
            <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center' }]}>
              <MaterialCommunityIcons name="pill" size={24} color={colors.primary} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>Healthcare Essentials Shipment</Text>
              <Text style={styles.itemQtyPrice}>Order Items ({itemCount})</Text>
            </View>
          </View>
        )}

        {items.length > 2 && (
          <Text style={styles.moreItemsText}>+ {items.length - 2} more product{items.length - 2 > 1 ? 's' : ''} in package</Text>
        )}
      </View>

      {/* Footer Row */}
      <View style={styles.cardFooterRow}>
        <View>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalPriceText}>₹{Number(order.total_price || 0).toLocaleString()}</Text>
        </View>

        <View style={styles.trackBtn}>
          <Text style={styles.trackBtnText}>Track Order</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const totalCartItems = useCartStore((s) => s.totalItems());

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');

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
    if (filter === 'cancelled') return o.status === 'cancelled';
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
    <View style={styles.container}>
      {/* Top Safe Area Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity
          style={styles.cartIconButton}
          onPress={() => router.push('/cart')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="shopping-outline" size={22} color={colors.textPrimary} />
          {totalCartItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalCartItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Chips Bar (No Vertical Clipping) */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
              All ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'processing' && styles.filterChipActive]}
            onPress={() => setFilter('processing')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'processing' && styles.filterChipTextActive]}>
              Processing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'shipped' && styles.filterChipActive]}
            onPress={() => setFilter('shipped')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'shipped' && styles.filterChipTextActive]}>
              Shipped
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'delivered' && styles.filterChipActive]}
            onPress={() => setFilter('delivered')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'delivered' && styles.filterChipTextActive]}>
              Delivered
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'cancelled' && styles.filterChipActive]}
            onPress={() => setFilter('cancelled')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === 'cancelled' && styles.filterChipTextActive]}>
              Cancelled
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
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
            <MaterialCommunityIcons name="package-variant" size={54} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptySubtext}>Your recent orders and shipments will appear here</Text>
            <TouchableOpacity
              style={styles.shopCTA}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.85}
            >
              <Text style={styles.shopCTAText}>Explore Healthcare Items</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.xl,
    color: colors.primary,
  },
  cartIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textPrimary,
  },
  filterSection: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScrollContent: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    fontFamily: fonts.bodyBold,
    color: colors.surface,
  },
  listContent: {
    padding: spacing['2xl'],
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  statusBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  itemsPreviewContainer: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  itemPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  itemInfo: { flex: 1 },
  itemCategory: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginTop: 1,
  },
  itemQtyPrice: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreItemsText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: 2,
  },
  deliveryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  deliveryBarText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  totalLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  totalPriceText: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  trackBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['5xl'],
  },
  emptyTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  shopCTA: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    marginTop: spacing.xl,
  },
  shopCTAText: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.surface,
  },
});
