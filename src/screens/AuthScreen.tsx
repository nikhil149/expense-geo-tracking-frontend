import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { GlassCard } from '../components/GlassCard';
import * as LucideIcons from 'lucide-react-native';
const Icons = LucideIcons as any;

type AuthMode = 'login' | 'register' | 'forgot' | 'verify' | 'resetPassword';

export const AuthScreen: React.FC = () => {
  const { login, register, forgotPassword, verifyCode, resetPassword, isLoading, error } = useAppStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearState = () => {
    setLocalError(null);
    setSuccessMsg(null);
  };

  const handleLoginSubmit = async () => {
    clearState();
    if (!email || !password) {
      setLocalError('Please fill in email and password.');
      return;
    }
    try {
      await login(email, password);
    } catch (err: any) { /* handled by store */ }
  };

  const handleRegisterSubmit = async () => {
    clearState();
    if (!email || !password || !name) {
      setLocalError('Please fill in all fields.');
      return;
    }
    try {
      await register(email, password, name);
    } catch (err: any) { /* handled by store */ }
  };

  const handleForgotSubmit = async () => {
    clearState();
    if (!email) {
      setLocalError('Please enter your email address.');
      return;
    }
    try {
      const msg = await forgotPassword(email);
      setSuccessMsg('Verification code sent! Check your email.');
      setMode('verify');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleVerifySubmit = async () => {
    clearState();
    if (!code || code.length !== 6) {
      setLocalError('Please enter the 6-digit code.');
      return;
    }
    try {
      await verifyCode(email, code);
      setSuccessMsg('Code verified! Set your new password.');
      setMode('resetPassword');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleResetSubmit = async () => {
    clearState();
    if (!newPassword || !confirmPassword) {
      setLocalError('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    try {
      await resetPassword(email, code, newPassword);
      setSuccessMsg('Password reset successfully! You can now log in.');
      setMode('login');
      setPassword('');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const switchTo = (target: AuthMode) => {
    setMode(target);
    clearState();
    if (target === 'login' || target === 'register') {
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const activeError = error || localError;

  // Card titles and subtitles per mode
  const titles: Record<AuthMode, string> = {
    login: 'Sign In to Hub',
    register: 'Register Account',
    forgot: 'Forgot Password',
    verify: 'Enter Verification Code',
    resetPassword: 'Set New Password',
  };

  const subtitles: Record<AuthMode, string> = {
    login: 'Welcome back! Log in to view your ledger.',
    register: 'Join and start tracking geospatial transactions.',
    forgot: 'Enter your email to receive a 6-digit verification code.',
    verify: `We sent a code to ${email}. Enter it below.`,
    resetPassword: 'Choose a strong new password for your account.',
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Branding header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBox}>
            <Icons.TrendingUp size={32} color="#8B5CF6" />
          </View>
          <Text style={styles.brandName}>GEO-FINANCE</Text>
          <Text style={styles.brandSub}>Geo-Finance & Investment Auditor</Text>
        </View>

        {/* Auth Glass Card */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{titles[mode]}</Text>
          <Text style={styles.cardSubtitle}>{subtitles[mode]}</Text>

          {/* Success message */}
          {successMsg && (
            <View style={styles.successContainer}>
              <Icons.CheckCircle size={16} color="#10B981" style={styles.errorIcon} />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {/* Error message */}
          {activeError && (
            <View style={styles.errorContainer}>
              <Icons.AlertCircle size={16} color="#EF4444" style={styles.errorIcon} />
              <Text style={styles.errorText}>{activeError}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* --- LOGIN MODE --- */}
            {mode === 'login' && (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Icons.Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="nikhil@example.com"
                      placeholderTextColor="#6B7280"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputContainer}>
                    <Icons.Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor="#6B7280"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Forgot Password Link */}
                <Pressable onPress={() => switchTo('forgot')} style={styles.forgotBtn}>
                  <Text style={styles.forgotBtnText}>Forgot Password?</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleLoginSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Authenticate</Text>
                      <Icons.ArrowRight size={16} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </>
            )}

            {/* --- REGISTER MODE --- */}
            {mode === 'register' && (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputContainer}>
                    <Icons.User size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Nikhil Rachawar"
                      placeholderTextColor="#6B7280"
                      value={name}
                      onChangeText={setName}
                      style={styles.input}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Icons.Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="nikhil@example.com"
                      placeholderTextColor="#6B7280"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputContainer}>
                    <Icons.Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor="#6B7280"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleRegisterSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Get Started</Text>
                      <Icons.ArrowRight size={16} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </>
            )}

            {/* --- FORGOT PASSWORD MODE --- */}
            {mode === 'forgot' && (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Icons.Mail size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="nikhil@example.com"
                      placeholderTextColor="#6B7280"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleForgotSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icons.Send size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Send Verification Code</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}

            {/* --- VERIFY CODE MODE --- */}
            {mode === 'verify' && (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>6-Digit Verification Code</Text>
                  <View style={styles.inputContainer}>
                    <Icons.KeyRound size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="123456"
                      placeholderTextColor="#6B7280"
                      value={code}
                      onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[styles.input, { letterSpacing: 6, fontSize: 20, fontWeight: '700' }]}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleVerifySubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icons.ShieldCheck size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Verify Code</Text>
                    </>
                  )}
                </Pressable>

                <Pressable onPress={handleForgotSubmit} style={styles.resendBtn}>
                  <Text style={styles.resendBtnText}>Didn't receive it? Resend Code</Text>
                </Pressable>
              </>
            )}

            {/* --- RESET PASSWORD MODE --- */}
            {mode === 'resetPassword' && (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Icons.Lock size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor="#6B7280"
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Icons.LockKeyhole size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor="#6B7280"
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleResetSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icons.Save size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Reset Password</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </GlassCard>

        {/* Toggle Footer */}
        {(mode === 'login' || mode === 'register') && (
          <Pressable
            style={styles.toggleFooter}
            onPress={() => switchTo(mode === 'login' ? 'register' : 'login')}
          >
            <Text style={styles.toggleText}>
              {mode === 'login' ? "Don't have an account? " : "Already registered? "}
              <Text style={styles.toggleTextHighlight}>
                {mode === 'login' ? 'Sign Up' : 'Log In'}
              </Text>
            </Text>
          </Pressable>
        )}

        {/* Back to Login from forgot/verify/reset screens */}
        {(mode === 'forgot' || mode === 'verify' || mode === 'resetPassword') && (
          <Pressable style={styles.toggleFooter} onPress={() => switchTo('login')}>
            <Text style={styles.toggleText}>
              Remember your password?{' '}
              <Text style={styles.toggleTextHighlight}>Back to Login</Text>
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.25)',
      },
    }),
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  brandSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
    lineHeight: 18,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  successText: {
    flex: 1,
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  errorIcon: {
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '500',
  },
  form: {
    marginTop: 20,
    gap: 16,
  },
  inputWrapper: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#F3F4F6',
    fontSize: 14,
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  forgotBtnText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  resendBtn: {
    alignSelf: 'center',
    marginTop: -4,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  resendBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  submitBtn: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
      },
    }),
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleFooter: {
    marginTop: 24,
    alignItems: 'center',
    padding: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  toggleText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  toggleTextHighlight: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
});
