import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsService } from '../../services/products.service';
import { useVoiceSearchStore } from '../../store/voiceSearchStore';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';
import { Product } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - spacing.md) / 2;

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const openVoice = useVoiceSearchStore((s) => s.open);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await productsService.getAll({ search: text.trim() });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => performSearch(text), 400);
    },
    [performSearch]
  );

  useEffect(() => {
    // Auto-focus on mount
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.88}
      >
        <Image
          source={{ uri: item.image_url }}
          style={styles.productImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.productPrice}>₹{item.price.toLocaleString()}</Text>
        </View>
      </TouchableOpacity>
    ),
    [router]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>  
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={onChangeText}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={openVoice}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Search by voice"
          >
            <MaterialCommunityIcons name="microphone-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setResults([]);
                setSearched(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="magnify-close" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtext}>Try another product name or category</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
          ListEmptyComponent={
            !searched ? (
              <View style={styles.centered}>
                <MaterialCommunityIcons name="magnify" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>Search AuraMart</Text>
                <Text style={styles.emptySubtext}>
                  Find healthcare products, medicines, and more
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    height: 56,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 80 },
  columnWrapper: { gap: spacing.md, marginBottom: spacing.md },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.md,
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: colors.skeleton,
  },
  productInfo: { padding: spacing.md },
  productTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  productPrice: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.primary,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
