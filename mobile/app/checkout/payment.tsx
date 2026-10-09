import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ordersService } from '../../services/orders.service';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { CreateOrderPayload } from '../../types';

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { items: cartItems, subtotal, clearLocal } = useCartStore();
  const { address } = useUserStore();

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [loading, setLoading] = useState(false);

  const total = subtotal();

  const handlePlaceOrder = async () => {
    if (!user?.id) return;
    if (!address) {
      Alert.alert('Address Missing', 'Please select a delivery address.');
      router.push('/checkout/address');
      return;
    }

    setLoading(true);
    try {
      const orderPayload: CreateOrderPayload = {
        user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || user.firstName || 'Customer',
        phone: address.phone,
        total_price: total,
        payment_method: paymentMethod,
        address: {
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: address.zip_code,
          phone: address.phone,
        },
        items: cartItems.map((ci) => ({
          product_id: ci.product_id,
          quantity: ci.quantity,
          price: ci.products.price,
        })),
      };

      const createdOrder = await ordersService.createOrder(orderPayload);
      clearLocal();

      router.replace({
        pathname: '/checkout/success',
        params: { orderId: (createdOrder?.id || '').toString(), total: total.toString() },
      });
    } catch {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Step 3: Payment',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.heading, fontSize: fontSize.lg },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step 3 of 3</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose Payment Method</Text>

          {/* COD Option */}
          <TouchableOpacity
            style={[
              styles.methodOption,
              paymentMethod === 'cod' && styles.methodOptionSelected,
            ]}
            onPress={() => setPaymentMethod('cod')}
            activeOpacity={0.88}
          >
            <View style={styles.radioOuter}>
              {paymentMethod === 'cod' && <View style={styles.radioInner} />}
            </View>
            <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.primary} />
            <View style={styles.methodTextGroup}>
              <Text style={styles.methodTitle}>Cash on Delivery (COD)</Text>
              <Text style={styles.methodSubtext}>Pay in cash upon doorstep delivery</Text>
            </View>
          </TouchableOpacity>

          {/* Razorpay Option */}
          <TouchableOpacity
            style={[
              styles.methodOption,
              paymentMethod === 'razorpay' && styles.methodOptionSelected,
            ]}
            onPress={() => setPaymentMethod('razorpay')}
            activeOpacity={0.88}
          >
            <View style={styles.radioOuter}>
              {paymentMethod === 'razorpay' && <View style={styles.radioInner} />}
            </View>
            <MaterialCommunityIcons name="credit-card-outline" size={24} color={colors.primary} />
            <View style={styles.methodTextGroup}>
              <Text style={styles.methodTitle}>UPI / Credit Card / NetBanking</Text>
              <Text style={styles.methodSubtext}>Online instant payment via Razorpay</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Amount to pay */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payable Amount</Text>
            <Text style={styles.totalValue}>₹{total.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.placeOrderBtn, loading && styles.btnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.placeOrderBtnText}>
              Confirm & Place Order (₹{total.toLocaleString()})
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing['2xl'] },
  stepIndicator: { marginBottom: spacing.md },
  stepText: { fontFamily: fonts.bodyBold, fontSize: fontSize.xs, color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing['2xl'],
    marginBottom: spacing['2xl'],
    ...shadows.sm,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  methodOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  methodTextGroup: { flex: 1 },
  methodTitle: { fontFamily: fonts.bodyBold, fontSize: fontSize.sm, color: colors.textPrimary },
  methodSubtext: { fontFamily: fonts.body, fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.textPrimary },
  totalValue: { fontFamily: fonts.heading, fontSize: fontSize.xl, color: colors.primary },
  placeOrderBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  placeOrderBtnText: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.surface },
});
