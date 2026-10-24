import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ordersService } from '../../services/orders.service';
import { PaymentTransaction } from '../../types';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await ordersService.getUserPayments(user.id);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch payment transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const totalSpent = transactions
    .filter((t) => t.status.toLowerCase() === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderItem = ({ item }: { item: PaymentTransaction }) => {
    const isRzp = item.payment_method.toLowerCase() === 'razorpay';
    const isCompleted = item.status.toLowerCase() === 'completed';
    const isCancelled = item.status.toLowerCase() === 'cancelled';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => router.push(`/order/${item.order_id}`)}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.iconAndDetails}>
            <View
              style={[
                styles.methodIconBadge,
                { backgroundColor: isRzp ? colors.primarySoft : colors.infoSoft },
              ]}
            >
              <MaterialCommunityIcons
                name={isRzp ? 'credit-card-outline' : 'cash-multiple'}
                size={22}
                color={isRzp ? colors.primary : colors.info}
              />
            </View>
            <View style={styles.textDetails}>
              <Text style={styles.orderTitle}>Order #{item.order_id}</Text>
              <Text style={styles.methodLabel}>
                {isRzp ? 'Online Payment (Razorpay)' : 'Cash on Delivery'}
              </Text>
              {item.razorpay_id && (
                <Text style={styles.refId} numberOfLines={1}>
                  Ref: {item.razorpay_id}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.amountCol}>
            <Text style={styles.amountText}>₹{Number(item.amount).toLocaleString()}</Text>
            <View
              style={[
                styles.statusBadge,
                isCompleted
                  ? styles.statusBadgeCompleted
                  : isCancelled
                  ? styles.statusBadgeCancelled
                  : styles.statusBadgePending,
              ]}
            >
              <MaterialCommunityIcons
                name={isCompleted ? 'check-circle' : isCancelled ? 'close-circle' : 'clock-outline'}
                size={12}
                color={
                  isCompleted ? colors.primary : isCancelled ? colors.error : colors.warning
                }
              />
              <Text
                style={[
                  styles.statusText,
                  isCompleted
                    ? styles.statusTextCompleted
                    : isCancelled
                    ? styles.statusTextCancelled
                    : styles.statusTextPending,
                ]}
              >
                {isCompleted ? 'Paid' : isCancelled ? 'Cancelled' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBottomRow}>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          <View style={styles.viewOrderLink}>
            <Text style={styles.viewOrderText}>View Order</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Summary Stats Header Card */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={styles.summaryValue}>₹{totalSpent.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Transactions</Text>
          <Text style={styles.summaryValue}>{transactions.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment history...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="receipt" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Payment Transactions</Text>
          <Text style={styles.emptySubtitle}>
            When you complete an order, your transaction receipts and payment details will appear here.
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.88}
          >
            <Text style={styles.shopNowText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => String(item.id || item.order_id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontFamily: fonts.headingBold,
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  iconAndDetails: {
    flexDirection: 'row',
    flex: 1,
    marginRight: spacing.sm,
  },
  methodIconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textDetails: {
    flex: 1,
  },
  orderTitle: {
    fontSize: fontSize.md,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  methodLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
  },
  refId: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textTertiary,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: fontSize.md + 1,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  statusBadgeCompleted: {
    backgroundColor: colors.primarySoft,
  },
  statusBadgePending: {
    backgroundColor: colors.warningSoft,
  },
  statusBadgeCancelled: {
    backgroundColor: colors.errorSoft,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.headingBold,
  },
  statusTextCompleted: {
    color: colors.primary,
  },
  statusTextPending: {
    color: colors.warning,
  },
  statusTextCancelled: {
    color: colors.error,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  dateText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  viewOrderLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewOrderText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.headingBold,
    color: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  shopNowBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  shopNowText: {
    color: colors.textInverse,
    fontFamily: fonts.headingBold,
    fontSize: fontSize.sm,
  },
});
