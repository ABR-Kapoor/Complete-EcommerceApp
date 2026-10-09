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
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
  const [errorMsg, setErrorMsg] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSendCode = useCallback(async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await signIn.create({ identifier: email.trim() });
      if (error) {
        setErrorMsg(getClerkErrorMessage(error, 'Failed to send reset code.'));
        return;
      }

      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setErrorMsg(getClerkErrorMessage(sendError, 'Failed to send reset code.'));
        return;
      }

      setCodeSent(true);
      setErrorMsg('');
    } finally {
      setLoading(false);
    }
  }, [email, signIn]);

  const handleReset = useCallback(async () => {
    if (!code.trim() || !newPassword.trim()) {
      setErrorMsg('Please enter the code and new password.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });
      if (error) {
        setErrorMsg(getClerkErrorMessage(error, 'Password reset failed.'));
        return;
      }

      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (submitError) {
        setErrorMsg(getClerkErrorMessage(submitError, 'Password reset failed.'));
        return;
      }

      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) {
          setErrorMsg(getClerkErrorMessage(finalizeError));
          return;
        }
        
        // Push back to login on success
        router.replace('/(auth)/login');
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
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(auth)/login');
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Top Curved Green Background */}
        <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.topCurvedSection}>
          <View style={styles.topCurvedBackground} />
          <View style={styles.illustrationPlaceholder}>
            <MaterialCommunityIcons
              name={codeSent ? "email-check-outline" : "lock-reset"}
              size={80}
              color="#FFFFFF"
              opacity={0.8}
            />
          </View>
        </Animated.View>

        {/* Form Content */}
        <Animated.View entering={FadeInUp.duration(600).delay(200).springify().damping(14)} style={styles.formContainer}>
          <View style={styles.titleContainer}>
            <Text style={[styles.titleText, { color: colors.primary }]}>
              {codeSent ? 'Enter code' : 'Forgot '}
            </Text>
            <Text style={styles.titleText}>
              {codeSent ? '' : 'password?'}
            </Text>
          </View>
          <Text style={styles.subtitleText}>
            {codeSent
              ? `We sent a code to ${email}`
              : "Enter your email and we'll send you a reset code."}
          </Text>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {!codeSent ? (
            <>
              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputContainer, focusedInput === 'email' && styles.inputContainerFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Submit Button */}
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
              {/* Code Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <View style={[styles.inputContainer, focusedInput === 'code' && styles.inputContainerFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={colors.textTertiary}
                    value={code}
                    onChangeText={setCode}
                    onFocus={() => setFocusedInput('code')}
                    onBlur={() => setFocusedInput(null)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* New Password Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={[styles.inputContainer, focusedInput === 'newPassword' && styles.inputContainerFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textTertiary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setFocusedInput('newPassword')}
                    onBlur={() => setFocusedInput(null)}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Submit Button */}
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
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['4xl'],
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  topCurvedSection: {
    height: 320,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  topCurvedBackground: {
    position: 'absolute',
    top: -100,
    left: -50,
    right: -50,
    height: 420,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
  },
  illustrationPlaceholder: {
    marginTop: 40,
  },
  formContainer: {
    paddingHorizontal: spacing['2xl'],
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  titleText: {
    fontFamily: fonts.headingBold,
    fontSize: 28,
    color: colors.textPrimary,
  },
  subtitleText: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    lineHeight: 20,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    height: 40,
  },
  inputContainerFocused: {
    borderBottomColor: colors.primary,
    borderBottomWidth: 2,
  },
  input: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textPrimary,
    paddingBottom: 4,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  disabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textInverse,
  },
});
