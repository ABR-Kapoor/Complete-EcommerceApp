import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useUser } from '@clerk/expo';
import { useVoiceSearchStore } from '../store/voiceSearchStore';
import { useCartStore } from '../store/cartStore';
import { voiceService, VoiceSearchResult } from '../services/voice.service';
import { Product } from '../types';
import { colors, fonts, fontSize, radius, shadows, spacing } from '../theme';

type Phase = 'idle' | 'requesting' | 'listening' | 'processing' | 'results' | 'error';

const MAX_RECORDING_MS = 15000;
const LISTEN_GIF = require('../assets/gif/output-onlinegiftools.gif');

function ProductRow({
  product,
  onPress,
  onAddToCart,
}: {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
}) {
  const ratingVal = product.rating ? Number(product.rating).toFixed(1) : '4.5';
  const reviewsCount = product.reviews_count || 12;

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.88}>
      <Image source={{ uri: product.image_url }} style={styles.productImage} contentFit="cover" transition={150} />
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{product.category || 'Healthcare'}</Text>
        <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        <View style={styles.ratingRow}>
          <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
          <Text style={styles.ratingText}>{ratingVal}</Text>
          <Text style={styles.reviewsText}>({reviewsCount})</Text>
        </View>
        <Text style={styles.productPrice}>₹{Number(product.price).toLocaleString()}</Text>
      </View>
      <TouchableOpacity
        style={styles.addCartBtn}
        onPress={(e) => {
          e.stopPropagation();
          onAddToCart();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="cart-plus" size={18} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function statusTitle(phase: Phase): string {
  switch (phase) {
    case 'requesting':
      return 'Waking up the mic…';
    case 'listening':
      return 'Listening…';
    case 'processing':
      return 'Finding best matches…';
    case 'results':
      return 'Here is what I found';
    case 'error':
      return 'Something went wrong';
    default:
      return 'Voice search';
  }
}

function statusSubtitle(phase: Phase, durationMillis: number, error: string): string {
  if (phase === 'error') return error || 'Please try again.';
  if (phase === 'listening') {
    return `Speak in any language — tap Done when finished · ${Math.round((durationMillis || 0) / 1000)}s`;
  }
  if (phase === 'requesting') return 'Grant microphone access to search by voice.';
  if (phase === 'processing') return 'Analyzing your speech with Gemini AI…';
  if (phase === 'results') return 'Tap a product to view details or add to cart.';
  return 'Tap the mic and describe what you need.';
}

export default function VoiceSearchDialog() {
  const visible = useVoiceSearchStore((s) => s.visible);
  const closeStore = useVoiceSearchStore((s) => s.close);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const addToCart = useCartStore((s) => s.addToCart);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<VoiceSearchResult | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAndSearch = useCallback(async () => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }

    let uri: string | null = null;
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      uri = recorder.uri;
    } catch {
      uri = recorder.uri;
    }

    if (!uri) {
      setErrorMsg("I couldn't hear anything. Please try again.");
      setPhase('error');
      return;
    }

    setPhase('processing');
    try {
      const data = await voiceService.search(uri);
      setResult(data);
      setPhase('results');
    } catch {
      setErrorMsg('Voice search failed. Please check your connection and try again.');
      setPhase('error');
    }
  }, [recorder]);

  const startListening = useCallback(async () => {
    setErrorMsg('');
    setResult(null);
    setPhase('requesting');
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setErrorMsg('Microphone permission is required for voice search.');
        setPhase('error');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('listening');
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      autoStopRef.current = setTimeout(() => {
        void stopAndSearch();
      }, MAX_RECORDING_MS);
    } catch {
      setErrorMsg('Could not start the microphone. Please try again.');
      setPhase('error');
    }
  }, [recorder, stopAndSearch]);

  useEffect(() => {
    if (!visible) return undefined;

    const timer = setTimeout(() => {
      void startListening();
    }, 200);
    return () => clearTimeout(timer);
  }, [visible, startListening]);

  const handleClose = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    try {
      if (recorder.isRecording) recorder.stop();
    } catch {
      // ignore
    }
    setPhase('idle');
    setResult(null);
    setErrorMsg('');
    closeStore();
  }, [closeStore, recorder]);

  const openProduct = useCallback(
    (id: number) => {
      handleClose();
      router.push(`/product/${id}`);
    },
    [handleClose, router]
  );

  const handleAddToCart = useCallback(
    (productId: number) => {
      if (user) {
        addToCart(user.id, productId, 1);
        setAddedId(productId);
        setTimeout(() => setAddedId(null), 1500);
      }
    },
    [user, addToCart]
  );

  const isListening = phase === 'listening';
  const isBusy = phase === 'requesting' || phase === 'processing';
  const isResults = phase === 'results';
  const showGif = !isBusy || isListening;

  const gifSize = isResults ? 72 : 150;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) + spacing.md },
          ]}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <MaterialCommunityIcons name="creation" size={20} color={colors.primary} />
              <Text style={styles.brand}>AuraMart Voice</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close voice search"
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* GIF Animation container (Smaller when output results arrive) */}
          <View style={[styles.mediaWrap, { height: gifSize + 16 }]}>
            {showGif ? (
              <Image
                source={LISTEN_GIF}
                style={{ width: gifSize, height: gifSize }}
                contentFit="contain"
              />
            ) : (
              <ActivityIndicator color={colors.primary} size="large" />
            )}
          </View>

          <Text style={styles.statusTitle}>{statusTitle(phase)}</Text>
          <Text style={styles.statusSubtitle}>
            {statusSubtitle(phase, recorderState.durationMillis, errorMsg)}
          </Text>

          {/* Intent & AI Response Summary Box */}
          {result ? (
            <View style={styles.intentCard}>
              <View style={styles.intentHeaderRow}>
                <MaterialCommunityIcons name="target" size={16} color={colors.primary} />
                <Text style={styles.intentLabel}>Intent</Text>
                {result.language ? (
                  <View style={styles.langBadge}>
                    <Text style={styles.langBadgeText}>
                      {String(result.language).toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.intentQueryText}>
                “{result.query || result.transcript}”
              </Text>

              {result.reply ? (
                <Text style={styles.intentReplyText}>{result.reply}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Results List */}
          {isResults && result ? (
            result.products.length > 0 ? (
              <ScrollView
                style={styles.results}
                contentContainerStyle={styles.resultsContent}
                showsVerticalScrollIndicator={false}
              >
                {result.products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onPress={() => openProduct(product.id)}
                    onAddToCart={() => handleAddToCart(product.id)}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="magnify-close" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyText}>
                  No matching products found. Try describing what you need.
                </Text>
              </View>
            )
          ) : null}

          {/* Feedback Toast */}
          {addedId !== null && (
            <View style={styles.toastBox}>
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.surface} />
              <Text style={styles.toastText}>Item added to cart!</Text>
            </View>
          )}

          {/* Action Controls */}
          <View style={styles.controls}>
            {isListening ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => void stopAndSearch()}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            ) : isBusy ? null : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => void startListening()}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="microphone" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {isResults ? 'Ask again' : 'Try again'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    maxHeight: '90%',
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  brand: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.md,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  statusTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  statusSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 18,
  },
  intentCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(18, 70, 56, 0.1)',
  },
  intentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  intentLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  langBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  langBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.textSecondary,
  },
  intentQueryText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  intentReplyText: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  results: {
    marginTop: spacing.md,
    maxHeight: 280,
  },
  resultsContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.sm + 2,
    gap: spacing.md,
    ...shadows.sm,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  productInfo: { flex: 1 },
  productCategory: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  reviewsText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textTertiary,
  },
  productPrice: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: 3,
  },
  addCartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  toastText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.surface,
  },
  controls: {
    marginTop: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 48,
  },
  primaryButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: '#FFFFFF',
  },
});
