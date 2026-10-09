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

export default function LoginScreen() {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn.password({
        emailAddress: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Sign In Error', getClerkErrorMessage(error, 'Sign in failed. Please check your credentials.'));
        return;
      }

      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) {
          Alert.alert('Sign In Error', getClerkErrorMessage(finalizeError));
          return;
        }
        router.replace('/(tabs)');
      } else if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
        Alert.alert('Sign In', 'Additional verification is required.');
      } else {
        Alert.alert('Sign In', 'Sign in could not be completed.');
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, router, signIn]);

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
        {/* Brand Header */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons
              name="hospital-building"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={styles.brandName}>AuraMart</Text>
          <Text style={styles.brandTagline}>Healthcare marketplace</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>
            Sign in to your account to continue
          </Text>

          {/* Email */}
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
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={20}
              color={colors.textTertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInButton, loading && styles.signInButtonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up */}
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.signUpButtonText}>Create an account</Text>
          </TouchableOpacity>
        </View>

        {/* Trust footer */}
        <View style={styles.trustSection}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={16}
            color={colors.textTertiary}
          />
          <Text style={styles.trustText}>
            Secure authentication powered by Clerk
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['6xl'],
    paddingBottom: spacing['3xl'],
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brandName: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize['2xl'],
    color: colors.primary,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formSection: {
    marginBottom: spacing['3xl'],
  },
  formTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
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
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing['2xl'],
  },
  forgotPasswordText: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  signInButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing['2xl'],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginHorizontal: spacing.lg,
  },
  signUpButton: {
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  signUpButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustText: {
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
