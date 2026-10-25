import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { colors, fonts, fontSize, radius, spacing, shadows } from '../theme';

interface StepperProps {
  currentStep: 1 | 2 | 3 | number;
  cartDone?: boolean;
  addressDone?: boolean;
  paymentDone?: boolean;
  confirmDone?: boolean; // Kept for backwards compatibility
  onStepPress?: (step: 1 | 2 | 3) => void;
}

interface StepConfig {
  step: 1 | 2 | 3;
  label: string;
  defaultIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  route?: string;
}

const STEPS: StepConfig[] = [
  { step: 1, label: 'Cart', defaultIcon: 'cart', route: '/cart' },
  { step: 2, label: 'Address', defaultIcon: 'map-marker', route: '/checkout/address' },
  { step: 3, label: 'Payment', defaultIcon: 'credit-card-outline', route: '/checkout/payment' },
];

export default function CheckoutJourneyStepper({
  currentStep,
  cartDone,
  addressDone,
  paymentDone,
  onStepPress,
}: StepperProps) {
  const router = useRouter();
  const savedAddress = useUserStore((s) => s.address);
  const hasSavedAddress = Boolean(savedAddress && savedAddress.street && savedAddress.city);

  // Compute completed status for the 3 steps
  const isCartDone = cartDone !== undefined ? cartDone : currentStep >= 2;
  const isAddressDone =
    addressDone !== undefined
      ? addressDone
      : currentStep >= 3 || (currentStep === 1 && hasSavedAddress);
  const isPaymentDone = paymentDone !== undefined ? paymentDone : currentStep >= 4;

  const getStepStatus = (step: 1 | 2 | 3) => {
    switch (step) {
      case 1:
        return { isDone: isCartDone, isActive: currentStep === 1 && !isCartDone };
      case 2:
        return { isDone: isAddressDone, isActive: currentStep === 2 && !isAddressDone };
      case 3:
        return { isDone: isPaymentDone, isActive: currentStep === 3 && !isPaymentDone };
      default:
        return { isDone: false, isActive: false };
    }
  };

  const handlePress = (stepConfig: StepConfig) => {
    if (onStepPress) {
      onStepPress(stepConfig.step);
      return;
    }
    // Allow jumping back to earlier completed steps
    if (stepConfig.step < currentStep && stepConfig.route) {
      router.push(stepConfig.route as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.timelineWrapper}>
        {/* Horizontal Connecting Timeline Line Tracks (2 Segments for 3 Steps) */}
        <View style={styles.connectingLineContainer} pointerEvents="none">
          {[1, 2].map((segmentIndex) => {
            // Segment 1 connects step 1 (Cart) -> step 2 (Address)
            // Segment 2 connects step 2 (Address) -> step 3 (Payment)
            const prevDone = segmentIndex === 1 ? isCartDone : isAddressDone;
            const currentOrPrevDone = prevDone || currentStep > segmentIndex;

            return (
              <View key={`seg-${segmentIndex}`} style={styles.segmentTrack}>
                <View
                  style={[
                    styles.segmentFill,
                    currentOrPrevDone ? styles.segmentFillDone : styles.segmentFillPending,
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Step Nodes Row */}
        <View style={styles.nodesRow}>
          {STEPS.map((item) => {
            const { isDone, isActive } = getStepStatus(item.step);
            const canNavigate = item.step < currentStep;

            return (
              <TouchableOpacity
                key={item.step}
                style={styles.nodeColumn}
                activeOpacity={canNavigate ? 0.75 : 1}
                onPress={() => handlePress(item)}
                disabled={!canNavigate && !onStepPress}
              >
                {/* Node Circle Badge */}
                <View
                  style={[
                    styles.nodeCircle,
                    isDone && styles.nodeCircleDone,
                    isActive && styles.nodeCircleActive,
                    !isDone && !isActive && styles.nodeCirclePending,
                  ]}
                >
                  {isDone ? (
                    <MaterialCommunityIcons name="check-bold" size={16} color="#FFFFFF" />
                  ) : (
                    <MaterialCommunityIcons
                      name={item.defaultIcon}
                      size={isActive ? 16 : 15}
                      color={isActive ? colors.primary : colors.textTertiary}
                    />
                  )}
                </View>

                {/* Step Label */}
                <Text
                  style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                    isActive && styles.stepLabelActive,
                    !isDone && !isActive && styles.stepLabelPending,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>

                {/* Status Badge Pill */}
                <View
                  style={[
                    styles.statusPill,
                    isDone && styles.statusPillDone,
                    isActive && styles.statusPillActive,
                    !isDone && !isActive && styles.statusPillPending,
                  ]}
                >
                  {isDone ? (
                    <View style={styles.pillContent}>
                      <MaterialCommunityIcons name="check" size={10} color="#059669" />
                      <Text style={styles.statusPillTextDone}>Done</Text>
                    </View>
                  ) : isActive ? (
                    <Text style={styles.statusPillTextActive}>Active</Text>
                  ) : (
                    <Text style={styles.statusPillTextPending}>{`Step ${item.step}`}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timelineWrapper: {
    position: 'relative',
    paddingVertical: spacing.xs,
  },
  connectingLineContainer: {
    position: 'absolute',
    top: 22, // Center vertically behind the 34px circle
    left: '16.6%',
    right: '16.6%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  segmentTrack: {
    flex: 1,
    height: 3,
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: 12,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  segmentFillDone: {
    backgroundColor: '#059669',
  },
  segmentFillPending: {
    backgroundColor: colors.surfaceAlt,
  },
  nodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  nodeColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  nodeCircleDone: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 3,
  },
  nodeCircleActive: {
    backgroundColor: colors.surface,
    borderWidth: 2.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  nodeCirclePending: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  stepLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginBottom: 3,
    textAlign: 'center',
  },
  stepLabelDone: {
    color: '#059669',
    fontFamily: fonts.bodyBold,
  },
  stepLabelActive: {
    color: colors.primary,
    fontFamily: fonts.headingBold,
  },
  stepLabelPending: {
    color: colors.textTertiary,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + '40',
  },
  statusPillPending: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusPillTextDone: {
    fontSize: 9.5,
    fontFamily: fonts.bodyBold,
    color: '#059669',
  },
  statusPillTextActive: {
    fontSize: 9.5,
    fontFamily: fonts.headingBold,
    color: colors.primary,
  },
  statusPillTextPending: {
    fontSize: 9.5,
    fontFamily: fonts.bodyMedium,
    color: colors.textTertiary,
  },
});
