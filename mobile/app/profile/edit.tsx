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
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useUserStore } from '../../store/userStore';
import { usersService } from '../../services/users.service';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const profile = useUserStore((s) => s.profile);
  const updateProfileStore = useUserStore((s) => s.updateProfile);

  const fullName = user?.fullName || profile?.name || '';
  const [firstName, setFirstName] = useState(user?.firstName || fullName.split(' ')[0] || '');
  const [lastName, setLastName] = useState(
    user?.lastName || fullName.split(' ').slice(1).join(' ') || ''
  );
  const [phone, setPhone] = useState(profile?.phone || user?.primaryPhoneNumber?.phoneNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || user?.imageUrl || '');
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress || profile?.email || '';

  const handlePickAvatar = async () => {
    if (!user) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to change your profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setAvatarSaving(true);
      const blob = await fetch(asset.uri).then((r) => r.blob());
      const updated = await user.setProfileImage({ file: blob });
      const newAvatar = updated.publicUrl || user.imageUrl;
      setAvatarUrl(newAvatar);
      await usersService.updateAvatar(user.id, newAvatar);
    } catch {
      Alert.alert('Error', 'Could not update your photo. Please try again.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const name = `${firstName} ${lastName}`.trim().replace(/\s+/g, ' ');
    if (!name) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setSaving(true);
    try {
      const updateParams: { firstName?: string; lastName?: string } = {};
      if (firstName) updateParams.firstName = firstName;
      if (lastName) updateParams.lastName = lastName;
      await user.update(updateParams);
      await updateProfileStore(user.id, { name, phone });
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.message || 'Could not update profile. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
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
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handlePickAvatar}
            style={styles.avatarBtn}
            disabled={avatarSaving}
            activeOpacity={0.85}
            accessibilityLabel="Change profile photo"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={150} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={40} color={colors.primary} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <MaterialCommunityIcons name="camera" size={14} color={colors.surface} />
            </View>
          </TouchableOpacity>
          {avatarSaving ? (
            <ActivityIndicator color={colors.primary} style={styles.avatarLoading} />
          ) : (
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="John"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Doe"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.readonlyBox}>
            <Text style={styles.readonlyText} numberOfLines={1}>
              {email || '—'}
            </Text>
            <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textTertiary} />
          </View>
          <Text style={styles.readonlyHint}>
            Email is managed by your login account and can't be changed here.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  avatarBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    ...shadows.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoading: { marginTop: spacing.md },
  avatarHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
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
  readonlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  readonlyText: {
    flex: 1,
    marginRight: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  readonlyHint: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
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