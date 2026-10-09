import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const { orderId, total } = useLocalSearchParams<{ orderId?: string; total?: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="check-bold" size={48} color={colors.surface} />
        </View>

        <Text style={styles.title}>Order Placed Successfully!</Text>
        <Text style={styles.subtext}>
          Thank you for shopping with AuraMart. Your order has been placed and is being processed.
        </Text>

        {orderId && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order ID:</Text>
              <Text style={styles.infoValue}>#{orderId}</Text>
            </View>
            {total && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Amount:</Text>
                <Text style={styles.infoValue}>₹{Number(total).toLocaleString()}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace(`/order/${orderId}`)}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>View Order Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.88}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, justifyContent: 'center' },
  content: { paddingHorizontal: spacing['3xl'], alignItems: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing['3xl'],
  },
  infoCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontFamily: fonts.body, fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.bodyBold, fontSize: fontSize.sm, color: colors.textPrimary },
  btnGroup: { width: '100%', gap: spacing.md },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.surface },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.textPrimary },
});
