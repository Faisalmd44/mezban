import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { EmptyState } from "@/src/components/ui";

type Order = {
  id: string; order_no: string; total: number; status: string;
  payment_method: string; payment_status: string; created_at: string;
  order_items: { name: string; quantity: number; price: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  received: COLORS.warning,
  preparing: COLORS.gold,
  ready: COLORS.goldLight,
  dispatched: COLORS.success,
  delivered: COLORS.success,
  cancelled: COLORS.error,
};

export default function OrdersTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const load = useCallback(async () => {
    try { setOrders(await api.myOrders()); } finally { setLoading(false); setRefresh(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Orders</Text>
      </View>
      {loading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : (
        <FlatList
          data={orders} keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} tintColor={COLORS.gold} colors={[COLORS.gold]} />}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No orders yet" subtitle="Your order history will appear here" actionLabel="Browse Menu" onAction={() => router.push("/(tabs)/menu")} />}
          renderItem={({ item }) => (
            <Pressable testID={`order-${item.id}`} style={styles.card} onPress={() => router.push(`/tracking/${item.id}`)}>
              <View style={styles.cardHead}>
                <Text style={styles.orderNo}>{item.order_no}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || COLORS.textMuted) + "22" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || COLORS.textMuted }]}>{item.status}</Text>
                </View>
              </View>
                <Text numberOfLines={2} style={styles.itemsSummary}>{(item.order_items || []).map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}</Text>
              <View style={styles.cardFoot}>
                <Text style={styles.total}>₹{item.total}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.white },
  loading: { color: COLORS.textMuted, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  orderNo: { fontWeight: "800", color: COLORS.white, fontSize: 15 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  itemsSummary: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  total: { fontWeight: "900", color: COLORS.gold, fontSize: 16 },
  date: { color: COLORS.textMuted, fontSize: 12 },
});
