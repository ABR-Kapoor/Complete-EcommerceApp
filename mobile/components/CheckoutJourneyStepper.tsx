import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, radius, spacing } from '../theme';

interface StepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

const STEPS = [
  { step: 1, label: 'Cart', icon: 'cart-outline' },
  { step: 2, label: 'Address', icon: 'map-marker-outline' },
  { step: 3, label: 'Payment', icon: 'credit-card-outline' },
  { step: 4, label: 'Confirm', icon: 'check-circle-outline' },
];

export default function CheckoutJourneyStepper({ currentStep }: StepperProps) {
  const progressPercent =
    currentStep === 1 ? '25%' : currentStep === 2 ? '50%' : currentStep === 3 ? '75%' : '100%';

  return (
    <View style={styles.wrapper}>
      {/* Top Thin Progress Track */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressPercent }]} />
      </View>

      {/* Modern Segmented Steps Row */}
      <View style={styles.stepsRow}>
        {STEPS.map((item) => {
          const isActive = item.step === currentStep;
          const isPassed = item.step < currentStep;

          return (
            <View
              key={item.step}
              style={[
                styles.stepItem,
                isActive && styles.stepItemActive,
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  isActive && styles.iconCircleActive,
                  isPassed && styles.iconCirclePassed,
                ]}
              >
                {isPassed ? (
                  <MaterialCommunityIcons name="check" size={13} color={colors.surface} />
                ) : (
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={14}
                    color={isActive ? colors.surface : colors.textTertiary}
                  />
                )}
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isPassed && styles.stepLabelPassed,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs + 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
  },
  stepItemActive: {
    backgroundColor: colors.primarySoft,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.primary,
  },
  iconCirclePassed: {
    backgroundColor: '#059669',
  },
  stepLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textTertiary,
  },
  stepLabelActive: {
    fontFamily: fonts.headingBold,
    color: colors.primary,
  },
  stepLabelPassed: {
    fontFamily: fonts.bodySemiBold,
    color: '#059669',
  },
});
