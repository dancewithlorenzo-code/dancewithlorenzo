import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, useAlert, getSupabaseClient } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/theme';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithPassword, signUpWithPassword, sendOTP, verifyOTPAndLogin, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const { t } = useLanguage();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [showResetFlow, setShowResetFlow] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  

  const handleSendSignupOtp = async () => {
    if (!email) {
      showAlert(t('error'), 'Please enter your email address');
      return;
    }

    if (!password || !confirmPassword) {
      showAlert(t('error'), 'Please enter and confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      showAlert(t('error'), 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showAlert(t('error'), 'Password must be at least 6 characters');
      return;
    }

    setSendingOtp(true);
    const { error } = await sendOTP(email);
    setSendingOtp(false);

    if (error) {
      showAlert(t('error'), error);
      return;
    }

    setOtpSent(true);
    showAlert(t('success'), `4-digit verification code sent to ${email}! Check your inbox and spam folder.`);
  };

  const handleVerifySignup = async () => {
    if (!otp || otp.length !== 4) {
      showAlert(t('error'), 'Please enter the 4-digit code');
      return;
    }

    setVerifyingOtp(true);
    const { error } = await verifyOTPAndLogin(email, otp, { password });
    setVerifyingOtp(false);

    if (error) {
      showAlert(t('error'), error);
      return;
    }

    showAlert(t('success'), 'Account created successfully! You are now logged in.');
  };



  const handleLogin = async () => {
    console.log('Login clicked - email:', email, 'password length:', password?.length);
    
    if (!email || !password) {
      console.log('Validation failed - missing email or password');
      showAlert(t('error'), 'Please fill in all fields');
      return;
    }

    console.log('Calling signInWithPassword...');
    const { error } = await signInWithPassword(email, password);
    console.log('signInWithPassword result - error:', error);
    
    if (error) {
      showAlert(t('error'), error);
      return;
    }
    
    console.log('Login successful!');
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setOtpSent(false);
    setOtp('');
  };

  const handleForgotPassword = () => {
    setShowResetFlow(true);
    setOtpSent(false);
    setOtp('');
  };

  const handleSendResetOtp = async () => {
    if (!email) {
      showAlert(t('error'), 'Please enter your email address');
      return;
    }

    setSendingOtp(true);
    const { error } = await sendOTP(email);
    setSendingOtp(false);

    if (error) {
      showAlert(t('error'), error);
      return;
    }

    setOtpSent(true);
    showAlert(t('success'), `4-digit reset code sent to ${email}! Check your inbox and spam folder.`);
  };

  const handleVerifyResetOtp = async () => {
    if (!otp || otp.length !== 4) {
      showAlert(t('error'), 'Please enter the 4-digit code');
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      showAlert(t('error'), 'Please enter your new password');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showAlert(t('error'), 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showAlert(t('error'), 'Password must be at least 6 characters');
      return;
    }

    setVerifyingOtp(true);
    const { error } = await verifyOTPAndLogin(email, otp, { password: newPassword });
    setVerifyingOtp(false);

    if (error) {
      showAlert(t('error'), error);
      return;
    }

    showAlert(t('success'), 'Password reset successfully! You are now logged in.');
    handleCancelReset();
  };

  const handleCancelReset = () => {
    setShowResetFlow(false);
    setOtpSent(false);
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
  };


  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.lg }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Pressable 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>Dance with Lorenzo</Text>
        <Text style={styles.subtitle}>
          {isLogin ? t('login') : t('signup')}
        </Text>

        {/* Password Reset Flow */}
        {showResetFlow ? (
          <View style={styles.formContainer}>
            <View style={styles.resetHeader}>
              <MaterialIcons name="lock-reset" size={48} color={colors.primary} />
              <Text style={styles.resetTitle}>Reset Your Password</Text>
              <Text style={styles.resetSubtitle}>Enter your email to receive a 4-digit reset code</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!otpSent}
              />
            </View>

            {!otpSent ? (
              <Pressable 
                style={[styles.primaryButton, sendingOtp && styles.buttonDisabled]}
                onPress={handleSendResetOtp}
                disabled={sendingOtp}
              >
                <Text style={styles.primaryButtonText}>
                  {sendingOtp ? 'Sending Code...' : 'Send 4-Digit Code'}
                </Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>4-Digit Verification Code</Text>
                  <Text style={styles.helperText}>Check your email for the code</Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="0000"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                    maxLength={4}
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textLight}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textLight}
                    secureTextEntry
                  />
                </View>

                <Pressable 
                  style={[styles.primaryButton, verifyingOtp && styles.buttonDisabled]}
                  onPress={handleVerifyResetOtp}
                  disabled={verifyingOtp}
                >
                  <Text style={styles.primaryButtonText}>
                    {verifyingOtp ? 'Resetting...' : 'Reset Password'}
                  </Text>
                </Pressable>

                <Pressable 
                  style={styles.resendButton}
                  onPress={handleSendResetOtp}
                  disabled={sendingOtp}
                >
                  <MaterialIcons name="refresh" size={16} color={colors.primary} />
                  <Text style={styles.resendText}>Resend Code</Text>
                </Pressable>
              </>
            )}

            <Pressable 
              style={styles.cancelButton}
              onPress={handleCancelReset}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          /* Email/Password Form */
          <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('email')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('password')}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textLight}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {!isLogin && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('confirm_password')}</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              {otpSent && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>4-Digit Verification Code</Text>
                  <Text style={styles.helperText}>Check your email for the code</Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="0000"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                    maxLength={4}
                    autoFocus
                  />
                </View>
              )}
            </>
          )}

          {isLogin ? (
            <Pressable 
              style={[styles.primaryButton, operationLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={operationLoading}
            >
              <Text style={styles.primaryButtonText}>
                {operationLoading ? t('loading') : t('login')}
              </Text>
            </Pressable>
          ) : (
            <>
              {!otpSent ? (
                <Pressable 
                  style={[styles.primaryButton, sendingOtp && styles.buttonDisabled]}
                  onPress={handleSendSignupOtp}
                  disabled={sendingOtp}
                >
                  <Text style={styles.primaryButtonText}>
                    {sendingOtp ? 'Sending Code...' : 'Send Verification Code'}
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable 
                    style={[styles.primaryButton, verifyingOtp && styles.buttonDisabled]}
                    onPress={handleVerifySignup}
                    disabled={verifyingOtp}
                  >
                    <Text style={styles.primaryButtonText}>
                      {verifyingOtp ? 'Verifying...' : 'Create Account'}
                    </Text>
                  </Pressable>

                  <Pressable 
                    style={styles.resendButton}
                    onPress={handleSendSignupOtp}
                    disabled={sendingOtp}
                  >
                    <MaterialIcons name="refresh" size={16} color={colors.primary} />
                    <Text style={styles.resendText}>Resend Code</Text>
                  </Pressable>
                </>
              )}
            </>
          )}

          {/* Forgot Password Help */}
          {isLogin && (
            <Pressable 
              style={styles.forgotButton}
              onPress={handleForgotPassword}
            >
              <MaterialIcons name="mail" size={16} color={colors.accent} />
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          )}

          {/* Toggle Login/Signup */}
          <Pressable 
            style={styles.toggleButton}
            onPress={handleToggleMode}
          >
            <Text style={styles.toggleText}>
              {isLogin ? t('dont_have_account') : t('already_have_account')}
            </Text>
          </Pressable>
        </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  toggleButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  toggleText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  helperText: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
  },
  resetHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resetTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
  },
  resetSubtitle: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    ...typography.caption,
    color: colors.textLight,
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  resendText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  forgotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  forgotText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
});
