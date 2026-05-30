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

export const AuthScreen: React.FC = () => {
  const { login, register, isLoading, error } = useAppStore();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Please fill in email and password.');
      return;
    }
    if (!isLogin && !name) {
      setLocalError('Please fill in your name.');
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: any) {
      // Handled by store, but we can log it here
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setLocalError(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  const activeError = error || localError;

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
          <Text style={styles.brandName}>ANTIGRAVITY</Text>
          <Text style={styles.brandSub}>Geo-Finance & Investment Auditor</Text>
        </View>

        {/* Auth Glass Card */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>
            {isLogin ? 'Sign In to Hub' : 'Register Account'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {isLogin ? 'Welcome back! Log in to view your ledger.' : 'Join and start tracking geospatial transactions.'}
          </Text>

          {activeError && (
            <View style={styles.errorContainer}>
              <Icons.AlertCircle size={16} color="#EF4444" style={styles.errorIcon} />
              <Text style={styles.errorText}>{activeError}</Text>
            </View>
          )}

          <View style={styles.form}>
            {!isLogin && (
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
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.8 }
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>
                    {isLogin ? 'Authenticate' : 'Get Started'}
                  </Text>
                  <Icons.ArrowRight size={16} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>
        </GlassCard>

        {/* Toggle Footer button */}
        <Pressable style={styles.toggleFooter} onPress={toggleMode}>
          <Text style={styles.toggleText}>
            {isLogin ? "Don't have an account? " : "Already registered? "}
            <Text style={styles.toggleTextHighlight}>
              {isLogin ? 'Sign Up' : 'Log In'}
            </Text>
          </Text>
        </Pressable>
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
