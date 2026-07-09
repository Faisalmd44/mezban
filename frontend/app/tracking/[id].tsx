import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Animated, Easing, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";

const STEPS = [
  { key: "received", title: "Order Received", desc: "We got your order and are confirming it.", icon: "receipt" as const },
  { key: "preparing", title: "Preparing", desc: "Our chefs are cooking up your food.", icon: "flame" as const },
  { key: "packed", title: "Packed", desc: "Your food is sealed and ready to go.", icon: "cube" as const },
  { key: "out_for_delivery", title: "Out for Delivery", desc: "Rider is heading your way.", icon: "bicycle" as const },
  { key: "delivered", title: "Delivered", desc: "Enjoy your meal! 🎉", icon: "checkmark-done" as const },
];

export default function Tracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<any>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await api.order(id);
      setOrder(d);
    } catch {}
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // poll every 5s
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, [pulseAnim]);

  if (!order) {
    return <View style={styles.loader}><ActivityIndicator color={COLORS.brand} /></View>;
  }

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const delivered = order.status === "delivered";

  const whatsapp = () => Linking.openURL(`https://wa.me/918595244548?text=Hi%2C%20Mezbaan%20-%20Order%20%23${order.order_no}`);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable testID="track-back" onPress={() => router.replace("/(tabs)/orders")} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Track Order</Text>
        <Pressable testID="track-help" onPress={whatsapp} style={styles.iconBtn}>
          <Ionicons name="logo-whatsapp" size={20} color={COLORS.success} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.orderHead}>
          <Text style={styles.orderNo}>#{order.order_no}</Text>
          <Text style={styles.eta}>
            {delivered ? "✓ Delivered" : "Estimated delivery in 25-35 mins"}
          </Text>
        </View>

        <View style={styles.timeline}>
          {STEPS.map((s, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const color = done || active ? COLORS.brand : COLORS.border;
            return (
              <View key={s.key} style={styles.tlRow}>
                <View style={styles.tlLeft}>
                  <Animated.View
                    style={[
                      styles.tlNode,
                      { backgroundColor: done || active ? COLORS.brand : "#fff", borderColor: color },
                      active && {
                        transform: [{
                          scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
                        }],
                      },
                    ]}
                  >
                    <Ionicons name={s.icon} size={18} color={done || active ? "#fff" : COLORS.textMuted} />
                  </Animated.View>
                  {idx < STEPS.length - 1 ? (
                    <View style={[styles.tlLine, { backgroundColor: done ? COLORS.brand : COLORS.border }]} />
                  ) : null}
                </View>
                <View style={styles.tlBody}>
                  <Text style={[styles.tlTitle, (done || active) && { color: COLORS.textPrimary }]}>{s.title}</Text>
                  <Text style={styles.tlDesc}>{s.desc}</Text>
                  {active ? (
                    <View style={styles.activePill}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activeTxt}>IN PROGRESS</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.section}>Order Summary</Text>
          {order.items.map((it: any, i: number) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemQty}>{it.quantity}x</Text>
              <Text style={styles.itemName}>{it.name}{it.variant ? ` (${it.variant})` : ""}</Text>
              <Text style={styles.itemPrice}>₹{(it.price * it.quantity).toFixed(0)}</Text>
            </View>
          ))}
          <View style={styles.dvdr} />
          <View style={styles.itemRow}><Text style={{flex:1,color:COLORS.textSecondary}}>Total</Text><Text style={{fontWeight:"900"}}>₹{order.total.toFixed(0)}</Text></View>
          <View style={styles.itemRow}><Text style={{flex:1,color:COLORS.textSecondary}}>Payment</Text><Text style={{fontWeight:"700"}}>{order.payment_method.toUpperCase()}</Text></View>
          <View style={styles.itemRow}><Text style={{flex:1,color:COLORS.textSecondary}}>Address</Text><Text style={{fontWeight:"700",maxWidth:"60%"}} numberOfLines={2}>{order.address}</Text></View>
          {order.earned_points ? (
            <View style={styles.pointsCard}>
              <Ionicons name="star" size={18} color={COLORS.gold} />
              <Text style={styles.pointsTxt}>You earned {order.earned_points} loyalty points!</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: "#fff" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceAlt },
  title: { fontWeight: "800", fontSize: 17 },
  orderHead: { padding: SPACING.lg, backgroundColor: "#fff", marginBottom: SPACING.md },
  orderNo: { fontSize: 22, fontWeight: "900", color: COLORS.textPrimary },
  eta: { color: COLORS.textSecondary, marginTop: 4 },
  timeline: { padding: SPACING.lg, backgroundColor: "#fff" },
  tlRow: { flexDirection: "row", minHeight: 80 },
  tlLeft: { alignItems: "center", width: 40 },
  tlNode: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tlLine: { width: 2, flex: 1, marginTop: 4, marginBottom: 4 },
  tlBody: { flex: 1, paddingLeft: SPACING.md, paddingBottom: SPACING.md },
  tlTitle: { fontWeight: "800", color: COLORS.textMuted },
  tlDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  activePill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: COLORS.surfaceTint, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill, marginTop: 6, gap: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.brand },
  activeTxt: { fontSize: 10, fontWeight: "900", color: COLORS.brand, letterSpacing: 1 },
  detailsCard: { backgroundColor: "#fff", margin: SPACING.lg, padding: SPACING.lg, borderRadius: RADIUS.lg, ...SHADOW.card },
  section: { fontWeight: "800", fontSize: 15, marginBottom: SPACING.md },
  itemRow: { flexDirection: "row", paddingVertical: 4, gap: 8 },
  itemQty: { fontWeight: "800", color: COLORS.brand, width: 30 },
  itemName: { flex: 1, color: COLORS.textPrimary },
  itemPrice: { fontWeight: "700" },
  dvdr: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  pointsCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.black, padding: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.md },
  pointsTxt: { color: COLORS.gold, fontWeight: "800" },
});
