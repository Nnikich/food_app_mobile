import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, ChefHat, Sparkles, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const { signIn, signUp, verifyEmail, resendVerification, setGuestMode } = useAppContext();
  const router = useRouter();

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States for verification flow
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Status banners
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Code resend countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleSubmit = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password || (!isLoginTab && !confirmPassword)) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Пожалуйста, введите корректный email адрес');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    if (!isLoginTab && password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLoginTab) {
        // Sign in
        const res = await signIn(cleanEmail, password);
        if (!res.success) {
          if (res.error === 'EMAIL_UNVERIFIED' && res.email) {
            setVerificationEmail(res.email);
            setIsVerifying(true);
            setError(null);
            setSuccessMsg('Почта еще не подтверждена. Код отправлен.');
            resendVerification(res.email);
            setResendTimer(60);
          } else {
            setError(res.error || 'Неверный email или пароль');
          }
        } else {
          router.replace('/(tabs)');
        }
      } else {
        // Sign up
        const res = await signUp(cleanEmail, password, confirmPassword);
        if (!res.success) {
          setError(res.error || 'Ошибка при регистрации');
        } else {
          if (res.requiresVerification && res.email) {
            setVerificationEmail(res.email);
            setIsVerifying(true);
            setError(null);
            setSuccessMsg('Регистрация успешна! Код подтверждения отправлен на почту.');
            setResendTimer(60);
          } else {
            router.replace('/(tabs)');
          }
        }
      }
    } catch (err) {
      setError('Что-то пошло не так. Попробуйте еще раз.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    const code = verificationCode.trim();
    if (!code || code.length !== 6) {
      setError('Пожалуйста, введите 6-значный код');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await verifyEmail(verificationEmail, code);
      if (!res.success) {
        setError(res.error || 'Неверный код подтверждения');
      } else {
        setSuccessMsg('Почта успешно подтверждена! Добро пожаловать!');
        setTimeout(() => {
          router.replace('/onboarding');
        }, 1200);
      }
    } catch (err) {
      setError('Ошибка верификации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await resendVerification(verificationEmail);
      if (res.success) {
        setSuccessMsg('Код успешно отправлен повторно!');
        setResendTimer(60);
      } else {
        setError(res.error || 'Не удалось отправить код повторно');
      }
    } catch (err) {
      setError('Ошибка отправки кода');
    }
  };

  const handleGuestBypass = () => {
    setGuestMode();
    router.replace('/onboarding');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Background Glows */}
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        {/* Logo and title */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#f43f5e', '#ec4899']}
            style={styles.logoBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ChefHat size={36} color="#ffffff" />
          </LinearGradient>
          <View style={styles.titleWrapper}>
            <Text style={styles.logoText}>CHOOZI</Text>
            <Sparkles size={20} color="#f43f5e" style={styles.sparkleIcon} />
          </View>
          <Text style={styles.subtitle}>Быстрые решения для вкусных рецептов</Text>
        </View>

        {/* Main interactive card */}
        <View style={styles.card}>
          {/* Status alerts */}
          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#ef4444" style={styles.bannerIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {successMsg && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={16} color="#10b981" style={styles.bannerIcon} />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {isVerifying ? (
            // Verification Form View
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Подтверждение почты</Text>
              <Text style={styles.formDesc}>
                Код отправлен на <Text style={styles.highlightText}>{verificationEmail}</Text>. Введите его ниже для входа.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Код подтверждения</Text>
                <TextInput
                  placeholder="000000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.verificationInput}
                  value={verificationCode}
                  onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').substring(0, 6))}
                />
              </View>

              <TouchableOpacity
                onPress={handleVerifySubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#f43f5e', '#ec4899']}
                  style={styles.submitButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View style={styles.submitBtnInner}>
                      <Text style={styles.submitBtnText}>Подтвердить и войти</Text>
                      <ArrowRight size={16} color="#ffffff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.verificationActions}>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={resendTimer > 0}
                >
                  <Text style={[styles.resendText, resendTimer > 0 && styles.disabledText]}>
                    {resendTimer > 0 ? `Повторить отправку через ${resendTimer}с` : 'Отправить код повторно'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setIsVerifying(false);
                    setError(null);
                    setSuccessMsg(null);
                    setVerificationCode('');
                  }}
                >
                  <Text style={styles.backToLoginText}>Назад к форме входа</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Tabs View (Login / Register)
            <View style={styles.formContainer}>
              {/* Tab Selector */}
              <View style={styles.tabSelector}>
                <TouchableOpacity
                  style={[styles.tabButton, isLoginTab && styles.activeTab]}
                  onPress={() => {
                    setIsLoginTab(true);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, isLoginTab && styles.activeTabText]}>Вход</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, !isLoginTab && styles.activeTab]}
                  onPress={() => {
                    setIsLoginTab(false);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, !isLoginTab && styles.activeTabText]}>Регистрация</Text>
                </TouchableOpacity>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email адрес</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    placeholder="your-name@example.com"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Пароль</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              {/* Confirm Password Input (Register mode only) */}
              {!isLoginTab && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Подтвердите пароль</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.textInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                </View>
              )}

              {/* Submit Action */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
                style={{ marginTop: 8 }}
              >
                <LinearGradient
                  colors={['#f43f5e', '#ec4899']}
                  style={styles.submitButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View style={styles.submitBtnInner}>
                      <Text style={styles.submitBtnText}>
                        {isLoginTab ? 'Войти в аккаунт' : 'Создать аккаунт'}
                      </Text>
                      <ArrowRight size={16} color="#ffffff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Guest Bypass button */}
        <TouchableOpacity
          onPress={handleGuestBypass}
          style={styles.guestButton}
          activeOpacity={0.8}
        >
          <Text style={styles.guestText}>Войти без регистрации (как гость)</Text>
        </TouchableOpacity>

        {/* Legal credentials details footer */}
        <View style={styles.legalFooter}>
          <Text style={styles.legalInfoText}>
            Пользуясь приложением, вы соглашаетесь с Офертой и Политикой.
          </Text>
          <Text style={styles.legalNameText}>
            CHOOZI кулинарный сервис • ИП Гольцев Н.С. • ИНН 235208985015
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  glowTop: {
    position: 'absolute',
    top: 50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#ffe4e6',
    opacity: 0.6,
    zIndex: -1,
  },
  glowBottom: {
    position: 'absolute',
    bottom: 50,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#fce7f3',
    opacity: 0.6,
    zIndex: -1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBg: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  sparkleIcon: {
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderWidth: 1,
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  bannerIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    flex: 1,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#d1fae5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  successText: {
    fontSize: 12,
    color: '#10b981',
    flex: 1,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  formDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    marginBottom: 20,
  },
  highlightText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 16,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabText: {
    color: '#0f172a',
  },
  inputGroup: {
    marginBottom: 16,
    width: '100%',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: '#0f172a',
  },
  verificationInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#0f172a',
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  verificationActions: {
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  resendText: {
    fontSize: 12,
    color: '#f43f5e',
    fontWeight: '700',
  },
  disabledText: {
    color: '#94a3b8',
  },
  backToLoginText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  guestButton: {
    marginTop: 24,
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  guestText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  legalFooter: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  legalInfoText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  legalNameText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
});
