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
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useVoiceSearchStore } from '../store/voiceSearchStore';
import { voiceService, VoiceSearchResult } from '../services/voice.service';
import { Product } from '../types';
import { colors, fonts, fontSize, radius, shadows, spacing } from '../theme';

type Phase = 'idle' | 'requesting' | 'listening' | 'processing' | 'results' | 'error';

const MAX_RECORDING_MS = 15000;

const LISTEN_GIF = require('../assets/gif/output-onlinegiftools.gif');

function ProductRow({ product, onPress }: { product: Product; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.productRow} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: product.image_url }} style={styles.productImage} contentFit="cover" transition={150} />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        <Text style={styles.productCategory} numberOfLines={1}>{product.category}</Text>
        <Text style={styles.productPrice}>₹{Number(product.price).toLocaleString()}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textTertiary} />
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
      return 'Finding products…';
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
    return `Speak in any language — tap Done when you finish · ${Math.round((durationMillis || 0) / 1000)}s`;
  }
  if (phase === 'requesting') return 'Grant microphone access to search by voice.';
  if (phase === 'processing') return 'Optimising your words, then searching…';
  if (phase === 'results') return 'Tap a product to open it.';
  return 'Tap the mic and describe what you need.';
}

export default function VoiceSearchDialog() {
  const visible = useVoiceSearchStore((s) => s.visible);
  const closeStore = useVoiceSearchStore((s) => s.close);
  const router = useRouter();

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<VoiceSearchResult | null>(null);
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

  const isListening = phase === 'listening';
  const isBusy = phase === 'requesting' || phase === 'processing';
  const showGif = !isBusy || isListening;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <MaterialCommunityIcons name="creation" size={18} color={colors.primary} />
              <Text style={styles.brand}>AuraMart Voice</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close voice search"
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.mediaWrap}>
            {showGif ? (
              <Image source={LISTEN_GIF} style={styles.listenGif} contentFit="contain" />
            ) : (
              <ActivityIndicator color={colors.primary} size="large" />
            )}
          </View>

          <Text style={styles.statusTitle}>{statusTitle(phase)}</Text>
          <Text style={styles.statusSubtitle}>
            {statusSubtitle(phase, recorderState.durationMillis, errorMsg)}
          </Text>

          {result?.transcript ? (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>You said</Text>
              <Text style={styles.transcriptText}>“{result.transcript}”</Text>
              {result.query && result.query !== result.transcript ? (
                <Text style={styles.transcriptQuery}>
                  → {result.query}
                  {result.language ? `  ·  ${String(result.language).toUpperCase()}` : ''}
                </Text>
              ) : null}
            </View>
          ) : null}

          {phase === 'results' && result ? (
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
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>
                No matching products. Try describing it differently.
              </Text>
            )
          ) : null}

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
                  {phase === 'results' ? 'Ask again' : 'Try again'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const GIF_SIZE = 168;

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
    paddingBottom: spacing['4xl'],
    maxHeight: '92%',
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brand: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaWrap: {
    height: GIF_SIZE + 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  listenGif: {
    width: GIF_SIZE,
    height: GIF_SIZE,
  },
  statusTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  statusSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  transcriptBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  transcriptLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  transcriptText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  transcriptQuery: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  results: { marginTop: spacing.lg, maxHeight: 320 },
  resultsContent: { gap: spacing.sm, paddingBottom: spacing.md },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  productImage: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  productInfo: { flex: 1 },
  productTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  productCategory: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  productPrice: {
    fontFamily: fonts.heading,
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  controls: { marginTop: spacing['2xl'] },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 54,
  },
  primaryButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: '#FFFFFF',
  },
});
