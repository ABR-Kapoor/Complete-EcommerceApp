import { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useUserStore } from '../../store/userStore';
import { usersService } from '../../services/users.service';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const profile = useUserStore((s) => s.profile);
  const updateProfileStore = useUserStore((s) => s.updateProfile);
  const setAvatarUrlStore = useUserStore((s) => s.setAvatarUrl);

  const fullName = user?.fullName || profile?.name || '';
  const initialFirstName = user?.firstName || (fullName ? fullName.split(' ')[0] : '');
  const initialLastName = user?.lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : '');

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(profile?.phone || user?.primaryPhoneNumber?.phoneNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || user?.imageUrl || '');
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress || profile?.email || '';

  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
    if (profile?.phone && !phone) {
      setPhone(profile.phone);
    }
    if (profile?.name && (!firstName && !lastName)) {
      setFirstName(profile.name.split(' ')[0] || '');
      setLastName(profile.name.split(' ').slice(1).join(' ') || '');
    }
  }, [profile]);

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
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setAvatarSaving(true);

      // 1. Upload directly to Supabase Storage Bucket ('ecommerce' bucket)
      const mimeType = asset.mimeType || 'image/jpeg';
      const uploadRes = await usersService.uploadAvatarFile(user.id, asset.uri, mimeType);

      if (uploadRes && uploadRes.url) {
        setAvatarUrl(uploadRes.url);
        setAvatarUrlStore(uploadRes.url);

        // 2. Also try syncing to Clerk in background (non-blocking)
        try {
          const blob = await fetch(asset.uri).then((r) => r.blob());
          await user.setProfileImage({ file: blob });
        } catch {
          // Clerk failure doesn't affect Supabase storage
        }

        Alert.alert('Success', 'Profile photo updated and saved to storage!');
      } else {
        throw new Error('No URL returned from storage');
      }
    } catch (err: any) {
      if (__DEV__) console.log('Avatar upload error:', err);
      Alert.alert('Upload Error', 'Could not save photo to storage. Please try again.');
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
      // 1. Update Supabase users table and zustand store
      await updateProfileStore(user.id, { name, phone });

      // 2. Also update Clerk profile name (optional/graceful)
      try {
        const updateParams: { firstName?: string; lastName?: string } = {};
        if (firstName) updateParams.firstName = firstName;
        if (lastName) updateParams.lastName = lastName;
        await user.update(updateParams);
      } catch {
        // Clerk update is non-critical
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          },
        },
      ]);
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.message || 'Could not update profile. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'android' ? 'height' : 'padding'}
    >
      {/* Custom Safe Header Bar with back button and title */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 14) + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/profile');
            }
          }}
          style={styles.headerBackBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + spacing['2xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handlePickAvatar}
            style={styles.avatarBtn}
            disabled={avatarSaving}
            activeOpacity={0.88}
            accessibilityLabel="Change profile photo"
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={44} color={colors.primary} />
              </View>
            )}

            <View style={styles.cameraBadge}>
              <MaterialCommunityIcons name="camera" size={15} color={colors.surface} />
            </View>
          </TouchableOpacity>

          {avatarSaving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.savingText}>Saving to Supabase bucket…</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handlePickAvatar} hitSlop={{ top: 6, bottom: 6, left: 12, right: 12 }}>
              <Text style={styles.avatarHint}>Tap to change photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Inputs */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="phone-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.readonlyBox}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
              <Text style={styles.readonlyText} numberOfLines={1}>
                {email || '—'}
              </Text>
              <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textTertiary} />
            </View>
            <Text style={styles.readonlyHint}>
              Email is managed by your login account and can't be changed here.
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarBtn: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    ...shadows.md,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  avatarHint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.md,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 8,
  },
  savingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  readonlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  readonlyText: {
    flex: 1,
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
    height: 52,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.md,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.surface,
  },
});