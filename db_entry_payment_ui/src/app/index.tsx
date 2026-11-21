import { createContext, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';

import { API_BASE_URL } from '../config/api';

type LoginMethod = 'OTP' | 'PASSWORD';
type AppRole = 'MANAGEMENT' | 'TRAINER' | 'MEMBER';
type MemberFilter = 'ALL' | 'CURRENT' | 'DUE_SOON' | 'OVERDUE' | 'ACTIVE';
type Stage = 'role' | 'mobile' | 'credential' | 'home' | 'members' | 'onboard' | 'collect' | 'payments' | 'reminders' | 'memberHome' | 'memberRenew' | 'memberPayments' | 'memberUpdates';

type LoginMethodResponse = {
  name: string;
  mobileNumber: string;
  loginMethod?: LoginMethod;
};

type LoginResponse = {
  id: number;
  managementId?: number;
  name: string;
  mobileNumber: string;
  role?: AppRole;
  accessToken?: string;
};

type Plan = {
  id: number;
  managementId: number;
  name: string;
  amount: number;
  durationMonths: number;
  sessionCount?: number | null;
};

type Trainer = {
  id: number;
  managementId: number;
  name: string;
  mobileNumber: string | null;
};

type CreateMemberResponse = {
  memberId: number;
  selectedPlanId: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  expiresOn: string;
};

type MemberListItem = {
  id: number;
  fullName: string;
  whatsappNumber: string;
  photoData: string | null;
  membershipPlanName: string;
  hasPersonalTraining: boolean;
  expiresOn: string;
  status: 'ACTIVE' | 'DUE_SOON' | 'OVERDUE' | 'PENDING';
};

type MembersListResponse = {
  totalCount: number;
  dueSoonCount: number;
  overdueCount: number;
  activeCount: number;
  members: MemberListItem[];
};

type MemberDetail = {
  id: number;
  fullName: string;
  whatsappNumber: string;
  photoData: string | null;
  email: string | null;
  flatHouseNumber: string | null;
  apartmentBuilding: string | null;
  streetArea: string | null;
  city: string | null;
  pinCode: string | null;
  emergencyContactName: string | null;
  emergencyContactMobile: string | null;
  sendWhatsappWelcome: boolean;
  memberSince: string;
  onboardedBy: string;
  membershipPlanId: number;
  membershipPlanName: string;
  membershipPlanAmount: number;
  membershipPlanDurationMonths: number;
  personalTrainingPlanId: number | null;
  personalTrainingPlanName: string | null;
  personalTrainingPlanAmount: number | null;
  personalTrainingPlanDurationMonths: number | null;
  startDate: string;
  expiresOn: string;
  customEndDate?: string | null;
  membershipPriceOverride?: number | null;
  personalTrainingPriceOverride?: number | null;
  personalTrainingExpiresOn?: string | null;
  trainer: string;
  status: 'ACTIVE' | 'DUE_SOON' | 'OVERDUE' | 'PENDING';
};

type Payment = {
  id: number;
  memberId: number;
  memberSelectedPlanId: number;
  membershipPlanName: string;
  personalTrainingPlanName: string | null;
  amount: number;
  paymentMode: 'UPI' | 'CASH';
  utr: string | null;
  screenshotAttached: boolean;
  screenshotData: string | null;
  receiptSent: boolean;
  capturedBy: string;
  validTill: string;
  personalTrainingValidTill?: string | null;
  createdDate: string;
};

type WhatsAppMessage = {
  id: number;
  memberId: number | null;
  recipientName: string;
  recipientPhone: string;
  messageType: 'WELCOME' | 'RECEIPT' | 'REMINDER' | 'UPDATE';
  messageText: string;
  initiatedBy: string;
  automatic: boolean;
  handoffStatus: string;
  createdDate: string;
};

type ReminderSettings = {
  managementId: number;
  beforeDue: boolean;
  onDue: boolean;
  afterDue: boolean;
  sendAt: string;
  createdDate: string | null;
};

const DEMO_MANAGEMENT_MOBILE = '9876501003';
let apiAccessToken = '';
let onSessionExpired: (() => void) | undefined;
async function apiFetch(path: string, options: RequestInit = {}) {
  const sessionAtStart = apiAccessToken;
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (sessionAtStart !== apiAccessToken) throw new Error('Session changed. Please try again.');
  checkSession(response, path);
  return response;
}
function checkSession(response: Response, path: string) {
  if (response.status === 401 && apiAccessToken && !path.includes('/auth/') && !path.includes('/app-auth/')) {
    apiAccessToken = '';
    onSessionExpired?.();
    throw new Error('Your session has expired. Please sign in again.');
  }
}
let qaAccessCode = '';

function apiHeaders(json = false) {
  return {
    ...(qaAccessCode ? { 'X-QA-Code': qaAccessCode } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(apiAccessToken ? { Authorization: `Bearer ${apiAccessToken}` } : {}),
  };
}

function getErrorMessage(payload: unknown) {
  if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Something went wrong. Please try again.';
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    headers: apiHeaders(true),
    body: JSON.stringify(body),
  });

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getErrorMessage(payload));
  return payload as T;
}

async function getRequest<T>(path: string): Promise<T> {
  const response = await apiFetch(path, { headers: apiHeaders() });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getErrorMessage(payload));
  return payload as T;
}

async function putRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'PUT', headers: apiHeaders(true), body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getErrorMessage(payload));
  return payload as T;
}

async function patchRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'PATCH', headers: apiHeaders(true), body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(getErrorMessage(payload));
  return payload as T;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

const PRIMARY_TXN_LABEL = /\b(?:google|phonepe|paytm)\s*(?:transaction|txn)\s*(?:id|no\.?|number)\b/i;
const TRANSACTION_LABEL = /\b(?:transaction|txn|payment)\s*(?:id|no\.?|number)\b/i;
const REFERENCE_LABEL =
  /\b(?:(?:upi|payment)\s*)?(?:utr|rrn)\b|\b(?:(?:upi|payment)\s*)?(?:reference|ref)\s*(?:id|no\.?|number)\b/i;
const ID_VALUE = /\b(?=[a-z0-9/_-]{6,}\b)(?=[a-z0-9/_-]*\d)[a-z0-9][a-z0-9/_-]{5,}\b/i;

function valueAfterLabel(lines: string[], lineIndex: number, label: RegExp): string | undefined {
  const line = lines[lineIndex];
  const match = line.match(label);
  if (!match || match.index === undefined) {
    return undefined;
  }

  const sameLineValue = line
    .slice(match.index + match[0].length)
    .replace(/^\s*[:#=\-]?\s*/, '')
    .match(ID_VALUE)?.[0];
  if (sameLineValue) {
    return sameLineValue;
  }

  for (let offset = 1; offset <= 2; offset += 1) {
    const nextLine = lines[lineIndex + offset];
    if (!nextLine || PRIMARY_TXN_LABEL.test(nextLine) || TRANSACTION_LABEL.test(nextLine) || REFERENCE_LABEL.test(nextLine)) {
      break;
    }
    const value = nextLine.match(ID_VALUE)?.[0];
    if (value) {
      return value;
    }
  }

  return undefined;
}

function findTransactionId(text: string): { transactionId?: string; referenceId?: string } | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let primaryTransactionId: string | undefined;
  let transactionId: string | undefined;
  let referenceId: string | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    if (!primaryTransactionId && PRIMARY_TXN_LABEL.test(lines[index])) {
      primaryTransactionId = valueAfterLabel(lines, index, PRIMARY_TXN_LABEL);
    }
    if (!transactionId && TRANSACTION_LABEL.test(lines[index])) {
      transactionId = valueAfterLabel(lines, index, TRANSACTION_LABEL);
    }
    if (!referenceId && REFERENCE_LABEL.test(lines[index])) {
      referenceId = valueAfterLabel(lines, index, REFERENCE_LABEL);
    }
  }

  const resolvedTxnId = primaryTransactionId ?? transactionId;
  if (!resolvedTxnId && !referenceId) {
    return null;
  }

  return { transactionId: resolvedTxnId, referenceId };
}

function extractUpiUtrFromText(rawText: string): string | null {
  if (!rawText) return null;
  const found = findTransactionId(rawText);
  if (found?.transactionId) return found.transactionId;
  if (found?.referenceId) return found.referenceId;
  return null;
}

function sortPlansByDuration(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => a.durationMonths - b.durationMonths || a.id - b.id);
}

function membershipDurationText(months: number) {
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

function planValidityText(plan: Plan) {
  return `${plan.sessionCount ? `${plan.sessionCount} sessions · ` : ''}${membershipDurationText(plan.durationMonths)}`;
}

function whatsappLink(phoneNumber: string, message: string) {
  const digits = phoneNumber.replace(/\D/g, '').replace(/^91/, '');
  const phone = `91${digits}`;
  const encoded = encodeURIComponent(message);
  return Platform.OS === 'web'
    ? `https://wa.me/${phone}?text=${encoded}`
    : `whatsapp://send?phone=${phone}&text=${encoded}`;
}

async function openWhatsApp(phoneNumber: string, message: string) {
  const nativeUrl = whatsappLink(phoneNumber, message);
  const fallbackUrl = `https://wa.me/91${phoneNumber.replace(/\D/g, '').replace(/^91/, '')}?text=${encodeURIComponent(message)}`;
  try {
    await Linking.openURL(nativeUrl);
  } catch {
    await Linking.openURL(fallbackUrl);
  }
}

async function openWhatsAppShare(message: string) {
  const encoded = encodeURIComponent(message);
  const nativeUrl = Platform.OS === 'web' ? `https://wa.me/?text=${encoded}` : `whatsapp://send?text=${encoded}`;
  try {
    await Linking.openURL(nativeUrl);
  } catch {
    await Linking.openURL(`https://wa.me/?text=${encoded}`);
  }
}

async function prepareWhatsAppMessage(input: {
  managementId: number;
  memberId: number;
  messageType: WhatsAppMessage['messageType'];
  messageText: string;
  initiatedBy: string;
}) {
  return request<WhatsAppMessage>('/whatsapp/messages', { ...input, automatic: false });
}

type RoleTheme = {
  primary: string;
  onPrimary: string;
  soft: string;
  border: string;
};

function getRoleTheme(role: AppRole): RoleTheme {
  if (role === 'MANAGEMENT') {
    return {
      primary: '#38BDF8',
      onPrimary: '#082032',
      soft: 'rgba(56, 189, 248, 0.14)',
      border: 'rgba(56, 189, 248, 0.4)',
    };
  }
  return {
    primary: '#FFC83A',
    onPrimary: '#1A1400',
    soft: 'rgba(255, 200, 58, 0.14)',
    border: 'rgba(255, 200, 58, 0.4)',
  };
}

const RoleThemeContext = createContext<RoleTheme>(getRoleTheme('TRAINER'));

function AlertBanner({ message, variant = 'error' }: { message: string; variant?: 'error' | 'success' | 'info' }) {
  if (!message) return null;
  const isError = variant === 'error';
  const isSuccess = variant === 'success';
  const icon = isError ? 'alert-circle' : isSuccess ? 'check-circle' : 'info';
  const color = isError ? '#F87171' : isSuccess ? '#34D399' : '#38BDF8';
  return (
    <View
      style={[
        styles.alertBanner,
        isError ? styles.alertBannerError : isSuccess ? styles.alertBannerSuccess : styles.alertBannerInfo,
      ]}
      accessibilityRole="alert"
    >
      <Feather name={icon} size={16} color={color} style={styles.alertBannerIcon} />
      <Text style={[styles.alertBannerText, { color }]}>{message}</Text>
    </View>
  );
}

function PoweredByFooter({ withBottomInset = true }: { withBottomInset?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      style={[
        styles.poweredByFooter,
        withBottomInset && { paddingBottom: Math.max(insets.bottom, 12) + 4 },
      ]}
      onPress={() => void Linking.openURL('https://entrypayment.com/')}
      accessibilityRole="link"
      accessibilityLabel="Powered by Entry Payment, entrypayment.com"
    >
      <Text style={styles.poweredByText}>
        Powered by <Text style={styles.poweredByBrand}>Entry Payment</Text> · © {new Date().getFullYear()} entrypayment.com
      </Text>
    </Pressable>
  );
}

const ProfileActionContext = createContext<() => void>(() => {});

export default function ManagementLoginScreen() {
  const loginScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [unlocked, setUnlocked] = useState(process.env.EXPO_PUBLIC_QA_GATE !== '1');
  const [code, setCode] = useState('');
  const [appRole, setAppRole] = useState<AppRole>('MANAGEMENT');
  const [mobileNumber, setMobileNumber] = useState('');
  const [credential, setCredential] = useState('');
  const [stage, setStage] = useState<Stage>('role');
  const [membersInitialFilter, setMembersInitialFilter] = useState<MemberFilter>('ALL');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('OTP');
  const [managementName, setManagementName] = useState('');
  const [managementId, setManagementId] = useState<number | null>(null);
  const [actorId, setActorId] = useState<number | null>(null);
  const [collectMemberId, setCollectMemberId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  const cleanMobileNumber = mobileNumber.replace(/\D/g, '').slice(-10);
  const isOtp = loginMethod === 'OTP';

  useEffect(() => {
    if (stage !== 'mobile' && stage !== 'credential') return;
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      loginScrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => subscription.remove();
  }, [stage]);

  useEffect(() => {
    onSessionExpired = () => {
      homeCache.clear(); setManagementId(null); setActorId(null); setManagementName('');
      setCredential(''); setStage('role');
    };
    return () => { onSessionExpired = undefined; };
  }, []);

  if (!unlocked) {
    const unlock = async () => {
      setLoading(true);
      setError('');
      try {
        const value = code.trim();
        const response = await fetch(API_BASE_URL + '/qa/access', { headers: { 'X-QA-Code': value }, redirect: 'error' });
        if (response.status !== 204) throw new Error(response.status === 401 ? 'Incorrect QA code. Ask the test host for the current code.' : 'QA relay unavailable. Ask the test host to start the QA relay.');
        qaAccessCode = value;
        setCode('');
        setUnlocked(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to reach the QA relay.');
      } finally { setLoading(false); }
    };
    return <SafeAreaView style={styles.loginCard}><Text style={styles.label}>Entry Payment · QA access</Text>
      <Text style={{ color: '#A6AEBB' }}>Enter the temporary code shared by the test host, then sign in with your test account.</Text>
      <TextInput value={code} onChangeText={setCode} accessibilityLabel="QA access code" placeholder="QA access code" secureTextEntry autoCapitalize="none" autoCorrect={false} style={{ padding: 14, backgroundColor: '#1D2127', color: '#ECEEF1', marginTop: 16 }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primaryButton} disabled={loading || !code.trim()} onPress={unlock}><Text style={styles.primaryButtonText}>{loading ? 'Checking…' : 'Continue'}</Text></Pressable>
    </SafeAreaView>;
  }

  function openCollect(memberId: number | null = null) {
    setCollectMemberId(memberId);
    setStage('collect');
  }

  function selectRole(role: AppRole) {
    setAppRole(role);
    setMobileNumber('');
    setCredential('');
    setLoginMethod('OTP');
    setManagementName('');
    setManagementId(null);
    setActorId(null);
    setError('');
    setStage('mobile');
  }

  async function continueWithMobile() {
    if (cleanMobileNumber.length !== 10) {
      setError('Enter your 10-digit mobile number.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const path = appRole === 'MANAGEMENT'
        ? '/management/auth/login-method'
        : `/app-auth/${appRole === 'TRAINER' ? 'trainers' : 'members'}/login-method`;
      const result = await request<LoginMethodResponse>(path, {
        mobileNumber: cleanMobileNumber,
      });
      setManagementName(result.name);
      setLoginMethod(result.loginMethod ?? 'OTP');
      setCredential('');
      setStage('credential');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to find this account.');
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    if (!credential.trim()) {
      setError(isOtp ? 'Enter your passcode.' : 'Enter your password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const path = appRole === 'MANAGEMENT'
        ? (isOtp ? '/management/auth/verify-otp' : '/management/auth/verify-password')
        : `/app-auth/${appRole === 'TRAINER' ? 'trainers' : 'members'}/verify-otp`;
      const result = await request<LoginResponse>(
        path,
        isOtp
          ? { mobileNumber: cleanMobileNumber, otp: credential.trim() }
          : { mobileNumber: cleanMobileNumber, password: credential },
      );
      if (!result.accessToken) throw new Error('Login session was not returned. Please update the API.');
      homeCache.clear();
      setCredential('');
      setManagementName(result.name);
      setManagementId(result.managementId ?? result.id);
      setActorId(result.id);
      apiAccessToken = result.accessToken ?? '';
      setStage(appRole === 'MEMBER' ? 'memberHome' : 'home');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message.replace(/\bOTP\b/gi, 'passcode') : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    if (apiAccessToken) void request('/session/logout', {}).catch(() => {});
    setManagementId(null); setActorId(null); setManagementName('');
    homeCache.clear();
    apiAccessToken = '';
    setStage('role');
    setMobileNumber('');
    setCredential('');
    setError('');
  }

  const roleTheme = getRoleTheme(appRole);

  function withProfile(screen: ReactNode) {
    return <RoleThemeContext.Provider value={roleTheme}><ProfileActionContext.Provider value={() => setProfileOpen(true)}>{screen}<AccountSheet visible={profileOpen} managementName={managementName} mobileNumber={cleanMobileNumber} role={appRole} onClose={() => setProfileOpen(false)} onLogout={() => { setProfileOpen(false); restart(); }} /></ProfileActionContext.Provider></RoleThemeContext.Provider>;
  }

  if (stage === 'role') {
    return <RolePickerScreen onSelect={selectRole} />;
  }

  if (stage === 'home') {
    return <HomeScreen managementId={managementId ?? 1} managementName={managementName || (appRole === 'TRAINER' ? 'Ahmed' : 'Mahesh')} mobileNumber={cleanMobileNumber} actorRole={appRole} onMembers={(filter = 'ALL') => { setMembersInitialFilter(filter); setStage('members'); }} onOnboard={() => setStage('onboard')} onCollect={() => openCollect()} onPayments={() => setStage('payments')} onReminders={() => setStage('reminders')} onLogout={restart} />;
  }

  if (stage === 'members') {
    return withProfile(<MembersScreen initialFilter={membersInitialFilter} managementId={managementId ?? 1} actorRole={appRole} actorName={managementName || (appRole === 'TRAINER' ? 'Ahmed' : 'Mahesh')} onHome={() => setStage('home')} onPayments={() => setStage('payments')} onReminders={() => setStage('reminders')} onOnboard={() => setStage('onboard')} onCollect={(memberId) => openCollect(memberId)} onCollectFromNav={() => openCollect()} />);
  }

  if (stage === 'onboard') {
    return withProfile(<OnboardMemberScreen managementId={managementId ?? 1} actorName={managementName || (appRole === 'TRAINER' ? 'Ahmed' : 'Mahesh')} actorRole={appRole} onBack={() => setStage('members')} onSaved={() => { homeCache.delete(managementId ?? 1); setStage('members'); }} onHome={() => setStage('home')} onCollect={(memberId) => openCollect(memberId ?? null)} onPayments={() => setStage('payments')} onReminders={() => setStage('reminders')} />);
  }

  if (stage === 'collect') {
    return withProfile(<CollectPaymentScreen managementId={managementId ?? 1} actorName={managementName || (appRole === 'TRAINER' ? 'Ahmed' : 'Mahesh')} actorRole={appRole} memberId={collectMemberId} onBack={() => setStage('members')} onSaved={() => { homeCache.delete(managementId ?? 1); setStage('members'); }} onHome={() => setStage('home')} onPayments={() => setStage('payments')} onReminders={() => setStage('reminders')} />);
  }

  if (stage === 'payments') {
    return withProfile(<PaymentsHistoryScreen managementId={managementId ?? 1} limitedToRecent={appRole === 'TRAINER'} actorName={managementName || (appRole === 'TRAINER' ? 'Ahmed' : 'Mahesh')} onHome={() => setStage('home')} onMembers={() => { setMembersInitialFilter('ALL'); setStage('members'); }} onCollect={() => openCollect()} onReminders={() => setStage('reminders')} />);
  }

  if (stage === 'reminders') {
    return withProfile(<RemindersScreen managementId={managementId ?? 1} actorRole={appRole} actorName={managementName || (appRole === 'TRAINER' ? 'Ahmed' : 'Mahesh')} onHome={() => setStage('home')} onMembers={() => { setMembersInitialFilter('ALL'); setStage('members'); }} onCollect={() => openCollect()} onPayments={() => setStage('payments')} />);
  }

  if (stage === 'memberHome') {
    return <MemberHomeScreen managementId={managementId ?? 1} memberId={actorId ?? 0} memberName={managementName} onRenew={() => setStage('memberRenew')} onPayments={() => setStage('memberPayments')} onUpdates={() => setStage('memberUpdates')} onLogout={restart} />;
  }

  if (stage === 'memberRenew') {
    return <MemberRenewScreen managementId={managementId ?? 1} memberId={actorId ?? 0} onHome={() => setStage('memberHome')} onPayments={() => setStage('memberPayments')} onUpdates={() => setStage('memberUpdates')} />;
  }

  if (stage === 'memberPayments') {
    return <MemberPaymentsScreen managementId={managementId ?? 1} memberId={actorId ?? 0} onHome={() => setStage('memberHome')} onRenew={() => setStage('memberRenew')} onUpdates={() => setStage('memberUpdates')} />;
  }

  if (stage === 'memberUpdates') {
    return <MemberUpdatesScreen managementId={managementId ?? 1} memberId={actorId ?? 0} onHome={() => setStage('memberHome')} onRenew={() => setStage('memberRenew')} onPayments={() => setStage('memberPayments')} />;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior="padding"
        >
          <ScrollView ref={loginScrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false} overScrollMode="never" automaticallyAdjustKeyboardInsets>
            <View style={styles.phoneFrame}>
              <ImageBackground
                source={require('../../assets/images/people-fitness-hero.jpg')}
                style={styles.hero}
                imageStyle={styles.heroPhoto}
              >
                <View style={styles.heroShade} />
                <View style={styles.heroBottomFade} />
                {Platform.OS === 'web' ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusTime}>9:53</Text>
                    <View style={styles.statusIcons}>
                      <Text style={styles.statusSignal}>▮▮▮</Text>
                      <Text style={styles.statusSignal}>●</Text>
                      <Text style={styles.statusSignal}>▭</Text>
                    </View>
                  </View>
                ) : null}
                <View style={styles.heroTopLine}>
                  <View style={styles.heroTopLeft}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Back to role selection" style={styles.heroBackBtn} disabled={loading} onPress={restart} hitSlop={10}>
                      <Feather name="arrow-left" size={18} color="#F3F5F7" />
                    </Pressable>
                    <Image
                      source={require('../../assets/images/people-fitness-logo.jpg')}
                      style={styles.logoMark}
                      accessibilityLabel="People Fitness logo"
                    />
                  </View>
                  <View style={styles.taglinePill}>
                    <Text style={styles.tagline}>STRENGTH · CARDIO</Text>
                  </View>
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.welcome}>WELCOME TO</Text>
                  <Text style={styles.brandName}>People Fitness</Text>
                  <View style={styles.brandMetaRow}>
                    <View style={[styles.rolePill, { backgroundColor: roleTheme.soft, borderColor: roleTheme.border }]}>
                      <Text style={[styles.rolePillText, { color: roleTheme.primary }]}>
                        {appRole === 'MEMBER' ? 'Member' : appRole === 'TRAINER' ? 'Trainer' : 'Management'}
                      </Text>
                    </View>
                  </View>
                </View>
              </ImageBackground>

              <View style={styles.loginCard}>
                {stage === 'mobile' ? (
                  <>
                    <Text style={styles.cardTitle}>Log in with your mobile number</Text>
                    <Text style={styles.cardSubtitle}>We’ll check the login method configured for your account.</Text>
                    <Text style={styles.label}>Mobile number</Text>
                    <View style={styles.mobileInputRow}>
                      <View style={styles.countryCode}><Text style={styles.countryCodeText}>+91</Text></View>
                      <TextInput
                        value={mobileNumber}
                        onChangeText={(value) => { setMobileNumber(value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                        placeholder="98765 01003"
                        placeholderTextColor="#6E7785"
                        keyboardType="phone-pad"
                        maxLength={10}
                        style={styles.mobileInput}
                        returnKeyType="done"
                        onSubmitEditing={continueWithMobile}
                      />
                    </View>
                    <AlertBanner message={error} />
                    <Pressable
                      style={[styles.primaryButton, { backgroundColor: roleTheme.primary, shadowColor: roleTheme.primary }, loading && styles.disabledButton]}
                      onPress={continueWithMobile}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color={roleTheme.onPrimary} /> : <Text style={[styles.primaryButtonText, { color: roleTheme.onPrimary }]}>Continue</Text>}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable style={styles.backPillButton} onPress={() => { setCredential(''); setError(''); setStage('mobile'); }} disabled={loading}>
                      <Feather name="arrow-left" size={15} color="#9BA3B0" />
                      <Text style={styles.backPillText}>Use a different number</Text>
                    </Pressable>
                    <Text style={styles.cardTitle}>Welcome, {managementName}</Text>
                    <Text style={styles.cardSubtitle}>
                      {isOtp
                        ? 'Enter the passcode configured for this account.'
                        : 'A password is configured for this account. Passcode login is disabled.'}
                    </Text>
                    <Text style={styles.label}>{isOtp ? 'Passcode' : 'Password'}</Text>
                    <TextInput
                      value={credential}
                      onChangeText={(value) => { setCredential(isOtp ? value.replace(/\D/g, '').slice(0, 6) : value); setError(''); }}
                      placeholder={isOtp ? 'Enter passcode' : 'Enter password'}
                      placeholderTextColor="#6E7785"
                      keyboardType={isOtp ? 'number-pad' : 'default'}
                      secureTextEntry={!isOtp}
                      maxLength={isOtp ? 6 : undefined}
                      style={[styles.credentialInput, isOtp && styles.otpInput]}
                      returnKeyType="done"
                      onSubmitEditing={signIn}
                    />
                    <AlertBanner message={error} />
                    <Pressable
                      style={[styles.primaryButton, { backgroundColor: roleTheme.primary, shadowColor: roleTheme.primary }, loading && styles.disabledButton]}
                      onPress={signIn}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color={roleTheme.onPrimary} /> : <Text style={[styles.primaryButtonText, { color: roleTheme.onPrimary }]}>Log in</Text>}
                    </Pressable>
                  </>
                )}
                <PoweredByFooter />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function RolePickerScreen({ onSelect }: { onSelect: (role: AppRole) => void }) {
  const roles: Array<{ role: AppRole; title: string; people: string; detail: string; icon: 'user-check' | 'shield' | 'user' }> = [
    { role: 'TRAINER', title: 'Trainer', people: 'Ahmed · Kiran', detail: 'Onboard members and collect payments', icon: 'user-check' },
    { role: 'MANAGEMENT', title: 'Management', people: 'Mahesh · Bala', detail: 'Run the center, payments and reminders', icon: 'shield' },
  ];
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.rolePicker}>
          <ImageBackground source={require('../../assets/images/people-fitness-hero.jpg')} style={styles.roleHero} imageStyle={styles.heroPhoto}>
            <View style={styles.heroShade} />
            <View style={styles.heroBottomFade} />
            <View style={styles.heroTopLine}>
              <Image source={require('../../assets/images/people-fitness-logo.jpg')} style={styles.logoMark} />
              <View style={styles.taglinePill}>
                <Text style={styles.tagline}>ENTRY PAYMENT</Text>
              </View>
            </View>
            <View>
              <Text style={styles.roleKicker}>PEOPLE FITNESS</Text>
              <Text style={styles.roleHeading}>One app,{`\n`}every workout.</Text>
              <Text style={styles.roleDescription}>Choose how you want to enter the gym management system.</Text>
            </View>
          </ImageBackground>
          <View style={styles.roleBody}>
            <ScrollView style={styles.safeArea} contentContainerStyle={styles.roleBodyScroll} bounces={false} showsVerticalScrollIndicator={false}>
              <Text style={styles.roleTitle}>Choose your role</Text>
              <Text style={styles.roleSubtitle}>Each role sees the tools tailored for their day.</Text>
              {roles.map((item) => {
                const cardTheme = getRoleTheme(item.role);
                return (
                <Pressable key={item.role} style={[styles.roleCard, item.role === 'MANAGEMENT' && { borderColor: 'rgba(56, 189, 248, 0.35)' }]} onPress={() => onSelect(item.role)}>
                  <View style={[styles.roleIcon, { backgroundColor: cardTheme.soft, borderColor: cardTheme.border }]}>
                    <Feather name={item.icon} size={21} color={cardTheme.primary} />
                  </View>
                  <View style={styles.roleCopy}>
                    <Text style={styles.roleCardTitle}>{item.title}</Text>
                    <Text style={[styles.rolePeople, { color: cardTheme.primary }]}>{item.people}</Text>
                    <Text style={styles.roleCardDetail}>{item.detail}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#6E7785" />
                </Pressable>
                );
              })}
              <PoweredByFooter />
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function PhoneStatusBar({ dark = true }: { dark?: boolean }) {
  // Native devices already provide the actual clock, battery and network status.
  if (Platform.OS !== 'web') return null;
  return (
    <View style={styles.appStatusRow}>
      <Text style={[styles.appStatusTime, !dark && styles.lightText]}>10:48</Text>
      <View style={styles.appStatusIcons}>
        <Text style={[styles.appStatusSignal, !dark && styles.lightText]}>▮▮▮</Text>
        <Text style={[styles.appStatusSignal, !dark && styles.lightText]}>◆</Text>
        <Text style={[styles.appStatusSignal, !dark && styles.lightText]}>▭</Text>
      </View>
    </View>
  );
}

function MembersNavIcon({ active = false }: { active?: boolean }) {
  const color = active ? '#ECEEF1' : '#8D95A1';
  return <View style={styles.peopleNavIcon}><View style={[styles.peopleNavHead, { borderColor: color }]} /><View style={[styles.peopleNavHeadSmall, { borderColor: color }]} /><View style={[styles.peopleNavBody, { borderColor: color }]} /></View>;
}

function ReminderNavIcon() {
  return <View style={styles.bellNavIcon}><View style={styles.bellNavStem} /><View style={styles.bellNavBody} /><View style={styles.bellNavClapper} /></View>;
}

function BottomNavigation({ managementId, onHomePress, onMembersPress, onCollectPress, onPaymentsPress, onRemindersPress, active = 'members' }: { managementId: number; onHomePress?: () => void; onMembersPress?: () => void; onCollectPress?: () => void; onPaymentsPress?: () => void; onRemindersPress?: () => void; active?: 'home' | 'members' | 'collect' | 'payments' | 'reminders' }) {
  const [reminderCount, setReminderCount] = useState(() => {
    const cached = homeCache.get(managementId);
    return cached ? cached.dueSoonCount + cached.overdueCount : 0;
  });
  useEffect(() => {
    let activeRequest = true;
    getRequest<MembersListResponse>(`/members?managementId=${managementId}`).then((result) => {
      if (!activeRequest) return;
      homeCache.set(managementId, result);
      setReminderCount(result.dueSoonCount + result.overdueCount);
    }).catch(() => { if (activeRequest) setReminderCount(0); });
    return () => { activeRequest = false; };
  }, [managementId]);
  const insets = useSafeAreaInsets();
  const roleTheme = useContext(RoleThemeContext);
  const navItems: Array<{ key: 'home' | 'members' | 'collect' | 'payments' | 'reminders'; label: string; icon: 'home' | 'users' | 'credit-card' | 'clock' | 'bell'; onPress?: () => void }> = [
    { key: 'home', label: 'Home', icon: 'home', onPress: onHomePress },
    { key: 'members', label: 'Members', icon: 'users', onPress: onMembersPress },
    { key: 'collect', label: 'Collect', icon: 'credit-card', onPress: onCollectPress },
    { key: 'payments', label: 'Payments', icon: 'clock', onPress: onPaymentsPress },
    { key: 'reminders', label: 'Reminders', icon: 'bell', onPress: onRemindersPress },
  ];
  return (
    <View style={[styles.bottomNavigation, { paddingBottom: Math.max(insets.bottom, 10), height: 70 + insets.bottom }]}>
      {navItems.map((item) => {
        const isActive = active === item.key;
        return (
          <Pressable key={item.key} style={styles.navItem} onPress={item.onPress} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: isActive }}>
            <View style={[styles.navIconWrap, isActive && { backgroundColor: roleTheme.soft }]}>
              {item.key === 'collect' ? (
                <Text style={[styles.rupeeNavIcon, isActive && { color: roleTheme.primary }]}>₹</Text>
              ) : (
                <Feather name={item.icon} size={20} color={isActive ? roleTheme.primary : '#8D95A1'} />
              )}
              {item.key === 'reminders' && reminderCount > 0 ? (
                <View style={styles.notificationBadge}><Text style={styles.notificationText}>{reminderCount > 99 ? '99+' : reminderCount}</Text></View>
              ) : null}
            </View>
            <Text style={isActive ? styles.activeNavLabel : styles.navLabel}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MemberBottomNavigation({ active, onHome, onRenew, onPayments, onUpdates }: { active: 'home' | 'renew' | 'payments' | 'updates'; onHome: () => void; onRenew: () => void; onPayments: () => void; onUpdates: () => void }) {
  const insets = useSafeAreaInsets();
  const item = (key: 'home' | 'renew' | 'payments' | 'updates', label: string, icon: 'home' | 'refresh-cw' | 'clock' | 'bell', onPress: () => void) => {
    const isActive = active === key;
    return (
      <Pressable style={styles.memberNavItem} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: isActive }}>
        <View style={[styles.navIconWrap, isActive && styles.memberNavActiveIcon]}>
          <Feather name={icon} size={20} color={isActive ? '#FFC83A' : '#8D95A1'} />
        </View>
        <Text style={isActive ? styles.activeNavLabel : styles.navLabel}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[styles.bottomNavigation, { paddingBottom: Math.max(insets.bottom, 10), height: 70 + insets.bottom }]}>
      {item('home', 'Home', 'home', onHome)}
      {item('renew', 'Renew', 'refresh-cw', onRenew)}
      {item('payments', 'Payments', 'clock', onPayments)}
      {item('updates', 'Updates', 'bell', onUpdates)}
    </View>
  );
}

function MemberAppHeader({ title, subtitle, name, onLogout }: { title: string; subtitle: string; name: string; onLogout?: () => void }) {
  return <View style={styles.screenHeader}><View><Text style={styles.membersTitle}>{title}</Text><Text style={styles.membersSubtitle}>{subtitle}</Text></View>{onLogout ? <Pressable style={styles.profileCircle} onPress={onLogout} accessibilityLabel="Log out"><Text style={styles.profileInitial}>{name[0]?.toUpperCase() ?? 'M'}</Text></Pressable> : <View style={styles.profileCircle}><Text style={styles.profileInitial}>{name[0]?.toUpperCase() ?? 'M'}</Text></View>}</View>;
}

function MemberHomeScreen({ managementId, memberId, memberName, onRenew, onPayments, onUpdates, onLogout }: { managementId: number; memberId: number; memberName: string; onRenew: () => void; onPayments: () => void; onUpdates: () => void; onLogout: () => void }) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; getRequest<MemberDetail>(`/members/${memberId}?managementId=${managementId}`).then((response) => { if (active) setMember(response); }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load membership.'); }); return () => { active = false; }; }, [managementId, memberId]);
  const expiry = member ? parseIsoDate(member.expiresOn) : new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const remaining = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
  const statusText = member?.status === 'PENDING' ? 'Starts after the first payment is recorded' : member?.status === 'OVERDUE' ? 'Membership expired — renew to return to the floor.' : remaining === 0 ? 'Last day today' : `${Math.max(0, remaining)} days left`;
  return <View style={styles.screen}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.membersPhoneFrame}>{Platform.OS !== 'web' ? <PhoneStatusBar /> : null}<MemberAppHeader title={`Hi ${firstName(memberName)}`} subtitle="Member · People Fitness" name={memberName} onLogout={onLogout} /><ScrollView style={styles.paymentsScroll} contentContainerStyle={styles.paymentsContent}>{error ? <Text style={styles.error}>{error}</Text> : null}{!member && !error ? <ActivityIndicator style={styles.memberLoading} color="#1B222C" /> : null}{member ? <><View style={styles.memberCard}><View style={styles.memberCardTape} /><View style={styles.memberCardInside}><Text style={styles.memberCardGym}>PEOPLE FITNESS</Text><View style={styles.memberCardPerson}>{member.photoData ? <Image source={{ uri: member.photoData }} style={styles.memberCardPhoto} /> : null}<Text style={styles.memberCardName}>{member.fullName}</Text></View><View style={styles.memberCardGrid}><View><Text style={styles.memberCardLabel}>PLAN</Text><Text style={styles.memberCardValue}>{member.membershipPlanName}{member.personalTrainingPlanName ? ' + PT' : ''}</Text></View><View><Text style={styles.memberCardLabel}>{member.status === 'PENDING' ? 'STARTS' : member.status === 'OVERDUE' ? 'ENDED' : 'VALID TILL'}</Text><Text style={styles.memberCardValue}>{expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text></View><View><Text style={styles.memberCardLabel}>MEMBER ID</Text><Text style={styles.memberCardValue}>PF-{String(member.id).padStart(3, '0')}</Text></View></View><View style={styles.memberProgress}><View style={[styles.memberProgressFill, { width: member.status === 'PENDING' || member.status === 'OVERDUE' ? '0%' : `${Math.min(100, Math.max(4, (remaining / Math.max(1, member.membershipPlanDurationMonths * 30)) * 100))}%` }]} /></View><Text style={styles.memberCardNote}>{statusText}</Text></View></View>{member.status !== 'ACTIVE' ? <View style={styles.memberAlert}><Text style={styles.memberAlertTitle}>{member.status === 'PENDING' ? 'Your first payment is pending.' : 'Your membership needs renewal.'}</Text><Text style={styles.memberAlertCopy}>Pay at the front desk or by UPI to keep your membership active.</Text><Pressable style={styles.darkSmallButton} onPress={onRenew}><Text style={styles.darkSmallButtonText}>How to pay</Text></Pressable></View> : null}<View style={styles.homeSection}><View style={styles.homeSectionHeader}><Text style={styles.homeSectionTitle}>Latest on WhatsApp</Text><Pressable onPress={onUpdates}><Text style={styles.homeLink}>See all</Text></Pressable></View><View style={styles.memberQuickList}><Pressable style={styles.homeFollowRow} onPress={onUpdates}><View style={styles.homeActionIcon}><Text style={styles.homeActionGlyph}>◌</Text></View><View style={styles.memberCopy}><Text style={styles.memberName}>Receipts, reminders and updates</Text><Text style={styles.memberDetail}>Messages from People Fitness</Text></View><Text style={styles.homeFollowArrow}>›</Text></Pressable></View></View><View style={styles.homeSection}><Text style={styles.homeSectionTitle}>Your trainer</Text><View style={styles.memberQuickList}><View style={styles.homeFollowRow}><View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{member.trainer.slice(0, 2).toUpperCase()}</Text></View><View style={styles.memberCopy}><Text style={styles.memberName}>{member.trainer}</Text><Text style={styles.memberDetail}>Trainer at People Fitness</Text></View></View></View></View></> : null}</ScrollView><MemberBottomNavigation active="home" onHome={() => {}} onRenew={onRenew} onPayments={onPayments} onUpdates={onUpdates} /></View></SafeAreaView></View>;
}

function MemberRenewScreen({ managementId, memberId, onHome, onPayments, onUpdates }: { managementId: number; memberId: number; onHome: () => void; onPayments: () => void; onUpdates: () => void }) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const roleTheme = useContext(RoleThemeContext);
  const [membershipPlans, setMembershipPlans] = useState<Plan[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<Plan[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; Promise.all([getRequest<MemberDetail>(`/members/${memberId}?managementId=${managementId}`), getRequest<Plan[]>(`/membership-plans?managementId=${managementId}`), getRequest<Plan[]>(`/personal-trainings?managementId=${managementId}`)]).then(([detail, memberships, trainings]) => { if (active) { setMember(detail); setMembershipPlans(sortPlansByDuration(memberships)); setTrainingPlans(sortPlansByDuration(trainings)); } }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load renewal details.'); }); return () => { active = false; }; }, [managementId, memberId]);
  return <View style={styles.screen}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.membersPhoneFrame}>{Platform.OS !== 'web' ? <PhoneStatusBar /> : null}<MemberAppHeader title="Renew" subtitle="People Fitness" name={member?.fullName ?? 'M'} /><ScrollView style={styles.paymentsScroll} contentContainerStyle={styles.paymentsContent}>{error ? <Text style={styles.error}>{error}</Text> : null}{!member && !error ? <ActivityIndicator style={styles.memberLoading} color="#1B222C" /> : null}{member ? <><View style={styles.renewPlanCard}><Text style={styles.memberCardLabel}>YOUR PLAN</Text><Text style={styles.renewPlanName}>{member.membershipPlanName}{member.personalTrainingPlanName ? ' + PT' : ''}</Text><Text style={styles.renewPlanAmount}>₹{(member.membershipPlanAmount + (member.personalTrainingPlanAmount ?? 0)).toLocaleString('en-IN')}</Text><Text style={styles.memberDetail}>Valid till {parseIsoDate(member.expiresOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View><View style={styles.homeSection}><Text style={styles.homeSectionTitle}>Pay by UPI</Text><View style={styles.upiCard}><View style={styles.sampleQr}><Text style={styles.sampleQrText}>UPI</Text></View><View style={styles.memberCopy}><Text style={styles.memberName}>People Fitness UPI</Text><Text style={styles.memberDetail}>peoplefitness@upi</Text><Text style={styles.memberDetail}>Pay the renewal amount and show the screenshot at the front desk.</Text></View></View></View><View style={styles.homeSection}><Text style={styles.homeSectionTitle}>After you pay</Text><View style={styles.stepsCard}><Text style={styles.memberDetail}>1. Pay the amount using any UPI app.</Text><Text style={styles.memberDetail}>2. Take a screenshot of the confirmation.</Text><Text style={styles.memberDetail}>3. Show it at the front desk or send it on WhatsApp.</Text></View></View><View style={styles.homeSection}><Text style={styles.homeSectionTitle}>Available membership plans</Text><View style={styles.planGrid}>{membershipPlans.map((plan) => <View key={plan.id} style={[styles.planCard, plan.id === member.membershipPlanId && styles.planCardSelected]}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planAmount}>₹{plan.amount.toLocaleString('en-IN')}</Text><Text style={styles.planDuration}>{planValidityText(plan)}</Text></View>)}</View></View>{trainingPlans.length ? <View style={styles.homeSection}><Text style={styles.homeSectionTitle}>Personal training</Text><View style={styles.planGrid}>{trainingPlans.map((plan) => <View key={plan.id} style={[styles.planCard, plan.id === member.personalTrainingPlanId && styles.planCardSelected]}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planAmount}>₹{plan.amount.toLocaleString('en-IN')}</Text><Text style={styles.planDuration}>{planValidityText(plan)}</Text></View>)}</View></View> : null}<Pressable style={styles.completeOnboardButton} onPress={() => void openWhatsApp(DEMO_MANAGEMENT_MOBILE, `Hi People Fitness, I am ${member.fullName}. I would like to renew my ${member.membershipPlanName} membership.`)}><Text style={styles.primaryButtonText}>Contact People Fitness on WhatsApp</Text></Pressable></> : null}</ScrollView><MemberBottomNavigation active="renew" onHome={onHome} onRenew={() => {}} onPayments={onPayments} onUpdates={onUpdates} /></View></SafeAreaView></View>;
}

function MemberPaymentsScreen({ managementId, memberId, onHome, onRenew, onUpdates }: { managementId: number; memberId: number; onHome: () => void; onRenew: () => void; onUpdates: () => void }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; getRequest<Payment[]>(`/payments?managementId=${managementId}&memberId=${memberId}`).then((response) => { if (active) setPayments(response); }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load payments.'); }); return () => { active = false; }; }, [managementId, memberId]);
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return <View style={styles.screen}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.membersPhoneFrame}>{Platform.OS !== 'web' ? <PhoneStatusBar /> : null}<MemberAppHeader title="My payments" subtitle="People Fitness" name="M" /><ScrollView style={styles.paymentsScroll} contentContainerStyle={styles.paymentsContent}>{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.paymentTotalLine}><Text style={styles.paymentTotalLabel}>{payments.length} {payments.length === 1 ? 'payment' : 'payments'}</Text><Text style={styles.paymentTotalValue}>₹{total.toLocaleString('en-IN')}</Text></View>{payments.length ? <View style={styles.paymentHistoryList}>{payments.map((payment) => <View key={payment.id} style={styles.paymentHistoryRow}><View style={[styles.paymentModeBadge, payment.paymentMode === 'CASH' && styles.cashModeBadge]}><Text style={styles.paymentModeText}>{payment.paymentMode}</Text></View><View style={styles.paymentHistoryCopy}><Text style={styles.paymentHistoryName}>{payment.membershipPlanName}{payment.personalTrainingPlanName ? ' + PT' : ''}</Text><Text style={styles.paymentHistoryMeta}>{new Date(payment.createdDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · recorded by {payment.capturedBy}</Text></View><Text style={styles.paymentHistoryAmountText}>₹{payment.amount.toLocaleString('en-IN')}</Text></View>)}</View> : <View style={styles.homeEmpty}><Text style={styles.emptyMembersText}>No payments yet. They appear once the front desk records them.</Text></View>}</ScrollView><MemberBottomNavigation active="payments" onHome={onHome} onRenew={onRenew} onPayments={() => {}} onUpdates={onUpdates} /></View></SafeAreaView></View>;
}

function MemberUpdatesScreen({ managementId, memberId, onHome, onRenew, onPayments }: { managementId: number; memberId: number; onHome: () => void; onRenew: () => void; onPayments: () => void }) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function load() { try { const [detail, updates] = await Promise.all([getRequest<MemberDetail>(`/members/${memberId}?managementId=${managementId}`), getRequest<WhatsAppMessage[]>(`/whatsapp/messages?managementId=${managementId}&memberId=${memberId}`)]); setMember(detail); setMessages(updates); setError(''); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load updates.'); } }
  useEffect(() => { void load(); }, [managementId, memberId]);
  async function setUpdates(enabled: boolean) { setSaving(true); try { const updated = await patchRequest<MemberDetail>(`/members/${memberId}/whatsapp-updates?managementId=${managementId}`, { enabled }); setMember(updated); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to update WhatsApp preference.'); } finally { setSaving(false); } }
  return <View style={styles.screen}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.membersPhoneFrame}>{Platform.OS !== 'web' ? <PhoneStatusBar /> : null}<MemberAppHeader title="Updates" subtitle="WhatsApp messages from People Fitness" name={member?.fullName ?? 'M'} /><ScrollView style={styles.paymentsScroll} contentContainerStyle={styles.paymentsContent}>{error ? <Text style={styles.error}>{error}</Text> : null}{member ? <Pressable disabled={saving} style={styles.memberUpdatesToggle} onPress={() => void setUpdates(!member.sendWhatsappWelcome)}><View style={[styles.trainingSwitch, member.sendWhatsappWelcome && styles.trainingSwitchActive]}><View style={[styles.trainingSwitchThumb, member.sendWhatsappWelcome && styles.trainingSwitchThumbActive]} /></View><View style={styles.memberCopy}><Text style={styles.memberName}>WhatsApp updates</Text><Text style={styles.memberDetail}>Receipts, renewal reminders and announcements on +91 {member.whatsappNumber}</Text></View></Pressable> : null}{messages.length ? <View style={styles.messageChat}>{messages.map((message) => <View key={message.id} style={styles.messageBubble}><Text style={styles.messageKind}>{message.messageType === 'UPDATE' ? 'ANNOUNCEMENT' : message.messageType}</Text><Text style={styles.messageText}>{message.messageText}</Text><Text style={styles.messageDate}>{new Date(message.createdDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</Text></View>)}</View> : <View style={styles.homeEmpty}><Text style={styles.emptyMembersText}>No messages yet.</Text></View>}</ScrollView><MemberBottomNavigation active="updates" onHome={onHome} onRenew={onRenew} onPayments={onPayments} onUpdates={() => {}} /></View></SafeAreaView></View>;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function FutureDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => value ? parseIsoDate(value) : new Date());
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstDayOffset = (monthStart.getDay() + 6) % 7;
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(1 - firstDayOffset);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
  const selectedDate = value ? toIsoDate(parseIsoDate(value)) : '';

  return <View>
    <Pressable style={styles.dateField} onPress={() => setOpen(!open)}>
      <Text style={styles.dateFieldText}>{value || 'Select date'}</Text><Text style={styles.inputSuffix}>▣</Text>
    </Pressable>
    {open ? <View style={styles.calendarPanel}>
      <View style={styles.calendarHeader}><Pressable onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}><Text style={styles.calendarArrow}>‹</Text></Pressable><Text style={styles.calendarMonth}>{visibleMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text><Pressable onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}><Text style={styles.calendarArrow}>›</Text></Pressable></View>
      <View style={styles.calendarWeek}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.calendarWeekDay}>{day}</Text>)}</View>
      <View style={styles.calendarDays}>{days.map((date) => {
        const isoDate = toIsoDate(date);
        const unavailable = date.getMonth() !== visibleMonth.getMonth();
        const selected = isoDate === selectedDate;
        return <Pressable key={isoDate} disabled={unavailable} onPress={() => { onChange(isoDate); setOpen(false); }} style={[styles.calendarDay, selected && styles.calendarDaySelected]}><Text style={[styles.calendarDayText, unavailable && styles.calendarDayUnavailable, selected && styles.calendarDayTextSelected]}>{date.getDate()}</Text></Pressable>;
      })}</View>
    </View> : null}
  </View>;
}

const homeCache = new Map<number, MembersListResponse>();

function HomeScreen({ managementId, managementName, mobileNumber, actorRole, onMembers, onOnboard, onCollect, onPayments, onReminders, onLogout }: { managementId: number; managementName: string; mobileNumber: string; actorRole: AppRole; onMembers: (filter?: MemberFilter) => void; onOnboard: () => void; onCollect: () => void; onPayments: () => void; onReminders: () => void; onLogout: () => void }) {
  const [members, setMembers] = useState<MemberListItem[]>(() => homeCache.get(managementId)?.members ?? []);
  const [counts, setCounts] = useState(() => homeCache.get(managementId) ?? { totalCount: 0, dueSoonCount: 0, overdueCount: 0, activeCount: 0 });
  const [loading, setLoading] = useState(!homeCache.has(managementId));
  const [error, setError] = useState('');
  const [followUp, setFollowUp] = useState<'DUE_SOON' | 'OVERDUE'>('DUE_SOON');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadHome() {
      const cached = refreshVersion === 0 ? homeCache.get(managementId) : undefined;
      if (cached) { setMembers(cached.members); setCounts(cached); setLoading(false); return; }
      setLoading(true);
      try {
        const memberResponse = await getRequest<MembersListResponse>(`/members?managementId=${managementId}`);
        if (!active) return;
        homeCache.set(managementId, memberResponse);
        setMembers(memberResponse.members);
        setCounts(memberResponse);
        setError('');
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load home data.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadHome();
    return () => { active = false; };
  }, [managementId, refreshVersion]);

  const homeStyles = { ...styles, ...dashboardStyles };
  const roleTheme = useContext(RoleThemeContext);
  const insets = useSafeAreaInsets();
  const now = new Date();
  const currentMemberCount = members.filter((member) => member.status === 'ACTIVE' || member.status === 'DUE_SOON').length;
  const followUpMembers = members.filter((member) => member.status === followUp || (followUp === 'DUE_SOON' && member.status === 'PENDING'));
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  async function sendBroadcast() {
    const message = broadcastText.trim();
    if (!message) return;
    setBroadcastSending(true);
    setBroadcastMessage('');
    try {
      const prepared = await request<WhatsAppMessage[]>('/whatsapp/broadcasts', { managementId, messageType: 'UPDATE', messageText: message, initiatedBy: managementName });
      await openWhatsAppShare(message);
      setBroadcastText('');
      setBroadcastMessage(`${prepared.length} updates were recorded. WhatsApp is open so you can select the recipients.`);
    } catch (requestError) {
      setBroadcastMessage(requestError instanceof Error ? requestError.message : 'Unable to prepare the update.');
    } finally {
      setBroadcastSending(false);
    }
  }

  return <ImageBackground source={require('../../assets/images/dashboard-bg.jpg')} style={homeStyles.screen} imageStyle={styles.dashboardBgImage}><View style={styles.dashboardBgScrim} /><StatusBar style="light" /><SafeAreaView style={homeStyles.safeArea} edges={['top', 'left', 'right']}><View style={[homeStyles.membersPhoneFrame, { backgroundColor: 'transparent' }]}>
    <KeyboardAvoidingView style={homeStyles.safeArea} behavior="padding">
    <ScrollView style={homeStyles.homeScroll} contentContainerStyle={homeStyles.homeContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => setRefreshVersion((v) => v + 1)} tintColor="#ECEEF1" colors={['#ECEEF1']} progressBackgroundColor="#1D2127" />}>
      <View style={homeStyles.membersTitleRow}><View><Text style={homeStyles.homeGreeting}>Hi, {managementName}</Text><Text style={homeStyles.membersSubtitle}>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'} · {actorRole === 'TRAINER' ? 'Trainer' : 'Management'}</Text></View><Pressable style={[homeStyles.profileCircle, { backgroundColor: roleTheme.primary }]} onPress={() => setAccountOpen(true)} accessibilityLabel="Open account"><Text style={[homeStyles.profileInitial, { color: roleTheme.onPrimary }]}>{managementName[0]?.toUpperCase() ?? 'M'}</Text></Pressable></View>
      <View style={homeStyles.homeSectionHeader}><Text style={homeStyles.homeDate}>{dateLabel}</Text><Pressable disabled={loading} onPress={() => setRefreshVersion((value) => value + 1)} accessibilityLabel="Refresh dashboard" hitSlop={12}><Feather name="refresh-cw" size={16} color="#8D95A1" /></Pressable></View>
      {loading ? <ActivityIndicator color="#ECEEF1" style={homeStyles.memberLoading} /> : null}
      <AlertBanner message={error} />
      {!loading && !error ? <>
        <View style={homeStyles.homeTiles}>
            <Pressable style={homeStyles.homeTile} onPress={() => onMembers('CURRENT')}><Text style={homeStyles.homeTileLabel}>Current members</Text><Text style={homeStyles.homeTileValue}>{currentMemberCount}</Text><Text style={homeStyles.homeTileSub}>of {counts.totalCount} · {counts.overdueCount} lapsed</Text></Pressable>
            <Pressable style={homeStyles.homeTile} onPress={() => onMembers('DUE_SOON')}><Text style={homeStyles.homeTileLabel}>Due in 7 days</Text><Text style={[homeStyles.homeTileValue, homeStyles.homeTileValueWarning]}>{counts.dueSoonCount}</Text><Text style={homeStyles.homeTileSub}>members</Text></Pressable>
            <Pressable style={homeStyles.homeTile} onPress={() => onMembers('OVERDUE')}><Text style={homeStyles.homeTileLabel}>Overdue</Text><Text style={[homeStyles.homeTileValue, homeStyles.homeTileValueOverdue]}>{counts.overdueCount}</Text><Text style={homeStyles.homeTileSub}>members</Text></Pressable>
        </View>
        <View style={homeStyles.homeSection}><View style={homeStyles.homeActionList}>
          <Pressable style={homeStyles.homeAction} onPress={onOnboard}><View style={[homeStyles.homeActionIcon, { backgroundColor: roleTheme.soft, borderColor: roleTheme.border }]}><Feather name="user-plus" size={20} color={roleTheme.primary} /></View><View style={homeStyles.homeActionCopy}><Text style={homeStyles.homeActionTitle}>Onboard a member</Text><Text style={homeStyles.homeActionDescription}>Add member details and choose a plan</Text></View><Feather name="chevron-right" size={20} color="#6E7785" /></Pressable>
          <Pressable style={homeStyles.homeAction} onPress={onCollect}><View style={[homeStyles.homeActionIcon, { backgroundColor: roleTheme.soft, borderColor: roleTheme.border }]}><Text style={[homeStyles.homeActionGlyph, { color: roleTheme.primary }]}>₹</Text></View><View style={homeStyles.homeActionCopy}><Text style={homeStyles.homeActionTitle}>Collect payment</Text><Text style={homeStyles.homeActionDescription}>UPI with screenshot, or cash</Text></View><Feather name="chevron-right" size={20} color="#6E7785" /></Pressable>
          <Pressable style={[homeStyles.homeAction, { borderBottomWidth: 0 }]} onPress={onReminders}><View style={[homeStyles.homeActionIcon, { backgroundColor: roleTheme.soft, borderColor: roleTheme.border }]}><Feather name="bell" size={20} color={roleTheme.primary} /></View><View style={homeStyles.homeActionCopy}><Text style={homeStyles.homeActionTitle}>Send payment reminders</Text><Text style={homeStyles.homeActionDescription}>{counts.dueSoonCount + counts.overdueCount} due or overdue members</Text></View><Feather name="chevron-right" size={20} color="#6E7785" /></Pressable>
        </View></View>
        <View style={homeStyles.homeSection}><View style={homeStyles.homeSectionHeader}><Text style={homeStyles.homeSectionTitle}>PAYMENT FOLLOW-UP</Text><Pressable onPress={onReminders}><Text style={[homeStyles.homeLink, { color: roleTheme.primary }]}>Reminders</Text></Pressable></View><View style={homeStyles.followUpTabs}><Pressable onPress={() => setFollowUp('DUE_SOON')} style={[homeStyles.followUpTab, followUp === 'DUE_SOON' && { borderBottomColor: roleTheme.primary }]}><Text style={[homeStyles.followUpTabText, followUp === 'DUE_SOON' && homeStyles.followUpTabTextSelected]}>Due in 7 days</Text><View style={homeStyles.dueBadge}><Text style={homeStyles.dueBadgeText}>{counts.dueSoonCount}</Text></View></Pressable><Pressable onPress={() => setFollowUp('OVERDUE')} style={[homeStyles.followUpTab, followUp === 'OVERDUE' && { borderBottomColor: roleTheme.primary }]}><Text style={[homeStyles.followUpTabText, followUp === 'OVERDUE' && homeStyles.followUpTabTextSelected]}>Overdue members</Text><View style={homeStyles.overBadge}><Text style={homeStyles.overBadgeText}>{counts.overdueCount}</Text></View></Pressable></View>{followUpMembers.length === 0 ? <View style={homeStyles.homeEmpty}><Text style={homeStyles.emptyMembersText}>{followUp === 'DUE_SOON' ? 'No members are due in the next 7 days.' : 'No overdue members.'}</Text></View> : <View style={homeStyles.homeFollowList}>{followUpMembers.map((member) => <Pressable key={member.id} style={homeStyles.homeFollowRow} onPress={() => onMembers(followUp)}><View style={homeStyles.memberAvatar}><Text style={homeStyles.memberAvatarText}>{member.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</Text></View><View style={homeStyles.memberCopy}><Text style={homeStyles.memberName}>{member.fullName}</Text><Text style={[homeStyles.memberDetail, member.status === 'OVERDUE' && homeStyles.homeTileValueOverdue]}>{paymentStatusText(member)} · {member.membershipPlanName}</Text></View><Feather name="chevron-right" size={20} color="#6E7785" /></Pressable>)}</View>}</View>
        <View style={[homeStyles.homeSection, { opacity: 0.45 }]}><Text style={homeStyles.homeSectionTitle}>Send an update · unavailable</Text><View style={homeStyles.broadcastCard}><Text style={homeStyles.broadcastLabel}>Message to all members on WhatsApp</Text><TextInput editable={false} value={broadcastText} onChangeText={(value) => { setBroadcastText(value); setBroadcastMessage(''); }} placeholder="e.g. The gym is closed on Sunday for floor maintenance." placeholderTextColor="#6E7785" multiline style={homeStyles.broadcastInput} /><Pressable disabled accessibilityState={{ disabled: true }} onPress={() => void sendBroadcast()} style={[homeStyles.broadcastButton, (!broadcastText.trim() || broadcastSending) && homeStyles.disabledButton]}><Text style={homeStyles.broadcastButtonText}>{broadcastSending ? 'Preparing…' : `Send to ${counts.totalCount} ${counts.totalCount === 1 ? 'member' : 'members'}`}</Text></Pressable>{broadcastMessage ? <Text style={homeStyles.reminderConfirmation}>{broadcastMessage}</Text> : <Text style={homeStyles.broadcastHelp}>WhatsApp announcements are currently disabled.</Text>}</View></View>
      </> : null}
    </ScrollView>
    </KeyboardAvoidingView>
    <BottomNavigation
      managementId={managementId}
      active="home"
      onMembersPress={() => onMembers('ALL')}
      onCollectPress={onCollect}
      onPaymentsPress={onPayments}
      onRemindersPress={onReminders}
    />
    <AccountSheet visible={accountOpen} managementName={managementName} mobileNumber={mobileNumber} role={actorRole} onClose={() => setAccountOpen(false)} onLogout={onLogout} />
  </View></SafeAreaView></ImageBackground>;
}

function ProfileButton({ name }: { name: string }) {
  const openProfile = useContext(ProfileActionContext);
  const roleTheme = useContext(RoleThemeContext);
  return <Pressable style={[dashboardStyles.profileCircle, { backgroundColor: roleTheme.primary }]} onPress={openProfile} accessibilityRole="button" accessibilityLabel="Open account"><Text style={[dashboardStyles.profileInitial, { color: roleTheme.onPrimary }]}>{name.trim()[0]?.toUpperCase() ?? 'M'}</Text></Pressable>;
}

function AccountSheet({ visible, managementName, mobileNumber, role, onClose, onLogout }: { visible: boolean; managementName: string; mobileNumber: string; role: AppRole; onClose: () => void; onLogout: () => void }) {
  const trainer = role === 'TRAINER';
  const roleTheme = getRoleTheme(role);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.memberSheetModal}>
        <Pressable style={styles.memberSheetBackdrop} onPress={onClose} />
        <View style={[styles.accountSheet, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetAvatar, styles.accountAvatar, { backgroundColor: roleTheme.primary }]}>
              <Text style={[styles.profileInitial, { color: roleTheme.onPrimary }]}>{managementName[0]?.toUpperCase() ?? 'M'}</Text>
            </View>
            <View style={styles.sheetMemberCopy}>
              <Text style={styles.sheetMemberName}>{managementName}</Text>
              <Text style={styles.sheetMemberPhone}>{trainer ? 'TRN' : 'MGMT'}-001 · +91 {mobileNumber}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetCloseButton} accessibilityLabel="Close account">
              <Feather name="x" size={18} color="#F3F5F7" />
            </Pressable>
          </View>
          <View style={styles.detailRows}>
            <DetailRow label="Signed in with" value={trainer ? 'Trainer login (OTP)' : 'Center Management login'} />
            <DetailRow label="Role" value={trainer ? 'Trainer' : 'Management'} />
            <DetailRow label="Center" value="People Fitness" />
            <DetailRow label="Payments history" value={trainer ? 'Last 10 transactions' : 'Full access'} />
          </View>
          <Pressable style={styles.accountLogoutButton} onPress={onLogout} accessibilityRole="button" accessibilityLabel="Log out">
            <View style={styles.accountLogoutInner}>
              <Feather name="log-out" size={16} color="#F87171" />
              <Text style={styles.accountLogoutText}>Log out</Text>
            </View>
          </Pressable>
          <PoweredByFooter withBottomInset={false} />
        </View>
      </View>
    </Modal>
  );
}

function PaymentsHistoryScreen({ managementId, limitedToRecent, actorName, onHome, onMembers, onCollect, onReminders }: { managementId: number; limitedToRecent: boolean; actorName: string; onHome: () => void; onMembers: () => void; onCollect: () => void; onReminders: () => void }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [range, setRange] = useState<'MONTH' | 'LAST_MONTH' | 'ALL'>('MONTH');
  const [mode, setMode] = useState<'ALL' | 'UPI' | 'CASH'>('ALL');
  const [capturedBy, setCapturedBy] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [paymentResponse, memberResponse] = await Promise.all([getRequest<Payment[]>(`/payments?managementId=${managementId}`), getRequest<MembersListResponse>(`/members?managementId=${managementId}`)]);
        if (active) { setPayments(paymentResponse); setMembers(memberResponse.members); setError(''); }
      } catch (requestError) { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load payment history.'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [managementId]);

  const now = new Date();
  const nameFor = (memberId: number) => members.find((member) => member.id === memberId)?.fullName ?? 'Member';
  const capturers = Array.from(new Set(payments.map((payment) => payment.capturedBy))).sort();
  const visible = payments.filter((payment) => {
    const created = new Date(payment.createdDate);
    const inRange = limitedToRecent || range === 'ALL' || (range === 'MONTH'
      ? created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
      : created.getMonth() === (now.getMonth() + 11) % 12 && created.getFullYear() === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()));
    const matchesMode = mode === 'ALL' || payment.paymentMode === mode;
    const matchesCapturer = capturedBy === 'ALL' || payment.capturedBy === capturedBy;
    const query = search.trim().toLowerCase();
    return inRange && (limitedToRecent || (matchesMode && matchesCapturer && (!query || nameFor(payment.memberId).toLowerCase().includes(query) || (payment.utr ?? '').includes(query))));
  }).slice(0, limitedToRecent ? 10 : undefined);
  const total = visible.reduce((sum, payment) => sum + payment.amount, 0);

  return <View style={styles.screen}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.membersPhoneFrame}>
    {Platform.OS !== 'web' ? <PhoneStatusBar /> : null}
    <View style={styles.screenHeader}><View><Text style={styles.membersTitle}>Payments</Text><Text style={styles.membersSubtitle}>{limitedToRecent ? 'Last 10 transactions · Trainer' : 'Full history · Management'}</Text></View><ProfileButton name={actorName} /></View>
    <ScrollView style={styles.paymentsScroll} contentContainerStyle={styles.paymentsContent} keyboardShouldPersistTaps="handled">
      {limitedToRecent ? <View style={styles.homeEmpty}><Text style={styles.emptyMembersText}>You can see the latest 10 payments. Management can access the full history.</Text></View> : <><View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Search member or UTR" placeholderTextColor="#8D95A1" style={styles.membersSearchInput} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{(['MONTH', 'LAST_MONTH', 'ALL'] as const).map((item) => <Pressable key={item} onPress={() => setRange(item)} style={[styles.filterChip, range === item && styles.filterChipSelected]}><Text style={[styles.filterText, range === item && styles.filterTextSelected]}>{item === 'MONTH' ? now.toLocaleDateString('en-IN', { month: 'long' }) : item === 'LAST_MONTH' ? 'Last month' : 'All time'}</Text></Pressable>)}</ScrollView>
      <View style={styles.paymentFilterRow}>{(['ALL', 'UPI', 'CASH'] as const).map((item) => <Pressable key={item} onPress={() => setMode(item)} style={[styles.paymentFilterChip, mode === item && styles.paymentFilterChipSelected]}><Text style={[styles.paymentFilterChipText, mode === item && styles.paymentFilterChipTextSelected]}>{item === 'ALL' ? 'UPI and cash' : `${item} only`}</Text></Pressable>)}</View>
      {capturers.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{['ALL', ...capturers].map((item) => <Pressable key={item} onPress={() => setCapturedBy(item)} style={[styles.filterChip, capturedBy === item && styles.filterChipSelected]}><Text style={[styles.filterText, capturedBy === item && styles.filterTextSelected]}>{item === 'ALL' ? 'Captured by all' : item}</Text></Pressable>)}</ScrollView> : null}</>}
      {loading ? <ActivityIndicator color="#ECEEF1" style={styles.memberLoading} /> : null}{error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error ? <><View style={styles.paymentTotalLine}><Text style={styles.paymentTotalLabel}>{visible.length} {visible.length === 1 ? 'payment' : 'payments'}</Text><Text style={styles.paymentTotalValue}>₹{total.toLocaleString('en-IN')}</Text></View>{visible.length === 0 ? <View style={styles.homeEmpty}><Text style={styles.emptyMembersText}>No payments match these filters.</Text></View> : <View style={styles.paymentHistoryList}>{visible.map((payment) => <Pressable key={payment.id} style={styles.paymentHistoryRow} onPress={() => setSelectedPayment(payment)}><View style={[styles.paymentModeBadge, payment.paymentMode === 'CASH' && styles.cashModeBadge]}><Text style={styles.paymentModeText}>{payment.paymentMode}</Text></View><View style={styles.paymentHistoryCopy}><Text style={styles.paymentHistoryName}>{nameFor(payment.memberId)}</Text><Text style={styles.paymentHistoryMeta}>{new Date(payment.createdDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · by {payment.capturedBy}</Text></View><View style={styles.paymentHistoryAmount}><Text style={styles.paymentHistoryAmountText}>₹{payment.amount.toLocaleString('en-IN')}</Text>{payment.screenshotAttached ? <Text style={styles.paymentScreenshotLabel}>▧ Screenshot</Text> : null}</View></Pressable>)}</View>}</> : null}
    </ScrollView>
    <BottomNavigation managementId={managementId} active="payments" onHomePress={onHome} onMembersPress={onMembers} onCollectPress={onCollect} onRemindersPress={onReminders} />
    <PaymentDetailsSheet payment={selectedPayment} member={selectedPayment ? { fullName: nameFor(selectedPayment.memberId) } : null} onClose={() => setSelectedPayment(null)} />
  </View></SafeAreaView></View>;
}

function RemindersScreen({ managementId, actorRole, actorName, onHome, onMembers, onCollect, onPayments }: { managementId: number; actorRole: AppRole; actorName: string; onHome: () => void; onMembers: () => void; onCollect: () => void; onPayments: () => void }) {
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [beforeDue, setBeforeDue] = useState(true);
  const [onDue, setOnDue] = useState(true);
  const [afterDue, setAfterDue] = useState(false);
  const [sendAt, setSendAt] = useState('09:00');
  const [sending, setSending] = useState<number | 'ALL' | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getRequest<MembersListResponse>(`/members?managementId=${managementId}`), getRequest<ReminderSettings>(`/reminder-settings?managementId=${managementId}`)]).then(([response, settings]) => { if (active) { setMembers(response.members); setBeforeDue(settings.beforeDue); setOnDue(settings.onDue); setAfterDue(settings.afterDue); setSendAt(settings.sendAt || '09:00'); setError(''); } }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load reminders.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [managementId]);
  const overdue = members.filter((member) => member.status === 'OVERDUE');
  const dueSoon = members.filter((member) => member.status === 'DUE_SOON' || member.status === 'PENDING');
  const follow = [...overdue, ...dueSoon];

  function reminderText(member: MemberListItem) {
    const expiry = parseIsoDate(member.expiresOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const status = member.status === 'PENDING'
      ? 'Your first payment is still pending.'
      : member.status === 'OVERDUE'
        ? `Your membership ended on ${expiry}.`
        : `Your membership is due on ${expiry}.`;
    return `Hi ${firstName(member.fullName)}, ${status} Please contact People Fitness to renew and keep training without a break.`;
  }

  async function sendReminder(member: MemberListItem) {
    setSending(member.id);
    setSentMessage('');
    try {
      const message = reminderText(member);
      const prepared = await prepareWhatsAppMessage({ managementId, memberId: member.id, messageType: 'REMINDER', messageText: message, initiatedBy: actorName });
      await openWhatsApp(prepared.recipientPhone, prepared.messageText);
      setSentMessage(`WhatsApp opened for ${member.fullName}.`);
    } catch (requestError) {
      setSentMessage(requestError instanceof Error ? requestError.message : 'Unable to prepare the reminder.');
    } finally {
      setSending(null);
    }
  }

  async function sendAllReminders() {
    if (!follow.length) return;
    setSending('ALL');
    setSentMessage('');
    try {
      const message = 'Hello from People Fitness. Please check your membership payment status with the front desk. We will help you renew your plan.';
      const prepared = await request<WhatsAppMessage[]>('/whatsapp/broadcasts', { managementId, messageType: 'REMINDER', messageText: message, initiatedBy: actorName, audience: 'DUE_OR_OVERDUE' });
      await openWhatsAppShare(message);
      setSentMessage(`${prepared.length} reminders were prepared. WhatsApp is open so you can choose the members to receive this group message.`);
    } catch (requestError) {
      setSentMessage(requestError instanceof Error ? requestError.message : 'Unable to prepare reminders.');
    } finally {
      setSending(null);
    }
  }

  async function saveReminderSettings(next: { beforeDue: boolean; onDue: boolean; afterDue: boolean }) {
    setSavingSettings(true);
    try {
      const saved = await putRequest<ReminderSettings>('/reminder-settings', { managementId, ...next, sendAt });
      setBeforeDue(saved.beforeDue);
      setOnDue(saved.onDue);
      setAfterDue(saved.afterDue);
      setSentMessage('Reminder settings saved.');
    } catch (requestError) {
      setSentMessage(requestError instanceof Error ? requestError.message : 'Unable to save reminder settings.');
    } finally {
      setSavingSettings(false);
    }
  }

  return <View style={styles.screen}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.membersPhoneFrame}>
    {Platform.OS !== 'web' ? <PhoneStatusBar /> : null}
    <View style={styles.screenHeader}><View><Text style={styles.membersTitle}>Reminders</Text><Text style={styles.membersSubtitle}>Payment reminders on WhatsApp</Text></View><ProfileButton name={actorName} /></View>
    <ScrollView style={styles.paymentsScroll} contentContainerStyle={styles.paymentsContent}>
      {loading ? <ActivityIndicator color="#ECEEF1" style={styles.memberLoading} /> : null}{error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error ? <><View style={styles.reminderSummary}><View><Text style={styles.reminderNumber}>{follow.length}</Text><Text style={styles.reminderCopy}>{follow.length === 1 ? 'member needs' : 'members need'} a payment reminder</Text></View>{follow.length ? <Pressable disabled style={[styles.reminderSendButton, styles.disabledButton]} onPress={() => void sendAllReminders()}><Text style={styles.reminderSendText}>{sending === 'ALL' ? 'Preparing…' : 'Send to all'}</Text></Pressable> : null}</View>{sentMessage ? <Text style={styles.reminderConfirmation}>{sentMessage}</Text> : null}
        {overdue.length ? <ReminderGroup title={`Overdue · ${overdue.length}`} members={overdue} sending={sending} onSent={sendReminder} /> : null}{dueSoon.length ? <ReminderGroup title={`Due in the next 7 days · ${dueSoon.length}`} members={dueSoon} sending={sending} onSent={sendReminder} /> : null}{follow.length === 0 ? <View style={styles.homeEmpty}><Text style={styles.emptyMembersText}>No one is due or overdue right now.</Text></View> : null}
        <View style={styles.homeSection}><Text style={styles.homeSectionTitle}>Automatic reminders</Text><View style={styles.reminderSettings}>{actorRole === 'TRAINER' ? <Text style={styles.reminderHelp}>WhatsApp reminders are currently disabled.</Text> : <><ReminderToggle disabled={true} label="3 days before the due date" value={beforeDue} onPress={() => void saveReminderSettings({ beforeDue: !beforeDue, onDue, afterDue })} /><ReminderToggle disabled={true} label="On the due date" value={onDue} onPress={() => void saveReminderSettings({ beforeDue, onDue: !onDue, afterDue })} /><ReminderToggle disabled={true} label="3 days after, if still unpaid" value={afterDue} onPress={() => void saveReminderSettings({ beforeDue, onDue, afterDue: !afterDue })} /><Text style={styles.formLabel}>Send time</Text><View style={styles.paymentFilterRow}>{['07:00', '09:00', '18:00'].map((time) => <Pressable disabled key={time} onPress={() => { setSendAt(time); void saveReminderSettings({ beforeDue, onDue, afterDue }); }} style={[styles.paymentFilterChip, sendAt === time && styles.paymentFilterChipSelected]}><Text style={[styles.paymentFilterChipText, sendAt === time && styles.paymentFilterChipTextSelected]}>{time === '07:00' ? '7 AM' : time === '09:00' ? '9 AM' : '6 PM'}</Text></Pressable>)}</View><Text style={styles.reminderHelp}>{savingSettings ? 'Saving settings…' : 'WhatsApp reminders are currently disabled.'}</Text></>}</View></View></> : null}
    </ScrollView>
    <BottomNavigation managementId={managementId} active="reminders" onHomePress={onHome} onMembersPress={onMembers} onCollectPress={onCollect} onPaymentsPress={onPayments} />
  </View></SafeAreaView></View>;
}

function ReminderGroup({ title, members, sending, onSent }: { title: string; members: MemberListItem[]; sending: number | 'ALL' | null; onSent: (member: MemberListItem) => Promise<void> }) {
  return <View style={styles.homeSection}><Text style={styles.homeSectionTitle}>{title}</Text><View style={styles.homeFollowList}>{members.map((member) => <View key={member.id} style={styles.homeFollowRow}><View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{member.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</Text></View><View style={styles.memberCopy}><Text style={styles.memberName}>{member.fullName}</Text><Text style={styles.memberDetail}>{member.membershipPlanName} · Valid till {parseIsoDate(member.expiresOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text></View><Pressable disabled style={[styles.singleReminderButton, styles.disabledButton]} onPress={() => void onSent(member)}><Text style={styles.singleReminderText}>{sending === member.id ? 'Opening…' : 'Send'}</Text></Pressable></View>)}</View></View>;
}

function ReminderToggle({ label, value, onPress, disabled }: { label: string; value: boolean; onPress: () => void; disabled: boolean }) {
  return <Pressable disabled={disabled} style={[styles.reminderToggleRow, disabled && styles.disabledButton]} onPress={onPress}><View style={[styles.trainingSwitch, value && styles.trainingSwitchActive]}><View style={[styles.trainingSwitchThumb, value && styles.trainingSwitchThumbActive]} /></View><Text style={styles.reminderToggleLabel}>{label}</Text></Pressable>;
}

function MembersScreen({ initialFilter, managementId, actorRole, actorName, onHome, onPayments, onReminders, onOnboard, onCollect, onCollectFromNav }: { initialFilter: MemberFilter; managementId: number; actorRole: AppRole; actorName: string; onHome: () => void; onPayments: () => void; onReminders: () => void; onOnboard: () => void; onCollect: (memberId: number) => void; onCollectFromNav: () => void }) {
  const [selectedFilter, setSelectedFilter] = useState<MemberFilter>(initialFilter);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [counts, setCounts] = useState({ totalCount: 0, dueSoonCount: 0, overdueCount: 0, activeCount: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;
    async function loadMembers() {
      setLoading(true);
      try {
        const response = await getRequest<MembersListResponse>(`/members?managementId=${managementId}`);
        if (!isActive) return;
        setMembers(response.members);
        setCounts(response);
        setLoadError('');
      } catch (error) {
        if (isActive) setLoadError(error instanceof Error ? error.message : 'Unable to load members.');
      } finally {
        if (isActive) setLoading(false);
      }
    }
    void loadMembers();
    return () => { isActive = false; };
  }, [managementId]);

  const filters = [
    { key: 'ALL' as const, label: `All ${counts.totalCount}` },
    { key: 'CURRENT' as const, label: `Current ${members.filter((member) => member.status === 'ACTIVE' || member.status === 'DUE_SOON').length}` },
    { key: 'DUE_SOON' as const, label: `Due soon ${counts.dueSoonCount}` },
    { key: 'OVERDUE' as const, label: `Overdue ${counts.overdueCount}` },
    { key: 'ACTIVE' as const, label: `Active ${counts.activeCount}` },
  ];
  const normalizedSearch = search.trim().toLowerCase();
  const roleTheme = useContext(RoleThemeContext);
  const visibleMembers = members.filter((member) =>
    (selectedFilter === 'ALL' || (selectedFilter === 'CURRENT' ? member.status === 'ACTIVE' || member.status === 'DUE_SOON' : selectedFilter === 'DUE_SOON' ? member.status === 'DUE_SOON' || member.status === 'PENDING' : member.status === selectedFilter))
    && (!normalizedSearch || member.fullName.toLowerCase().includes(normalizedSearch) || member.whatsappNumber.includes(normalizedSearch)));

  function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  function expiryText(member: MemberListItem) {
    const expiry = parseIsoDate(member.expiresOn);
    if (member.status === 'OVERDUE') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = Math.max(1, Math.floor((today.getTime() - expiry.getTime()) / 86_400_000));
      return `Overdue by ${days} ${days === 1 ? 'day' : 'days'}`;
    }
    return member.status === 'PENDING' ? 'First payment pending' : `Valid till ${expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.membersPhoneFrame}>
          {Platform.OS !== 'web' ? <PhoneStatusBar /> : null}
          <View style={styles.membersContent}>
            <View style={styles.membersTitleRow}>
              <View><Text style={styles.membersTitle}>Members</Text><Text style={styles.membersSubtitle}>{counts.totalCount} members · People Fitness</Text></View>
              <ProfileButton name={actorName} />
            </View>
            <View style={styles.searchBox}><Feather name="search" size={18} color="#6E7785" /><TextInput value={search} onChangeText={setSearch} placeholder="Search name or number" placeholderTextColor="#6E7785" style={styles.membersSearchInput} /></View>
            <ScrollView horizontal style={styles.membersFilterBar} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {filters.map((filter) => (
                <Pressable key={filter.key} onPress={() => setSelectedFilter(filter.key)} style={[styles.filterChip, selectedFilter === filter.key && { backgroundColor: roleTheme.soft, borderColor: roleTheme.primary }]}>
                  <Text style={[styles.filterText, selectedFilter === filter.key && { color: roleTheme.primary }]}>{filter.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView style={styles.membersList} contentContainerStyle={styles.membersListContent} showsVerticalScrollIndicator={false}>
              <View style={styles.memberRows}>
              {loading ? <ActivityIndicator color="#ECEEF1" style={styles.memberLoading} /> : null}
              <AlertBanner message={loadError} />
              {!loading && !loadError && visibleMembers.length === 0 ? <Text style={styles.emptyMembersText}>No members found.</Text> : null}
              {visibleMembers.map((member) => {
                const dueSoon = member.status === 'DUE_SOON';
                const overdue = member.status === 'OVERDUE';
                const pending = member.status === 'PENDING';
                const statusLabel = pending ? 'First payment' : dueSoon ? 'Due soon' : overdue ? 'Overdue' : 'Active';
                return <Pressable key={member.id} style={styles.memberRow} onPress={() => setSelectedMemberId(member.id)} accessibilityLabel={`View ${member.fullName}`}>
                  <View style={styles.memberAvatar}>{member.photoData ? <Image source={{ uri: member.photoData }} style={styles.memberAvatarImage} /> : <Text style={styles.memberAvatarText}>{initials(member.fullName)}</Text>}</View>
                  <View style={styles.memberCopy}><Text style={styles.memberName}>{member.fullName}</Text><Text style={styles.memberDetail}>{member.membershipPlanName}{member.hasPersonalTraining ? ' + PT' : ''} · {expiryText(member)}</Text></View>
                  <View style={[styles.memberStatus, overdue && styles.overdueStatus, dueSoon && styles.dueSoonStatus, pending && styles.pendingStatus]}><Text style={[styles.statusDot, overdue && styles.overdueDot, dueSoon && styles.dueSoonDot, pending && styles.pendingDot]}>●</Text><Text style={[styles.memberStatusText, overdue && styles.overdueStatusText, dueSoon && styles.dueSoonStatusText, pending && styles.pendingStatusText]}>{statusLabel}</Text></View>
                </Pressable>;
              })}
              </View>
            </ScrollView>
            <Pressable style={[styles.onboardButton, { backgroundColor: roleTheme.primary }]} onPress={onOnboard} accessibilityLabel="Onboard member">
              <Feather name="plus" size={20} color={roleTheme.onPrimary} /><Text style={[styles.onboardText, { color: roleTheme.onPrimary }]}>Onboard</Text>
            </Pressable>
          </View>
          <BottomNavigation managementId={managementId} onHomePress={onHome} onCollectPress={onCollectFromNav} onPaymentsPress={onPayments} onRemindersPress={onReminders} />
        </View>
      </SafeAreaView>
      <MemberDetailsSheet memberId={selectedMemberId} managementId={managementId} actorRole={actorRole} onClose={() => setSelectedMemberId(null)} onCollect={(memberId) => { setSelectedMemberId(null); onCollect(memberId); }} />
    </View>
  );
}

function MemberDetailsSheet({ memberId, managementId, actorRole, onClose, onCollect }: { memberId: number | null; managementId: number; actorRole: AppRole; onClose: () => void; onCollect: (memberId: number) => void }) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (memberId === null) {
      setMember(null);
      setPayments([]);
      setSelectedPayment(null);
      setError('');
      return () => { active = false; };
    }
    async function loadMember() {
      setLoading(true);
      setError('');
      try {
        const [response, history] = await Promise.all([
          getRequest<MemberDetail>(`/members/${memberId}?managementId=${managementId}`),
          actorRole === 'TRAINER' ? Promise.resolve([] as Payment[]) : getRequest<Payment[]>(`/payments?managementId=${managementId}&memberId=${memberId}`),
        ]);
        if (active) { setMember(response); setPayments(history); }
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load member details.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadMember();
    return () => { active = false; };
  }, [memberId, managementId, actorRole]);

  const insets = useSafeAreaInsets();
  const [photoOpen, setPhotoOpen] = useState(false);
  useEffect(() => { setPhotoOpen(false); }, [memberId]);
  const initials = member?.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() ?? '';
  const statusLabel = member?.status === 'PENDING' ? 'Pending' : member?.status === 'OVERDUE' ? 'Overdue' : member?.status === 'DUE_SOON' ? 'Due soon' : 'Active';
  const address = member ? [member.flatHouseNumber, member.apartmentBuilding, member.streetArea, member.city, member.pinCode].filter(Boolean).join(', ') : '';
  const memberSince = member ? new Date(member.memberSince).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const validTill = member ? parseIsoDate(member.expiresOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const validityNote = member ? `Valid till ${parseIsoDate(member.expiresOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : '';
  const memberCode = member ? `PF-${String(member.id).padStart(3, '0')}` : '';

  return (
    <Modal visible={memberId !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.memberSheetModal}>
        <Pressable style={styles.memberSheetBackdrop} onPress={onClose} />
        <View style={[styles.memberSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />
          {loading ? <ActivityIndicator color="#ECEEF1" style={styles.memberSheetLoading} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {member ? <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.memberSheetContent}>
            <View style={styles.sheetHeader}>
              <Pressable accessibilityRole="button" accessibilityLabel="Enlarge member photo" onPress={() => setPhotoOpen(true)} style={[styles.memberAvatar, styles.sheetAvatar]}>{member.photoData ? <Image source={{ uri: member.photoData }} style={styles.memberAvatarImage} /> : <Text style={styles.memberAvatarText}>{initials}</Text>}</Pressable>
              <View style={styles.sheetMemberCopy}><Text style={styles.sheetMemberName}>{member.fullName}</Text><Text style={styles.sheetMemberPhone}>{memberCode} · +91 {member.whatsappNumber}</Text></View>
              <Pressable onPress={onClose} style={styles.sheetCloseButton} accessibilityLabel="Close member details"><Text style={styles.sheetCloseText}>×</Text></Pressable>
            </View>
            <View style={[styles.memberStatus, member.status === 'OVERDUE' && styles.overdueStatus, member.status === 'DUE_SOON' && styles.dueSoonStatus, member.status === 'PENDING' && styles.pendingStatus, styles.sheetStatus]}>
              <Text style={[styles.statusDot, member.status === 'OVERDUE' && styles.overdueDot, member.status === 'DUE_SOON' && styles.dueSoonDot, member.status === 'PENDING' && styles.pendingDot]}>●</Text>
              <Text style={[styles.memberStatusText, member.status === 'OVERDUE' && styles.overdueStatusText, member.status === 'DUE_SOON' && styles.dueSoonStatusText, member.status === 'PENDING' && styles.pendingStatusText]}>{statusLabel}</Text>
            </View>
            <Text style={styles.validityNote}>{validityNote}</Text>
            <View style={styles.detailRows}>
            <DetailRow label="Membership" value={`${member.membershipPlanName} · ₹${member.membershipPlanAmount.toLocaleString('en-IN')}`} />
            <DetailRow label="Personal training" value={member.personalTrainingPlanName ? `${member.personalTrainingPlanName} · ₹${(member.personalTrainingPlanAmount ?? 0).toLocaleString('en-IN')}` : 'Not taken'} />
            <DetailRow label="Membership duration" value={membershipDurationText(member.membershipPlanDurationMonths)} />
            <DetailRow label="Start date" value={parseIsoDate(member.startDate).toLocaleDateString('en-IN')} />
            <DetailRow label="Valid till" value={validTill} />
            {member.personalTrainingPlanName ? <DetailRow label="PT duration" value={membershipDurationText(member.personalTrainingPlanDurationMonths ?? 0)} /> : null}
            {member.personalTrainingExpiresOn ? <DetailRow label="PT valid till" value={parseIsoDate(member.personalTrainingExpiresOn).toLocaleDateString('en-IN')} /> : null}
            <DetailRow label="Member since" value={memberSince} />
            <DetailRow label="Trainer" value={member.trainer} />
            <DetailRow label="Onboarded by" value={member.onboardedBy} />
            <DetailRow label="WhatsApp updates" value={member.sendWhatsappWelcome ? 'On' : 'Off'} />
            <DetailRow label="Email" value={member.email || 'Not provided'} />
            <DetailRow label="Address" value={address || 'Not provided'} />
            <DetailRow label="Emergency contact" value={[member.emergencyContactName, member.emergencyContactMobile ? `+91 ${member.emergencyContactMobile}` : ''].filter(Boolean).join(' · ') || 'Not provided'} />
            </View>
            <Pressable style={styles.collectPaymentButton} onPress={() => onCollect(member.id)}>
              <Text style={styles.collectPaymentText}>₹ &nbsp;Collect payment</Text>
            </Pressable>
            <View style={styles.paymentHistorySection}>
              <Text style={styles.paymentHistoryTitle}>PAYMENT HISTORY · {payments.length}</Text>
              {actorRole === 'TRAINER' ? <View style={styles.emptyPaymentHistory}><Text style={styles.emptyPaymentHistoryText}>Only management can view a member’s full payment history.</Text></View> : payments.length === 0 ? <View style={styles.emptyPaymentHistory}><Text style={styles.emptyPaymentHistoryText}>No payments recorded yet.</Text></View> : <View style={styles.paymentHistoryList}>
                {payments.map((payment) => <Pressable key={payment.id} style={styles.paymentHistoryRow} onPress={() => setSelectedPayment(payment)} accessibilityLabel={`View payment of ₹${payment.amount}`}>
                  <View style={[styles.paymentModeBadge, payment.paymentMode === 'CASH' && styles.cashModeBadge]}><Text style={styles.paymentModeText}>{payment.paymentMode}</Text></View>
                  <View style={styles.paymentHistoryCopy}><Text style={styles.paymentHistoryName}>{member.fullName}</Text><Text style={styles.paymentHistoryMeta}>{new Date(payment.createdDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · by {payment.capturedBy}</Text></View>
                  <View style={styles.paymentHistoryAmount}><Text style={styles.paymentHistoryAmountText}>₹{payment.amount.toLocaleString('en-IN')}</Text>{payment.screenshotAttached ? <Text style={styles.paymentScreenshotLabel}>▧ Screenshot</Text> : null}</View>
                </Pressable>)}
              </View>}
            </View>
          </ScrollView> : null}
        </View>
        <Modal visible={photoOpen && memberId !== null} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}><SafeAreaView style={{ flex: 1, backgroundColor: "#080A0D", padding: 20 }}><Pressable accessibilityRole="button" accessibilityLabel="Close photo" onPress={() => setPhotoOpen(false)} style={{ padding: 16 }}><Text style={styles.sheetCloseText}>× Close photo</Text></Pressable><Text style={styles.sheetMemberName}>{member?.fullName}</Text>{member?.photoData ? <Image source={{ uri: member.photoData }} resizeMode="contain" style={{ flex: 1, width: "100%" }} /> : <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Text style={styles.sheetMemberName}>{initials}</Text><Text style={styles.memberDetail}>No photo added</Text></View>}</SafeAreaView></Modal>
        <PaymentDetailsSheet payment={selectedPayment} member={member} onClose={() => setSelectedPayment(null)} />
      </View>
    </Modal>
  );
}

function PaymentDetailsSheet({ payment, member, onClose }: { payment: Payment | null; member: Pick<MemberDetail, 'fullName'> | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  if (!payment || !member) return null;
  const paidAt = new Date(payment.createdDate);
  const paidDate = paidAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const paidTime = paidAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.memberSheetModal}>
      <Pressable style={styles.memberSheetBackdrop} onPress={onClose} />
      <View style={[styles.paymentDetailSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.sheetHandle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.memberSheetContent}>
          <View style={styles.paymentDetailHeader}><View><Text style={styles.paymentDetailMode}>{payment.paymentMode} payment</Text><Text style={styles.paymentDetailAmount}>₹{payment.amount.toLocaleString('en-IN')}</Text></View><Pressable onPress={onClose} style={styles.sheetCloseButton} accessibilityLabel="Close payment details"><Text style={styles.sheetCloseText}>×</Text></Pressable></View>
          <View style={styles.detailRows}>
            <DetailRow label="Member" value={member.fullName} />
            <DetailRow label="Membership" value={`${payment.membershipPlanName}`} />
            {payment.personalTrainingPlanName ? <DetailRow label="Personal training" value={payment.personalTrainingPlanName} /> : null}
            <DetailRow label="Date" value={`${paidDate}, ${paidTime}`} />
            {payment.utr ? <DetailRow label="UTR" value={payment.utr} /> : null}
            <DetailRow label="Captured by" value={payment.capturedBy} />
          </View>
          {payment.screenshotData ? <View style={styles.paymentDetailScreenshot}><Image source={{ uri: payment.screenshotData }} style={styles.paymentDetailScreenshotImage} /><Text style={styles.paymentDetailScreenshotCaption}>UPI payment screenshot</Text></View> : <Text style={styles.cashPaymentNote}>Cash payment, so no screenshot is attached.</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailRowLabel}>{label}</Text><Text style={styles.detailRowValue}>{value}</Text></View>;
}

type DropdownOption = {
  value: number | string;
  label: string;
  group?: string;
};

function DropdownField({ value, placeholder, options, onSelect, accessibilityLabel }: { value: number | string | null; placeholder: string; options: DropdownOption[]; onSelect: (value: number | string) => void; accessibilityLabel: string }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <><Pressable style={styles.selectField} onPress={() => setOpen(true)} accessibilityLabel={accessibilityLabel} accessibilityRole="button"><Text numberOfLines={1} style={[styles.selectFieldText, !selected && styles.selectFieldPlaceholder]}>{selected?.label ?? placeholder}</Text><Text style={styles.selectFieldCaret}>⌄</Text></Pressable><Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={styles.selectModalRoot}><Pressable style={styles.memberSheetBackdrop} onPress={() => setOpen(false)} /><View style={[styles.selectModalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Text style={[styles.selectModalTitle, { flex: 1 }]}>{accessibilityLabel}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close selection" onPress={() => setOpen(false)} style={styles.sheetCloseButton}><Text style={styles.sheetCloseText}>×</Text></Pressable></View><ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator style={styles.selectModalOptions} contentContainerStyle={styles.selectModalOptionsContent}>{options.map((option, index) => <View key={`${option.value}-${option.label}`}>{option.group && option.group !== options[index - 1]?.group ? <Text style={styles.selectGroupTitle}>{option.group}</Text> : null}<Pressable style={[styles.selectOption, option.value === value && styles.selectOptionSelected]} onPress={() => { onSelect(option.value); setOpen(false); }}><Text style={[styles.selectOptionText, option.value === value && styles.selectOptionTextSelected]}>{option.label}</Text>{option.value === value ? <Text style={styles.selectOptionCheck}>✓</Text> : null}</Pressable></View>)}</ScrollView></View></View></Modal></>;
}

function paymentStatusText(member: Pick<MemberListItem, 'status' | 'expiresOn'>) {
  if (member.status === 'PENDING') return 'First payment pending';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((parseIsoDate(member.expiresOn).getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
  if (days === 0) return 'Ends today';
  if (member.status === 'DUE_SOON') return `Ends in ${days} ${days === 1 ? 'day' : 'days'}`;
  return `Valid till ${parseIsoDate(member.expiresOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

function CollectPaymentScreen({ managementId, actorName, actorRole, memberId, onBack, onSaved, onHome, onPayments, onReminders }: { managementId: number; actorName: string; actorRole: AppRole; memberId: number | null; onBack: () => void; onSaved: () => void; onHome: () => void; onPayments: () => void; onReminders: () => void }) {
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(memberId);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const roleTheme = useContext(RoleThemeContext);
  const [membershipPlans, setMembershipPlans] = useState<Plan[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<Plan[]>([]);
  const [membershipPlanId, setMembershipPlanId] = useState<number | null>(null);
  const [trainingPlanId, setTrainingPlanId] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CASH'>('UPI');
  const [amount, setAmount] = useState('');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');
  const [membershipPriceEdit, setMembershipPriceEdit] = useState<string | null>(null);
  const [trainingPriceEdit, setTrainingPriceEdit] = useState<string | null>(null);
  const [utr, setUtr] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [readingUtr, setReadingUtr] = useState(false);
  const [ocrNote, setOcrNote] = useState('');
  const [sendReceipt, setSendReceipt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Payment | null>(null);

  const selectedMembership = membershipPlans.find((plan) => plan.id === membershipPlanId) ?? null;
  const eligibleTrainingPlans = trainingPlans.filter((plan) => selectedMembership && plan.durationMonths <= selectedMembership.durationMonths);
  const selectedTraining = eligibleTrainingPlans.find((plan) => plan.id === trainingPlanId) ?? null;
  useEffect(() => {
    if (trainingPlanId !== null && !eligibleTrainingPlans.some((plan) => plan.id === trainingPlanId)) setTrainingPlanId(null);
  }, [membershipPlanId, trainingPlanId, membershipPlans, trainingPlans]);
  const defaultMembershipAmount = member?.status === 'PENDING' && member.membershipPlanId === membershipPlanId
    && member.membershipPriceOverride != null ? member.membershipPriceOverride : selectedMembership?.amount ?? 0;
  const defaultTrainingAmount = member?.status === 'PENDING' && member.personalTrainingPlanId === trainingPlanId
    && member.personalTrainingPriceOverride != null ? member.personalTrainingPriceOverride : selectedTraining?.amount ?? 0;
  const membershipAmount = membershipPriceEdit === null ? defaultMembershipAmount : Number(membershipPriceEdit) || 0;
  const trainingAmount = trainingPriceEdit === null ? defaultTrainingAmount : Number(trainingPriceEdit) || 0;
  const total = membershipAmount + trainingAmount;

  useEffect(() => {
    let active = true;
    if (selectedMemberId === null) {
      setLoading(true);
      setMember(null);
      getRequest<MembersListResponse>(`/members?managementId=${managementId}`).then((response) => {
        if (active) {
          setMembers(response.members);
          setError('');
        }
      }).catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load members.');
      }).finally(() => {
        if (active) setLoading(false);
      });
      return () => { active = false; };
    }
    async function load() {
      setLoading(true);
      try {
        const [memberDetail, memberships, trainings, memberResponse] = await Promise.all([
          getRequest<MemberDetail>(`/members/${selectedMemberId}?managementId=${managementId}`),
          getRequest<Plan[]>(`/membership-plans?managementId=${managementId}`),
          getRequest<Plan[]>(`/personal-trainings?managementId=${managementId}`),
          getRequest<MembersListResponse>(`/members?managementId=${managementId}`),
        ]);
        if (!active) return;
        setMember(memberDetail);
        setMembershipPlans(sortPlansByDuration(memberships));
        setTrainingPlans(sortPlansByDuration(trainings));
        setMembers(memberResponse.members);
        setMembershipPlanId(memberDetail.membershipPlanId ?? sortPlansByDuration(memberships)[0]?.id ?? null);
        setTrainingPlanId(memberDetail.personalTrainingPlanId);
        const initialAmount = (memberDetail.status === 'PENDING' && memberDetail.membershipPriceOverride != null
          ? memberDetail.membershipPriceOverride : memberships.find((plan) => plan.id === memberDetail.membershipPlanId)?.amount ?? 0)
          + (memberDetail.status === 'PENDING' && memberDetail.personalTrainingPriceOverride != null
            ? memberDetail.personalTrainingPriceOverride : trainings.find((plan) => plan.id === memberDetail.personalTrainingPlanId)?.amount ?? 0);
        setAmount(String(initialAmount));
        setSendReceipt(false);
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load payment details.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [managementId, selectedMemberId]);

  useEffect(() => {
    if (selectedMembership) setAmount(String(total));
  }, [membershipPlanId, trainingPlanId, member, membershipPriceEdit, trainingPriceEdit]);

  async function attachScreenshot() {
    setError('');
    setOcrNote('');

    let result: ImagePicker.ImagePickerResult;
    if (Platform.OS === 'web') {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85, base64: true });
    } else {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Allow camera access to take a photo of the UPI receipt.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, base64: true });
    }

    if (result.canceled) return;
    const asset = result.assets[0];
    const uri = asset?.uri ?? null;
    setScreenshotUri(uri);
    setScreenshotData(asset?.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : null);

    if (uri && Platform.OS !== 'web') {
      setReadingUtr(true);
      try {
        if (typeof TextRecognition?.recognize !== 'function') {
          setOcrNote('Receipt OCR needs a fresh native app build to activate.');
        } else {
          const recognized = await TextRecognition.recognize(uri);
          const blockLines = (recognized?.blocks ?? []).flatMap((block) => (block.lines ?? []).map((line) => line.text)).join('\n');
          const blockText = (recognized?.blocks ?? []).map((block) => block.text).join('\n');
          const extractedUtr =
            extractUpiUtrFromText(recognized?.text ?? '') ??
            extractUpiUtrFromText(blockLines) ??
            extractUpiUtrFromText(blockText);
          if (extractedUtr) {
            setUtr(extractedUtr);
            setOcrNote('');
          } else {
            const preview = (recognized?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
            setOcrNote(preview ? `Could not detect Transaction ID (read: "${preview}…"). Please enter below.` : 'Could not read text from photo. Hold steady and try again, or enter Transaction ID below.');
          }
        }
      } catch (ocrError) {
        const msg = ocrError instanceof Error ? ocrError.message : '';
        setOcrNote(msg.includes('null') || msg.includes('TextRecognition')
          ? 'Receipt OCR needs a fresh native app build to activate.'
          : 'Could not read receipt text. Please enter the Transaction ID below.');
      } finally {
        setReadingUtr(false);
      }
    }
  }

  function useSampleScreenshot() {
    const paidAmount = Number(amount || total || 0).toLocaleString('en-IN');
    const sample = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="540" viewBox="0 0 360 540"><rect width="360" height="540" fill="#f4f6f8"/><rect width="360" height="180" fill="#1e7d4f"/><circle cx="180" cy="72" r="32" fill="#ffffff"/><path d="M165 73l10 10 21-23" fill="none" stroke="#1e7d4f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><text x="180" y="138" fill="#ffffff" font-family="Arial" font-size="19" font-weight="700" text-anchor="middle">Payment successful</text><text x="180" y="252" fill="#14171c" font-family="Arial" font-size="38" font-weight="700" text-anchor="middle">₹${paidAmount}</text><text x="180" y="284" fill="#5e6672" font-family="Arial" font-size="14" text-anchor="middle">Paid to People Fitness</text><rect x="28" y="335" width="304" height="122" rx="12" fill="#ffffff" stroke="#daddE2"/><text x="48" y="373" fill="#5e6672" font-family="Arial" font-size="13">Status</text><text x="312" y="373" fill="#16884f" font-family="Arial" font-size="13" font-weight="700" text-anchor="end">Completed</text><text x="48" y="414" fill="#5e6672" font-family="Arial" font-size="13">Reference</text><text x="312" y="414" fill="#14171c" font-family="Arial" font-size="13" font-weight="700" text-anchor="end">${String(Date.now()).slice(-12)}</text><rect x="108" y="486" width="144" height="34" rx="7" fill="#fde3e1" stroke="#c2352e"/><text x="180" y="508" fill="#c2352e" font-family="Arial" font-size="15" font-weight="700" text-anchor="middle" letter-spacing="3">SAMPLE</text></svg>`)}`;
    setScreenshotUri(sample);
    setScreenshotData(sample);
    setUtr(String(Date.now()).slice(-12));
  }

  async function savePayment() {
    if (!member || !membershipPlanId) { setError('Choose a membership plan.'); return; }
    const validPrice = (value: string | null) => value === null || (/^\d{1,10}(\.\d{1,2})?$/.test(value) && Number(value) > 0);
    if (!validPrice(membershipPriceEdit) || !validPrice(trainingPriceEdit)) { setError('Enter a valid plan price greater than zero, with up to two decimal places.'); return; }
    if (paymentEndDate && paymentStartDate && paymentEndDate < paymentStartDate) { setError('End date cannot be before the start date.'); return; }
    const paidAmount = Number(amount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) { setError('Enter the amount received.'); return; }
    if (paymentMode === 'UPI' && (!screenshotUri || !screenshotData)) { setError('Attach the UPI payment screenshot before saving.'); return; }
    if (paymentMode === 'UPI' && utr.trim() && !/^[a-zA-Z0-9/_-]{6,}$/.test(utr.trim())) { setError('Transaction ID should be at least 6 alphanumeric characters.'); return; }
    setSaving(true);
    setError('');
    try {
      const response = await request<Payment>('/payments', {
        managementId, memberId: member.id, membershipPlanId, personalTrainingPlanId: selectedTraining?.id ?? null,
        startDate: paymentStartDate || null, endDate: paymentEndDate || null,
        membershipPriceOverride: membershipPriceEdit === null ? null : Number(membershipPriceEdit), personalTrainingPriceOverride: selectedTraining && trainingPriceEdit !== null ? Number(trainingPriceEdit) : null,
        amount: paidAmount, paymentMode, utr: paymentMode === 'UPI' ? utr : null, screenshotAttached: paymentMode === 'UPI' && Boolean(screenshotData), screenshotData: paymentMode === 'UPI' ? screenshotData : null, sendReceipt: member.sendWhatsappWelcome && sendReceipt, capturedBy: actorName,
      });
      if (sendReceipt && response.receiptSent) {
        const receipt = `Payment received, ${firstName(member.fullName)}. ₹${response.amount.toLocaleString('en-IN')} by ${response.paymentMode}${response.utr ? ` (UTR ${response.utr})` : ''} for the ${response.membershipPlanName} plan${response.personalTrainingPlanName ? ` and ${response.personalTrainingPlanName} personal training` : ''}.\n\nYour membership is valid till ${parseIsoDate(response.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. See you at People Fitness!`;
        try {
          const prepared = await prepareWhatsAppMessage({ managementId, memberId: member.id, messageType: 'RECEIPT', messageText: receipt, initiatedBy: actorName });
          await openWhatsApp(prepared.recipientPhone, prepared.messageText);
        } catch {
          // Payment is saved even if WhatsApp cannot be opened on this device.
        }
      }
      homeCache.delete(managementId);
      setSaved(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save payment.');
    } finally {
      setSaving(false);
    }
  }

  function resetPaymentFields() {
    setSaved(null);
    setMember(null);
    setMembershipPlanId(null);
    setTrainingPlanId(null);
    setAmount('');
    setPaymentStartDate('');
    setPaymentEndDate('');
    setMembershipPriceEdit(null);
    setTrainingPriceEdit(null);
    setUtr('');
    setScreenshotUri(null);
    setScreenshotData(null);
    setPaymentMode('UPI');
    setSendReceipt(false);
    setError('');
  }

  function chooseAnotherMember() {
    resetPaymentFields();
    setSelectedMemberId(null);
  }

  function selectMember(nextMemberId: number) {
    if (nextMemberId === selectedMemberId) return;
    resetPaymentFields();
    setSelectedMemberId(nextMemberId);
  }

  // Preserve the API's creation-date descending order in every member selector.
  const memberOptions: DropdownOption[] = members.map((candidate) => ({ value: candidate.id, label: `${candidate.fullName} · ${paymentStatusText(candidate)}` }));
  const membershipOptions: DropdownOption[] = membershipPlans.map((plan) => ({ value: plan.id, label: `${plan.name} · ₹${plan.amount.toLocaleString('en-IN')}` }));
  const trainingOptions: DropdownOption[] = [{ value: 'none', label: 'None' }, ...eligibleTrainingPlans.map((plan) => ({ value: plan.id, label: `${plan.name} · ₹${plan.amount.toLocaleString('en-IN')}` }))];

  if (saved) {
    return <View style={styles.screen}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.collectScreen}>
      <View style={styles.onboardHeader}><Pressable onPress={onSaved} hitSlop={12} style={styles.backIconBtn}><Feather name="chevron-left" size={24} color="#F3F5F7" /></Pressable><View style={styles.onboardHeading}><Text style={styles.onboardTitle}>Payment saved</Text><Text style={styles.onboardSubtitle}>People Fitness</Text></View></View>
      <View style={styles.paymentSuccess}><View style={styles.successBadge}><Feather name="check" size={28} color="#34D399" /></View><Text style={styles.paymentSuccessTitle}>Payment saved</Text><Text style={styles.paymentSuccessText}>₹{saved.amount.toLocaleString('en-IN')} from {member?.fullName} by {saved.paymentMode}.</Text><Text style={styles.paymentSuccessText}>Membership valid till {parseIsoDate(saved.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.</Text><Pressable style={[styles.completeOnboardButton, { backgroundColor: roleTheme.primary }]} onPress={chooseAnotherMember}><Text style={[styles.primaryButtonText, { color: roleTheme.onPrimary }]}>Collect another payment</Text></Pressable><Pressable style={styles.sampleScreenshotButton} onPress={onPayments}><Text style={styles.sampleScreenshotText}>View payment history</Text></Pressable></View>
      <BottomNavigation managementId={managementId} active="collect" onHomePress={onHome} onMembersPress={onSaved} onCollectPress={chooseAnotherMember} onPaymentsPress={onPayments} onRemindersPress={onReminders} />
    </View></SafeAreaView></View>;
  }

  return <View style={styles.screen}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.collectScreen}>
    {Platform.OS !== 'web' ? <PhoneStatusBar /> : null}
    <View style={styles.screenHeader}><View><Text style={styles.membersTitle}>Collect payment</Text><Text style={styles.membersSubtitle}>Capture UPI screenshot</Text></View><ProfileButton name={actorName} /></View>
    <KeyboardAvoidingView style={styles.safeArea} behavior="padding">
    <ScrollView style={styles.onboardScroll} contentContainerStyle={styles.onboardContent} keyboardShouldPersistTaps="handled">
      {loading ? <ActivityIndicator color="#ECEEF1" style={styles.memberLoading} /> : null}
      <AlertBanner message={error} />
      {!loading && !error ? <><Text style={styles.formLabel}>Member</Text><DropdownField value={selectedMemberId} placeholder="Choose a member" options={memberOptions} onSelect={(value) => selectMember(Number(value))} accessibilityLabel="Member" />{member ? <Text style={styles.collectMemberHint}>{member.membershipPlanName} · {paymentStatusText(member)}</Text> : null}</> : null}
      {!loading && !error && !member ? <View style={styles.collectEmptyState}><Text style={styles.collectEmptyText}>Choose a member to record their payment.{`\n`}Newest members are listed first.</Text></View> : null}
      {member ? <>
        <View style={styles.twoColumnRow}><View style={styles.columnField}><Text style={styles.formLabel}>Membership plan</Text><DropdownField value={membershipPlanId} placeholder="Choose a plan" options={membershipOptions} onSelect={(value) => { setMembershipPlanId(Number(value)); setMembershipPriceEdit(null); setTrainingPriceEdit(null); }} accessibilityLabel="Membership plan" /></View><View style={styles.columnField}><Text style={styles.formLabel}>Personal training</Text><DropdownField value={trainingPlanId ?? 'none'} placeholder="None" options={trainingOptions} onSelect={(value) => { setTrainingPlanId(value === 'none' ? null : Number(value)); setTrainingPriceEdit(null); }} accessibilityLabel="Personal training" /></View></View>
        {selectedMembership ? <View><Pressable accessibilityRole="button" onPress={() => setMembershipPriceEdit(membershipPriceEdit === null ? String(defaultMembershipAmount) : null)}><Text style={styles.changeNumberText}>{membershipPriceEdit === null ? 'Edit membership price for this payment' : 'Use original membership price'}</Text></Pressable>{membershipPriceEdit !== null ? <><Text style={styles.formLabel}>Membership price for this payment (₹)</Text><TextInput value={membershipPriceEdit} onChangeText={setMembershipPriceEdit} keyboardType="decimal-pad" style={styles.formInput} accessibilityLabel="Membership price for this payment" /></> : null}</View> : null}
        {selectedTraining ? <View><Pressable accessibilityRole="button" onPress={() => setTrainingPriceEdit(trainingPriceEdit === null ? String(defaultTrainingAmount) : null)}><Text style={styles.changeNumberText}>{trainingPriceEdit === null ? 'Edit personal-training price for this payment' : 'Use original personal-training price'}</Text></Pressable>{trainingPriceEdit !== null ? <><Text style={styles.formLabel}>Personal-training price for this payment (₹)</Text><TextInput value={trainingPriceEdit} onChangeText={setTrainingPriceEdit} keyboardType="decimal-pad" style={styles.formInput} accessibilityLabel="Personal-training price for this payment" /></> : null}</View> : null}
        <View style={styles.paymentSummary}><View style={styles.summaryLine}><Text style={styles.summaryLabel}>Membership · {selectedMembership?.name}</Text><Text style={styles.summaryValue}>₹{membershipAmount.toLocaleString('en-IN')}</Text></View>{selectedTraining ? <View style={[styles.summaryLine, styles.collectSummaryExtra]}><Text style={styles.summaryLabel}>Personal training · {selectedTraining.name}</Text><Text style={styles.summaryValue}>₹{trainingAmount.toLocaleString('en-IN')}</Text></View> : null}<View style={styles.summaryDivider} /><View style={styles.summaryLine}><Text style={styles.firstPayment}>Total due</Text><Text style={[styles.firstPaymentAmount, { color: roleTheme.primary }]}>₹{total.toLocaleString('en-IN')}</Text></View></View>
        <View style={styles.twoColumnRow}><View style={styles.columnField}><Text style={styles.formLabel}>Amount (₹)</Text><TextInput value={amount} onChangeText={(value) => setAmount(value.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={styles.formInput} /></View><View style={styles.columnField}><Text style={styles.formLabel}>Paid by</Text><View style={styles.paymentModeRow}><Pressable onPress={() => setPaymentMode('UPI')} style={[styles.paymentModeButton, paymentMode === 'UPI' && { backgroundColor: roleTheme.soft, borderWidth: 1, borderColor: roleTheme.border }]}><Text style={[styles.paymentModeButtonText, paymentMode === 'UPI' && { color: roleTheme.primary, fontWeight: '800' }]}>UPI</Text></Pressable><Pressable onPress={() => { setPaymentMode('CASH'); setUtr(''); setScreenshotUri(null); setScreenshotData(null); }} style={[styles.paymentModeButton, paymentMode === 'CASH' && { backgroundColor: roleTheme.soft, borderWidth: 1, borderColor: roleTheme.border }]}><Text style={[styles.paymentModeButtonText, paymentMode === 'CASH' && { color: roleTheme.primary, fontWeight: '800' }]}>Cash</Text></Pressable></View></View></View>
        {paymentMode === 'UPI' ? <><Text style={styles.formLabel}>UPI payment screenshot</Text><View style={styles.screenshotCard}>{screenshotUri ? <><Image source={{ uri: screenshotUri }} style={styles.screenshotPreview} /><View style={styles.screenshotCopy}><Text style={styles.screenshotAttachedText}>{readingUtr ? 'Reading Transaction ID…' : '✓ Receipt photo attached'}</Text>{ocrNote ? <Text style={styles.fieldNote}>{ocrNote}</Text> : null}<View style={styles.screenshotButtonRow}><Pressable onPress={() => void attachScreenshot()} disabled={readingUtr}><Text style={styles.replaceScreenshotText}>Retake</Text></Pressable><Pressable onPress={() => { setScreenshotUri(null); setScreenshotData(null); setOcrNote(''); }}><Text style={styles.replaceScreenshotText}>Remove</Text></Pressable></View></View></> : <><View style={styles.screenshotIconWrap}><Feather name="camera" size={24} color="#9BA3B0" /></View><Text style={styles.screenshotHint}>Take a photo of the PhonePe or Google Pay{`\n`}receipt to auto-fill the Transaction ID.</Text><View style={styles.screenshotButtonRow}><Pressable style={styles.attachScreenshotButton} onPress={() => void attachScreenshot()}><Feather name="camera" size={14} color="#F3F5F7" /><Text style={styles.attachScreenshotText}>Take receipt photo</Text></Pressable><Pressable style={styles.sampleScreenshotButton} onPress={useSampleScreenshot}><Text style={styles.sampleScreenshotText}>Use sample</Text></Pressable></View></>}</View><Text style={styles.formLabel}>Transaction ID</Text><TextInput value={utr} onChangeText={(value) => setUtr(value.replace(/\s+/g, ''))} autoCapitalize="none" autoCorrect={false} placeholder="Shown on PhonePe / Google Pay receipt" placeholderTextColor="#6E7785" style={styles.formInput} /></> : null}
        <View style={styles.paymentValidity}><Text style={styles.paymentValidityLabel}>Membership validity</Text><Text style={styles.fieldNote}>Leave dates blank to use the automatic dates. The end date applies to membership; personal training uses its plan duration from the start date.</Text><View style={styles.twoColumnRow}><View style={styles.columnField}><Text style={styles.formLabel}>Start date (optional)</Text><FutureDatePicker value={paymentStartDate} onChange={setPaymentStartDate} />{paymentStartDate ? <Pressable onPress={() => setPaymentStartDate('')}><Text style={styles.changeNumberText}>Use automatic start date</Text></Pressable> : null}</View><View style={styles.columnField}><Text style={styles.formLabel}>End date (optional)</Text><FutureDatePicker value={paymentEndDate} onChange={setPaymentEndDate} />{paymentEndDate ? <Pressable onPress={() => setPaymentEndDate('')}><Text style={styles.changeNumberText}>Use automatic end date</Text></Pressable> : null}</View></View>{member?.status === 'PENDING' && member.customEndDate && !paymentEndDate ? <Text style={styles.paymentValidityValue}>Onboarding end date: {parseIsoDate(member.customEndDate).toLocaleDateString('en-IN')}</Text> : null}</View>
        <Pressable disabled accessibilityState={{ disabled: true }} style={[styles.welcomeMessageRow, styles.disabledButton]} onPress={() => setSendReceipt(!sendReceipt)}><View style={[styles.welcomeToggle, !sendReceipt && styles.welcomeToggleInactive]}><View style={[styles.welcomeToggleThumb, !sendReceipt && styles.welcomeToggleThumbInactive]} /></View><View><Text style={styles.welcomeMessageText}>Send receipt on WhatsApp · unavailable</Text>{!member.sendWhatsappWelcome ? <Text style={styles.fieldNote}>This member has turned WhatsApp updates off.</Text> : null}</View></Pressable>
        <Pressable style={[styles.completeOnboardButton, { backgroundColor: roleTheme.primary }, saving && styles.disabledButton]} onPress={() => void savePayment()} disabled={saving}>{saving ? <ActivityIndicator color={roleTheme.onPrimary} /> : <Text style={[styles.primaryButtonText, { color: roleTheme.onPrimary }]}>Save payment · ₹{Number(amount || 0).toLocaleString('en-IN')}</Text>}</Pressable>
      </> : null}
    </ScrollView>
    </KeyboardAvoidingView>
    <BottomNavigation managementId={managementId} active="collect" onHomePress={onHome} onMembersPress={onBack} onCollectPress={chooseAnotherMember} onPaymentsPress={onPayments} onRemindersPress={onReminders} />
  </View></SafeAreaView></View>;
}

function OnboardMemberScreen({ managementId, actorName, actorRole, onBack, onSaved, onHome, onCollect, onPayments, onReminders }: { managementId: number; actorName: string; actorRole: AppRole; onBack: () => void; onSaved: () => void; onHome: () => void; onCollect: (memberId?: number) => void; onPayments: () => void; onReminders: () => void }) {
  const roleTheme = useContext(RoleThemeContext);
  const [membershipPlans, setMembershipPlans] = useState<Plan[]>([]);
  const [personalTrainingPlans, setPersonalTrainingPlans] = useState<Plan[]>([]);
  const [membershipPlanId, setMembershipPlanId] = useState<number | null>(null);
  const [personalTraining, setPersonalTraining] = useState(false);
  const [personalTrainingPlanId, setPersonalTrainingPlanId] = useState<number | null>(null);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [sendWelcomeMessage, setSendWelcomeMessage] = useState(false);
  const [memberPhotoUri, setMemberPhotoUri] = useState<string | null>(null);
  const [memberPhotoData, setMemberPhotoData] = useState<string | null>(null);
  const [usingSamplePhoto, setUsingSamplePhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [startDate, setStartDate] = useState(() => toIsoDate(new Date()));
  const [endDate, setEndDate] = useState('');
  const [editingMembershipPrice, setEditingMembershipPrice] = useState(false);
  const [membershipPriceInput, setMembershipPriceInput] = useState('');
  const [editingTrainingPrice, setEditingTrainingPrice] = useState(false);
  const [trainingPriceInput, setTrainingPriceInput] = useState('');
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerId, setTrainerId] = useState<number | null>(null);
  const [trainerListOpen, setTrainerListOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [flatHouseNumber, setFlatHouseNumber] = useState('');
  const [apartmentBuilding, setApartmentBuilding] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactMobile, setEmergencyContactMobile] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createdMember, setCreatedMember] = useState<CreateMemberResponse | null>(null);

  useEffect(() => {
    let isActive = true;
    async function loadPlans() {
      setLoadingPlans(true);
      setFormError('');
      try {
        const [membership, training, availableTrainers] = await Promise.all([
          getRequest<Plan[]>(`/membership-plans?managementId=${managementId}`),
          getRequest<Plan[]>(`/personal-trainings?managementId=${managementId}`),
          getRequest<Trainer[]>(`/trainers?managementId=${managementId}`),
        ]);
        if (!isActive) return;
        setMembershipPlans(sortPlansByDuration(membership));
        setPersonalTrainingPlans(sortPlansByDuration(training));
        setTrainers(availableTrainers);
        setMembershipPlanId(sortPlansByDuration(membership)[0]?.id ?? null);
        setPersonalTrainingPlanId(sortPlansByDuration(training)[0]?.id ?? null);
        setTrainerId((actorRole === 'TRAINER' ? availableTrainers.find((trainer) => trainer.name.toLowerCase() === actorName.toLowerCase()) : availableTrainers[0])?.id ?? availableTrainers[0]?.id ?? null);
      } catch (loadError) {
        if (isActive) setFormError(loadError instanceof Error ? loadError.message : 'Unable to load plans.');
      } finally {
        if (isActive) setLoadingPlans(false);
      }
    }
    void loadPlans();
    return () => { isActive = false; };
  }, [managementId, actorName, actorRole]);

  const selectedPlan = membershipPlans.find((item) => item.id === membershipPlanId);
  const eligiblePersonalTrainingPlans = personalTrainingPlans.filter((plan) => selectedPlan && plan.durationMonths <= selectedPlan.durationMonths);
  const selectedPersonalTrainingPlan = eligiblePersonalTrainingPlans.find((item) => item.id === personalTrainingPlanId);
  useEffect(() => {
    if (!eligiblePersonalTrainingPlans.some((plan) => plan.id === personalTrainingPlanId)) {
      setPersonalTrainingPlanId(null);
      setEditingTrainingPrice(false);
      setTrainingPriceInput('');
    }
  }, [membershipPlanId, personalTrainingPlanId, membershipPlans, personalTrainingPlans]);
  const selectedTrainer = trainers.find((item) => item.id === trainerId);
  const editedMembershipPrice = Number(membershipPriceInput);
  const membershipPrice = editingMembershipPrice && membershipPriceInput ? editedMembershipPrice : selectedPlan?.amount ?? 0;
  const editedTrainingPrice = Number(trainingPriceInput);
  const trainingPrice = editingTrainingPrice && trainingPriceInput ? editedTrainingPrice : selectedPersonalTrainingPlan?.amount ?? 0;
  const firstPayment = membershipPrice + (personalTraining ? trainingPrice : 0);

  function currency(amount: number) {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  function durationText(months: number) {
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }

  async function takePhoto() {
    setPhotoError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoError('Camera permission is needed to take a member photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMemberPhotoUri(asset.uri);
      setMemberPhotoData(asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : null);
      setUsingSamplePhoto(false);
    }
  }

  function useSamplePhoto() {
    const sample = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="#F6DFBF"/><circle cx="160" cy="118" r="56" fill="#7A4D3B"/><path d="M68 306c10-70 55-106 92-106s82 36 92 106" fill="#263547"/><text x="160" y="292" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#fff">SAMPLE</text></svg>')}`;
    setMemberPhotoUri(sample);
    setMemberPhotoData(sample);
    setUsingSamplePhoto(true);
    setPhotoError('');
  }

  function removePhoto() {
    setMemberPhotoUri(null);
    setMemberPhotoData(null);
    setUsingSamplePhoto(false);
    setPhotoError('');
  }

  async function addMember() {
    if (fullName.trim().length < 2 || !/^[6-9]\d{9}$/.test(whatsappNumber.replace(/\D/g, '')) || !membershipPlanId || !startDate || !selectedTrainer) {
      setFormError('Enter full name, a 10-digit WhatsApp number, a membership plan, start date, and trainer.');
      return;
    }
    if (personalTraining && !selectedPersonalTrainingPlan) {
      setFormError('Select a personal-training plan.');
      return;
    }
    if (endDate && endDate < startDate) { setFormError('End date cannot be before the start date.'); return; }
    if (editingMembershipPrice && (!/^\d{1,10}(\.\d{1,2})?$/.test(membershipPriceInput) || editedMembershipPrice <= 0)) {
      setFormError('Enter a valid membership price greater than zero, with up to two decimal places.');
      return;
    }
    if (personalTraining && editingTrainingPrice && (!/^\d{1,10}(\.\d{1,2})?$/.test(trainingPriceInput) || editedTrainingPrice <= 0)) {
      setFormError('Enter a valid personal-training price greater than zero, with up to two decimal places.');
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setMoreDetailsOpen(true); setFormError('Enter a valid email address.'); return; }
    if (pinCode && !/^\d{6}$/.test(pinCode)) { setMoreDetailsOpen(true); setFormError('PIN code must contain 6 digits.'); return; }
    if (emergencyContactMobile && !/^[6-9]\d{9}$/.test(emergencyContactMobile)) { setMoreDetailsOpen(true); setFormError('Enter a valid emergency mobile number.'); return; }

    setSaving(true);
    setFormError('');
    setSuccessMessage('');
    try {
      const result = await request<CreateMemberResponse>('/members', {
        managementId,
        onboardedBy: actorName,
        fullName: fullName.trim(),
        whatsappNumber: whatsappNumber.replace(/\D/g, ''),
        membershipPlanId,
        personalTrainingPlanId: personalTraining ? personalTrainingPlanId : null,
        startDate,
        endDate: endDate || null,
        membershipPriceOverride: editingMembershipPrice ? editedMembershipPrice : null,
        personalTrainingPriceOverride: personalTraining && editingTrainingPrice ? editedTrainingPrice : null,
        trainer: selectedTrainer.name,
        email: email.trim() || null,
        flatHouseNumber: flatHouseNumber.trim() || null,
        apartmentBuilding: apartmentBuilding.trim() || null,
        streetArea: streetArea.trim() || null,
        city: city.trim() || null,
        pinCode: pinCode.trim() || null,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactMobile: emergencyContactMobile.replace(/\D/g, '') || null,
        sendWhatsappWelcome: sendWelcomeMessage,
        photoData: memberPhotoData,
      });
      if (sendWelcomeMessage) {
        const plan = selectedPlan;
        const training = selectedPersonalTrainingPlan;
        const welcome = `Welcome to People Fitness, ${firstName(fullName)}! You're on the ${plan?.name ?? 'membership'} plan (${plan ? currency(plan.amount) : ''})${training ? ` with ${training.name} personal training (${currency(training.amount)})` : ''}, starting ${parseIsoDate(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Your trainer is ${selectedTrainer.name}.\n\nSave this number. Receipts, renewal reminders and gym updates come here.`;
        try {
          const prepared = await prepareWhatsAppMessage({ managementId, memberId: result.memberId, messageType: 'WELCOME', messageText: welcome, initiatedBy: actorName });
          await openWhatsApp(prepared.recipientPhone, prepared.messageText);
          setSuccessMessage(`Member added. WhatsApp opened with the welcome message.`);
        } catch {
          setSuccessMessage(`Member added. Subscription is ${result.status.toLowerCase()} until ${result.expiresOn}. WhatsApp could not be opened on this device.`);
        }
      } else {
        setSuccessMessage(`Member added. Subscription is ${result.status.toLowerCase()} until ${result.expiresOn}.`);
      }
      homeCache.delete(managementId);
      setCreatedMember(result);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Unable to add member.');
    } finally {
      setSaving(false);
    }
  }

  if (createdMember) {
    return <View style={styles.screen}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.collectScreen}>
      <View style={styles.onboardHeader}><Pressable onPress={onSaved} hitSlop={12} style={styles.backIconBtn}><Feather name="chevron-left" size={24} color="#F3F5F7" /></Pressable><View style={styles.onboardHeading}><Text style={styles.onboardTitle}>Member added</Text><Text style={styles.onboardSubtitle}>First payment pending</Text></View><ProfileButton name={actorName} /></View>
      <View style={styles.paymentSuccess}><View style={styles.successBadge}><Feather name="check" size={28} color="#34D399" /></View><Text style={styles.paymentSuccessTitle}>{firstName(fullName)} is ready to join</Text><Text style={styles.paymentSuccessText}>Their first payment of {currency(firstPayment)} is pending. Collect it to activate the {selectedPlan?.name ?? 'membership'} plan.</Text>{successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}<Pressable style={styles.completeOnboardButton} onPress={() => onCollect(createdMember.memberId)}><Text style={styles.primaryButtonText}>₹  Collect payment</Text></Pressable><Pressable style={styles.sampleScreenshotButton} onPress={() => { setCreatedMember(null); setFullName(''); setWhatsappNumber(''); setEndDate(''); setEditingMembershipPrice(false); setMembershipPriceInput(''); setEditingTrainingPrice(false); setTrainingPriceInput(''); removePhoto(); setMoreDetailsOpen(false); setSuccessMessage(''); }}><Text style={styles.sampleScreenshotText}>Add another member</Text></Pressable><Pressable style={styles.changeNumberButton} onPress={onSaved}><Text style={styles.changeNumberText}>View members</Text></Pressable></View>
      <BottomNavigation managementId={managementId} active="members" onHomePress={onHome} onMembersPress={onSaved} onCollectPress={() => onCollect(createdMember.memberId)} onPaymentsPress={onPayments} onRemindersPress={onReminders} />
    </View></SafeAreaView></View>;
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.membersPhoneFrame}>
          {Platform.OS !== 'web' ? <PhoneStatusBar /> : null}
          <View style={styles.onboardHeader}>
            <Pressable onPress={onBack} hitSlop={12} style={styles.backIconBtn}><Feather name="chevron-left" size={24} color="#F3F5F7" /></Pressable>
            <View style={styles.onboardHeading}><Text style={styles.onboardTitle}>Onboard member</Text><Text style={styles.onboardSubtitle}>{actorRole === 'TRAINER' ? 'Trainer' : 'Management'} · People Fitness</Text></View>
            <ProfileButton name={actorName} />
          </View>
          <KeyboardAvoidingView style={styles.safeArea} behavior="padding">
          <ScrollView style={styles.onboardScroll} contentContainerStyle={styles.onboardContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.photoCard}>
              <View style={[styles.photoCircle, (memberPhotoUri || usingSamplePhoto) && styles.photoCircleFilled]}>
                {memberPhotoUri ? <Image source={{ uri: memberPhotoUri }} style={styles.memberPhotoPreview} accessibilityLabel="Member photo preview" /> : usingSamplePhoto ? <View style={styles.samplePhotoPreview}><View style={styles.samplePhotoHead} /><View style={styles.samplePhotoBody} /><Text style={styles.samplePhotoLabel}>SAMPLE</Text></View> : <Feather name="camera" size={26} color="#6E7785" />}
              </View>
              <View style={styles.photoRight}>
                <Text style={styles.photoLabel}>Member photo</Text>
                <Text style={styles.photoCopy}>{memberPhotoUri || usingSamplePhoto ? 'Photo added. It will show on the member card.' : 'Take a clear photo of the member’s face for their card and check-ins.'}</Text>
                {memberPhotoUri || usingSamplePhoto ? <View style={styles.photoButtonRow}><Pressable style={styles.takePhotoButton} onPress={takePhoto}><Feather name="camera" size={14} color="#F3F5F7" /><Text style={styles.takePhotoText}>Retake</Text></Pressable><Pressable style={styles.sampleButton} onPress={removePhoto}><Text style={styles.sampleButtonText}>Remove</Text></Pressable></View> : <View style={styles.photoButtonRow}><Pressable style={styles.takePhotoButton} onPress={takePhoto}><Feather name="camera" size={14} color="#F3F5F7" /><Text style={styles.takePhotoText}>Take photo</Text></Pressable><Pressable style={styles.sampleButton} onPress={useSamplePhoto}><Text style={styles.sampleButtonText}>Use sample</Text></Pressable></View>}
                {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
              </View>
            </View>
            <Text style={styles.formLabel}>Full name</Text>
            <TextInput value={fullName} onChangeText={setFullName} placeholder="e.g. Sana Mirza" placeholderTextColor="#8D95A1" style={styles.formInput} />
            <Text style={styles.formLabel}>WhatsApp number</Text>
            <View style={styles.whatsappRow}><View style={styles.countryCode}><Text style={styles.countryCodeText}>+91</Text></View><TextInput value={whatsappNumber} onChangeText={(value) => setWhatsappNumber(value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" placeholderTextColor="#8D95A1" keyboardType="phone-pad" style={styles.phoneFormInput} /></View>
            <Text style={styles.formLabel}>Membership plan</Text>
            {loadingPlans ? <ActivityIndicator color="#ECEEF1" style={styles.planLoading} /> : <View style={styles.planGrid}>{membershipPlans.map((item) => <Pressable key={item.id} onPress={() => { setMembershipPlanId(item.id); setEditingMembershipPrice(false); setMembershipPriceInput(''); }} style={[styles.planCard, membershipPlanId === item.id && styles.planCardSelected]}><Text style={styles.planName}>{item.name}</Text><Text style={styles.planAmount}>{currency(item.amount)}</Text><Text style={styles.planDuration}>{planValidityText(item)}</Text></Pressable>)}</View>}
            {selectedPlan ? <View><Pressable accessibilityRole="button" onPress={() => { if (editingMembershipPrice) { setEditingMembershipPrice(false); setMembershipPriceInput(''); } else { setMembershipPriceInput(String(selectedPlan.amount)); setEditingMembershipPrice(true); } }}><Text style={styles.changeNumberText}>{editingMembershipPrice ? 'Use standard plan price' : 'Edit price for this member'}</Text></Pressable>{editingMembershipPrice ? <><Text style={styles.formLabel}>Membership price for this member (₹)</Text><TextInput value={membershipPriceInput} onChangeText={setMembershipPriceInput} keyboardType="decimal-pad" style={styles.formInput} accessibilityLabel="Membership price for this member" /><Text style={styles.fieldNote}>The standard plan price remains unchanged.</Text></> : null}</View> : null}
            <Pressable style={[styles.personalTrainingRow, personalTraining && styles.personalTrainingRowOpen]} onPress={() => { setPersonalTraining(!personalTraining); setEditingTrainingPrice(false); setTrainingPriceInput(''); }} accessibilityRole="switch" accessibilityState={{ checked: personalTraining }}>
              <View style={styles.trainingSwitch}><View style={[styles.trainingSwitchThumb, personalTraining && styles.trainingSwitchThumbActive]} /></View>
              <View style={styles.personalTrainingCopy}><Text style={styles.personalTrainingTitle}>Add personal training</Text><Text style={styles.personalTrainingDetail}>One-on-one sessions with the trainer, paid along with the plan</Text></View>
            </Pressable>
            {personalTraining ? <>
              <View style={styles.personalTrainingPlanPanel}>
                <Text style={styles.personalTrainingPlanLabel}>Personal training plan</Text>
                <View style={styles.planGrid}>
                  {eligiblePersonalTrainingPlans.map((item) => <Pressable key={item.id} onPress={() => { setPersonalTrainingPlanId(item.id); setEditingTrainingPrice(false); setTrainingPriceInput(''); }} style={[styles.planCard, styles.personalTrainingPlanCard, personalTrainingPlanId === item.id && styles.planCardSelected]}><Text style={styles.planName}>{item.name}</Text><Text style={styles.planAmount}>{currency(item.amount)}</Text><Text style={styles.planDuration}>{planValidityText(item)}</Text></Pressable>)}
                  {eligiblePersonalTrainingPlans.length === 0 ? <Text style={styles.fieldNote}>No personal-training plans fit this membership duration.</Text> : null}
                </View>
                {selectedPersonalTrainingPlan ? <View><Pressable accessibilityRole="button" onPress={() => { if (editingTrainingPrice) { setEditingTrainingPrice(false); setTrainingPriceInput(''); } else { setTrainingPriceInput(String(selectedPersonalTrainingPlan.amount)); setEditingTrainingPrice(true); } }}><Text style={styles.changeNumberText}>{editingTrainingPrice ? 'Use standard personal-training price' : 'Edit personal-training price for this member'}</Text></Pressable>{editingTrainingPrice ? <><Text style={styles.formLabel}>Personal-training price for this member (₹)</Text><TextInput value={trainingPriceInput} onChangeText={setTrainingPriceInput} keyboardType="decimal-pad" style={styles.formInput} accessibilityLabel="Personal-training price for this member" /><Text style={styles.fieldNote}>The standard personal-training plan price remains unchanged.</Text></> : null}</View> : null}
              </View>
            </> : null}
            <View style={styles.paymentSummary}>
              <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Membership · {selectedPlan?.name}</Text><Text style={styles.summaryValue}>{selectedPlan ? currency(membershipPrice) : ''}</Text></View>
              {personalTraining ? <View style={styles.summaryLine}><Text style={styles.summaryLabel}>Personal training · {selectedPersonalTrainingPlan?.name}</Text><Text style={styles.summaryValue}>{selectedPersonalTrainingPlan ? currency(trainingPrice) : ''}</Text></View> : null}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryLine}><Text style={styles.firstPayment}>First payment</Text><Text style={styles.firstPaymentAmount}>{currency(firstPayment)}</Text></View>
            </View>
            <View style={styles.twoColumnRow}>
              <View style={styles.columnField}><Text style={styles.formLabel}>Start date</Text><FutureDatePicker value={startDate} onChange={setStartDate} /></View>
              <View style={styles.columnField}><Text style={styles.formLabel}>End date (optional)</Text><FutureDatePicker value={endDate} onChange={setEndDate} />{endDate ? <Pressable onPress={() => setEndDate('')} accessibilityRole="button"><Text style={styles.changeNumberText}>Clear end date</Text></Pressable> : null}</View>
            </View>
            <View style={styles.twoColumnRow}>
              <View style={styles.columnField}><Text style={styles.formLabel}>Trainer</Text>
                <Pressable disabled={actorRole === 'TRAINER'} style={[styles.dateField, actorRole === 'TRAINER' && styles.disabledButton]} onPress={() => setTrainerListOpen(!trainerListOpen)}><Text style={styles.dateFieldText}>{selectedTrainer?.name ?? 'Select trainer'}{actorRole === 'TRAINER' ? ' (you)' : ''}</Text><Text style={styles.inputSuffix}>{actorRole === 'TRAINER' ? '' : '⌄'}</Text></Pressable>
                {trainerListOpen && actorRole !== 'TRAINER' ? <View style={styles.trainerList}>{trainers.map((item) => <Pressable key={item.id} style={[styles.trainerOption, trainerId === item.id && styles.trainerOptionSelected]} onPress={() => { setTrainerId(item.id); setTrainerListOpen(false); }}><Text style={styles.trainerOptionText}>{item.name}</Text>{item.mobileNumber ? <Text style={styles.trainerOptionMobile}>{item.mobileNumber}</Text> : null}</Pressable>)}</View> : null}
              </View>
            </View>
            <Pressable style={styles.moreDetailsHeader} onPress={() => setMoreDetailsOpen(!moreDetailsOpen)} accessibilityState={{ expanded: moreDetailsOpen }}>
              <View><View style={styles.moreDetailsTitleRow}><Text style={styles.moreDetailsTitle}>More details</Text><Text style={styles.optionalBadge}>OPTIONAL</Text></View><Text style={styles.moreDetailsSubtitle}>Email, address, emergency contact</Text></View>
              <Text style={styles.detailsChevron}>{moreDetailsOpen ? '⌃' : '›'}</Text>
            </Pressable>
            {moreDetailsOpen ? <View style={styles.moreDetailsBody}>
              <Text style={styles.formLabel}>Email address</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor="#8D95A1" keyboardType="email-address" autoCapitalize="none" style={styles.formInput} />
              <Text style={styles.sectionLabel}>ADDRESS</Text>
              <Text style={styles.formLabel}>Flat / house no.</Text>
              <TextInput value={flatHouseNumber} onChangeText={setFlatHouseNumber} placeholder="e.g. B-304" placeholderTextColor="#8D95A1" style={styles.formInput} />
              <Text style={styles.formLabel}>Apartment / building</Text>
              <TextInput value={apartmentBuilding} onChangeText={setApartmentBuilding} placeholder="e.g. Green Meadows Apartments" placeholderTextColor="#8D95A1" style={styles.formInput} />
              <Text style={styles.formLabel}>Street / area</Text>
              <TextInput value={streetArea} onChangeText={setStreetArea} placeholder="e.g. Road No. 12, Banjara Hills" placeholderTextColor="#8D95A1" style={styles.formInput} />
              <View style={styles.twoColumnRow}>
                <View style={styles.columnField}><Text style={styles.formLabel}>City</Text><TextInput value={city} onChangeText={setCity} placeholder="e.g. Hyderabad" placeholderTextColor="#8D95A1" style={styles.formInput} /></View>
                <View style={styles.columnField}><Text style={styles.formLabel}>PIN code</Text><TextInput value={pinCode} onChangeText={(value) => setPinCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" placeholderTextColor="#8D95A1" keyboardType="number-pad" style={styles.formInput} /></View>
              </View>
              <Text style={styles.sectionLabel}>EMERGENCY CONTACT</Text>
              <View style={styles.twoColumnRow}>
                <View style={styles.columnField}><Text style={styles.formLabel}>Name</Text><TextInput value={emergencyContactName} onChangeText={setEmergencyContactName} placeholder="e.g. Ayesha Mirza" placeholderTextColor="#8D95A1" style={styles.formInput} /></View>
                <View style={styles.columnField}><Text style={styles.formLabel}>Mobile</Text><TextInput value={emergencyContactMobile} onChangeText={(value) => setEmergencyContactMobile(value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits" placeholderTextColor="#8D95A1" keyboardType="phone-pad" style={styles.formInput} /></View>
              </View>
            </View> : null}
            <View style={styles.onboardingFooter}>
              <Pressable disabled style={[styles.welcomeMessageRow, styles.disabledButton]} accessibilityRole="switch" accessibilityState={{ checked: false, disabled: true }}>
                <View style={[styles.welcomeToggle, !sendWelcomeMessage && styles.welcomeToggleInactive]}><View style={[styles.welcomeToggleThumb, !sendWelcomeMessage && styles.welcomeToggleThumbInactive]} /></View>
                <Text style={styles.welcomeMessageText}>Send WhatsApp welcome message · unavailable</Text>
              </Pressable>
              <AlertBanner message={formError} />
              <AlertBanner message={successMessage} variant="success" />
              <Pressable style={[styles.completeOnboardButton, { backgroundColor: roleTheme.primary }, saving && styles.disabledButton]} onPress={addMember} disabled={saving}>
                {saving ? <ActivityIndicator color={roleTheme.onPrimary} /> : <Text style={[styles.primaryButtonText, { color: roleTheme.onPrimary }]}>Add member</Text>}
              </Pressable>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
          <BottomNavigation managementId={managementId} active="members" onHomePress={onHome} onMembersPress={onBack} onCollectPress={onCollect} onPaymentsPress={onPayments} onRemindersPress={onReminders} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const dashboardStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115' },
  dashboardBgImage: { resizeMode: 'cover', opacity: 0.75 },
  dashboardBgScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 17, 21, 0.62)' },
  membersPhoneFrame: { flex: 1, width: '100%', backgroundColor: '#0F1115' },
  homeContent: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 18, paddingBottom: 32 },
  homeGreeting: { color: '#F3F5F7', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  membersSubtitle: { color: '#9BA3B0', fontSize: 14, marginTop: 2 },
  homeDate: { color: '#9BA3B0', fontSize: 14, fontWeight: '600', marginVertical: 14 },
  profileCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFC83A', alignItems: 'center', justifyContent: 'center' },
  profileInitial: { color: '#1A1400', fontWeight: '900', fontSize: 17 },
  homeTiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  homeTile: { width: '48.5%', minHeight: 106, borderWidth: 1, borderColor: '#2A313D', borderRadius: 16, backgroundColor: '#181C22', padding: 14, justifyContent: 'space-between' },
  homeTileLabel: { color: '#9BA3B0', fontSize: 13, fontWeight: '600' },
  homeTileValue: { color: '#F3F5F7', fontSize: 30, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
  homeTileSub: { color: '#6E7785', fontSize: 13, marginTop: 2 },
  homePaymentSplit: { color: '#6E7785', fontSize: 12, marginTop: 5 },
  homeTileValueWarning: { color: '#FBBF24' },
  homeTileValueOverdue: { color: '#F87171' },
  homeSectionTitle: { color: '#9BA3B0', fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  homeLink: { color: '#FFC83A', fontSize: 14, fontWeight: '700' },
  homeActionList: { backgroundColor: '#181C22', borderWidth: 1, borderColor: '#2A313D', borderRadius: 16, overflow: 'hidden' },
  homeAction: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#242A35' },
  homeActionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255, 200, 58, 0.14)', borderWidth: 1, borderColor: 'rgba(255, 200, 58, 0.25)', alignItems: 'center', justifyContent: 'center' },
  homeActionGlyph: { color: '#FFC83A', fontSize: 21, fontWeight: '800' },
  homeActionTitle: { color: '#F3F5F7', fontSize: 16, fontWeight: '700' },
  homeActionDescription: { color: '#9BA3B0', fontSize: 13, lineHeight: 18, marginTop: 2 },
  followUpTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2A313D', marginBottom: 12 },
  followUpTab: { flex: 1, flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingVertical: 13, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  followUpTabSelected: { borderBottomColor: '#FFC83A' },
  followUpTabText: { color: '#6E7785', fontSize: 14, fontWeight: '700' },
  followUpTabTextSelected: { color: '#F3F5F7' },
  dueBadge: { borderRadius: 20, backgroundColor: 'rgba(251, 191, 36, 0.14)', paddingHorizontal: 8, paddingVertical: 2 },
  dueBadgeText: { color: '#FBBF24', fontSize: 12, fontWeight: '800' },
  overBadge: { borderRadius: 20, backgroundColor: 'rgba(248, 113, 113, 0.14)', paddingHorizontal: 8, paddingVertical: 2 },
  overBadgeText: { color: '#F87171', fontSize: 12, fontWeight: '800' },
  homeFollowList: { backgroundColor: '#181C22', borderRadius: 16, borderWidth: 1, borderColor: '#2A313D', overflow: 'hidden' },
  homeFollowRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#242A35' },
  memberName: { color: '#F3F5F7', fontSize: 16, fontWeight: '700' },
  memberDetail: { color: '#9BA3B0', fontSize: 13, marginTop: 3 },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  memberAvatarText: { color: '#F3F5F7', fontSize: 13, fontWeight: '800' },
  dashboardNav: { flexDirection: 'row', backgroundColor: '#161920', borderTopWidth: 1, borderTopColor: '#2A313D', paddingTop: 8 },
  dashboardNavItem: { flex: 1, alignItems: 'center' },
  dashboardNavIcon: { width: 52, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dashboardNavActive: { backgroundColor: 'rgba(255, 200, 58, 0.16)' },
  dashboardRupee: { color: '#8D95A1', fontSize: 22 },
  dashboardNavBadge: { position: 'absolute', top: -2, right: 4, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  dashboardNavBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', paddingHorizontal: 4 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1115' },
  dashboardBgImage: { resizeMode: 'cover', opacity: 0.75 },
  dashboardBgScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 17, 21, 0.62)' },
  safeArea: { flex: 1 },
  rolePicker: { flex: 1, backgroundColor: '#0F1115' },
  roleHero: { minHeight: 248, padding: 24, justifyContent: 'space-between', overflow: 'hidden' },
  roleKicker: { color: '#FFC83A', fontSize: 12, letterSpacing: 2.2, fontWeight: '800', marginTop: 14 },
  roleHeading: { color: '#FFFFFF', fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  roleDescription: { color: '#D0D6E0', fontSize: 14, lineHeight: 20, maxWidth: 320, marginTop: 6 },
  roleBody: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 18, backgroundColor: '#0F1115' },
  roleBodyScroll: { flexGrow: 1 },
  roleTitle: { color: '#F3F5F7', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  roleSubtitle: { color: '#9BA3B0', fontSize: 14, marginTop: 4, marginBottom: 18 },
  roleCard: { minHeight: 84, borderWidth: 1, borderColor: '#2A313D', borderRadius: 16, backgroundColor: '#181C22', flexDirection: 'row', alignItems: 'center', padding: 15, gap: 14, marginBottom: 12 },
  roleIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255, 200, 58, 0.14)', borderWidth: 1, borderColor: 'rgba(255, 200, 58, 0.25)', alignItems: 'center', justifyContent: 'center' },
  roleIconText: { color: '#FFC83A', fontSize: 22, fontWeight: '800' },
  roleCopy: { flex: 1 },
  roleCardTitle: { color: '#F3F5F7', fontSize: 17, fontWeight: '800' },
  rolePeople: { color: '#FFC83A', fontSize: 13, fontWeight: '700', marginTop: 2 },
  roleCardDetail: { color: '#9BA3B0', fontSize: 13, marginTop: 3 },
  memberNavItem: { flex: 1, alignItems: 'center', position: 'relative', minWidth: 0 },
  memberNavActiveIcon: { backgroundColor: 'rgba(255, 200, 58, 0.16)' },
  memberNavIcon: { color: '#9BA3B0', fontSize: 22, lineHeight: 26, height: 26 },
  memberCard: { borderRadius: 18, backgroundColor: '#181C22', borderWidth: 1, borderColor: '#2A313D', overflow: 'hidden', marginTop: 2 },
  memberCardTape: { height: 7, backgroundColor: '#FFC83A' },
  memberCardInside: { padding: 18 },
  memberCardGym: { color: '#9BA3B0', fontSize: 12, letterSpacing: 1.5, fontWeight: '800' },
  memberCardPerson: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  memberCardPhoto: { width: 44, height: 44, borderRadius: 22, resizeMode: 'cover' },
  memberCardName: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', flex: 1 },
  memberCardGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 18 },
  memberCardLabel: { color: '#6E7785', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  memberCardValue: { color: '#F3F5F7', fontSize: 14, fontWeight: '800', marginTop: 4, maxWidth: 88 },
  memberProgress: { height: 6, borderRadius: 3, backgroundColor: '#2A313D', marginTop: 18, overflow: 'hidden' },
  memberProgressFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFC83A' },
  memberCardNote: { color: '#9BA3B0', fontSize: 13, marginTop: 8 },
  memberAlert: { marginTop: 15, borderRadius: 14, backgroundColor: 'rgba(255, 200, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 200, 58, 0.28)', padding: 14 },
  memberAlertTitle: { color: '#F3F5F7', fontSize: 16, fontWeight: '800' },
  memberAlertCopy: { color: '#9BA3B0', fontSize: 14, lineHeight: 20, marginTop: 4 },
  darkSmallButton: { alignSelf: 'flex-start', marginTop: 10, minHeight: 34, paddingHorizontal: 14, borderRadius: 9, justifyContent: 'center', backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E' },
  darkSmallButtonText: { color: '#F3F5F7', fontSize: 13, fontWeight: '700' },
  memberQuickList: { borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  renewPlanCard: { borderRadius: 16, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', padding: 16, marginTop: 2 },
  renewPlanName: { color: '#F3F5F7', fontSize: 22, fontWeight: '900', marginTop: 5 },
  renewPlanAmount: { color: '#FFC83A', fontSize: 28, fontWeight: '900', marginTop: 6 },
  upiCard: { borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 8 },
  sampleQr: { width: 72, height: 72, borderRadius: 10, borderWidth: 4, borderColor: '#2A313D', backgroundColor: '#12151B', alignItems: 'center', justifyContent: 'center' },
  sampleQrText: { color: '#F3F5F7', fontSize: 13, fontWeight: '900' },
  stepsCard: { borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', gap: 8, padding: 14, marginTop: 8 },
  memberUpdatesToggle: { minHeight: 73, borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 2 },
  messageChat: { backgroundColor: 'rgba(52, 211, 153, 0.1)', borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.25)', borderRadius: 14, padding: 12, gap: 8, marginTop: 18 },
  messageBubble: { alignSelf: 'flex-start', maxWidth: '94%', backgroundColor: '#181C22', borderRadius: 12, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  messageKind: { color: '#34D399', fontSize: 11, letterSpacing: 0.8, fontWeight: '900' },
  messageText: { color: '#F3F5F7', fontSize: 15, lineHeight: 21, marginTop: 3 },
  messageDate: { color: '#6E7785', fontSize: 12, alignSelf: 'flex-end', marginTop: 4 },
  scrollContent: { flexGrow: 1, alignItems: 'stretch' },
  phoneFrame: { flex: 1, width: '100%', overflow: 'hidden', backgroundColor: '#0F1115' },
  hero: { height: 244, overflow: 'hidden', backgroundColor: '#0F1115', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 32, justifyContent: 'space-between' },
  heroPhoto: { resizeMode: 'cover', opacity: 1 },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(9, 11, 15, 0.54)' },
  heroBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, backgroundColor: 'rgba(15, 17, 21, 0.55)' },
  statusRow: { height: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 4 },
  statusTime: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  statusIcons: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusSignal: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  heroTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  heroTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(15, 17, 21, 0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  logoMark: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  taglinePill: { backgroundColor: 'rgba(15, 17, 21, 0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagline: { color: '#F3F5F7', fontSize: 11, letterSpacing: 1.6, fontWeight: '800' },
  heroCopy: { paddingBottom: 4 },
  welcome: { color: '#FFC83A', fontSize: 12, fontWeight: '900', letterSpacing: 2.1, marginBottom: 4 },
  brandName: { color: '#FFFFFF', fontSize: 36, lineHeight: 40, letterSpacing: -1, fontWeight: '900' },
  brandMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rolePill: { backgroundColor: 'rgba(255, 200, 58, 0.18)', borderWidth: 1, borderColor: 'rgba(255, 200, 58, 0.45)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  rolePillText: { color: '#FFC83A', fontSize: 12, fontWeight: '800' },
  brandDetail: { color: '#D0D6E0', fontSize: 13, fontWeight: '600' },
  loginCard: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', marginTop: -22, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, borderColor: '#262C36', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 36, backgroundColor: '#0F1115' },
  backPillButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#181C22', borderWidth: 1, borderColor: '#2A313D', marginBottom: 20 },
  backPillText: { color: '#9BA3B0', fontSize: 13, fontWeight: '700' },
  cardTitle: { color: '#F3F5F7', fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  cardSubtitle: { color: '#9BA3B0', fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 24 },
  label: { color: '#D0D6E0', fontSize: 13, fontWeight: '700', letterSpacing: 0.3, marginBottom: 8 },
  mobileInputRow: { height: 54, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#2A313D', borderRadius: 14, backgroundColor: '#161A21' },
  countryCode: { justifyContent: 'center', alignItems: 'center', width: 54, borderRightWidth: 1, borderRightColor: '#2A313D', backgroundColor: '#181C22' },
  countryCodeText: { color: '#F3F5F7', fontSize: 15, fontWeight: '700' },
  mobileInput: { flex: 1, color: '#F3F5F7', fontSize: 17, fontWeight: '600', paddingHorizontal: 14 },
  hint: { color: '#6E7785', fontSize: 13, lineHeight: 19, marginTop: 10 },
  error: { color: '#F87171', fontSize: 14, lineHeight: 20, marginTop: 12, fontWeight: '600' },
  alertBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  alertBannerError: { backgroundColor: 'rgba(248, 113, 113, 0.12)', borderColor: 'rgba(248, 113, 113, 0.35)' },
  alertBannerSuccess: { backgroundColor: 'rgba(52, 211, 153, 0.12)', borderColor: 'rgba(52, 211, 153, 0.35)' },
  alertBannerInfo: { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.35)' },
  alertBannerIcon: { marginTop: 2 },
  alertBannerText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  primaryButton: { height: 54, borderRadius: 14, backgroundColor: '#FFC83A', justifyContent: 'center', alignItems: 'center', marginTop: 24, shadowColor: '#FFC83A', shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: { color: '#1A1400', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  credentialInput: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#161A21', color: '#F3F5F7', fontSize: 17, paddingHorizontal: 14 },
  otpInput: { letterSpacing: 8, textAlign: 'center', fontWeight: '800', fontSize: 20 },
  changeNumberButton: { alignSelf: 'center', paddingVertical: 14 },
  changeNumberText: { color: '#9BA3B0', fontSize: 14, fontWeight: '700' },
  successContent: { alignItems: 'center', paddingVertical: 38 },
  successBadge: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(52, 211, 153, 0.15)', borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.35)', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  successIcon: { color: '#34D399', fontSize: 30, fontWeight: '900' },
  secondaryButton: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22' },
  secondaryButtonText: { color: '#F3F5F7', fontSize: 15, fontWeight: '700' },
  poweredByFooter: { marginTop: 'auto', paddingTop: 20, paddingBottom: 8, alignItems: 'center' },
  poweredByText: { color: '#6E7785', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  poweredByBrand: { color: '#9BA3B0', fontWeight: '700' },
  membersPhoneFrame: { flex: 1, width: '100%', backgroundColor: '#0F1115' },
  appStatusRow: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, backgroundColor: '#181C22' },
  appStatusTime: { color: '#F3F5F7', fontSize: 14, fontWeight: '800' },
  appStatusIcons: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  appStatusSignal: { color: '#F3F5F7', fontSize: 13, fontWeight: '800' },
  lightText: { color: '#FFFFFF' },
  membersContent: { flex: 1, width: '100%', maxWidth: 920, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 16 },
  screenHeader: { width: '100%', maxWidth: 920, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  homeScroll: { flex: 1 },
  homeContent: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 100 },
  homeGreeting: { color: '#F3F5F7', fontSize: 26, letterSpacing: -0.6, fontWeight: '900' },
  homeDate: { color: '#9BA3B0', fontSize: 14, marginTop: -5, marginBottom: 16 },
  homeTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  homeTile: { width: '48.5%', minHeight: 104, borderWidth: 1, borderColor: '#2A313D', borderRadius: 16, backgroundColor: '#181C22', padding: 14, justifyContent: 'space-between' },
  homeTileLabel: { color: '#9BA3B0', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  homeTileValue: { color: '#F3F5F7', fontSize: 28, lineHeight: 33, fontWeight: '900', marginTop: 6 },
  homeTileValueWarning: { color: '#FBBF24' },
  homeTileValueOverdue: { color: '#F87171' },
  homeTileSub: { color: '#6E7785', fontSize: 13, marginTop: 4 },
  homeSection: { marginTop: 22 },
  homeSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  homeSectionTitle: { color: '#9BA3B0', fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  homeLink: { color: '#FFC83A', fontSize: 14, fontWeight: '700' },
  homeActionList: { borderWidth: 1, borderColor: '#2A313D', borderRadius: 16, backgroundColor: '#181C22', overflow: 'hidden' },
  homeAction: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#242A35' },
  homeActionIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(255, 200, 58, 0.14)', borderWidth: 1, borderColor: 'rgba(255, 200, 58, 0.25)', alignItems: 'center', justifyContent: 'center' },
  homeActionGlyph: { color: '#FFC83A', fontSize: 21, fontWeight: '800' },
  homeActionCopy: { flex: 1 },
  homeActionTitle: { color: '#F3F5F7', fontSize: 16, fontWeight: '700' },
  homeActionDescription: { color: '#9BA3B0', fontSize: 13, lineHeight: 18, marginTop: 2 },
  homeActionArrow: { color: '#6E7785', fontSize: 26, lineHeight: 28 },
  followUpTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2A313D' },
  followUpTab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  followUpTabSelected: { borderBottomColor: '#FFC83A' },
  followUpTabText: { color: '#6E7785', fontSize: 14, fontWeight: '700' },
  followUpTabTextSelected: { color: '#F3F5F7' },
  followUpCount: { color: '#9BA3B0', fontWeight: '900' },
  homeEmpty: { minHeight: 80, borderWidth: 1, borderColor: '#2A313D', borderTopWidth: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: '#181C22', alignItems: 'center', justifyContent: 'center' },
  homeFollowList: { borderWidth: 1, borderColor: '#2A313D', borderTopWidth: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: '#181C22', overflow: 'hidden' },
  homeFollowRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#242A35' },
  homeFollowArrow: { color: '#6E7785', fontSize: 26, marginLeft: 8 },
  broadcastCard: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', padding: 14 },
  broadcastLabel: { color: '#9BA3B0', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  broadcastInput: { minHeight: 76, borderRadius: 12, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#12151B', color: '#F3F5F7', fontSize: 15, paddingHorizontal: 12, paddingTop: 11, textAlignVertical: 'top' },
  broadcastButton: { height: 42, borderRadius: 10, backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E', justifyContent: 'center', alignItems: 'center', marginTop: 11 },
  broadcastButtonText: { color: '#F3F5F7', fontSize: 14, fontWeight: '700' },
  broadcastHelp: { color: '#6E7785', fontSize: 13, lineHeight: 19, marginTop: 8 },
  paymentsScroll: { flex: 1 },
  paymentsContent: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingHorizontal: 18, paddingBottom: 100 },
  paymentFilterRow: { flexDirection: 'row', gap: 8, marginTop: -2, marginBottom: 16 },
  paymentFilterChip: { height: 35, borderRadius: 18, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', paddingHorizontal: 14, justifyContent: 'center' },
  paymentFilterChipSelected: { borderColor: '#FFC83A', backgroundColor: 'rgba(255, 200, 58, 0.16)' },
  paymentFilterChipText: { color: '#9BA3B0', fontSize: 13, fontWeight: '700' },
  paymentFilterChipTextSelected: { color: '#FFC83A' },
  paymentTotalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  paymentTotalLabel: { color: '#9BA3B0', fontSize: 14, fontWeight: '600' },
  paymentTotalValue: { color: '#F3F5F7', fontSize: 20, fontWeight: '900' },
  reminderSummary: { minHeight: 91, borderRadius: 16, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 2 },
  reminderNumber: { color: '#F3F5F7', fontSize: 28, lineHeight: 32, fontWeight: '900' },
  reminderCopy: { color: '#9BA3B0', fontSize: 14, marginTop: 2 },
  reminderSendButton: { height: 38, borderRadius: 10, backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E', justifyContent: 'center', paddingHorizontal: 14 },
  reminderSendText: { color: '#F3F5F7', fontSize: 13, fontWeight: '700' },
  reminderConfirmation: { color: '#34D399', fontSize: 14, fontWeight: '700', marginTop: 8 },
  singleReminderButton: { height: 32, borderRadius: 8, backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E', justifyContent: 'center', paddingHorizontal: 12, marginLeft: 8 },
  singleReminderText: { color: '#F3F5F7', fontSize: 12, fontWeight: '700' },
  reminderSettings: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', paddingHorizontal: 14, paddingVertical: 4 },
  reminderToggleRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#242A35', gap: 11 },
  reminderToggleLabel: { color: '#F3F5F7', fontSize: 15, flex: 1 },
  reminderHelp: { color: '#6E7785', fontSize: 13, lineHeight: 19, paddingTop: 11, paddingBottom: 7 },
  membersTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  membersTitle: { color: '#F3F5F7', fontSize: 26, letterSpacing: -0.6, fontWeight: '900' },
  membersSubtitle: { color: '#9BA3B0', fontSize: 14, marginTop: 2 },
  profileCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFC83A' },
  profileInitial: { color: '#1A1400', fontSize: 16, fontWeight: '900' },
  searchBox: { height: 48, borderWidth: 1, borderColor: '#2A313D', borderRadius: 14, backgroundColor: '#161A21', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  searchIcon: { color: '#6E7785', fontSize: 24, lineHeight: 26 },
  searchHint: { color: '#6E7785', fontSize: 15 },
  membersSearchInput: { flex: 1, height: 48, color: '#F3F5F7', fontSize: 15, padding: 0 },
  membersFilterBar: { flexGrow: 0, flexShrink: 0 },
  filterRow: { gap: 8, paddingVertical: 14, paddingRight: 16 },
  filterChip: { height: 35, borderRadius: 18, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  filterChipSelected: { backgroundColor: 'rgba(255, 200, 58, 0.16)', borderColor: '#FFC83A' },
  filterText: { color: '#9BA3B0', fontSize: 13, fontWeight: '700' },
  filterTextSelected: { color: '#FFC83A' },
  membersList: { flex: 1, marginHorizontal: -1 },
  membersListContent: { flexGrow: 0, justifyContent: 'flex-start', paddingTop: 2, paddingBottom: 105 },
  memberRows: { width: '100%', alignSelf: 'flex-start' },
  memberRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', backgroundColor: '#181C22', borderWidth: 1, borderColor: '#2A313D', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 8 },
  memberSheetModal: { flex: 1, justifyContent: 'flex-end' },
  memberSheetBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(5, 7, 10, 0.65)' },
  memberSheet: { width: '100%', maxWidth: 720, maxHeight: '90%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', paddingHorizontal: 18, paddingBottom: 24, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, elevation: 16 },
  sheetHandle: { width: 40, height: 4, borderRadius: 3, backgroundColor: '#3A4250', alignSelf: 'center', marginVertical: 10 },
  memberSheetLoading: { marginVertical: 44 },
  memberSheetContent: { paddingBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sheetAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  sheetMemberCopy: { flex: 1 },
  sheetMemberName: { color: '#F3F5F7', fontSize: 20, fontWeight: '900' },
  sheetMemberPhone: { color: '#9BA3B0', fontSize: 14, marginTop: 3 },
  sheetCloseButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E', alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { color: '#F3F5F7', fontSize: 22, fontWeight: '400', lineHeight: 24 },
  sheetStatus: { alignSelf: 'flex-start', marginBottom: 0 },
  validityNote: { color: '#9BA3B0', fontSize: 13, marginLeft: 85, marginTop: -19, marginBottom: 13 },
  detailRows: { marginTop: 4 },
  detailRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  detailRowLabel: { color: '#9BA3B0', fontSize: 14, flex: 0.42 },
  detailRowValue: { color: '#F3F5F7', fontSize: 14, fontWeight: '700', lineHeight: 20, textAlign: 'right', flex: 0.58 },
  collectPaymentButton: { height: 50, borderRadius: 12, backgroundColor: '#FFC83A', marginTop: 16, alignItems: 'center', justifyContent: 'center' },
  collectPaymentText: { color: '#1A1400', fontSize: 16, fontWeight: '800' },
  sheetActionMessage: { color: '#9BA3B0', textAlign: 'center', fontSize: 13, marginTop: 8 },
  paymentHistorySection: { marginTop: 18 },
  paymentHistoryTitle: { color: '#9BA3B0', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  emptyPaymentHistory: { minHeight: 54, marginTop: 8, borderWidth: 1, borderColor: '#2A313D', borderRadius: 12, backgroundColor: '#12151B', alignItems: 'center', justifyContent: 'center' },
  emptyPaymentHistoryText: { color: '#6E7785', fontSize: 14 },
  paymentHistoryList: { marginTop: 8, borderWidth: 1, borderColor: '#2A313D', borderRadius: 14, backgroundColor: '#181C22', overflow: 'hidden' },
  paymentHistoryRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#242A35', gap: 11 },
  paymentModeBadge: { width: 44, height: 38, borderRadius: 10, backgroundColor: 'rgba(255, 200, 58, 0.14)', borderWidth: 1, borderColor: 'rgba(255, 200, 58, 0.3)', alignItems: 'center', justifyContent: 'center' },
  cashModeBadge: { backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E' },
  paymentModeText: { color: '#F3F5F7', fontSize: 11, fontWeight: '900' },
  paymentHistoryCopy: { flex: 1 },
  paymentHistoryName: { color: '#F3F5F7', fontSize: 15, fontWeight: '700' },
  paymentHistoryMeta: { color: '#9BA3B0', fontSize: 13, marginTop: 3 },
  paymentHistoryAmount: { alignItems: 'flex-end' },
  paymentHistoryAmountText: { color: '#F3F5F7', fontSize: 16, fontWeight: '900' },
  paymentScreenshotLabel: { color: '#FFC83A', fontSize: 12, fontWeight: '600', marginTop: 3 },
  collectScreen: { flex: 1, width: '100%', backgroundColor: '#0F1115' },
  selectField: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#161A21', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  selectFieldText: { flex: 1, color: '#F3F5F7', fontSize: 15, fontWeight: '600' },
  selectFieldPlaceholder: { color: '#6E7785' },
  selectFieldCaret: { color: '#9BA3B0', fontSize: 20, lineHeight: 22, marginTop: -2 },
  selectModalRoot: { flex: 1, justifyContent: 'flex-end' },
  selectModalSheet: { width: '100%', maxWidth: 720, height: '75%', maxHeight: '90%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', paddingHorizontal: 18, paddingBottom: 24, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, elevation: 18 },
  selectModalTitle: { color: '#F3F5F7', fontSize: 19, fontWeight: '800', marginBottom: 12 },
  selectModalOptions: { flex: 1, marginHorizontal: -18 },
  selectModalOptionsContent: { paddingBottom: 8 },
  selectGroupTitle: { color: '#9BA3B0', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 7, backgroundColor: '#14171D' },
  selectOption: { minHeight: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#242A35' },
  selectOptionSelected: { backgroundColor: 'rgba(255, 200, 58, 0.14)' },
  selectOptionText: { flex: 1, color: '#F3F5F7', fontSize: 15 },
  selectOptionTextSelected: { fontWeight: '800', color: '#FFC83A' },
  selectOptionCheck: { color: '#FFC83A', fontSize: 18, fontWeight: '900' },
  collectMemberHint: { color: '#9BA3B0', fontSize: 13, marginTop: 7 },
  collectEmptyState: { minHeight: 82, marginTop: 16, paddingHorizontal: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: '#2A313D', borderRadius: 14, backgroundColor: '#181C22', alignItems: 'center', justifyContent: 'center' },
  collectEmptyText: { color: '#9BA3B0', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  collectPickerTitle: { color: '#F3F5F7', fontSize: 21, fontWeight: '800', marginTop: 4 },
  collectPickerHint: { color: '#9BA3B0', fontSize: 14, marginTop: 5, marginBottom: 16 },
  collectMemberPicker: { borderWidth: 1, borderColor: '#2A313D', borderRadius: 14, overflow: 'hidden', backgroundColor: '#181C22' },
  collectMemberChoice: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#242A35' },
  collectMemberChoiceCopy: { flex: 1, minWidth: 0 },
  collectMemberCard: { minHeight: 68, borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10 },
  collectMemberName: { color: '#F3F5F7', fontSize: 16, fontWeight: '800' },
  collectMemberMeta: { color: '#9BA3B0', fontSize: 13, marginTop: 3 },
  trainingSwitchActive: { backgroundColor: '#FFC83A' },
  collectSummaryExtra: { marginTop: 9 },
  paymentModeRow: { height: 48, borderWidth: 1, borderColor: '#2A313D', borderRadius: 12, backgroundColor: '#161A21', flexDirection: 'row', padding: 4, gap: 4 },
  paymentModeButton: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  paymentModeButtonSelected: { backgroundColor: 'rgba(255, 200, 58, 0.16)', borderWidth: 1, borderColor: 'rgba(255, 200, 58, 0.4)' },
  paymentModeButtonText: { color: '#9BA3B0', fontSize: 14, fontWeight: '700' },
  paymentModeButtonTextSelected: { color: '#FFC83A', fontWeight: '800' },
  screenshotCard: { minHeight: 152, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#2A313D', backgroundColor: '#181C22', padding: 16, alignItems: 'center', justifyContent: 'center' },
  screenshotIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#252B36', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  screenshotIcon: { color: '#9BA3B0', fontSize: 28, lineHeight: 30, marginBottom: 6 },
  screenshotHint: { color: '#9BA3B0', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
  screenshotButtonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  attachScreenshotButton: { height: 36, paddingHorizontal: 14, borderRadius: 9, backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E', flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  attachScreenshotText: { color: '#F3F5F7', fontSize: 13, fontWeight: '700' },
  sampleScreenshotButton: { height: 36, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#161A21', justifyContent: 'center' },
  sampleScreenshotText: { color: '#9BA3B0', fontSize: 13, fontWeight: '700' },
  screenshotPreview: { width: 68, height: 68, borderRadius: 10, resizeMode: 'cover' },
  screenshotCopy: { alignItems: 'center', marginTop: 8 },
  screenshotAttachedText: { color: '#34D399', fontSize: 14, fontWeight: '800' },
  replaceScreenshotText: { color: '#9BA3B0', fontSize: 13, fontWeight: '700', marginTop: 4 },
  paymentValidity: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', marginTop: 18, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  paymentValidityLabel: { color: '#9BA3B0', fontSize: 12, fontWeight: '600' },
  paymentValidityValue: { color: '#F3F5F7', fontSize: 14, fontWeight: '800', marginTop: 3 },
  paymentSuccess: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 64 },
  paymentSuccessTitle: { color: '#F3F5F7', fontSize: 24, fontWeight: '900', marginBottom: 10 },
  paymentSuccessText: { color: '#9BA3B0', fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 3 },
  paymentDetailSheet: { width: '100%', maxWidth: 720, maxHeight: '82%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', paddingHorizontal: 18, paddingBottom: 24, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, elevation: 17 },
  accountSheet: { width: '100%', maxWidth: 720, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', paddingHorizontal: 18, paddingBottom: 24, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, elevation: 17 },
  accountAvatar: { backgroundColor: '#FFC83A', alignItems: 'center', justifyContent: 'center' },
  accountLogoutButton: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.35)', backgroundColor: 'rgba(248, 113, 113, 0.12)', justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  accountLogoutInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountLogoutText: { color: '#F87171', fontSize: 15, fontWeight: '800' },
  paymentDetailHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  paymentDetailMode: { color: '#9BA3B0', fontSize: 13, fontWeight: '700' },
  paymentDetailAmount: { color: '#F3F5F7', fontSize: 28, fontWeight: '900', marginTop: 3 },
  paymentDetailScreenshot: { marginTop: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2A313D', borderRadius: 12, overflow: 'hidden', backgroundColor: '#12151B' },
  paymentDetailScreenshotImage: { width: '100%', height: 310, resizeMode: 'contain' },
  paymentDetailScreenshotCaption: { color: '#9BA3B0', fontSize: 13, paddingVertical: 8 },
  cashPaymentNote: { color: '#9BA3B0', fontSize: 15, textAlign: 'center', marginTop: 18 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  memberAvatarText: { color: '#F3F5F7', fontSize: 13, fontWeight: '800' },
  memberAvatarImage: { width: '100%', height: '100%', borderRadius: 999, resizeMode: 'cover' },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { color: '#F3F5F7', fontSize: 16, fontWeight: '700' },
  memberDetail: { color: '#9BA3B0', fontSize: 13, marginTop: 3 },
  memberStatus: { minWidth: 68, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(52, 211, 153, 0.14)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  overdueStatus: { backgroundColor: 'rgba(248, 113, 113, 0.14)' },
  dueSoonStatus: { backgroundColor: 'rgba(251, 191, 36, 0.14)' },
  pendingStatus: { backgroundColor: '#252B36' },
  statusDot: { color: '#34D399', fontSize: 10 },
  overdueDot: { color: '#F87171' },
  dueSoonDot: { color: '#FBBF24' },
  pendingDot: { color: '#9BA3B0' },
  memberStatusText: { color: '#34D399', fontSize: 12, fontWeight: '800' },
  overdueStatusText: { color: '#F87171' },
  dueSoonStatusText: { color: '#FBBF24' },
  pendingStatusText: { color: '#9BA3B0' },
  memberLoading: { marginTop: 30 },
  emptyMembersText: { color: '#6E7785', textAlign: 'center', marginTop: 28, fontSize: 15 },
  onboardButton: { position: 'absolute', right: 16, bottom: 14, height: 50, borderRadius: 16, paddingHorizontal: 18, backgroundColor: '#FFC83A', flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  onboardPlus: { color: '#1A1400', fontSize: 22, fontWeight: '600' },
  onboardText: { color: '#1A1400', fontSize: 15, fontWeight: '800' },
  bottomNavigation: { height: 70, backgroundColor: '#161920', borderTopWidth: 1, borderTopColor: '#2A313D', flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8 },
  navItem: { flex: 1, alignItems: 'center', position: 'relative', minWidth: 0 },
  navIconWrap: { width: 50, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  navIcon: { color: '#8D95A1', fontSize: 22, lineHeight: 26, height: 26 },
  rupeeNavIcon: { color: '#8D95A1', fontSize: 20, lineHeight: 24, height: 24, fontWeight: '700' },
  navLabel: { color: '#6E7785', fontSize: 11, fontWeight: '600', marginTop: 3 },
  activeNavIcon: { backgroundColor: 'rgba(255, 200, 58, 0.16)' },
  activeNavGlyph: { color: '#FFC83A' },
  activeNavLabel: { color: '#F3F5F7', fontSize: 11, fontWeight: '800', marginTop: 3 },
  peopleNavIcon: { width: 25, height: 22, position: 'relative', marginTop: 4 },
  peopleNavHead: { position: 'absolute', width: 7, height: 7, borderRadius: 5, borderWidth: 1.6, left: 5, top: 0 },
  peopleNavHeadSmall: { position: 'absolute', width: 6, height: 6, borderRadius: 4, borderWidth: 1.4, right: 3, top: 2 },
  peopleNavBody: { position: 'absolute', width: 17, height: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderWidth: 1.6, borderBottomWidth: 0, left: 2, bottom: 0 },
  bellNavIcon: { width: 22, height: 29, position: 'relative', alignItems: 'center' },
  bellNavStem: { position: 'absolute', width: 5, height: 3, borderRadius: 2, backgroundColor: '#657183', top: 2 },
  bellNavBody: { position: 'absolute', width: 15, height: 16, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 1.6, borderColor: '#353C46', borderBottomWidth: 2, top: 5 },
  bellNavClapper: { position: 'absolute', width: 6, height: 3, borderRadius: 2, backgroundColor: '#657183', top: 22 },
  notificationBadge: { position: 'absolute', right: 2, top: -3, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#161920' },
  notificationText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  onboardHeader: { width: '100%', maxWidth: 920, alignSelf: 'center', minHeight: 64, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0F1115' },
  backIconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#181C22', borderWidth: 1, borderColor: '#2A313D', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#F3F5F7', fontSize: 32, fontWeight: '300', lineHeight: 34 },
  onboardHeading: { flex: 1 },
  onboardTitle: { color: '#F3F5F7', fontSize: 22, lineHeight: 26, fontWeight: '900' },
  onboardSubtitle: { color: '#9BA3B0', fontSize: 13, marginTop: 2 },
  onboardScroll: { flex: 1, borderTopWidth: 1, borderTopColor: '#222731' },
  onboardContent: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 16, paddingBottom: 32 },
  photoCard: { minHeight: 134, backgroundColor: '#181C22', borderWidth: 1, borderColor: '#2A313D', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoCircle: { width: 82, height: 82, borderRadius: 41, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#363F4E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#12151B' },
  photoCircleFilled: { borderStyle: 'solid', borderWidth: 2, borderColor: '#FFC83A' },
  cameraIcon: { color: '#6E7785', fontSize: 28 },
  photoRight: { flex: 1 },
  photoLabel: { color: '#F3F5F7', fontSize: 15, fontWeight: '800', marginBottom: 3 },
  photoCopy: { color: '#9BA3B0', fontSize: 13, lineHeight: 19, marginBottom: 10 },
  photoButtonRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  takePhotoButton: { alignSelf: 'flex-start', height: 34, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E', flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  takePhotoText: { color: '#F3F5F7', fontSize: 13, fontWeight: '700' },
  sampleButton: { alignSelf: 'flex-start', height: 34, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#161A21', justifyContent: 'center' },
  sampleButtonText: { color: '#9BA3B0', fontSize: 13, fontWeight: '700' },
  photoError: { color: '#F87171', fontSize: 13, lineHeight: 18, marginTop: 6 },
  memberPhotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  samplePhotoPreview: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: '#181C22', overflow: 'hidden' },
  samplePhotoHead: { position: 'absolute', top: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: '#8A98AA' },
  samplePhotoBody: { width: 67, height: 36, borderTopLeftRadius: 34, borderTopRightRadius: 34, backgroundColor: '#8A98AA' },
  samplePhotoLabel: { position: 'absolute', bottom: 4, color: '#FFC83A', fontSize: 10, letterSpacing: 1.5, fontWeight: '900' },
  formLabel: { color: '#D0D6E0', fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  staticInput: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#161A21', justifyContent: 'center', paddingHorizontal: 14 },
  formInput: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#161A21', color: '#F3F5F7', fontSize: 15, paddingHorizontal: 14 },
  phoneFormInput: { flex: 1, height: 48, color: '#F3F5F7', fontSize: 15, paddingHorizontal: 12 },
  dateField: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#161A21', justifyContent: 'center', paddingHorizontal: 14 },
  dateFieldText: { color: '#F3F5F7', fontSize: 15 },
  calendarPanel: { width: '100%', maxWidth: 300, marginTop: 6, borderWidth: 1, borderColor: '#2A313D', borderRadius: 14, backgroundColor: '#181C22', padding: 12 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calendarArrow: { color: '#F3F5F7', fontSize: 26, lineHeight: 28, paddingHorizontal: 6 },
  calendarArrowDisabled: { color: '#4B5563' },
  calendarMonth: { color: '#F3F5F7', fontSize: 15, fontWeight: '800' },
  calendarWeek: { flexDirection: 'row' },
  calendarWeekDay: { width: '14.285%', textAlign: 'center', color: '#6E7785', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  calendarDays: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  calendarDaySelected: { backgroundColor: '#FFC83A' },
  calendarDayText: { color: '#F3F5F7', fontSize: 13, fontWeight: '700' },
  calendarDayUnavailable: { color: '#4B5563' },
  calendarDayTextSelected: { color: '#1A1400', fontWeight: '900' },
  trainerList: { position: 'absolute', top: 54, left: 0, right: 0, borderWidth: 1, borderColor: '#2A313D', borderRadius: 12, backgroundColor: '#181C22', overflow: 'hidden', zIndex: 30, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12 },
  trainerOption: { minHeight: 42, paddingHorizontal: 13, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#242A35', justifyContent: 'center' },
  trainerOptionSelected: { backgroundColor: 'rgba(255, 200, 58, 0.14)' },
  trainerOptionText: { color: '#F3F5F7', fontSize: 15, fontWeight: '700' },
  trainerOptionMobile: { color: '#9BA3B0', fontSize: 13, marginTop: 2 },
  staticPlaceholder: { color: '#6E7785', fontSize: 15 },
  whatsappRow: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#161A21', flexDirection: 'row', alignItems: 'center', overflow: 'hidden', gap: 12 },
  fieldNote: { color: '#6E7785', fontSize: 13, lineHeight: 19, marginTop: 6 },
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  planLoading: { minHeight: 80, justifyContent: 'center' },
  planCard: { width: '48.5%', minHeight: 84, backgroundColor: '#181C22', borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', padding: 13 },
  planCardSelected: { backgroundColor: 'rgba(255, 200, 58, 0.12)', borderColor: '#FFC83A', borderWidth: 2, padding: 12 },
  planName: { color: '#F3F5F7', fontSize: 14, fontWeight: '700' },
  planAmount: { color: '#F3F5F7', fontSize: 20, lineHeight: 24, fontWeight: '900', marginTop: 4 },
  planDuration: { color: '#9BA3B0', fontSize: 12, marginTop: 2 },
  personalTrainingRow: { marginTop: 16, minHeight: 80, borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  personalTrainingRowOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0, marginBottom: 0 },
  trainingSwitch: { width: 46, height: 28, borderRadius: 14, backgroundColor: '#252B36', borderWidth: 1, borderColor: '#363F4E', padding: 3, justifyContent: 'center' },
  trainingSwitchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#9BA3B0' },
  trainingSwitchThumbActive: { alignSelf: 'flex-end', backgroundColor: '#1A1400' },
  personalTrainingCopy: { flex: 1 },
  personalTrainingTitle: { color: '#F3F5F7', fontSize: 15, fontWeight: '800' },
  personalTrainingDetail: { color: '#9BA3B0', fontSize: 13, lineHeight: 19, marginTop: 3 },
  personalTrainingPlanPanel: { marginTop: -1, borderWidth: 1, borderTopWidth: 0, borderColor: '#2A313D', backgroundColor: '#181C22', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, paddingHorizontal: 14, paddingBottom: 14 },
  personalTrainingPlanLabel: { color: '#9BA3B0', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  personalTrainingPlanCard: { minHeight: 80 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#363F4E', backgroundColor: '#12151B', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#FFC83A', borderColor: '#FFC83A' },
  checkboxTick: { color: '#1A1400', fontSize: 15, fontWeight: '900' },
  paymentSummary: { marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', paddingHorizontal: 15, paddingVertical: 14 },
  summaryLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { color: '#9BA3B0', fontSize: 14 },
  summaryValue: { color: '#F3F5F7', fontSize: 14, fontWeight: '800' },
  summaryDivider: { height: 1, borderTopWidth: 1, borderTopColor: '#2A313D', borderStyle: 'dashed', marginVertical: 10 },
  firstPayment: { color: '#F3F5F7', fontSize: 15, fontWeight: '800' },
  firstPaymentAmount: { color: '#FFC83A', fontSize: 22, fontWeight: '900' },
  twoColumnRow: { flexDirection: 'row', gap: 10, zIndex: 20 },
  columnField: { flex: 1, position: 'relative' },
  inputSuffix: { position: 'absolute', right: 13, color: '#F3F5F7', fontSize: 18 },
  moreDetailsHeader: { marginTop: 16, minHeight: 64, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#181C22', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moreDetailsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moreDetailsTitle: { color: '#F3F5F7', fontSize: 15, fontWeight: '800' },
  optionalBadge: { color: '#9BA3B0', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, borderRadius: 6, borderWidth: 1, borderColor: '#2A313D', backgroundColor: '#12151B', paddingHorizontal: 7, paddingVertical: 2 },
  moreDetailsSubtitle: { color: '#6E7785', fontSize: 13, marginTop: 3 },
  detailsChevron: { color: '#9BA3B0', fontSize: 26, lineHeight: 28 },
  moreDetailsBody: { marginTop: -1, borderWidth: 1, borderTopWidth: 0, borderColor: '#2A313D', backgroundColor: '#181C22', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, padding: 14 },
  sectionLabel: { color: '#9BA3B0', fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 18, marginBottom: -1 },
  welcomeMessageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  onboardingFooter: { marginTop: 16 },
  welcomeToggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#34D399', padding: 3, justifyContent: 'center' },
  welcomeToggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },
  welcomeToggleInactive: { backgroundColor: '#252B36' },
  welcomeToggleThumbInactive: { alignSelf: 'flex-start' },
  welcomeMessageText: { color: '#F3F5F7', fontSize: 14, fontWeight: '600' },
  successMessage: { color: '#34D399', fontSize: 14, lineHeight: 20, marginTop: 14, fontWeight: '700' },
  completeOnboardButton: { height: 52, marginTop: 18, borderRadius: 14, backgroundColor: '#FFC83A', alignItems: 'center', justifyContent: 'center' },
});
