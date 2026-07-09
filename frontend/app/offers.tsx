import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";

export default function Offers() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [coupons, setCoupons] = useState<any[]>([]);
  useEffect(() => { api.coupons().then(setCoupons); }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable testID="offers-back" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} /></Pressable>
        <Text style={styles.title}>Offers & Coupons</Text>
        <View style={styles.iconBtn} />
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        {coupons.map((c) => (
          <View key={c.code} style={styles.card} testID={`offer-${c.code}`}>
            <View style={styles.badge}>
              <Text style={styles.pct}>{c.discount_percent}%</Text>
              <Text style={styles.off}>OFF</Text>
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={styles.code}>{c.code}</Text>
              <Text style={styles.desc}>{c.description}</Text>
              <Text style={styles.min}>Min order ₹{c.min_order}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: "#fff" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceAlt },
  title: { fontWeight: "800", fontSize: 17 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.md, ...SHADOW.card, borderLeftWidth: 5, borderLeftColor: COLORS.gold },
  badge: { backgroundColor: COLORS.brand, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: "center", minWidth: 70 },
  pct: { color: "#fff", fontWeight: "900", fontSize: 22 },
  off: { color: "#fff", fontWeight: "700", fontSize: 11, letterSpacing: 1 },
  code: { fontSize: 18, fontWeight: "900", color: COLORS.textPrimary, letterSpacing: 1 },
  desc: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  min: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
});
