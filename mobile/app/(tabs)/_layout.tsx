import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCartStore } from '../../store/cartStore';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';

function CartBadge() {
  const totalItems = useCartStore((s) => s.totalItems());
  if (totalItems === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{totalItems > 9 ? '9+' : totalItems}</Text>
    </View>
  );
}

function HeaderCartButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.headerCartButton}
      onPress={() => router.push('/cart')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel="Shopping cart"
    >
      <MaterialCommunityIcons name="shopping-outline" size={24} color={colors.textPrimary} />
      <CartBadge />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  const tabBarHeight = 56 + bottomInset;

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
        headerTitleStyle: {
          fontFamily: fonts.heading,
          fontSize: fontSize.lg,
          color: colors.textPrimary,
        },
        headerRight: () => <HeaderCartButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'AuraMart',
          headerTitleStyle: {
            fontFamily: fonts.headingBold,
            fontSize: fontSize.xl,
            color: colors.primary,
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
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#ffffff',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: -32,
                elevation: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                borderWidth: 4,
                borderColor: '#ffffff',
              }}
            >
              <View style={{ width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                <Image
                  source={require('../../assets/gif/output-onlinegiftools.gif')}
                  style={{ width: '100%', height: '100%', transform: [{ scale: 1.1 }] }}
                  contentFit="cover"
                />
                {/* Overlay to adjust brightness/contrast slightly by overlaying semi-transparent white */}
                <View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
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
  headerCartButton: {
    marginRight: spacing.lg,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textPrimary,
    lineHeight: 14,
  },
});
