import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";

const STATUS_FLOW = ["received", "preparing", "packed", "out_for_delivery", "delivered"];
const STATUS_LABEL: Record<string, string> = {
  received: "Received", preparing: "Preparing", packed: "Packed",
  out_for_delivery: "Out for Delivery", delivered: "Delivered",
};

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [filter, setFilter] = useState<string>("All");

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([api.adminStats(), api.adminOrders()]);
      setStats(s); setOrders(o);
    } catch (e: any) {
      if (e?.message?.includes("403")) router.replace("/(tabs)");
    } finally { setLoading(false); setRefresh(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const nextStatus = async (id: string, current: string) => {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    await api.adminUpdateStatus(id, STATUS_FLOW[idx + 1]);
    load();
  };

  const filtered = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[COLORS.black, COLORS.brandDark]} style={styles.header}>
        <Pressable testID="admin-back" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.title}>Admin Panel</Text><Text style={styles.sub}>Mezbaan Restro</Text></View>
      </LinearGradient>

      {loading || !stats ? (
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} tintColor={COLORS.gold} colors={[COLORS.gold]} />}>
          <View style={styles.statsRow}>
            <StatCard title="Orders" value={stats.total_orders} icon="receipt" color={COLORS.gold} />
            <StatCard title="Revenue" value={`₹${stats.revenue.toFixed(0)}`} icon="cash" color={COLORS.success} />
          </View>
          <View style={styles.statsRow}>
            <StatCard title="Active" value={stats.active_orders} icon="time" color={COLORS.warning} />
            <StatCard title="Customers" value={stats.total_customers} icon="people" color={COLORS.gold} />
          </View>

          <Pressable testID="admin-menu-btn" onPress={() => router.push("/admin/menu")} style={styles.menuMgrBtn}>
            <Ionicons name="restaurant" size={22} color={COLORS.gold} />
            <Text style={styles.menuMgrTxt}>Manage Menu</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </Pressable>

          <Text style={styles.section}>Orders</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {["All", ...STATUS_FLOW].map((s) => (
              <Pressable key={s} testID={`admin-filter-${s}`} onPress={() => setFilter(s)} style={[styles.filter, filter === s && styles.filterActive]}>
                <Text style={[styles.filterTxt, filter === s && { color: COLORS.black }]}>{s === "All" ? "All" : STATUS_LABEL[s]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {filtered.length === 0 ? (
            <Text style={styles.empty}>No orders in this state</Text>
          ) : (
            filtered.map((o) => {
              const idx = STATUS_FLOW.indexOf(o.status);
              const next = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
              return (
                <View key={o.id} style={styles.orderCard}>
                  <View style={styles.ohead}>
                    <View><Text style={styles.ono}>#{o.order_no}</Text><Text style={styles.odate}>{new Date(o.created_at).toLocaleTimeString()}</Text></View>
                    <View style={styles.statusPill}><Text style={styles.statusTxt}>{STATUS_LABEL[o.status]}</Text></View>
                  </View>
                  <Text style={styles.cust}>👤 {o.user_name} • {o.user_phone}</Text>
                  <Text style={styles.addr} numberOfLines={2}>📍 {o.address}</Text>
                  <Text style={styles.items}>{o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}</Text>
                  <View style={styles.ofoot}>
                    <Text style={styles.amount}>₹{o.total.toFixed(0)} • {o.payment_method.toUpperCase()}</Text>
                    {next ? (
                      <Pressable testID={`admin-advance-${o.id}`} onPress={() => nextStatus(o.id, o.status)} style={styles.advanceBtn}>
                        <Text style={styles.advanceTxt}>Mark {STATUS_LABEL[next]}</Text>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.black} />
                      </Pressable>
                    ) : (
                      <View style={[styles.advanceBtn, { backgroundColor: COLORS.success }]}><Ionicons name="checkmark" size={14} color={COLORS.black} /><Text style={styles.advanceTxt}>Done</Text></View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.statLbl}>{title}</Text>
      <Text style={styles.statVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  title: { fontWeight: "900", fontSize: 20, color: COLORS.white },
  sub: { color: COLORS.gold, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  statsRow: { flexDirection: "row", paddingHorizontal: SPACING.lg, marginTop: SPACING.md, gap: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 4, ...SHADOW.card },
  statLbl: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
  statVal: { fontSize: 20, fontWeight: "900", color: COLORS.white, marginTop: 2 },
  menuMgrBtn: { flexDirection: "row", alignItems: "center", margin: SPACING.lg, padding: SPACING.md, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, gap: 12, ...SHADOW.card, borderWidth: 1, borderColor: COLORS.border },
  menuMgrTxt: { flex: 1, fontWeight: "800", color: COLORS.white },
  section: { fontWeight: "800", fontSize: 16, marginHorizontal: SPACING.lg, marginTop: SPACING.md, color: COLORS.white },
  filters: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: 8 },
  filter: { paddingHorizontal: SPACING.lg, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.charcoal, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  filterActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  filterTxt: { fontWeight: "700", color: COLORS.white, fontSize: 12 },
  empty: { textAlign: "center", color: COLORS.textMuted, marginTop: 40 },
  orderCard: { backgroundColor: COLORS.charcoal, marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.card, borderWidth: 1, borderColor: COLORS.border },
  ohead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  ono: { fontWeight: "900", fontSize: 15, color: COLORS.white },
  odate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statusPill: { backgroundColor: COLORS.surfaceTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  statusTxt: { color: COLORS.gold, fontWeight: "800", fontSize: 11 },
  cust: { color: COLORS.white, fontWeight: "700", marginTop: SPACING.sm, fontSize: 13 },
  addr: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  items: { color: COLORS.textSecondary, fontSize: 12, marginTop: SPACING.sm },
  ofoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.md },
  amount: { fontWeight: "900", color: COLORS.gold },
  advanceBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.gold, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill },
  advanceTxt: { color: COLORS.black, fontWeight: "800", fontSize: 12 },
});
