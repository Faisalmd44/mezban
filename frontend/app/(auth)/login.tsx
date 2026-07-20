import { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Pressable, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { saveToken, useApp, getDeviceId } from "@/src/store";
import { useGoogleAuth } from "@/src/hooks/use-google-auth";
import { useEmailOtp } from "@/src/hooks/use-email-otp";

type Mode = "select" | "email" | "otp" | "mobile";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("select");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setUser } = useApp();
  const insets = useSafeAreaInsets();
  const otpInputRef = useRef<TextInput>(null);

  const { signIn, loading: googleLoading } = useGoogleAuth();
  const { sendOtp, verifyOtp, loading: otpLoading, resendTimer } = useEmailOtp();

  const finishLogin = async (res: { token: string; user: any }) => {
    await saveToken(res.token);
    if (!res.user.phone) {
      setPendingUser(res.user);
      setPendingToken(res.token);
      setMode("mobile");
    } else {
      setUser(res.user);
      router.replace("/(tabs)");
    }
  };

  const onGoogleSignIn = async () => {
    setError("");
    const googleUser = await signIn();
    if (!googleUser) return;
    setLoading(true);
    try {
      const device_id = await getDeviceId();
      const res = await api.googleLogin({
        id_token: googleUser.id_token, email: googleUser.email, name: googleUser.name,
        picture: googleUser.picture, google_id: googleUser.google_id, device_id,
      });
      await finishLogin(res);
    } catch (e: any) { setError(e?.message || "Login failed"); }
    finally { setLoading(false); }
  };

  const onSendOtp = async () => {
    setError("");
    const ok = await sendOtp(email);
    if (ok) setMode("otp");
  };

  const onVerifyOtp = async () => {
    setError("");
    const supabaseToken = await verifyOtp(email, otp);
    if (!supabaseToken) return;
    setLoading(true);
    try {
      const device_id = await getDeviceId();
      const res = await api.emailOtpLogin({
        supabase_token: supabaseToken,
        email,
        name: email.split("@")[0],
        device_id,
      });
      await finishLogin(res);
    } catch (e: any) { setError(e?.message || "Login failed"); }
    finally { setLoading(false); }
  };

  const onMobileSubmit = async () => {
    setError("");
    if (phone.trim().length < 10) { setError("Please enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    try {
      const res = await api.updateMobile(phone.trim());
      setUser(res.user);
      router.replace("/(tabs)");
    } catch (e: any) { setError(e?.message || "Failed to save mobile number"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (mode === "otp" && otpInputRef.current) {
      setTimeout(() => otpInputRef.current?.focus(), 300);
    }
  }, [mode]);

  return (
    <View style={styles.root}>
      <Image source="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200" style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      <LinearGradient colors={["rgba(10,10,10,0.6)", "rgba(10,10,10,0.88)", COLORS.black]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kb}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.heroWrap}>
            <View style={styles.logoRing}><Text style={styles.logoMonogram}>M</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>SINCE 2026</Text></View>
            <Text testID="brand-title" style={styles.brand}>MEZBAAN</Text>
            <Text style={styles.brandSub}>RESTRO</Text>
            <View style={styles.taglineRow}>
              <View style={styles.taglineLine} />
              <Text style={styles.tagline}>Freshly Crafted, Honestly Served</Text>
              <View style={styles.taglineLine} />
            </View>
          </View>

          {mode === "select" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome</Text>
              <Text style={styles.cardSub}>Sign in to order premium meals</Text>
              <Pressable testID="login-google-btn" onPress={onGoogleSignIn} disabled={loading || googleLoading} style={({ pressed }) => [styles.googleBtn, pressed && { transform: [{ scale: 0.98 }] }]}>
                {loading || googleLoading ? <ActivityIndicator color={COLORS.white} /> : (
                  <>
                    <View style={styles.googleIcon}><Text style={styles.googleIconG}>G</Text></View>
                    <Text style={styles.googleBtnTxt}>Continue with Google</Text>
                  </>
                )}
              </Pressable>
              <Pressable testID="login-email-btn" onPress={() => { setError(""); setMode("email"); }} style={({ pressed }) => [styles.emailBtn, pressed && { transform: [{ scale: 0.98 }] }]}>
                <Ionicons name="mail" size={22} color={COLORS.gold} />
                <Text style={styles.emailBtnTxt}>Continue with Email</Text>
              </Pressable>
              {error ? <Text testID="login-error" style={styles.error}>{error}</Text> : null}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerTxt}>SECURE LOGIN</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.trustRow}>
                <Ionicons name="shield-checkmark" size={14} color={COLORS.gold} />
                <Text style={styles.trustTxt}>No fake accounts · Verified login</Text>
              </View>
              <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy.</Text>
            </View>
          )}

          {mode === "email" && (
            <View style={styles.card}>
              <Pressable onPress={() => { setError(""); setMode("select"); }} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={COLORS.gold} />
                <Text style={styles.backTxt}>Back</Text>
              </Pressable>
              <Text style={styles.cardTitle}>Email Login</Text>
              <Text style={styles.cardSub}>We'll send a 6-digit verification code to your email</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={{ marginHorizontal: SPACING.sm }} />
                <TextInput
                  testID="login-email-input"
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  onSubmitEditing={onSendOtp}
                />
              </View>
              {error ? <Text testID="login-error" style={styles.error}>{error}</Text> : null}
              <Pressable testID="login-send-otp" onPress={onSendOtp} disabled={otpLoading || !email} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
                {otpLoading ? <ActivityIndicator color={COLORS.black} /> : (
                  <>
                    <Text style={styles.ctaText}>Send Code</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.black} />
                  </>
                )}
              </Pressable>
              <Text style={styles.terms}>OTP expires in 5 minutes. Resend available after 30 seconds.</Text>
            </View>
          )}

          {mode === "otp" && (
            <View style={styles.card}>
              <Pressable onPress={() => { setError(""); setMode("email"); }} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={COLORS.gold} />
                <Text style={styles.backTxt}>Back</Text>
              </Pressable>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeTxt}>VERIFY EMAIL</Text></View>
              <Text style={styles.cardTitle}>Enter Code</Text>
              <Text style={styles.cardSub}>We sent a 6-digit code to {email}</Text>
              <View style={styles.otpRow}>
                <TextInput
                  ref={otpInputRef}
                  testID="login-otp-input"
                  placeholder="------"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  style={styles.otpInput}
                  textAlign="center"
                />
              </View>
              {error ? <Text testID="login-error" style={styles.error}>{error}</Text> : null}
              <Pressable testID="login-verify-otp" onPress={onVerifyOtp} disabled={loading || otpLoading || otp.length !== 6} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
                {loading || otpLoading ? <ActivityIndicator color={COLORS.black} /> : (
                  <>
                    <Text style={styles.ctaText}>Verify & Continue</Text>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.black} />
                  </>
                )}
              </Pressable>
              {resendTimer > 0 ? (
                <Text style={styles.resendTxt}>Resend code in {resendTimer}s</Text>
              ) : (
                <Pressable testID="login-resend-otp" onPress={onSendOtp} disabled={otpLoading}>
                  <Text style={styles.resendLink}>Resend code</Text>
                </Pressable>
              )}
            </View>
          )}

          {mode === "mobile" && pendingUser && (
            <View style={styles.card}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeTxt}>STEP 2 OF 2</Text></View>
              <Text style={styles.cardTitle}>Enter Mobile Number</Text>
              <Text style={styles.cardSub}>Welcome, {pendingUser.name?.split(" ")[0] || "Guest"}. A valid mobile number is required to place orders.</Text>
              <View style={styles.inputRow}>
                <Text style={styles.prefix}>+91</Text>
                <View style={styles.inputDivider} />
                <TextInput testID="login-phone-input" placeholder="10-digit mobile number" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" maxLength={10} value={phone} onChangeText={setPhone} style={styles.input} />
              </View>
              {error ? <Text testID="login-error" style={styles.error}>{error}</Text> : null}
              <Pressable testID="login-submit-button" onPress={onMobileSubmit} disabled={loading} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
                {loading ? <ActivityIndicator color={COLORS.black} /> : (
                  <>
                    <Text style={styles.ctaText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.black} />
                  </>
                )}
              </Pressable>
              <Text style={styles.terms}>We use this to deliver your orders and send updates.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  kb: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: SPACING.xxl },
  heroWrap: { alignItems: "center", marginBottom: SPACING.xxl },
  logoRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: COLORS.gold, alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg, ...SHADOW.gold },
  logoMonogram: { fontSize: 40, fontWeight: "900", color: COLORS.gold },
  badge: { borderWidth: 1, borderColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.pill, marginBottom: SPACING.md },
  badgeText: { color: COLORS.gold, fontWeight: "800", fontSize: 11, letterSpacing: 2 },
  brand: { fontSize: 52, fontWeight: "900", color: COLORS.white, letterSpacing: 6 },
  brandSub: { fontSize: 18, fontWeight: "700", color: COLORS.gold, letterSpacing: 10, marginTop: -6 },
  taglineRow: { flexDirection: "row", alignItems: "center", marginTop: SPACING.sm, gap: SPACING.sm },
  taglineLine: { width: 30, height: 1, backgroundColor: COLORS.goldDark },
  tagline: { color: "rgba(255,255,255,0.8)", fontStyle: "italic", fontSize: 13, letterSpacing: 1 },
  card: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.strong },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: SPACING.md },
  backTxt: { color: COLORS.gold, fontWeight: "700", fontSize: 14 },
  stepBadge: { alignSelf: "flex-start", backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 3, borderRadius: RADIUS.pill, marginBottom: SPACING.md },
  stepBadgeTxt: { color: COLORS.black, fontWeight: "900", fontSize: 10, letterSpacing: 1.5 },
  cardTitle: { fontSize: 24, fontWeight: "900", color: COLORS.white },
  cardSub: { color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg, fontSize: 13 },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.pill, paddingVertical: 16, ...SHADOW.card },
  googleBtnTxt: { color: COLORS.black, fontWeight: "800", fontSize: 16 },
  googleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  googleIconG: { fontSize: 16, fontWeight: "900", color: "#4285F4" },
  emailBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.md, backgroundColor: "transparent", borderRadius: RADIUS.pill, paddingVertical: 16, marginTop: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.gold },
  emailBtnTxt: { color: COLORS.gold, fontWeight: "800", fontSize: 16 },
  error: { color: COLORS.error, marginBottom: SPACING.sm, marginTop: SPACING.sm, textAlign: "center" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: SPACING.lg, gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerTxt: { color: COLORS.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, height: 56, borderWidth: 1, borderColor: COLORS.border },
  prefix: { fontWeight: "800", color: COLORS.gold, fontSize: 16 },
  inputDivider: { width: 1, height: 24, backgroundColor: COLORS.border, marginHorizontal: SPACING.sm },
  input: { flex: 1, fontSize: 16, color: COLORS.white, height: "100%" },
  otpRow: { flexDirection: "row", justifyContent: "center", marginBottom: SPACING.md },
  otpInput: { fontSize: 32, fontWeight: "900", color: COLORS.gold, letterSpacing: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, height: 64, width: "100%", paddingHorizontal: SPACING.md },
  cta: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: SPACING.sm, ...SHADOW.gold },
  ctaText: { color: COLORS.black, fontWeight: "900", fontSize: 16 },
  trustRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  trustTxt: { color: COLORS.textSecondary, fontSize: 12 },
  terms: { textAlign: "center", color: COLORS.textMuted, fontSize: 11, marginTop: SPACING.md },
  resendTxt: { textAlign: "center", color: COLORS.textMuted, fontSize: 13, marginTop: SPACING.md },
  resendLink: { textAlign: "center", color: COLORS.gold, fontWeight: "700", fontSize: 14, marginTop: SPACING.md, textDecorationLine: "underline" },
});
