import { useState, type ComponentProps } from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_NAME } from '@fitora/shared';
import type { AuthResponse } from '@fitora/shared';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/lib/api';
import { completePlayerOnboarding, loginWithPhone, sendOtp } from '@/lib/auth-api';
import lifestyleImage from '../../assets/auth/sports-lifestyle-court.jpg';
import courtImage from '../../assets/auth/tennis-racket-ball-court.jpg';

type AuthStep = 'welcome' | 'phone' | 'otp' | 'profile' | 'city' | 'sports' | 'notifications';
type SportIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];
type ProfilePhoto = { uri: string; fileName?: string | null; mimeType?: string | null };
type CityOption = { label: string; landmark: string; icon: SportIcon };

const design = {
  background: '#fff8f6',
  surface: '#ffffff',
  surfaceLow: '#fff1eb',
  surfaceContainer: '#ffeae0',
  surfaceHigh: '#fce3d9',
  surfaceHighest: '#f6ded3',
  primary: '#9d4300',
  primaryHot: '#f97316',
  onPrimary: '#ffffff',
  onSurface: '#251913',
  onSurfaceVariant: '#584237',
  outline: '#8c7164',
  outlineVariant: '#e0c0b1',
  secondary: '#006e2f',
  tertiary: '#006398',
  error: '#ba1a1a',
} as const;

const sportOptions: Array<{ label: string; icon: SportIcon; accent: string }> = [
  { label: 'Badminton', icon: 'badminton', accent: design.primaryHot },
  { label: 'Cricket', icon: 'cricket', accent: design.secondary },
  { label: 'Football', icon: 'soccer', accent: design.tertiary },
  { label: 'Tennis', icon: 'tennis', accent: design.primary },
  { label: 'Swimming', icon: 'swim', accent: '#008f99' },
  { label: 'Basketball', icon: 'basketball', accent: '#d55a00' },
  { label: 'Volleyball', icon: 'volleyball', accent: '#5a4fcf' },
  { label: 'Running', icon: 'run-fast', accent: '#00894b' },
];

const notificationBenefits: Array<{ title: string; body: string; icon: SportIcon; color: string }> =
  [
    {
      title: 'Booking reminders',
      body: 'Never miss a court, class, or training session.',
      icon: 'calendar-clock',
      color: design.primary,
    },
    {
      title: 'Game invitations',
      body: 'Know when friends invite you to play.',
      icon: 'account-group',
      color: design.secondary,
    },
    {
      title: 'Tournament updates',
      body: 'Brackets, scores, and rewards in real time.',
      icon: 'trophy-outline',
      color: design.tertiary,
    },
  ];

const popularCities: CityOption[] = [
  { label: 'Mumbai', landmark: 'Gateway', icon: 'gate' },
  { label: 'Delhi', landmark: 'India Gate', icon: 'bank' },
  { label: 'Bengaluru', landmark: 'Vidhana Soudha', icon: 'office-building' },
  { label: 'Hyderabad', landmark: 'Charminar', icon: 'mosque' },
  { label: 'Chennai', landmark: 'Valluvar Kottam', icon: 'temple-hindu' },
  { label: 'Kolkata', landmark: 'Victoria Memorial', icon: 'home-city' },
  { label: 'Ahmedabad', landmark: 'Adalaj', icon: 'bridge' },
  { label: 'Pune', landmark: 'Shaniwar Wada', icon: 'castle' },
  { label: 'Chandigarh', landmark: 'Open Hand', icon: 'hand-back-left' },
  { label: 'Jaipur', landmark: 'Hawa Mahal', icon: 'castle' },
  { label: 'Kochi', landmark: 'Fishing Nets', icon: 'sail-boat' },
  { label: 'Lucknow', landmark: 'Rumi Darwaza', icon: 'gate' },
];

const otherCities = [
  'Aalo',
  'Abohar',
  'Abu Road',
  'Achhnera',
  'Acharapakkam',
  'Addanki',
  'Adilabad',
  'Adityapur',
];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<AuthStep>('welcome');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [gender, setGender] = useState('Male');
  const [selectedSports, setSelectedSports] = useState<string[]>(['Tennis', 'Badminton']);
  const [profilePhoto, setProfilePhoto] = useState<ProfilePhoto | null>(null);
  const [pendingAuthResponse, setPendingAuthResponse] = useState<AuthResponse | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = `+91${phoneDigits}`;
  const progress =
    step === 'profile' || step === 'city'
      ? 1 / 3
      : step === 'sports'
        ? 2 / 3
        : step === 'notifications'
          ? 1
          : 0;

  function goBack() {
    setError(null);
    if (step === 'otp') setStep('phone');
    else if (step === 'profile') setStep('otp');
    else if (step === 'city') setStep('profile');
    else if (step === 'sports') setStep('profile');
    else if (step === 'notifications') setStep('sports');
    else if (step === 'phone') setStep('welcome');
  }

  function appendPhoneDigit(value: string) {
    setError(null);
    setPhoneDigits((current) => (current.length >= 10 ? current : `${current}${value}`));
  }

  function deletePhoneDigit() {
    setError(null);
    setPhoneDigits((current) => current.slice(0, -1));
  }

  function toggleSport(label: string) {
    setSelectedSports((current) =>
      current.includes(label) ? current.filter((sport) => sport !== label) : [...current, label],
    );
  }

  async function handleSendOtp() {
    if (phoneDigits.length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await sendOtp(normalizedPhone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.trim().length < 4) {
      setError('Enter the verification code we sent you.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await loginWithPhone(normalizedPhone, otp.trim());
      if (response.isNewUser || response.requiresOnboarding) {
        setPendingAuthResponse(response);
        setIsRegistering(true);
        setStep('profile');
        return;
      }

      await signIn(response);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setIsRegistering(true);
        setError(null);
        setStep('profile');
      } else {
        setError(err instanceof ApiError ? err.message : 'Invalid OTP');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleProfileContinue() {
    if (!firstName.trim()) {
      setError('Add your first name to continue.');
      return;
    }
    if (!email.trim()) {
      setError('Add your email to finish your player profile.');
      return;
    }
    if (!city) {
      setError('Choose your city to personalize nearby courts and events.');
      setStep('city');
      return;
    }
    setError(null);
    setStep('sports');
  }

  function handleSelectCity(value: string) {
    setCity(value);
    setCityQuery('');
    setError(null);
    setStep('profile');
  }

  function handleSportsContinue() {
    if (selectedSports.length === 0) {
      setError('Pick at least one sport you love to play.');
      return;
    }
    setError(null);
    setStep('notifications');
  }

  async function handleCapturePhoto() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to add your profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.72,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) {
      setError('Unable to capture photo. Try again.');
      return;
    }

    setProfilePhoto({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
  }

  async function completeRegistration(askForNotifications: boolean) {
    setError(null);
    setLoading(true);
    try {
      if (!pendingAuthResponse) {
        setError('Verify your OTP before finishing onboarding.');
        setStep('otp');
        return;
      }

      if (askForNotifications) {
        await Notifications.requestPermissionsAsync();
      }

      const user = await completePlayerOnboarding(pendingAuthResponse.tokens.accessToken, {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city: city.trim() || undefined,
        profileImage: profilePhoto?.uri,
        gender,
        sports: selectedSports,
        notificationsEnabled: askForNotifications,
      });
      await signIn({ ...pendingAuthResponse, user });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardRoot}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar canGoBack={step !== 'welcome'} onBack={goBack} />
        {step === 'phone' ? (
          <PhoneStep
            bottomInset={insets.bottom}
            error={error}
            loading={loading}
            phoneDigits={phoneDigits}
            onAppendDigit={appendPhoneDigit}
            onDeleteDigit={deletePhoneDigit}
            onSendOtp={handleSendOtp}
          />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 'welcome' && <WelcomeStep onContinue={() => setStep('phone')} />}
            {step === 'otp' && (
              <OtpStep
                error={error}
                loading={loading}
                otp={otp}
                phone={formatPhone(phoneDigits)}
                onChangeOtp={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                onResend={handleSendOtp}
                onVerify={handleVerifyOtp}
              />
            )}
            {step === 'profile' && (
              <ProfileStep
                city={city}
                email={email}
                error={error}
                firstName={firstName}
                gender={gender}
                lastName={lastName}
                profileImageUri={profilePhoto?.uri ?? null}
                progress={progress}
                onChangeEmail={setEmail}
                onChangeFirstName={setFirstName}
                onChangeGender={setGender}
                onChangeLastName={setLastName}
                onCapturePhoto={handleCapturePhoto}
                onContinue={handleProfileContinue}
                onOpenCityPicker={() => setStep('city')}
              />
            )}
            {step === 'city' && (
              <CitySelectionStep
                city={city}
                query={cityQuery}
                onChangeQuery={setCityQuery}
                onSelectCity={handleSelectCity}
              />
            )}
            {step === 'sports' && (
              <SportsStep
                error={error}
                progress={progress}
                selectedSports={selectedSports}
                onContinue={handleSportsContinue}
                onToggleSport={toggleSport}
              />
            )}
            {step === 'notifications' && (
              <NotificationsStep
                error={error}
                isRegistering={isRegistering}
                loading={loading}
                progress={progress}
                selectedSports={selectedSports}
                onAllow={() => completeRegistration(true)}
                onSkip={() => completeRegistration(false)}
              />
            )}
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function TopBar({ canGoBack, onBack }: { canGoBack: boolean; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityLabel="Go back"
        disabled={!canGoBack}
        onPress={onBack}
        style={({ pressed }) => [
          styles.iconButton,
          !canGoBack && styles.iconButtonHidden,
          pressed && styles.pressed,
        ]}
      >
        <MaterialCommunityIcons color={design.primary} name="chevron-left" size={30} />
      </Pressable>
      <Text style={styles.topBrand}>{APP_NAME}</Text>
      <View style={styles.iconButton} />
    </View>
  );
}

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={styles.welcomeWrap}>
      <View style={styles.heroCard}>
        <ImageBackground
          source={lifestyleImage}
          resizeMode="cover"
          style={styles.heroImage}
          imageStyle={styles.heroImageRadius}
        >
          <LinearGradient
            colors={['rgba(37,25,19,0.04)', 'rgba(37,25,19,0.78)']}
            style={styles.heroOverlay}
          >
            <View style={styles.heroChip}>
              <MaterialCommunityIcons color={design.primary} name="map-marker-radius" size={16} />
              <Text style={styles.heroChipText}>Courts near you</Text>
            </View>
            <Text style={styles.heroCaption}>Find your people. Book your game.</Text>
          </LinearGradient>
        </ImageBackground>
      </View>

      <View style={styles.centerBlock}>
        <Text style={styles.h1}>Welcome to {APP_NAME}</Text>
        <Text style={styles.lead}>
          Join a premium sports community built for players, bookings, coaching, and match day
          energy.
        </Text>
      </View>

      <View style={styles.ctaStack}>
        <PrimaryButton icon="cellphone" label="Continue with Mobile Number" onPress={onContinue} />
        <SecondaryButton icon="google" label="Continue with Google" />
        <SecondaryButton icon="apple" label="Continue with Apple" />
      </View>

      <Text style={styles.termsText}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}

function PhoneStep({
  bottomInset,
  error,
  loading,
  phoneDigits,
  onAppendDigit,
  onDeleteDigit,
  onSendOtp,
}: {
  bottomInset: number;
  error: string | null;
  loading: boolean;
  phoneDigits: string;
  onAppendDigit: (value: string) => void;
  onDeleteDigit: () => void;
  onSendOtp: () => void;
}) {
  return (
    <View style={styles.phoneRoot}>
      <View style={styles.phoneContent}>
        <View style={styles.decorativePhoto}>
          <ImageBackground
            source={courtImage}
            resizeMode="cover"
            style={styles.decorativePhotoImage}
            imageStyle={styles.decorativePhotoRadius}
          />
        </View>
        <Text style={styles.h1}>{"What's your number?"}</Text>
        <Text style={styles.leadLeft}>
          {"We'll send a code to verify your account and get you started."}
        </Text>

        <View style={[styles.phoneInput, error && styles.inputError]}>
          <View style={styles.countryCode}>
            <Text style={styles.flag}>IN</Text>
            <Text style={styles.countryText}>+91</Text>
          </View>
          <View style={styles.phoneDisplay}>
            <Text style={[styles.phoneText, !phoneDigits && styles.phonePlaceholder]}>
              {phoneDigits ? formatPhone(phoneDigits, false) : 'Mobile Number'}
            </Text>
            {phoneDigits.length < 10 && <View style={styles.cursor} />}
          </View>
        </View>
        <HelperText error={error} fallback="Standard SMS rates may apply." />
        <PrimaryButton
          disabled={loading}
          icon="arrow-right"
          label={loading ? 'Sending code...' : 'Send OTP'}
          onPress={onSendOtp}
          style={styles.phoneButton}
        />
      </View>

      <View style={[styles.keypad, { paddingBottom: bottomInset + 22 }]}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <KeyButton key={digit} label={digit} onPress={() => onAppendDigit(digit)} />
        ))}
        <View style={styles.keyButton} />
        <KeyButton label="0" onPress={() => onAppendDigit('0')} />
        <Pressable
          onPress={onDeleteDigit}
          style={({ pressed }) => [styles.keyButton, pressed && styles.keyPressed]}
        >
          <MaterialCommunityIcons color={design.onSurface} name="backspace-outline" size={24} />
        </Pressable>
      </View>
    </View>
  );
}

function OtpStep({
  error,
  loading,
  otp,
  phone,
  onChangeOtp,
  onResend,
  onVerify,
}: {
  error: string | null;
  loading: boolean;
  otp: string;
  phone: string;
  onChangeOtp: (value: string) => void;
  onResend: () => void;
  onVerify: () => void;
}) {
  return (
    <View style={styles.screenBlock}>
      <ProgressPill label="Verification" value={0.25} />
      <Text style={styles.h1}>Enter your code</Text>
      <Text style={styles.leadLeft}>We sent a verification code to {phone}.</Text>
      <TextInput
        autoFocus
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={onChangeOtp}
        placeholder="000000"
        placeholderTextColor={`${design.onSurfaceVariant}88`}
        style={[styles.otpInput, error && styles.inputError]}
        value={otp}
      />
      <HelperText
        error={error}
        fallback="If you are new here, we will help you create a player profile after verification."
      />
      <PrimaryButton
        disabled={loading}
        icon="arrow-right"
        label={loading ? 'Verifying...' : 'Verify and continue'}
        onPress={onVerify}
      />
      <Pressable
        onPress={onResend}
        style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
      >
        <Text style={styles.textButtonLabel}>Resend OTP</Text>
      </Pressable>
    </View>
  );
}

function ProfileStep({
  city,
  email,
  error,
  firstName,
  gender,
  lastName,
  profileImageUri,
  progress,
  onChangeEmail,
  onChangeFirstName,
  onChangeGender,
  onChangeLastName,
  onCapturePhoto,
  onContinue,
  onOpenCityPicker,
}: {
  city: string;
  email: string;
  error: string | null;
  firstName: string;
  gender: string;
  lastName: string;
  profileImageUri: string | null;
  progress: number;
  onChangeEmail: (value: string) => void;
  onChangeFirstName: (value: string) => void;
  onChangeGender: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onCapturePhoto: () => void;
  onContinue: () => void;
  onOpenCityPicker: () => void;
}) {
  return (
    <View style={styles.screenBlock}>
      <ProgressPill label="Step 1 of 3" value={progress} />
      <View style={styles.centerBlockTight}>
        <Text style={styles.h2}>Complete your profile</Text>
        <Text style={styles.bodyText}>Build your identity in the FitOra player community.</Text>
      </View>

      <Pressable
        accessibilityLabel={profileImageUri ? 'Retake profile photo' : 'Add profile photo'}
        onPress={onCapturePhoto}
        style={({ pressed }) => [
          styles.avatarUpload,
          profileImageUri && styles.avatarUploadSelected,
          pressed && styles.avatarUploadPressed,
        ]}
      >
        {profileImageUri ? (
          <Image source={{ uri: profileImageUri }} style={styles.avatarPhoto} />
        ) : (
          <View style={styles.avatarPhotoEmpty}>
            <MaterialCommunityIcons color={design.primary} name="camera-plus-outline" size={42} />
            <Text style={styles.avatarText}>Add Photo</Text>
          </View>
        )}
        <View style={styles.avatarBadge}>
          <MaterialCommunityIcons
            color={design.onPrimary}
            name={profileImageUri ? 'camera-retake-outline' : 'plus'}
            size={18}
          />
        </View>
      </Pressable>

      <View style={styles.rowFields}>
        <FloatingInput label="First Name" value={firstName} onChangeText={onChangeFirstName} />
        <FloatingInput label="Last Name" value={lastName} onChangeText={onChangeLastName} />
      </View>
      <FloatingInput
        autoCapitalize="none"
        keyboardType="email-address"
        label="Email"
        value={email}
        onChangeText={onChangeEmail}
      />
      <View style={styles.segmentWrap}>
        <Text style={styles.fieldLabel}>Gender</Text>
        <View style={styles.segmentControl}>
          {['Male', 'Female', 'Other'].map((option) => {
            const active = gender === option;
            return (
              <Pressable
                key={option}
                onPress={() => onChangeGender(option)}
                style={({ pressed }) => [
                  styles.segmentItem,
                  active && styles.segmentActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <CitySelectField city={city} onPress={onOpenCityPicker} />

      <ImageBackground
        source={lifestyleImage}
        resizeMode="cover"
        style={styles.communityCard}
        imageStyle={styles.communityImage}
      >
        <LinearGradient
          colors={['rgba(37,25,19,0.05)', 'rgba(37,25,19,0.86)']}
          style={styles.communityOverlay}
        >
          <Text style={styles.communityTitle}>Join the global performance community</Text>
          <Text style={styles.communitySubtitle}>Connect with athletes worldwide</Text>
        </LinearGradient>
      </ImageBackground>
      <HelperText
        error={error}
        fallback="Your profile details help clubs and coaches recognize you."
      />
      <PrimaryButton icon="arrow-right" label="Continue" onPress={onContinue} />
    </View>
  );
}

function CitySelectField({ city, onPress }: { city: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Choose city"
      onPress={onPress}
      style={({ pressed }) => [styles.cityField, pressed && styles.cityFieldPressed]}
    >
      <View style={styles.cityFieldIcon}>
        <MaterialCommunityIcons color={design.primaryHot} name="map-marker-radius" size={24} />
      </View>
      <View style={styles.cityFieldTextWrap}>
        <Text style={styles.cityFieldLabel}>City</Text>
        <Text style={[styles.cityFieldValue, !city && styles.cityFieldPlaceholder]}>
          {city || 'Select your city'}
        </Text>
      </View>
      <MaterialCommunityIcons color={design.primary} name="chevron-right" size={26} />
    </Pressable>
  );
}

function CitySelectionStep({
  city,
  query,
  onChangeQuery,
  onSelectCity,
}: {
  city: string;
  query: string;
  onChangeQuery: (value: string) => void;
  onSelectCity: (value: string) => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePopularCities = normalizedQuery
    ? popularCities.filter((option) =>
        `${option.label} ${option.landmark}`.toLowerCase().includes(normalizedQuery),
      )
    : popularCities;
  const visibleOtherCities = otherCities.filter((option) =>
    option.toLowerCase().includes(normalizedQuery),
  );

  return (
    <View style={styles.cityScreen}>
      <ProgressPill label="Location" value={1 / 3} />
      <View style={styles.cityHeroRow}>
        <View style={styles.cityHeroCopy}>
          <Text style={styles.h1}>Select Your City</Text>
          <Text style={styles.leadLeft}>We will tune courts, coaching, and events around you.</Text>
        </View>
        <View style={styles.currentCityChip}>
          <MaterialCommunityIcons color={design.primaryHot} name="map-marker" size={14} />
          <Text style={styles.currentCityText}>{city || 'Choose'}</Text>
        </View>
      </View>

      <View style={styles.citySearchWrap}>
        <MaterialCommunityIcons color={design.outline} name="magnify" size={22} />
        <TextInput
          autoCapitalize="words"
          onChangeText={onChangeQuery}
          placeholder="Search for your city"
          placeholderTextColor={`${design.onSurfaceVariant}88`}
          style={styles.citySearchInput}
          value={query}
        />
      </View>

      <Pressable
        onPress={() => onSelectCity('Hyderabad')}
        style={({ pressed }) => [styles.detectLocationButton, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons color={design.primaryHot} name="crosshairs-gps" size={20} />
        <Text style={styles.detectLocationText}>Auto Detect My Location</Text>
      </Pressable>

      <View style={styles.citySectionHeader}>
        <Text style={styles.citySectionTitle}>Popular Cities</Text>
      </View>
      <View style={styles.cityGrid}>
        {visiblePopularCities.map((option) => (
          <CityCard
            key={option.label}
            option={option}
            selected={city === option.label}
            onPress={() => onSelectCity(option.label)}
          />
        ))}
      </View>

      <View style={styles.citySectionHeader}>
        <Text style={styles.citySectionTitle}>Other Cities</Text>
      </View>
      <View style={styles.otherCityList}>
        {visibleOtherCities.map((option) => (
          <Pressable
            key={option}
            onPress={() => onSelectCity(option)}
            style={({ pressed }) => [styles.otherCityRow, pressed && styles.otherCityRowPressed]}
          >
            <Text style={styles.otherCityText}>{option}</Text>
            <MaterialCommunityIcons color={design.primaryHot} name="chevron-right" size={20} />
          </Pressable>
        ))}
        {visiblePopularCities.length === 0 && visibleOtherCities.length === 0 && (
          <View style={styles.noCityResult}>
            <MaterialCommunityIcons color={design.outline} name="map-search-outline" size={32} />
            <Text style={styles.noCityResultText}>No matching city yet</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function CityCard({
  option,
  selected,
  onPress,
}: {
  option: CityOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cityCard,
        selected && styles.cityCardSelected,
        pressed && styles.cityCardPressed,
      ]}
    >
      <View style={[styles.cityIconTile, selected && styles.cityIconTileSelected]}>
        <View style={styles.cityIconFrame}>
          <MaterialCommunityIcons
            color={selected ? design.primaryHot : design.outline}
            name={option.icon}
            size={36}
          />
          <View style={[styles.cityIconAccent, selected && styles.cityIconAccentSelected]} />
        </View>
      </View>
      <Text style={[styles.cityCardLabel, selected && styles.cityCardLabelSelected]}>
        {option.label}
      </Text>
      <Text style={styles.cityCardLandmark}>{option.landmark}</Text>
    </Pressable>
  );
}

function SportsStep({
  error,
  progress,
  selectedSports,
  onContinue,
  onToggleSport,
}: {
  error: string | null;
  progress: number;
  selectedSports: string[];
  onContinue: () => void;
  onToggleSport: (label: string) => void;
}) {
  return (
    <View style={styles.screenBlock}>
      <ProgressPill label="Step 2 of 3" value={progress} />
      <Text style={styles.h1}>What do you love to play?</Text>
      <Text style={styles.leadLeft}>
        Select your favorite sports to personalize your bookings and activity feed.
      </Text>
      <View style={styles.sportsGrid}>
        {sportOptions.map((sport) => {
          const selected = selectedSports.includes(sport.label);
          return (
            <Pressable
              key={sport.label}
              onPress={() => onToggleSport(sport.label)}
              style={({ pressed }) => [
                styles.sportCard,
                selected && styles.sportCardSelected,
                pressed && styles.sportCardPressed,
              ]}
            >
              <View style={[styles.sportIconWrap, { backgroundColor: `${sport.accent}16` }]}>
                <MaterialCommunityIcons color={sport.accent} name={sport.icon} size={42} />
              </View>
              <Text style={styles.sportLabel}>{sport.label}</Text>
              {selected && (
                <View style={styles.checkBadge}>
                  <MaterialCommunityIcons color={design.onPrimary} name="check" size={16} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <HelperText error={error} fallback={`${selectedSports.length} selected`} />
      <PrimaryButton icon="arrow-right" label="Continue" onPress={onContinue} />
    </View>
  );
}

function NotificationsStep({
  error,
  isRegistering,
  loading,
  progress,
  selectedSports,
  onAllow,
  onSkip,
}: {
  error: string | null;
  isRegistering: boolean;
  loading: boolean;
  progress: number;
  selectedSports: string[];
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.screenBlock}>
      <ProgressPill label="Final step" value={progress} />
      <View style={styles.notificationHero}>
        <View style={styles.notificationBubbleLarge}>
          <MaterialCommunityIcons color={design.primary} name="bell-ring" size={74} />
          <View style={styles.pingDot} />
        </View>
        <View style={[styles.floatingCard, styles.floatingCardTop]}>
          <MaterialCommunityIcons color={design.onPrimary} name="calendar-clock" size={20} />
          <View style={styles.floatingLine} />
        </View>
        <View style={[styles.floatingCard, styles.floatingCardBottom]}>
          <MaterialCommunityIcons color={design.onPrimary} name="account-group" size={20} />
          <View style={styles.floatingLineWide} />
        </View>
      </View>
      <View style={styles.centerBlockTight}>
        <Text style={styles.h2}>Stay in the loop</Text>
        <Text style={styles.bodyText}>
          Enable notifications for bookings, matches, and your {selectedSports[0] ?? 'sports'}{' '}
          updates.
        </Text>
      </View>
      <View style={styles.benefitStack}>
        {notificationBenefits.map((benefit) => (
          <View key={benefit.title} style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: `${benefit.color}14` }]}>
              <MaterialCommunityIcons color={benefit.color} name={benefit.icon} size={25} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitBody}>{benefit.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <HelperText
        error={error}
        fallback={
          isRegistering
            ? 'Your player account will be created after this step.'
            : 'You can change this later in settings.'
        }
      />
      <PrimaryButton
        disabled={loading}
        icon="bell-ring-outline"
        label={loading ? 'Finishing...' : 'Allow Notifications'}
        onPress={onAllow}
      />
      <Pressable
        disabled={loading}
        onPress={onSkip}
        style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
      >
        <Text style={styles.textButtonLabel}>Not now</Text>
      </Pressable>
    </View>
  );
}

function FloatingInput({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  const hasValue = Boolean(props.value);
  return (
    <View style={styles.floatingInputWrap}>
      <Text style={[styles.floatingLabel, hasValue && styles.floatingLabelActive]}>{label}</Text>
      <TextInput
        placeholder=" "
        placeholderTextColor="transparent"
        style={styles.floatingInput}
        {...props}
      />
    </View>
  );
}

function ProgressPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressMeta}>
        <Text style={styles.progressLabel}>Onboarding</Text>
        <Text style={styles.progressStep}>{label}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(value * 100)}%` }]} />
      </View>
    </View>
  );
}

function PrimaryButton({
  disabled,
  icon,
  label,
  onPress,
  style,
}: {
  disabled?: boolean;
  icon?: SportIcon;
  label: string;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        style,
        pressed && styles.primaryButtonPressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
      {icon && <MaterialCommunityIcons color={design.onPrimary} name={icon} size={21} />}
    </Pressable>
  );
}

function SecondaryButton({ icon, label }: { icon: SportIcon; label: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <MaterialCommunityIcons color={design.onSurface} name={icon} size={22} />
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function KeyButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.keyButton, pressed && styles.keyPressed]}
    >
      <Text style={styles.keyLabel}>{label}</Text>
    </Pressable>
  );
}

function HelperText({ error, fallback }: { error: string | null; fallback: string }) {
  return (
    <View style={styles.helperRow}>
      <MaterialCommunityIcons
        color={error ? design.error : design.onSurfaceVariant}
        name={error ? 'alert-circle-outline' : 'information-outline'}
        size={16}
      />
      <Text style={[styles.helperText, error && styles.helperError]}>{error ?? fallback}</Text>
    </View>
  );
}

function formatPhone(value: string, includeCountry = true) {
  const first = value.slice(0, 5);
  const second = value.slice(5, 10);
  const number = [first, second].filter(Boolean).join(' ');
  return includeCountry ? `+91 ${number}`.trim() : number;
}

const styles = StyleSheet.create({
  keyboardRoot: { flex: 1, backgroundColor: design.background },
  container: { flex: 1, backgroundColor: design.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  topBar: {
    alignItems: 'center',
    borderBottomColor: 'rgba(224, 192, 177, 0.45)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconButtonHidden: { opacity: 0 },
  topBrand: { color: design.primary, fontSize: 28, fontWeight: '800' },
  welcomeWrap: { gap: 28 },
  heroCard: {
    alignSelf: 'center',
    aspectRatio: 3 / 2,
    borderRadius: 32,
    maxWidth: 420,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    width: '100%',
  },
  heroImage: { flex: 1 },
  heroImageRadius: { borderRadius: 32 },
  heroOverlay: { flex: 1, justifyContent: 'space-between', padding: 18 },
  heroChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 248, 246, 0.9)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroChipText: { color: design.primary, fontSize: 12, fontWeight: '800' },
  heroCaption: {
    color: design.onPrimary,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    maxWidth: 260,
  },
  centerBlock: { alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  centerBlockTight: { alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  h1: {
    color: design.onSurface,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 38,
  },
  h2: {
    color: design.onSurface,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    textAlign: 'center',
  },
  lead: {
    color: design.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 316,
    textAlign: 'center',
  },
  leadLeft: { color: design.onSurfaceVariant, fontSize: 16, lineHeight: 24, maxWidth: 318 },
  bodyText: { color: design.onSurfaceVariant, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  ctaStack: { gap: 12 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: design.primary,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    height: 56,
    justifyContent: 'center',
    shadowColor: design.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  primaryButtonPressed: { transform: [{ scale: 0.98 }] },
  primaryButtonText: {
    color: design.onPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: design.surface,
    borderColor: design.outline,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    height: 56,
    justifyContent: 'center',
  },
  secondaryButtonText: { color: design.onSurface, fontSize: 15, fontWeight: '700' },
  termsText: {
    color: design.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  phoneRoot: { flex: 1 },
  phoneContent: { flex: 1, paddingHorizontal: 16, paddingTop: 28 },
  decorativePhoto: {
    height: 108,
    opacity: 0.24,
    overflow: 'hidden',
    position: 'absolute',
    right: -12,
    top: 8,
    width: 108,
  },
  decorativePhotoImage: { flex: 1 },
  decorativePhotoRadius: { borderRadius: 54 },
  phoneInput: {
    alignItems: 'center',
    backgroundColor: design.surface,
    borderColor: design.outlineVariant,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 34,
    minHeight: 78,
    padding: 16,
  },
  countryCode: {
    alignItems: 'center',
    borderRightColor: design.outlineVariant,
    borderRightWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingRight: 14,
  },
  flag: {
    backgroundColor: design.surfaceLow,
    borderRadius: 6,
    color: design.primary,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  countryText: { color: design.onSurface, fontSize: 18, fontWeight: '800' },
  phoneDisplay: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 4 },
  phoneText: { color: design.onSurface, fontSize: 26, fontWeight: '800', letterSpacing: 1.2 },
  phonePlaceholder: {
    color: design.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
  },
  cursor: { backgroundColor: design.primaryHot, borderRadius: 999, height: 31, width: 2 },
  phoneButton: { marginTop: 20 },
  keypad: {
    backgroundColor: 'rgba(246, 222, 211, 0.64)',
    borderTopColor: 'rgba(255,255,255,0.78)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 1,
    columnGap: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 26,
    rowGap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  keyButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 58,
    justifyContent: 'center',
    width: '28%',
  },
  keyPressed: { backgroundColor: design.surfaceHigh },
  keyLabel: { color: design.onSurface, fontSize: 28, fontWeight: '700' },
  screenBlock: { gap: 22 },
  progressWrap: { gap: 8, marginBottom: 4 },
  progressMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: {
    color: design.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  progressStep: {
    color: design.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressTrack: {
    backgroundColor: design.surfaceHighest,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: design.primary, borderRadius: 999, height: 8 },
  otpInput: {
    backgroundColor: design.surface,
    borderColor: design.outlineVariant,
    borderRadius: 24,
    borderWidth: 1,
    color: design.onSurface,
    fontSize: 34,
    fontWeight: '900',
    height: 78,
    letterSpacing: 8,
    paddingHorizontal: 18,
    textAlign: 'center',
  },
  inputError: { borderColor: design.error },
  helperRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  helperText: { color: design.onSurfaceVariant, flex: 1, fontSize: 12, lineHeight: 17 },
  helperError: { color: design.error, fontWeight: '700' },
  textButton: { alignItems: 'center', borderRadius: 999, justifyContent: 'center', minHeight: 48 },
  textButtonLabel: { color: design.onSurfaceVariant, fontSize: 15, fontWeight: '800' },
  avatarUpload: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: design.surfaceLow,
    borderColor: design.primary,
    borderRadius: 72,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 144,
    justifyContent: 'center',
    width: 144,
  },
  avatarUploadSelected: {
    backgroundColor: design.surface,
    borderColor: design.primaryHot,
    borderStyle: 'solid',
    overflow: 'hidden',
  },
  avatarUploadPressed: { transform: [{ scale: 0.98 }] },
  avatarPhoto: { height: '100%', width: '100%' },
  avatarPhotoEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: design.primary, fontSize: 12, fontWeight: '800', marginTop: 4 },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: design.primary,
    borderColor: design.background,
    borderRadius: 999,
    borderWidth: 4,
    bottom: 4,
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: 2,
    width: 42,
  },
  rowFields: { flexDirection: 'row', gap: 12 },
  floatingInputWrap: {
    backgroundColor: design.background,
    borderColor: design.outlineVariant,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    height: 58,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  floatingLabel: {
    backgroundColor: design.background,
    color: design.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '700',
    left: 12,
    paddingHorizontal: 4,
    position: 'absolute',
    top: 18,
  },
  floatingLabelActive: { color: design.primary, fontSize: 11, top: -8 },
  floatingInput: {
    color: design.onSurface,
    fontSize: 16,
    fontWeight: '700',
    height: 54,
    paddingTop: 10,
  },
  segmentWrap: { gap: 9 },
  fieldLabel: {
    color: design.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  segmentControl: {
    backgroundColor: design.surfaceLow,
    borderColor: 'rgba(224, 192, 177, 0.55)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 6,
  },
  segmentItem: { alignItems: 'center', borderRadius: 14, flex: 1, paddingVertical: 11 },
  segmentActive: {
    backgroundColor: design.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  segmentText: { color: design.onSurfaceVariant, fontSize: 14, fontWeight: '800' },
  segmentTextActive: { color: design.onSurface },
  cityField: {
    alignItems: 'center',
    backgroundColor: design.surface,
    borderColor: design.outlineVariant,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
  },
  cityFieldPressed: { backgroundColor: design.surfaceLow, transform: [{ scale: 0.99 }] },
  cityFieldIcon: {
    alignItems: 'center',
    backgroundColor: `${design.primaryHot}14`,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cityFieldTextWrap: { flex: 1, gap: 2 },
  cityFieldLabel: { color: design.primary, fontSize: 11, fontWeight: '800' },
  cityFieldValue: { color: design.onSurface, fontSize: 16, fontWeight: '800' },
  cityFieldPlaceholder: { color: design.onSurfaceVariant, fontWeight: '700' },
  cityScreen: { gap: 18 },
  cityHeroRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  cityHeroCopy: { flex: 1, gap: 8 },
  currentCityChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: design.surfaceLow,
    borderColor: 'rgba(224, 192, 177, 0.45)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  currentCityText: { color: design.onSurfaceVariant, fontSize: 11, fontWeight: '800' },
  citySearchWrap: {
    alignItems: 'center',
    backgroundColor: design.surface,
    borderColor: design.outlineVariant,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 56,
    paddingHorizontal: 14,
  },
  citySearchInput: { color: design.onSurface, flex: 1, fontSize: 15, fontWeight: '700' },
  detectLocationButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 2,
  },
  detectLocationText: { color: design.primaryHot, fontSize: 13, fontWeight: '900' },
  citySectionHeader: { marginTop: 8 },
  citySectionTitle: {
    color: design.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cityCard: { alignItems: 'center', gap: 7, width: '30.9%' },
  cityCardSelected: {},
  cityCardPressed: { transform: [{ translateY: -2 }] },
  cityIconTile: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: design.surface,
    borderColor: design.outlineVariant,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    width: '100%',
  },
  cityIconTileSelected: {
    borderColor: design.primaryHot,
    borderWidth: 2,
    shadowColor: design.primaryHot,
    shadowOpacity: 0.14,
  },
  cityIconFrame: { alignItems: 'center', justifyContent: 'center' },
  cityIconAccent: {
    backgroundColor: design.surfaceContainer,
    borderRadius: 999,
    height: 3,
    marginTop: 6,
    width: 34,
  },
  cityIconAccentSelected: { backgroundColor: design.primaryHot },
  cityCardLabel: {
    color: design.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  cityCardLabelSelected: { color: design.primaryHot },
  cityCardLandmark: { color: design.outline, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  otherCityList: {
    backgroundColor: design.surface,
    borderColor: 'rgba(224, 192, 177, 0.45)',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  otherCityRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(224, 192, 177, 0.38)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 16,
  },
  otherCityRowPressed: { backgroundColor: design.surfaceLow },
  otherCityText: { color: design.onSurface, fontSize: 14, fontWeight: '700' },
  noCityResult: { alignItems: 'center', gap: 8, padding: 26 },
  noCityResultText: { color: design.onSurfaceVariant, fontSize: 13, fontWeight: '800' },
  communityCard: { borderRadius: 28, height: 178, overflow: 'hidden' },
  communityImage: { borderRadius: 28 },
  communityOverlay: { flex: 1, justifyContent: 'flex-end', padding: 22 },
  communityTitle: {
    color: design.onPrimary,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  communitySubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  sportsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  sportCard: {
    alignItems: 'center',
    backgroundColor: design.surface,
    borderColor: design.outlineVariant,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 154,
    padding: 14,
    position: 'relative',
    width: '47.8%',
  },
  sportCardSelected: {
    backgroundColor: design.surfaceContainer,
    borderColor: design.primary,
    borderWidth: 2,
  },
  sportCardPressed: { transform: [{ scale: 0.98 }] },
  sportIconWrap: {
    alignItems: 'center',
    borderRadius: 18,
    height: 88,
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%',
  },
  sportLabel: { color: design.onSurface, fontSize: 15, fontWeight: '900' },
  checkBadge: {
    alignItems: 'center',
    backgroundColor: design.primary,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 28,
  },
  notificationHero: {
    alignItems: 'center',
    height: 268,
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBubbleLarge: {
    alignItems: 'center',
    backgroundColor: design.surfaceLow,
    borderColor: 'rgba(224, 192, 177, 0.7)',
    borderRadius: 118,
    borderWidth: 1,
    height: 222,
    justifyContent: 'center',
    width: 222,
  },
  pingDot: {
    backgroundColor: design.primaryHot,
    borderColor: design.surfaceLow,
    borderRadius: 999,
    borderWidth: 4,
    height: 26,
    position: 'absolute',
    right: 64,
    top: 64,
    width: 26,
  },
  floatingCard: {
    alignItems: 'center',
    backgroundColor: design.primary,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  floatingCardTop: { right: 8, top: 28 },
  floatingCardBottom: { backgroundColor: design.secondary, bottom: 38, left: 4 },
  floatingLine: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: 999,
    height: 9,
    width: 58,
  },
  floatingLineWide: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: 999,
    height: 9,
    width: 76,
  },
  benefitStack: { gap: 12 },
  benefitCard: {
    alignItems: 'center',
    backgroundColor: design.surface,
    borderColor: 'rgba(224, 192, 177, 0.45)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 14,
  },
  benefitIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  benefitTextWrap: { flex: 1, gap: 3 },
  benefitTitle: { color: design.onSurface, fontSize: 15, fontWeight: '900' },
  benefitBody: { color: design.onSurfaceVariant, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
});
