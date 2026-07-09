import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";

const STATUS_LABEL: Record<string, { txt: string; color: string }> = {
  received: { txt: "Received", color: COLORS.warning },
  preparing: { txt: "Preparing", color: COLORS.warning },
  packed: { txt: "Packed", color: COLORS.warning },
  out_for_delivery: { txt: "Out for delivery", color: COLORS.brand },
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
    try {
      const d = await api.myOrders();
      setOrders(d);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const repeat = (order: any) => {
    order.items.forEach((it: any) => addToCart(it));
    router.push("/(tabs)/cart");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySub}>Place your first order and track it here</Text>
          <Pressable testID="orders-browse" onPress={() => router.push("/(tabs)/menu")} style={styles.browseBtn}>
            <Text style={styles.browseTxt}>Browse Menu</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} />}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.orderNo}>#{item.order_no}</Text>
                  <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_LABEL[item.status]?.color || COLORS.brand) + "20" }]}>
                  <Text style={[styles.statusTxt, { color: STATUS_LABEL[item.status]?.color || COLORS.brand }]}>
                    {STATUS_LABEL[item.status]?.txt || item.status}
                  </Text>
                </View>
              </View>
              <Text numberOfLines={2} style={styles.itemsSummary}>
                {item.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}
              </Text>
              <View style={styles.cardFoot}>
                <Text style={styles.total}>₹{item.total.toFixed(0)}</Text>
                <View style={styles.actions}>
                  <Pressable
                    testID={`track-${item.id}`}
                    onPress={() => router.push(`/tracking/${item.id}`)}
                    style={styles.outlineBtn}
                  >
                    <Text style={styles.outlineTxt}>Track</Text>
                  </Pressable>
                  {index === 0 ? (
                    <Pressable testID={`repeat-${item.id}`} onPress={() => repeat(item)} style={styles.solidBtn}>
                      <Ionicons name="refresh" size={14} color="#fff" />
                      <Text style={styles.solidTxt}>Repeat</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.textPrimary },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl, gap: 8 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub: { color: COLORS.textSecondary, textAlign: "center" },
  browseBtn: { backgroundColor: COLORS.brand, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.pill, marginTop: SPACING.lg },
  browseTxt: { color: "#fff", fontWeight: "800" },
  card: { backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW.card },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderNo: { fontWeight: "900", color: COLORS.textPrimary },
  date: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  statusTxt: { fontSize: 11, fontWeight: "800" },
  itemsSummary: { color: COLORS.textSecondary, fontSize: 13, marginTop: SPACING.sm },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.md },
  total: { fontSize: 18, fontWeight: "900", color: COLORS.textPrimary },
  actions: { flexDirection: "row", gap: 8 },
  outlineBtn: { borderWidth: 1.5, borderColor: COLORS.brand, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill },
  outlineTxt: { color: COLORS.brand, fontWeight: "800", fontSize: 13 },
  solidBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.brand, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill },
  solidTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
