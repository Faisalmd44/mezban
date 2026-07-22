import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Pressable, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { supabase } from "@/src/lib/supabase";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const parsedUrl = Linking.parse(initialUrl);
          if (parsedUrl.queryParams?.access_token) {
            accessToken = parsedUrl.queryParams.access_token as string;
            refreshToken = (parsedUrl.queryParams.refresh_token as string) || null;
          }
        }

        if (!accessToken && params.access_token) {
          accessToken = params.access_token as string;
          refreshToken = (params.refresh_token as string) || null;
        }

        if (!accessToken) {
          const { data: sessData } = await supabase.auth.getSession();
          if (sessData.session) {
            accessToken = sessData.session.access_token;
            refreshToken = sessData.session.refresh_token;
          }
        }

        if (!accessToken) {
          setError("Invalid or missing reset token. Please request a new reset link.");
          setVerifying(false);
          return;
        }

        const { error: sessError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });

        if (sessError) {
          setError("Invalid or expired reset link. Please request a new one.");
        }
      } catch {
        setError("Failed to verify reset token. Please request a new reset link.");
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [params]);

  const onSubmit = async () => {
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace("/(auth)/login"), 2000);
    } catch (e: any) {
      setError(e?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200" style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      <LinearGradient colors={["rgba(10,10,10,0.6)", "rgba(10,10,10,0.88)", COLORS.black]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kb}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.heroWrap}>
            <View style={styles.logoRing}><Text style={styles.logoMonogram}>M</Text></View>
            <Text style={styles.brand}>MEZBAAN</Text>
            <Text style={styles.brandSub}>RESTRO</Text>
          </View>

          <View style={styles.card}>
            {verifying ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={COLORS.gold} />
                <Text style={styles.cardSub}>Verifying reset link...</Text>
              </View>
            ) : success ? (
              <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.gold} />
                <Text style={styles.cardTitle}>Password Updated</Text>
                <Text style={styles.cardSub}>Your password has been changed. Redirecting to login...</Text>
              </View>
            ) : (
              <>
                <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={COLORS.gold} />
                  <Text style={styles.backTxt}>Back to Login</Text>
                </Pressable>
                <Text style={styles.cardTitle}>Set New Password</Text>
                <Text style={styles.cardSub}>Enter your new password below</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={{ marginHorizontal: SPACING.sm }} />
                  <TextInput
                    placeholder="New password (min 6 characters)"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    onSubmitEditing={onSubmit}
                  />
                </View>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={{ marginHorizontal: SPACING.sm }} />
                  <TextInput
                    placeholder="Confirm new password"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={styles.input}
                    onSubmitEditing={onSubmit}
                  />
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable onPress={onSubmit} disabled={loading || !password || !confirmPassword} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
                  {loading ? <ActivityIndicator color={COLORS.black} /> : (
                    <>
                      <Text style={styles.ctaText}>Update Password</Text>
                      <Ionicons name="checkmark" size={20} color={COLORS.black} />
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
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
  brand: { fontSize: 52, fontWeight: "900", color: COLORS.white, letterSpacing: 6 },
  brandSub: { fontSize: 18, fontWeight: "700", color: COLORS.gold, letterSpacing: 10, marginTop: -6 },
  card: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.strong },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: SPACING.md },
  backTxt: { color: COLORS.gold, fontWeight: "700", fontSize: 14 },
  cardTitle: { fontSize: 24, fontWeight: "900", color: COLORS.white, textAlign: "center" },
  cardSub: { color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg, fontSize: 13, textAlign: "center" },
  centerContent: { alignItems: "center", justifyContent: "center", paddingVertical: SPACING.xl },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, height: 56, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, fontSize: 16, color: COLORS.white, height: "100%" },
  error: { color: COLORS.error, marginBottom: SPACING.sm, marginTop: SPACING.sm, textAlign: "center" },
  cta: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingVertical: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: SPACING.sm, ...SHADOW.gold },
  ctaText: { color: COLORS.black, fontWeight: "900", fontSize: 16 },
});
