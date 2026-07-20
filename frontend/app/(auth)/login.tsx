import { useState } from "react";
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

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [pendingUser, setPendingUser] = useState<{ token: string; user: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setUser } = useApp();
  const insets = useSafeAreaInsets();
  
  const { signIn, loading: googleLoading } = useGoogleAuth();
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
      await saveToken(res.token);
      if (!res.user.phone) setPendingUser({ token: res.token, user: res.user });
      else { setUser(res.user); router.replace("/(tabs)"); }
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

          {!pendingUser ? (
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
              {error ? <Text testID="login-error" style={styles.error}>{error}</Text> : null}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerTxt}>SECURE LOGIN</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.trustRow}>
                <Ionicons name="shield-checkmark" size={14} color={COLORS.gold} />
                <Text style={styles.trustTxt}>No fake accounts · Google verified</Text>
              </View>
              <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.stepBadge}><Text style={styles.stepBadgeTxt}>STEP 2 OF 2</Text></View>
              <Text style={styles.cardTitle}>Enter Mobile Number</Text>
              <Text style={styles.cardSub}>Welcome, {pendingUser.user.name?.split(" ")[0] || "Guest"}. A valid mobile number is required to place orders.</Text>
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
  stepBadge: { alignSelf: "flex-start", backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 3, borderRadius: RADIUS.pill, marginBottom: SPACING.md },
  stepBadgeTxt: { color: COLORS.black, fontWeight: "900", fontSize: 10, letterSpacing: 1.5 },
  cardTitle: { fontSize: 24, fontWeight: "900", color: COLORS.white },
  cardSub: { color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg, fontSize: 13 },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.pill, paddingVertical: 16, ...SHADOW.card },
  googleBtnTxt: { color: COLORS.black, fontWeight: "800", fontSize: 16 },
  googleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  googleIconG: { fontSize: 16, fontWeight: "900", color: "#4285F4" },
  error: { color: COLORS.error, marginBottom: SPACING.sm, marginTop: SPACING.sm, textAlign: "center" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: SPACING.lg, gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerTxt: { color: COLORS.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, height: 56, borderWidth: 1, borderColor: COLORS.border },
  prefix: { fontWeight: "800", color: COLORS.gold, fontSize: 16 },
  inputDivider: { width: 1, height: 24, backgroundColor: COLORS.border, marginHorizontal: SPACING.sm },
  input: { flex: 1, fontSize: 16, color: COLORS.white, height: "100%" },
  cta: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: SPACING.sm, ...SHADOW.gold },
  ctaText: { color: COLORS.black, fontWeight: "900", fontSize: 16 },
  trustRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  trustTxt: { color: COLORS.textSecondary, fontSize: 12 },
  terms: { textAlign: "center", color: COLORS.textMuted, fontSize: 11, marginTop: SPACING.md },
});
