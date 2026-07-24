import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { useApp, clearToken } from "@/src/store";
import { api } from "@/src/api";
import { useState } from "react";

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser, clearCart } = useApp();
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

const savePhone = async () => {
  try {
    setSaving(true);

    const res = await api.updateMobile(phone);

    setUser(res);

    Alert.alert("Success", "Mobile number updated successfully");
  } catch (e: any) {
    Alert.alert(
      "Error",
      e?.response?.data?.detail || "Unable to update mobile number"
    );
  } finally {
    setSaving(false);
  }
};

  const logout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await clearToken(); clearCart(); setUser(null); router.replace("/(auth)/login"); } },
    ]);
  };

  const whatsapp = () => Linking.openURL("https://wa.me/918595244548?text=Hi%20Mezbaan%20Restro");

  return (
    <ScrollView style={[styles.root, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[COLORS.blackSoft, COLORS.black]} style={styles.hero}>
        <View style={styles.avatarRing}>
          {user?.picture ? <Image source={user.picture} style={styles.avatarImg} contentFit="cover" /> : <Text style={styles.avatarTxt}>{(user?.name || "G")[0].toUpperCase()}</Text>}
        </View>
        <Text testID="profile-name" style={styles.name}>{user?.name || "Guest"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>
       <View style={{ paddingHorizontal: 20, width: "100%", marginTop: 10 }}>
  <TextInput
    value={phone}
    onChangeText={setPhone}
    keyboardType="phone-pad"
    placeholder="Enter mobile number"
    placeholderTextColor="#777"
    style={{
      backgroundColor: "#222",
      color: "#fff",
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: "#444",
    }}
  />

  <Pressable
    onPress={savePhone}
    style={{
      backgroundColor: "#D4AF37",
      padding: 12,
      borderRadius: 10,
      marginTop: 10,
      alignItems: "center",
    }}
  >
    <Text style={{ fontWeight: "bold", color: "#000" }}>
      {saving ? "Saving..." : "Save Number"}
    </Text>
  </Pressable>
</View>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Account</Text>
      <MenuRow icon="receipt-outline" label="Order History" onPress={() => router.push("/(tabs)/orders")} testID="row-orders" />
      <MenuRow icon="heart-outline" label="Wishlist" onPress={() => router.push("/wishlist")} testID="row-wishlist" />
      <MenuRow icon="pricetags-outline" label="Offers & Coupons" onPress={() => router.push("/offers")} testID="row-offers" />
      <MenuRow icon="location-outline" label="Saved Addresses" onPress={() => router.push("/checkout")} testID="row-addresses" />
      <MenuRow icon="logo-whatsapp" label="WhatsApp Support" onPress={whatsapp} testID="row-whatsapp" />
      <MenuRow icon="log-out-outline" label="Logout" onPress={logout} danger testID="row-logout" />

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
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View style={[styles.menuIcon, danger && { backgroundColor: "rgba(255,90,95,0.15)" }]}>
        <Ionicons name={icon} size={20} color={danger ? COLORS.error : COLORS.gold} />
      </View>
      <Text style={[styles.menuLbl, danger && { color: COLORS.error }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  hero: { alignItems: "center", paddingTop: SPACING.xl, paddingBottom: SPACING.xl + 12, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: COLORS.gold, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md, overflow: "hidden", ...SHADOW.gold },
  avatarImg: { width: "100%", height: "100%" },
  avatarTxt: { fontSize: 36, fontWeight: "900", color: COLORS.gold },
  name: { color: "#fff", fontSize: 24, fontWeight: "900" },
  email: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  phonePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.charcoal, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  phoneTxt: { color: COLORS.gold, fontWeight: "800", fontSize: 13 },
  sectionTitle: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm, fontWeight: "800", color: COLORS.white, fontSize: 16 },
  menuRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  menuIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceTint, alignItems: "center", justifyContent: "center" },
  menuLbl: { flex: 1, fontWeight: "700", color: COLORS.white },
  footer: { alignItems: "center", paddingVertical: SPACING.xl, gap: 4 },
  brand: { fontWeight: "900", color: COLORS.gold, letterSpacing: 3 },
  tag: { color: COLORS.textSecondary, fontStyle: "italic", fontSize: 12 },
  addr: { color: COLORS.textMuted, fontSize: 11 },
});
