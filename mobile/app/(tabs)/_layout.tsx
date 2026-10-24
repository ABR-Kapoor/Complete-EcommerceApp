import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCartStore } from '../../store/cartStore';
import { useVoiceSearchStore } from '../../store/voiceSearchStore';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';

import { useWishlistStore } from '../../store/wishlistStore';

function CartBadge() {
  const totalItems = useCartStore((s) => s.totalItems());
  if (totalItems === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{totalItems > 9 ? '9+' : totalItems}</Text>
    </View>
  );
}

function WishlistBadge() {
  const count = useWishlistStore((s) => s.productIds.length);
  if (count === 0) return null;
  return (
    <View style={[styles.badge, styles.wishlistBadge]}>
      <Text style={[styles.badgeText, styles.wishlistBadgeText]}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

function HeaderRightActions() {
  const router = useRouter();
  return (
    <View style={styles.headerRightGroup}>
      <TouchableOpacity
        style={styles.headerIconButton}
        onPress={() => router.push('/wishlist')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Wishlist"
      >
        <MaterialCommunityIcons name="heart-outline" size={24} color={colors.textPrimary} />
        <WishlistBadge />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.headerCartButton}
        onPress={() => router.push('/cart')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Shopping cart"
      >
        <MaterialCommunityIcons name="shopping-outline" size={24} color={colors.textPrimary} />
        <CartBadge />
      </TouchableOpacity>
    </View>
  );
}

const BRAND_LOGO = require('../../assets/AuraMart-transparent-Logo.png');

function HeaderLogo() {
  return (
    <Image
      source={BRAND_LOGO}
      style={styles.headerLogo}
      contentFit="contain"
      accessibilityLabel="AuraMart"
    />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const openVoice = useVoiceSearchStore((s) => s.open);
  const bottomInset = Math.max(insets.bottom, 12);
  const tabBarHeight = 58 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
          marginTop: -2,
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottomInset,
          elevation: 12,
          shadowColor: '#124638',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 0,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerStatusBarHeight: insets.top,
        headerTitleStyle: {
          fontFamily: fonts.heading,
          fontSize: fontSize.lg,
          color: colors.textPrimary,
        },
        headerRight: () => <HeaderRightActions />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: () => null,
          headerLeft: () => (
            <View style={styles.headerLeftContainer}>
              <HeaderLogo />
            </View>
          ),
          headerLeftContainerStyle: {
            paddingLeft: 0,
            marginLeft: 0,
          },
          headerRight: () => <HeaderRightActions />,
          headerRightContainerStyle: {
            paddingRight: 0,
            marginRight: 0,
          },
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "home" : "home-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "view-grid" : "view-grid-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '',
          headerShown: false,
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.voiceTabTouchable}
              onPress={() => {
                openVoice();
                router.push('/(tabs)/search');
              }}
            >
              <View style={styles.voiceOrbContainer}>
                <Image
                  source={require('../../assets/gif/output-onlinegiftools.gif')}
                  style={styles.voiceOrbGif}
                  contentFit="cover"
                />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "package-variant-closed" : "package-variant-closed-remove"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "account" : "account-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerCartButton: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 0,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    minWidth: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  wishlistBadge: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textPrimary,
    lineHeight: 14,
  },
  wishlistBadgeText: {
    color: colors.surface,
  },
  voiceTabTouchable: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    height: 72,
  },
  voiceOrbContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    elevation: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  voiceOrbGif: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.25 }],
  },
  headerLeftContainer: {
    paddingLeft: spacing.md,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerLogo: {
    width: 135,
    height: 32,
  },
});
