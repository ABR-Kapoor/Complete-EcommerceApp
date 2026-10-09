import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';

function ProfileMenuItem({
  icon,
  label,
  subtitle,
  onPress,
  color,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.menuIcon, { backgroundColor: color ? `${color}15` : colors.primarySoft }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={color || colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, color ? { color } : null]}>{label}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const profile = useUserStore((s) => s.profile);
  const clearUser = useUserStore((s) => s.clearUser);
  const clearCart = useCartStore((s) => s.clearLocal);
  const clearWishlist = useWishlistStore((s) => s.clearLocal);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          clearUser();
          clearCart();
          clearWishlist();
          await signOut();
        },
      },
    ]);
  };

  const displayName = profile?.name || user?.fullName || 'User';
  const displayEmail = profile?.email || user?.primaryEmailAddress?.emailAddress || '';
  const avatarUrl = profile?.avatar_url || user?.imageUrl;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <MaterialCommunityIcons name="account" size={40} color={colors.textTertiary} />
          </View>
        )}
        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileEmail}>{displayEmail}</Text>
        {profile?.phone && <Text style={styles.profilePhone}>{profile.phone}</Text>}
      </View>

      {/* Menu Sections */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Shopping</Text>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="package-variant-closed"
            label="My Orders"
            subtitle="Track and manage orders"
            onPress={() => router.push('/(tabs)/orders')}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="heart-outline"
            label="Wishlist"
            subtitle="Your saved products"
            onPress={() => router.push('/wishlist')}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="map-marker-outline"
            label="Addresses"
            subtitle="Manage delivery addresses"
            onPress={() => router.push('/addresses')}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => Alert.alert('Support', 'Contact us at support@auramart.com')}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="shield-lock-outline"
            label="Privacy Policy"
            onPress={() => Alert.alert('Privacy', 'Privacy policy will be available soon.')}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="logout"
            label="Sign Out"
            onPress={handleSignOut}
            color={colors.error}
          />
        </View>
      </View>

      {/* App info */}
      <Text style={styles.versionText}>AuraMart v1.0.0</Text>
      <Text style={styles.versionSubtext}>Part of the AuraSutra ecosystem</Text>

      <View style={{ height: spacing['4xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 130 },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing['2xl'],
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.lg,
  },
  avatarPlaceholder: {
    backgroundColor: colors.skeleton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
  },
  profileEmail: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  profilePhone: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuSection: {
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing['2xl'],
  },
  menuSectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  menuSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 40 + spacing.md,
  },
  versionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
  versionSubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
});
