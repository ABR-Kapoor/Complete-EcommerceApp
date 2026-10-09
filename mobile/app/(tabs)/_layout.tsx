import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: colors.surface,
          borderRadius: 30,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 10,
          shadowColor: colors.primaryDark,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
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
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              backgroundColor: focused ? colors.primarySoft : 'transparent',
              padding: 10,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialCommunityIcons 
                name={focused ? "home-variant" : "home-variant-outline"} 
                size={focused ? 28 : 24} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              backgroundColor: focused ? colors.primarySoft : 'transparent',
              padding: 10,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialCommunityIcons 
                name={focused ? "view-grid" : "view-grid-outline"} 
                size={focused ? 28 : 24} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              backgroundColor: focused ? colors.primarySoft : 'transparent',
              padding: 10,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialCommunityIcons 
                name="magnify" 
                size={focused ? 28 : 24} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              backgroundColor: focused ? colors.primarySoft : 'transparent',
              padding: 10,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialCommunityIcons 
                name={focused ? "package-variant" : "package-variant-closed"} 
                size={focused ? 28 : 24} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{
              backgroundColor: focused ? colors.primarySoft : 'transparent',
              padding: 10,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialCommunityIcons 
                name={focused ? "account-circle" : "account-circle-outline"} 
                size={focused ? 28 : 24} 
                color={color} 
              />
            </View>
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
