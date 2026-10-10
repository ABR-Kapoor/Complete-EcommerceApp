import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';

import CheckoutJourneyStepper from '../../components/CheckoutJourneyStepper';

export default function CheckoutAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { address, loading: addressLoading, fetchAddress, saveAddress } = useUserStore();

  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAddress(user.id);
    }
  }, [user?.id, fetchAddress]);

  useEffect(() => {
    if (address) {
      setStreet(address.street || '');
      setCity(address.city || '');
      setState(address.state || '');
      setZipCode(address.zip_code || '');
      setPhone(address.phone || '');
    }
  }, [address]);

  const handleNext = async () => {
    if (!user?.id) return;
    if (!street.trim() || !city.trim() || !state.trim() || !zipCode.trim() || !phone.trim()) {
      Alert.alert('Address Required', 'Please complete all address fields to proceed.');
      return;
    }

    setSaving(true);
    try {
      await saveAddress(user.id, {
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        zip_code: zipCode.trim(),
        phone: phone.trim(),
      });
      router.push('/checkout/review');
    } catch {
      Alert.alert('Error', 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  if (addressLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Safe Area Top Header */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/cart');
            }
          }}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Address</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Modern Journey Stepper */}
      <CheckoutJourneyStepper currentStep={2} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shipping Details</Text>
          <Text style={styles.cardSubtext}>Enter where you want your order delivered.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Flat/House No., Street Name"
              placeholderTextColor={colors.textTertiary}
              value={street}
              onChangeText={setStreet}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={colors.textTertiary}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={colors.textTertiary}
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>PIN Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="PIN Code"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={zipCode}
                onChangeText={setZipCode}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.nextButton, saving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <View style={styles.btnRow}>
              <Text style={styles.nextButtonText}>Continue to Order Review</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.surface} />
            </View>
          )}
        </TouchableOpacity>
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
  cardTitle: { fontFamily: fonts.heading, fontSize: fontSize.lg, color: colors.textPrimary },
  cardSubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  fieldGroup: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nextButtonText: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.surface },
});
