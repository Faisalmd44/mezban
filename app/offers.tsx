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
        <Pressable testID="offers-back" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color={COLORS.white} /></Pressable>
        <Text style={styles.title}>Offers & Coupons</Text><View style={styles.iconBtn} />
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        {coupons.length === 0 ? (
          <View style={styles.empty}><Text style={{ fontSize: 56 }}>🏷️</Text><Text style={styles.emptyTitle}>No active offers</Text><Text style={styles.emptySub}>Check back soon for new deals</Text></View>
        ) : (
          coupons.map((c) => (
            <View key={c.code} style={styles.card} testID={`offer-${c.code}`}>
              <View style={styles.badge}><Text style={styles.pct}>{c.discount_percent}%</Text><Text style={styles.off}>OFF</Text></View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.code}>{c.code}</Text><Text style={styles.desc}>{c.description}</Text><Text style={styles.min}>Min order ₹{c.min_order}</Text>
                {c.first_order_only ? (<View style={styles.firstTag}><Ionicons name="ribbon" size={11} color={COLORS.gold} /><Text style={styles.firstTagTxt}>First order only</Text></View>) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: COLORS.blackSoft },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.charcoal },
  title: { fontWeight: "800", fontSize: 17, color: COLORS.white },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.white, marginTop: SPACING.md },
  emptySub: { color: COLORS.textSecondary },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.charcoal, padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.md, ...SHADOW.card, borderLeftWidth: 5, borderLeftColor: COLORS.gold, borderWidth: 1, borderColor: COLORS.border },
  badge: { backgroundColor: COLORS.gold, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: "center", minWidth: 70 },
  pct: { color: COLORS.black, fontWeight: "900", fontSize: 22 },
  off: { color: COLORS.black, fontWeight: "700", fontSize: 11, letterSpacing: 1 },
  code: { fontSize: 18, fontWeight: "900", color: COLORS.white, letterSpacing: 1 },
  desc: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  min: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  firstTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: SPACING.sm },
  firstTagTxt: { color: COLORS.gold, fontSize: 11, fontWeight: "700" },
});
