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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const profile = useUserStore((s) => s.profile);
  const wishlistCount = useWishlistStore((s) => s.productIds.length);
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

  const displayName = profile?.name || user?.firstName || 'Rohan';
  const avatarUrl = profile?.avatar_url || user?.imageUrl;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.sm }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeaderCard}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <MaterialCommunityIcons name="account" size={36} color={colors.primary} />
          </View>
        )}
        <View style={styles.headerTextGroup}>
          <Text style={styles.greetingTitle}>Hello, {displayName} 👋</Text>
          <Text style={styles.welcomeSubtext}>Welcome back!</Text>
        </View>
      </View>

      {/* Main Account Options List */}
      <View style={styles.menuCard}>
        <ProfileMenuItem
          icon="package-variant-closed"
          label="My Orders"
          subtitle="Track, return or buy again"
          onPress={() => router.push('/(tabs)/orders')}
        />
        <View style={styles.menuDivider} />

        <ProfileMenuItem
          icon="heart-outline"
          label="Wishlist"
          subtitle={`Saved items (${wishlistCount})`}
          onPress={() => router.push('/wishlist')}
        />
        <View style={styles.menuDivider} />

        <ProfileMenuItem
          icon="map-marker-outline"
          label="My Addresses"
          subtitle="Manage delivery address"
          onPress={() => router.push('/addresses')}
        />
        <View style={styles.menuDivider} />

        <ProfileMenuItem
          icon="account-cog-outline"
          label="Profile Settings"
          subtitle="Name, phone, avatar"
          onPress={() => router.push('/profile/edit')}
        />
        <View style={styles.menuDivider} />

        <ProfileMenuItem
          icon="star-outline"
          label="Reviews"
          subtitle="Your product reviews"
          onPress={() => Alert.alert('Reviews', 'Your reviews will appear here.')}
        />
        <View style={styles.menuDivider} />

        <ProfileMenuItem
          icon="credit-card-outline"
          label="Payment History"
          subtitle="View transactions"
          onPress={() => Alert.alert('Payment History', 'No past transactions found.')}
        />
        <View style={styles.menuDivider} />

        <ProfileMenuItem
          icon="help-circle-outline"
          label="Help & Support"
          subtitle="Get assistance"
          onPress={() => Alert.alert('Support', 'Contact us at support@auramart.com')}
        />
      </View>

      {/* Sign Out Card */}
      <View style={[styles.menuCard, { marginTop: spacing.lg }]}>
        <ProfileMenuItem
          icon="logout"
          label="Sign Out"
          onPress={handleSignOut}
          color={colors.error}
        />
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
  scrollContent: { padding: spacing['2xl'], paddingBottom: 140 },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.lg,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  greetingTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  welcomeSubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  menuSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 38 + spacing.md,
  },
  versionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  versionSubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
});
