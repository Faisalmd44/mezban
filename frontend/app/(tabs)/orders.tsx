import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";
import { EmptyState } from "@/src/components/ui";

const STATUS_LABEL: Record<string, { txt: string; color: string }> = {
  received: { txt: "Received", color: COLORS.warning },
  preparing: { txt: "Preparing", color: COLORS.warning },
  packed: { txt: "Packed", color: COLORS.warning },
  out_for_delivery: { txt: "Out for delivery", color: COLORS.gold },
  delivered: { txt: "Delivered", color: COLORS.success },
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addToCart } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = useCallback(async () => {
    try { setOrders(await api.myOrders()); } finally { setLoading(false); setRefresh(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const repeat = (order: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    order.items.forEach((it: any) => addToCart(it));
    router.push("/(tabs)/cart");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>My Orders</Text></View>
      {loading ? <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} /> :
        orders.length === 0 ? (
          <EmptyState icon="📦" title="No orders yet" subtitle="Place your first order and track it here" actionLabel="Browse Menu" onAction={() => router.push("/(tabs)/menu")} />
        ) : (
          <FlatList
            data={orders} keyExtractor={(o) => o.id}
            contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} tintColor={COLORS.gold} colors={[COLORS.gold]} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <View><Text style={styles.orderNo}>#{item.order_no}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text></View>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_LABEL[item.status]?.color || COLORS.gold) + "22" }]}>
                    <Text style={[styles.statusTxt, { color: STATUS_LABEL[item.status]?.color || COLORS.gold }]}>{STATUS_LABEL[item.status]?.txt || item.status}</Text>
                  </View>
                </View>
                <Text numberOfLines={2} style={styles.itemsSummary}>{item.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}</Text>
                <View style={styles.cardFoot}>
                  <Text style={styles.total}>₹{item.total.toFixed(0)}</Text>
                  <View style={styles.actions}>
                    <Pressable testID={`track-${item.id}`} onPress={() => router.push(`/tracking/${item.id}`)} style={styles.outlineBtn}><Ionicons name="navigate" size={14} color={COLORS.gold} /><Text style={styles.outlineTxt}>Track</Text></Pressable>
                    <Pressable testID={`repeat-${item.id}`} onPress={() => repeat(item)} style={styles.solidBtn}><Ionicons name="refresh" size={14} color={COLORS.black} /><Text style={styles.solidTxt}>Reorder</Text></Pressable>
                  </View>
                </View>
              </View>
            )}
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: COLORS.blackSoft },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.white },
  card: { backgroundColor: COLORS.charcoal, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderNo: { fontWeight: "900", color: COLORS.white },
  date: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  statusTxt: { fontSize: 11, fontWeight: "800" },
  itemsSummary: { color: COLORS.textSecondary, fontSize: 13, marginTop: SPACING.sm },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.md },
  total: { fontSize: 18, fontWeight: "900", color: COLORS.gold },
  actions: { flexDirection: "row", gap: 8 },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill },
  outlineTxt: { color: COLORS.gold, fontWeight: "800", fontSize: 13 },
  solidBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill },
  solidTxt: { color: COLORS.black, fontWeight: "800", fontSize: 13 },
});
