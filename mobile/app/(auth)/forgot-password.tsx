import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSignIn } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { getClerkErrorMessage } from '../../services/clerkError';

export default function ForgotPasswordScreen() {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSendCode = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn.create({ identifier: email.trim() });
      if (error) {
        Alert.alert('Error', getClerkErrorMessage(error, 'Failed to send reset code.'));
        return;
      }

      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        Alert.alert('Error', getClerkErrorMessage(sendError, 'Failed to send reset code.'));
        return;
      }

      setCodeSent(true);
    } finally {
      setLoading(false);
    }
  }, [email, signIn]);

  const handleReset = useCallback(async () => {
    if (!code.trim() || !newPassword.trim()) {
      Alert.alert('Missing fields', 'Please enter the code and new password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });
      if (error) {
        Alert.alert('Error', getClerkErrorMessage(error, 'Password reset failed.'));
        return;
      }

      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (submitError) {
        Alert.alert('Error', getClerkErrorMessage(submitError, 'Password reset failed.'));
        return;
      }

      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) {
          Alert.alert('Error', getClerkErrorMessage(finalizeError));
          return;
        }
        Alert.alert('Success', 'Password reset successfully.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [code, newPassword, router, signIn]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'android' ? 'height' : 'padding'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={codeSent ? 'email-check-outline' : 'lock-reset'}
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {codeSent ? 'Enter reset code' : 'Forgot password?'}
          </Text>
          <Text style={styles.subtitle}>
            {codeSent
              ? `We sent a code to ${email}`
              : "Enter your email and we'll send you a reset code."}
          </Text>
        </View>

        {!codeSent ? (
          <>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="numeric"
                size={20}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Verification code"
                placeholderTextColor={colors.textTertiary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoFocus
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={colors.textTertiary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['5xl'],
    paddingBottom: spacing['3xl'],
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  header: { alignItems: 'center', marginBottom: spacing['3xl'] },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 52,
    marginBottom: spacing.md,
  },
  inputIcon: { marginRight: spacing.md },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  disabled: { opacity: 0.7 },
  primaryButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
});
