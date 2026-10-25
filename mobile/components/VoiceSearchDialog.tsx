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
import {
  voiceService,
  VoiceSearchIssue,
  VoiceSearchProduct,
  VoiceSearchResult,
} from '../services/voice.service';
import { colors, fonts, fontSize, radius, shadows, spacing } from '../theme';

type Phase = 'idle' | 'requesting' | 'listening' | 'processing' | 'results' | 'error';

const MAX_RECORDING_MS = 15000;
const LISTEN_GIF = require('../assets/gif/output-onlinegiftools.gif');

const KNOWN_ICONS = new Set([
  'thermometer',
  'pill',
  'emoticon-sick-outline',
  'stomach',
  'medical-bag',
  'shield-plus-outline',
  'bandage',
  'heart-pulse',
  'water',
  'needle',
  'eye-outline',
  'sleep',
  'head-snowflake-outline',
  'arm-flex-outline',
  'lungs',
]);

function getSafeIcon(iconName?: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (iconName && KNOWN_ICONS.has(iconName)) {
    return iconName as keyof typeof MaterialCommunityIcons.glyphMap;
  }
  return 'pill';
}

const COMPILING_STEPS = [
  { label: 'Transcribing speech', sub: 'Aura Speech Engine' },
  { label: 'Analyzing symptoms & needs', sub: 'Clinical language model' },
  { label: 'Compiling 3 to 4 specific issues', sub: 'Synthesizing health dimensions' },
  { label: 'Matching pharmacy inventory', sub: 'Ranking remedies & medicines' },
];

function ProductRow({
  product,
  issues = [],
  onPress,
  onAddToCart,
}: {
  product: VoiceSearchProduct;
  issues?: VoiceSearchIssue[];
  onPress: () => void;
  onAddToCart: () => void;
}) {
  const ratingVal = product.avg_rating ? Number(product.avg_rating).toFixed(1) : '4.5';

  // Find titles of matched issues for this product
  const matchedIssueTitles = (product.matched_issue_ids || [])
    .map((id) => issues.find((iss) => iss.id === id)?.title)
    .filter(Boolean) as string[];

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.88}>
      <Image source={{ uri: product.image_url }} style={styles.productImage} contentFit="cover" transition={150} />
      <View style={styles.productInfo}>
        <View style={styles.categoryRow}>
          <Text style={styles.productCategory}>{product.category || 'Healthcare'}</Text>
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>{ratingVal}</Text>
          </View>
        </View>
        <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        <Text style={styles.productPrice}>₹{Number(product.price).toLocaleString()}</Text>

        {/* Matched Issue Badges */}
        {matchedIssueTitles.length > 0 && (
          <View style={styles.productIssueTags}>
            {matchedIssueTitles.slice(0, 2).map((title, i) => (
              <View key={i} style={styles.productIssueTag}>
                <MaterialCommunityIcons name="check-circle" size={10} color={colors.primary} />
                <Text style={styles.productIssueTagText} numberOfLines={1}>
                  {title}
                </Text>
              </View>
            ))}
          </View>
        )}
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
      return 'Starting microphone…';
    case 'listening':
      return 'Listening… Speak Now';
    case 'processing':
      return 'Compiling & Processing…';
    case 'results':
      return 'Aura AI Clinical Summary';
    case 'error':
      return 'Microphone Inactive';
    default:
      return 'Voice Search';
  }
}

function statusSubtitle(phase: Phase, durationMillis: number, error: string): string {
  if (phase === 'error') return error || 'Tap to speak again or tap a symptom below.';
  if (phase === 'listening') {
    const secs = Math.round((durationMillis || 0) / 1000);
    return `Say your symptoms or medicine names (${secs}s) · Tap Stop when done`;
  }
  if (phase === 'requesting') return 'Granting microphone access…';
  if (phase === 'processing') return 'Compiling your sentence into 3 to 4 specific search issues…';
  if (phase === 'results') return 'Tap any issue below to view targeted remedies.';
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
  const [selectedIssueId, setSelectedIssueId] = useState<string>('all');
  const [compileStep, setCompileStep] = useState(0);
  const [addedId, setAddedId] = useState<number | null>(null);

  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compileIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCompileInterval = useCallback(() => {
    if (compileIntervalRef.current) {
      clearInterval(compileIntervalRef.current);
      compileIntervalRef.current = null;
    }
  }, []);

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
    setCompileStep(0);
    clearCompileInterval();
    compileIntervalRef.current = setInterval(() => {
      setCompileStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 700);

    try {
      const data = await voiceService.search(uri);
      clearCompileInterval();
      setResult(data);
      setSelectedIssueId('all');
      setPhase('results');
    } catch {
      clearCompileInterval();
      setErrorMsg('Voice search failed. Please check your connection and try again.');
      setPhase('error');
    }
  }, [recorder, clearCompileInterval]);

  const startListening = useCallback(async () => {
    clearCompileInterval();
    setErrorMsg('');
    setResult(null);
    setSelectedIssueId('all');
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
  }, [recorder, stopAndSearch, clearCompileInterval]);

  useEffect(() => {
    if (!visible) return undefined;

    const timer = setTimeout(() => {
      void startListening();
    }, 200);
    return () => clearTimeout(timer);
  }, [visible, startListening]);

  const handleClose = useCallback(() => {
    clearCompileInterval();
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
    setSelectedIssueId('all');
    setErrorMsg('');
    closeStore();
  }, [closeStore, recorder, clearCompileInterval]);

  const openProduct = useCallback(
    (id: number) => {
      handleClose();
      router.push(`/product/${id}`);
    },
    [handleClose, router]
  );

  const handleAddToCart = useCallback(
    (productId: number) => {
      addToCart(user?.id || 'guest', productId, 1);
      setAddedId(productId);
      setTimeout(() => setAddedId(null), 1500);
    },
    [user, addToCart]
  );

  const handleQuickSymptom = useCallback(async (symptom: string) => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    try {
      if (recorder.isRecording) await recorder.stop();
    } catch {}

    setPhase('processing');
    setCompileStep(0);
    clearCompileInterval();
    compileIntervalRef.current = setInterval(() => {
      setCompileStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 500);

    try {
      const data = await voiceService.searchText(symptom);
      clearCompileInterval();
      setResult(data);
      setSelectedIssueId('all');
      setPhase('results');
    } catch {
      clearCompileInterval();
      setErrorMsg('Could not fetch remedies. Please try again.');
      setPhase('error');
    }
  }, [recorder, clearCompileInterval]);

  const isListening = phase === 'listening';
  const isBusy = phase === 'requesting' || phase === 'processing';
  const isResults = phase === 'results';
  const isProcessing = phase === 'processing';
  const showGif = !isBusy || isListening;

  const gifSize = isResults ? 42 : 130;

  // Currently selected issue details
  const activeIssue =
    result?.issues && selectedIssueId !== 'all'
      ? result.issues.find((iss) => iss.id === selectedIssueId)
      : null;

  // Filter products by selected issue
  const displayedProducts = (result?.products || []).filter((p) => {
    if (selectedIssueId === 'all') return true;
    return p.matched_issue_ids?.includes(selectedIssueId);
  });

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
            { paddingBottom: Math.max(insets.bottom, 16) + spacing.sm },
          ]}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.brandRow}>
              <MaterialCommunityIcons name="creation" size={20} color={colors.primary} />
              <Text style={styles.brand}>Aura AI Voice</Text>
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

          {/* Media Wrap (GIF or Mini Header in Results) */}
          {!isProcessing && (
            <View style={[styles.mediaWrap, { height: gifSize + 10 }]}>
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
          )}

          <Text style={styles.statusTitle}>{statusTitle(phase)}</Text>
          <Text style={styles.statusSubtitle}>
            {statusSubtitle(phase, recorderState.durationMillis, errorMsg)}
          </Text>

          {/* COMPILING & PROCESSING FLOW ANIMATION */}
          {isProcessing && (
            <View style={styles.compilingContainer}>
              <View style={styles.compilingHeader}>
                <View style={styles.compilingBadge}>
                  <MaterialCommunityIcons name="auto-fix" size={15} color={colors.primary} />
                  <Text style={styles.compilingBadgeText}>Aura Clinical Pipeline</Text>
                </View>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>

              <View style={styles.stepperWrap}>
                {COMPILING_STEPS.map((step, idx) => {
                  const isDone = compileStep > idx;
                  const isCurrent = compileStep === idx;
                  return (
                    <View key={idx} style={styles.stepRow}>
                      <View
                        style={[
                          styles.stepIndicator,
                          isDone && styles.stepIndicatorDone,
                          isCurrent && styles.stepIndicatorCurrent,
                        ]}
                      >
                        {isDone ? (
                          <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />
                        ) : isCurrent ? (
                          <ActivityIndicator size={11} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.stepNumText}>{idx + 1}</Text>
                        )}
                      </View>
                      <View style={styles.stepContent}>
                        <Text
                          style={[
                            styles.stepLabel,
                            (isDone || isCurrent) && styles.stepLabelActive,
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.stepSubText}>{step.sub}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* RESULTS: TRANSCRIPT & COMPILED 3-4 ISSUES */}
          {isResults && result ? (
            <ScrollView
              style={styles.resultsScroll}
              contentContainerStyle={styles.resultsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Spoken Transcript & Aura AI Reply */}
              <View style={styles.transcriptCard}>
                <View style={styles.transcriptHeader}>
                  <MaterialCommunityIcons name="account-voice" size={16} color={colors.primary} />
                  <Text style={styles.transcriptLabel}>You said:</Text>
                </View>
                <Text style={styles.transcriptText}>"{result.transcript}"</Text>

                {result.reply ? (
                  <View style={styles.replyBox}>
                    <MaterialCommunityIcons name="creation" size={15} color={colors.primary} />
                    <Text style={styles.replyText}>{result.reply}</Text>
                  </View>
                ) : null}
              </View>

              {/* 3 TO 4 COMPILED SPECIFIC ISSUES */}
              {result.issues && result.issues.length > 0 && (
                <View style={styles.issuesSection}>
                  <View style={styles.issuesHeaderRow}>
                    <View style={styles.issuesHeaderLeft}>
                      <MaterialCommunityIcons
                        name="format-list-checks"
                        size={17}
                        color={colors.primary}
                      />
                      <Text style={styles.issuesSectionTitle}>
                        Compiled Health Issues ({result.issues.length})
                      </Text>
                    </View>
                    <Text style={styles.filterHint}>Tap issue to filter</Text>
                  </View>

                  {/* Horizontal Chips to Filter */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.issueChipsScroll}
                  >
                    {/* All chip */}
                    <TouchableOpacity
                      style={[
                        styles.issueChip,
                        selectedIssueId === 'all' && styles.issueChipActive,
                      ]}
                      onPress={() => setSelectedIssueId('all')}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name="view-grid-outline"
                        size={14}
                        color={selectedIssueId === 'all' ? '#FFFFFF' : colors.primary}
                      />
                      <Text
                        style={[
                          styles.issueChipText,
                          selectedIssueId === 'all' && styles.issueChipTextActive,
                        ]}
                      >
                        All ({result.products.length})
                      </Text>
                    </TouchableOpacity>

                    {/* Each compiled issue chip */}
                    {result.issues.map((issue) => {
                      const isSelected = selectedIssueId === issue.id;
                      const count = (result.products || []).filter((p) =>
                        p.matched_issue_ids?.includes(issue.id)
                      ).length;

                      return (
                        <TouchableOpacity
                          key={issue.id}
                          style={[
                            styles.issueChip,
                            isSelected && styles.issueChipActive,
                          ]}
                          onPress={() => setSelectedIssueId(issue.id)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons
                            name={getSafeIcon(issue.icon)}
                            size={14}
                            color={isSelected ? '#FFFFFF' : colors.primary}
                          />
                          <Text
                            style={[
                              styles.issueChipText,
                              isSelected && styles.issueChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {issue.title}
                          </Text>
                          <View
                            style={[
                              styles.chipBadge,
                              isSelected && styles.chipBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipBadgeText,
                                isSelected && styles.chipBadgeTextActive,
                              ]}
                            >
                              {count}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Detail card for selected issue */}
                  {activeIssue && (
                    <View style={styles.activeIssueCard}>
                      <View style={styles.activeIssueTop}>
                        <MaterialCommunityIcons
                          name={getSafeIcon(activeIssue.icon)}
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.activeIssueTitle}>{activeIssue.title}</Text>
                        {activeIssue.category ? (
                          <View style={styles.categoryPill}>
                            <Text style={styles.categoryPillText}>{activeIssue.category}</Text>
                          </View>
                        ) : null}
                      </View>
                      {activeIssue.tip ? (
                        <Text style={styles.activeIssueTip}>💡 {activeIssue.tip}</Text>
                      ) : null}
                      {activeIssue.query ? (
                        <View style={styles.activeIssueSearchTerms}>
                          <MaterialCommunityIcons name="magnify" size={13} color={colors.primary} />
                          <Text style={styles.activeIssueQueryText}>
                            Targeted query: {activeIssue.query}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              )}

              {/* Products matching the issue or all */}
              <View style={styles.productsHeaderRow}>
                <Text style={styles.productsHeaderTitle}>
                  {activeIssue
                    ? `Remedies for: ${activeIssue.title}`
                    : `Recommended Remedies (${result.products.length})`}
                </Text>
                {selectedIssueId !== 'all' && (
                  <TouchableOpacity onPress={() => setSelectedIssueId('all')}>
                    <Text style={styles.resetFilterText}>Show All</Text>
                  </TouchableOpacity>
                )}
              </View>

              {displayedProducts.length > 0 ? (
                <View style={styles.productsList}>
                  {displayedProducts.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      issues={result.issues}
                      onPress={() => openProduct(product.id)}
                      onAddToCart={() => handleAddToCart(product.id)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="magnify-close" size={36} color={colors.textTertiary} />
                  <Text style={styles.emptyText}>
                    No products specifically matched this issue. Tap "Show All" to see all remedies.
                  </Text>
                  <TouchableOpacity
                    style={styles.showAllBtn}
                    onPress={() => setSelectedIssueId('all')}
                  >
                    <Text style={styles.showAllBtnText}>Show All Remedies</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : null}

          {/* Toast Notification */}
          {addedId !== null && (
            <View style={styles.toastBox}>
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.surface} />
              <Text style={styles.toastText}>Item added to cart!</Text>
            </View>
          )}

          {/* Action Controls */}
          <View style={styles.controls}>
            {isListening ? (
              <View style={styles.listeningControlsCol}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.stopSearchButton]}
                  onPress={() => void stopAndSearch()}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="stop-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Stop & Search Remedies</Text>
                </TouchableOpacity>

                <View style={styles.quickSymptomSection}>
                  <Text style={styles.quickSymptomHeader}>Or tap common issue:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPillsRow}>
                    {['Fever & Headache', 'Cold & Cough', 'Acidity & Gas', 'Joint & Muscle Pain', 'First Aid'].map((sym) => (
                      <TouchableOpacity
                        key={sym}
                        style={styles.quickPill}
                        onPress={() => handleQuickSymptom(sym)}
                      >
                        <Text style={styles.quickPillText}>{sym}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            ) : isBusy ? null : (
              <View style={styles.listeningControlsCol}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => void startListening()}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="microphone" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    {isResults ? 'Ask another query' : 'Tap to Speak'}
                  </Text>
                </TouchableOpacity>

                {!isResults && (
                  <View style={styles.quickSymptomSection}>
                    <Text style={styles.quickSymptomHeader}>Or tap common issue:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPillsRow}>
                      {['Fever & Headache', 'Cold & Cough', 'Acidity & Gas', 'Joint & Muscle Pain', 'First Aid'].map((sym) => (
                        <TouchableOpacity
                          key={sym}
                          style={styles.quickPill}
                          onPress={() => handleQuickSymptom(sym)}
                        >
                          <Text style={styles.quickPillText}>{sym}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    maxHeight: '94%',
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
    marginTop: spacing.xs,
  },
  statusTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
  },
  statusSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
  },

  /* Compiling Pipeline Styles */
  compilingContainer: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(18, 70, 56, 0.15)',
  },
  compilingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(18, 70, 56, 0.10)',
  },
  compilingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compilingBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSize.xs,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stepperWrap: {
    gap: 10,
    marginTop: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepIndicatorDone: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  stepNumText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textTertiary,
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  stepLabelActive: {
    color: colors.textPrimary,
  },
  stepSubText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textSecondary,
  },

  /* Results Styles */
  resultsScroll: {
    marginTop: spacing.sm,
    maxHeight: 380,
  },
  resultsScrollContent: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  transcriptCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  transcriptLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyText: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.primaryDark,
    lineHeight: 16,
  },

  /* 3-4 Issues Section */
  issuesSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
  },
  issuesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: spacing.xs,
  },
  issuesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  issuesSectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  filterHint: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textTertiary,
  },
  issueChipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  issueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  issueChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  issueChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  issueChipTextActive: {
    color: '#FFFFFF',
  },
  chipBadge: {
    backgroundColor: 'rgba(18, 70, 56, 0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chipBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  chipBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
  },
  chipBadgeTextActive: {
    color: '#FFFFFF',
  },

  /* Active Issue Card */
  activeIssueCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(18, 70, 56, 0.15)',
  },
  activeIssueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeIssueTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
  },
  categoryPill: {
    backgroundColor: 'rgba(18, 70, 56, 0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  activeIssueTip: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  activeIssueSearchTerms: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  activeIssueQueryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.primary,
  },

  /* Products Header & List */
  productsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: spacing.xs,
  },
  productsHeaderTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  resetFilterText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
  },
  productsList: {
    gap: spacing.xs + 2,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.md,
    ...shadows.sm,
  },
  productImage: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  productInfo: { flex: 1 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCategory: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textPrimary,
  },
  productTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 17,
    marginTop: 2,
  },
  productPrice: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: 2,
  },
  productIssueTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  productIssueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  productIssueTagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.primaryDark,
    maxWidth: 130,
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
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  showAllBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
  },
  showAllBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
    marginTop: spacing.sm,
  },
  listeningControlsCol: {
    gap: spacing.xs + 2,
    width: '100%',
  },
  stopSearchButton: {
    backgroundColor: '#DC2626',
  },
  quickSymptomSection: {
    marginTop: 2,
    alignItems: 'center',
  },
  quickSymptomHeader: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  quickPillsRow: {
    gap: 6,
    paddingHorizontal: 4,
  },
  quickPill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.primary,
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

