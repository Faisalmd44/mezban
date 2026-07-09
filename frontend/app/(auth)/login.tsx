import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { saveToken, useApp } from "@/src/store";

export default function LoginScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setUser } = useApp();

  const onContinue = async () => {
    setError("");
    if (!name.trim()) return setError("कृपया अपना नाम बताएं");
    if (phone.trim().length < 10) return setError("Valid 10-digit phone enter करें");
    setLoading(true);
    try {
      const res = await api.signup(name.trim(), phone.trim());
      await saveToken(res.token);
      setUser(res.user);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image
        source="https://images.unsplash.com/photo-1613319300832-a105da5bd34e?w=1200"
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.85)", COLORS.black]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kb}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.heroWrap}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SINCE 2026</Text>
            </View>
            <Text testID="brand-title" style={styles.brand}>MEZBAAN</Text>
            <Text style={styles.brandSub}>RESTRO</Text>
            <Text style={styles.tagline}>Freshly Crafted, Honestly Served</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Get Started</Text>
            <Text style={styles.cardSub}>Quick login से order करें</Text>

            <View style={styles.inputRow}>
              <Ionicons name="person" size={18} color={COLORS.textSecondary} />
              <TextInput
                testID="login-name-input"
                placeholder="Your Name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="call" size={18} color={COLORS.textSecondary} />
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                testID="login-phone-input"
                placeholder="10-digit mobile number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            {error ? <Text testID="login-error" style={styles.error}>{error}</Text> : null}

            <Pressable
              testID="login-submit-button"
              onPress={onContinue}
              disabled={loading}
              style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </Pressable>

            <Text style={styles.terms}>
              By continuing you agree to our Terms & Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  kb: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "flex-end", paddingBottom: SPACING.xl },
  heroWrap: { alignItems: "center", marginTop: 80, marginBottom: SPACING.xl },
  badge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.md,
  },
  badgeText: { color: COLORS.black, fontWeight: "800", fontSize: 11, letterSpacing: 1.5 },
  brand: { fontSize: 48, fontWeight: "900", color: COLORS.white, letterSpacing: 4 },
  brandSub: { fontSize: 18, fontWeight: "700", color: COLORS.gold, letterSpacing: 8, marginTop: -4 },
  tagline: { color: "rgba(255,255,255,0.85)", marginTop: SPACING.sm, fontStyle: "italic" },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOW.strong,
  },
  cardTitle: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  cardSub: { color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.lg },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    height: 52,
  },
  prefix: { fontWeight: "700", color: COLORS.textPrimary },
  input: { flex: 1, fontSize: 16, color: COLORS.textPrimary, height: "100%" },
  error: { color: COLORS.error, marginBottom: SPACING.sm },
  cta: {
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: SPACING.sm,
  },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  terms: { textAlign: "center", color: COLORS.textMuted, fontSize: 12, marginTop: SPACING.md },
});
