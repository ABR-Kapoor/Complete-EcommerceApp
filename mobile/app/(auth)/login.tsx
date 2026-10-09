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
import { useSignIn, useOAuth } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { getClerkErrorMessage } from '../../services/clerkError';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await signIn.password({
        identifier: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(getClerkErrorMessage(error, 'Sign in failed. Please check your credentials.'));
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize();
        router.replace('/(tabs)');
      } else if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
        setErrorMsg('Additional verification is required.');
      } else {
        setErrorMsg('Sign in could not be completed.');
      }
    } catch (err: unknown) {
      setErrorMsg(getClerkErrorMessage(err, 'Sign in failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  }, [email, password, router, signIn]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch {
      setErrorMsg('Failed to sign in with Google');
    }
  }, [startOAuthFlow, router]);

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
        {/* Top Curved Green Background */}
        <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.topCurvedSection}>
          <View style={styles.topCurvedBackground} />
          {/* We use an icon as a placeholder for the illustration */}
          <View style={styles.illustrationPlaceholder}>
            <MaterialCommunityIcons name="shopping" size={80} color="#FFFFFF" opacity={0.8} />
          </View>
        </Animated.View>

        {/* Form Content */}
        <Animated.View entering={FadeInUp.duration(600).delay(300).springify().damping(14)} style={styles.formContainer}>
          <View style={styles.titleContainer}>
            <Text style={[styles.titleText, { color: colors.primary }]}>Hello </Text>
            <Text style={styles.titleText}>Again!</Text>
          </View>
          <Text style={styles.subtitleText}>
            Fill your details or continue with{'\n'}social media.
          </Text>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={[styles.inputContainer, focusedInput === 'email' && styles.inputContainerFocused]}>
              <TextInput
                style={styles.input}
                placeholder="imshuvo97@gmail.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputContainer, focusedInput === 'password' && styles.inputContainerFocused]}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
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
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Google Sign In Button */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} activeOpacity={0.8}>
            <MaterialCommunityIcons name="google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Sign In With Google</Text>
          </TouchableOpacity>

          {/* Create Account Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>New User? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
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
    top: -100, // Make it big enough to curve naturally at the bottom
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing['2xl'],
  },
  forgotPasswordText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textInverse,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  googleButtonText: {
    fontFamily: fonts.heading,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  footerLink: {
    fontFamily: fonts.heading,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});
