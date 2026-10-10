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
import { useSignUp, useOAuth } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, fonts, fontSize, spacing, radius } from '../../theme';
import { getClerkErrorMessage } from '../../services/clerkError';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { signUp } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignUp = useCallback(async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await signUp.password({
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || undefined,
        emailAddress: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(getClerkErrorMessage(error, 'Registration failed. Please try again.'));
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setErrorMsg(getClerkErrorMessage(sendError, 'Could not send the verification code.'));
        return;
      }

      setPendingVerification(true);
    } catch (err: unknown) {
      setErrorMsg(getClerkErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [name, email, password, signUp]);

  const handleVerify = useCallback(async () => {
    if (!code.trim()) {
      setErrorMsg('Please enter the verification code.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({
        code: code.trim(),
      });

      if (error) {
        setErrorMsg(getClerkErrorMessage(error, 'Verification failed. Please try again.'));
        return;
      }

      if (signUp.status === 'complete') {
        await signUp.finalize();
        router.replace('/(tabs)');
      } else {
        setErrorMsg('Verification could not be completed.');
      }
    } catch (err: unknown) {
      setErrorMsg(getClerkErrorMessage(err, 'Verification failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [code, router, signUp]);

  const handleGoogleSignUp = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch {
      setErrorMsg('Failed to sign up with Google');
    }
  }, [startOAuthFlow, router]);

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Curved Green Background */}
          <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.topCurvedSection}>
            <View style={styles.topCurvedBackground} />
            <View style={styles.illustrationPlaceholder}>
              <MaterialCommunityIcons name="email-check-outline" size={80} color="#FFFFFF" opacity={0.8} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(200).springify().damping(14)} style={styles.formContainer}>
            <View style={styles.titleContainer}>
              <Text style={[styles.titleText, { color: colors.primary }]}>Verify </Text>
              <Text style={styles.titleText}>Email</Text>
            </View>
            <Text style={styles.subtitleText}>
              We sent a verification code to{'\n'}
              {email}
            </Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

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
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify Email</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
        {/* Top Curved Green Background with Brand Logo */}
        <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.topCurvedSection}>
          <View style={styles.topCurvedBackground} />
          <View style={styles.illustrationPlaceholder}>
            <Image
              source={require('../../assets/AuraMart-transparent-Logo.png')}
              style={styles.authBrandLogo}
              contentFit="contain"
            />
          </View>
        </Animated.View>

        {/* Form Content */}
        <Animated.View entering={FadeInUp.duration(600).delay(300).springify().damping(14)} style={styles.formContainer}>
          <View style={styles.titleContainer}>
            <Text style={[styles.titleText, { color: colors.primary }]}>Create </Text>
            <Text style={styles.titleText}>Account</Text>
          </View>
          <Text style={styles.subtitleText}>
            Fill your details or continue with{'\n'}social media.
          </Text>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Name */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={[styles.inputContainer, focusedInput === 'name' && styles.inputContainerFocused]}>
              <TextInput
                style={styles.input}
                placeholder="Jhon Doe"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="words"
                textContentType="name"
              />
            </View>
          </View>

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
                textContentType="newPassword"
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

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Required for sign-up flows on Expo web */}
          <View nativeID="clerk-captcha" />

          {/* Google Sign In Button */}
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignUp} activeOpacity={0.8}>
            <MaterialCommunityIcons name="google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Sign Up With Google</Text>
          </TouchableOpacity>

          {/* Create Account Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Already Have Account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Log In</Text>
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
    marginBottom: spacing.xl,
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
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: 22,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  authBrandLogo: {
    width: 170,
    height: 48,
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
