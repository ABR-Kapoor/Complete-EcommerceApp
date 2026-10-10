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
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';

export default function AddressScreen() {
  const router = useRouter();
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

  const handleSave = async () => {
    if (!user?.id) return;

    if (!street.trim() || !city.trim() || !state.trim() || !zipCode.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Please fill in all address fields.');
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
      Alert.alert('Success', 'Address updated successfully.', [
        { text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        } },
      ]);
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
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Delivery Address',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: fonts.heading, fontSize: fontSize.lg },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              style={{ marginRight: spacing.md }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="map-marker-outline" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>Default Delivery Address</Text>
          </View>
          <Text style={styles.cardSubtext}>
            This address will be used for delivery and invoice generation.
          </Text>

          {/* Form Fields */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="House/Flat No., Building Name, Street"
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
              <Text style={styles.label}>PIN / Zip Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit PIN"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={zipCode}
                onChangeText={setZipCode}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit Mobile"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>Save Address</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
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
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  saveButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.surface,
  },
});
