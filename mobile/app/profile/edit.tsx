import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { usersService } from '../../services/users.service';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const profile = useUserStore((s) => s.profile);
  const updateProfileStore = useUserStore((s) => s.updateProfile);

  const [name, setName] = useState(profile?.name || user?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const updates = { name, phone };
      await updateProfileStore(user.id, updates);
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Could not update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return <View style={styles.container} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
      <Stack.Screen 
        options={{ 
          title: 'Edit Profile', 
          headerStyle: { backgroundColor: colors.surface },
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 234 567 890"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing['2xl'] },
  inputGroup: { marginBottom: spacing.xl },
  label: { fontFamily: fonts.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontFamily: fonts.heading, fontSize: fontSize.md, color: colors.surface },
});
