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

type AuthMode = 'login' | 'register' | 'verify';

export const AuthScreen: React.FC = () => {
  const { sendOtp, verifyOtp, isLoading, error } = useAppStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearState = () => {
    setLocalError(null);
    setSuccessMsg(null);
  };

  const handleSendOtp = async () => {
    clearState();
    if (!phoneNumber) {
      setLocalError('Please enter your phone number.');
      return;
    }
    if (mode === 'register' && !name) {
      setLocalError('Please enter your full name.');
      return;
    }

    try {
      await sendOtp(phoneNumber);
      setSuccessMsg('Verification code sent!');
      setMode('verify');
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  const handleVerifyOtp = async () => {
    clearState();
    if (!code || code.length !== 6) {
      setLocalError('Please enter the 6-digit code.');
      return;
    }
    try {
      await verifyOtp(phoneNumber, code, name);
    } catch (err: any) {
      setLocalError(err.message);
      if (err.isNewUser) {
        // If they tried to log in but don't exist, we send them to register
        setLocalError('Account not found. Please register.');
        setMode('register');
      }
    }
  };

  const switchTo = (target: AuthMode) => {
    setMode(target);
    clearState();
    setCode('');
  };

  const activeError = error || localError;

  const titles: Record<AuthMode, string> = {
    login: 'Sign In to Hub',
    register: 'Create Account',
    verify: 'Enter Verification Code',
  };

  const subtitles: Record<AuthMode, string> = {
    login: 'Welcome back! Log in to view your ledger.',
    register: 'Join and start tracking geospatial transactions.',
    verify: `We sent a code to ${phoneNumber}. Enter it below.`,
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
            {/* --- REGISTER MODE --- */}
            {mode === 'register' && (
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
            )}

            {/* --- ENTRY MODES --- */}
            {(mode === 'login' || mode === 'register') && (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputContainer}>
                    <Icons.Phone size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="+1234567890"
                      placeholderTextColor="#6B7280"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleSendOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Send Code</Text>
                      <Icons.ArrowRight size={16} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </>
            )}

            {/* --- VERIFY MODE --- */}
            {mode === 'verify' && (
              <>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Verification Code</Text>
                  <View style={styles.inputContainer}>
                    <Icons.Key size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      placeholder="123456"
                      placeholderTextColor="#6B7280"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.input}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Verify & Continue</Text>
                      <Icons.Check size={16} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </GlassCard>

        {/* Toggle Login/Register footer */}
        <View style={styles.footer}>
          {mode === 'login' ? (
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.footerLink} onPress={() => switchTo('register')}>
                Register here
              </Text>
            </Text>
          ) : mode === 'register' ? (
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.footerLink} onPress={() => switchTo('login')}>
                Sign in here
              </Text>
            </Text>
          ) : (
            <Pressable onPress={() => switchTo('login')} style={styles.backBtn}>
              <Icons.ArrowLeft size={16} color="#9CA3AF" />
              <Text style={styles.backBtnText}>Back to Sign In</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19', // Dark premium background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  brandSub: {
    fontSize: 14,
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  inputWrapper: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.8)',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%',
  },
  submitBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  successText: {
    color: '#6EE7B7',
    fontSize: 14,
    flex: 1,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  footerLink: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backBtnText: {
    color: '#9CA3AF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});
