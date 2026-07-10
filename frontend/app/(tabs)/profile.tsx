import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { useApp, clearToken } from "@/src/store";

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser, clearCart } = useApp();

  const logout = async () => {
    await clearToken();
    clearCart();
    setUser(null);
    router.replace("/(auth)/login");
  };

  const whatsapp = () => Linking.openURL("https://wa.me/918595244548?text=Hi%20Mezbaan%20Restro");

  return (
    <ScrollView style={[styles.root, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{(user?.name || "G")[0].toUpperCase()}</Text>
        </View>
        <Text testID="profile-name" style={styles.name}>{user?.name || "Guest"}</Text>
        <Text style={styles.phone}>+91 {user?.phone}</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: COLORS.gold }]}>
          <Ionicons name="wallet" size={24} color={COLORS.black} />
          <Text style={styles.statLbl}>Wallet</Text>
          <Text style={styles.statVal}>₹{user?.wallet?.toFixed(0) || "0"}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Account</Text>

      <MenuRow
  icon="receipt-outline"
  label="Order History"
  onPress={() => router.push("/(tabs)/orders")}
  testID="row-orders"
/>

<MenuRow
  icon="heart-outline"
  label="Wishlist"
  onPress={() => router.push("/wishlist")}
  testID="row-wishlist"
/>

<MenuRow
  icon="pricetags-outline"
  label="Offers & Coupons"
  onPress={() => router.push("/offers")}
  testID="row-offers"
/>

<MenuRow
  icon="logo-whatsapp"
  label="WhatsApp Support"
  onPress={whatsapp}
  testID="row-whatsapp"
/>

{user?.is_admin && (
  <MenuRow
    icon="shield-checkmark-outline"
    label="Admin Panel"
    onPress={() => router.push("/admin")}
    testID="row-admin"
  />
)}

<MenuRow
  icon="log-out-outline"
  label="Logout"
  onPress={logout}
  danger
  testID="row-logout"
/>

      <View style={styles.footer}>
        <Text style={styles.brand}>MEZBAAN RESTRO</Text>
        <Text style={styles.tag}>Freshly Crafted, Honestly Served</Text>
        <Text style={styles.addr}>Abul Fazal Enclave, Jamia Nagar, New Delhi</Text>
        <Text style={styles.addr}>+91 859 524 4548</Text>
      </View>
    </ScrollView>
  );
}

function MenuRow({ icon, label, onPress, danger, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.menuRow}>
      <View style={[styles.menuIcon, danger && { backgroundColor: "#FFE5E5" }]}>
        <Ionicons name={icon} size={20} color={danger ? COLORS.error : COLORS.brand} />
      </View>
      <Text style={[styles.menuLbl, danger && { color: COLORS.error }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  hero: { alignItems: "center", paddingTop: SPACING.lg, paddingBottom: SPACING.xl + 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.gold, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  avatarTxt: { fontSize: 32, fontWeight: "900", color: COLORS.black },
  name: { color: "#fff", fontSize: 22, fontWeight: "900" },
  phone: { color: "rgba(255,255,255,0.85)", marginTop: 2 },
  statsRow: { flexDirection: "row", paddingHorizontal: SPACING.lg, marginTop: -24, gap: SPACING.md },
  statCard: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.card },
  statLbl: { fontWeight: "700", fontSize: 12, marginTop: 6, color: COLORS.black },
  statVal: { fontWeight: "900", fontSize: 22, marginTop: 2, color: COLORS.black },
  referralCard: {
    margin: SPACING.lg, backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: SPACING.lg,
    flexDirection: "row", alignItems: "center", ...SHADOW.card,
    borderLeftWidth: 4, borderLeftColor: COLORS.gold,
  },
  refTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary },
  refSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  refCode: {
    alignSelf: "flex-start", marginTop: SPACING.sm, backgroundColor: COLORS.surfaceTint,
    paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.sm,
    borderWidth: 1, borderStyle: "dashed", borderColor: COLORS.brand,
  },
  refCodeTxt: { fontWeight: "900", color: COLORS.brand, letterSpacing: 1 },
  sectionTitle: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm, fontWeight: "800", color: COLORS.textPrimary },
  menuRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md,
    borderRadius: RADIUS.md, gap: SPACING.md,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceTint, alignItems: "center", justifyContent: "center" },
  menuLbl: { flex: 1, fontWeight: "700", color: COLORS.textPrimary },
  footer: { alignItems: "center", paddingVertical: SPACING.xl, gap: 4 },
  brand: { fontWeight: "900", color: COLORS.brand, letterSpacing: 3 },
  tag: { color: COLORS.textSecondary, fontStyle: "italic", fontSize: 12 },
  addr: { color: COLORS.textMuted, fontSize: 11 },
});
