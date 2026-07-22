import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { stopAlert } from "@/src/services/AdminNotificationService";

const STATUS_FLOW = ["received", "preparing", "packed", "out_for_delivery", "delivered"];
const STATUS_LABEL: Record<string, string> = {
  received: "Received", preparing: "Preparing", packed: "Packed",
  out_for_delivery: "Out for Delivery", delivered: "Delivered", cancelled: "Cancelled",
};

export default function AdminOrderDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const o = await api.order(id);
      setOrder(o);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const acceptOrder = async () => {
    if (!order) return;
    setActing(true);
    try {
      await api.adminUpdateStatus(order.id, "preparing");
      await stopAlert(order.id);
      load();
    } catch {
      Alert.alert("Error", "Failed to accept order. Please try again.");
    } finally {
      setActing(false);
    }
  };

  const rejectOrder = () => {
    if (!order) return;
    Alert.alert(
      "Reject Order",
      "Are you sure you want to reject this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActing(true);
            try {
              await api.adminUpdateStatus(order.id, "cancelled");
              await stopAlert(order.id);
              router.back();
            } catch {
              Alert.alert("Error", "Failed to reject order. Please try again.");
            } finally {
              setActing(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !order) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }, styles.center]}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  const isReceived = order.status === "received";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[COLORS.black, COLORS.brandDark]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Order #{order.order_no}</Text>
          <Text style={styles.sub}>{STATUS_LABEL[order.status] || order.status}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.detailText}>{order.user_name}</Text>
          <Text style={styles.detailSub}>{order.user_phone}</Text>

          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.detailText}>{order.address}</Text>

          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{order.total.toFixed(0)}</Text>
          </View>
          <Text style={styles.payMethod}>Payment: {order.payment_method.toUpperCase()}</Text>
        </View>
      </ScrollView>

      {isReceived && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            testID="order-detail-reject"
            onPress={rejectOrder}
            style={[styles.actionBtn, styles.rejectBtn]}
            disabled={acting}
          >
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.rejectTxt}>Reject</Text>
          </Pressable>
          <Pressable
            testID="order-detail-accept"
            onPress={acceptOrder}
            style={[styles.actionBtn, styles.acceptBtn]}
            disabled={acting}
          >
            {acting ? (
              <ActivityIndicator color={COLORS.black} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={COLORS.black} />
                <Text style={styles.acceptTxt}>Accept Order</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  center: { justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  title: { fontWeight: "900", fontSize: 20, color: COLORS.white },
  sub: { color: COLORS.gold, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  card: { margin: SPACING.lg, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOW.card, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontWeight: "800", fontSize: 13, color: COLORS.gold, marginTop: SPACING.md, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  detailText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
  detailSub: { color: COLORS.textSecondary, fontSize: 14, marginTop: 2 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  itemQty: { color: COLORS.gold, fontWeight: "800", fontSize: 14, minWidth: 30 },
  itemName: { flex: 1, color: COLORS.white, fontSize: 14 },
  itemPrice: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "700" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { color: COLORS.white, fontWeight: "900", fontSize: 18 },
  totalValue: { color: COLORS.gold, fontWeight: "900", fontSize: 22 },
  payMethod: { color: COLORS.textMuted, fontSize: 12, marginTop: 6, fontWeight: "700" },
  actionBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, paddingHorizontal: SPACING.lg, paddingTop: 12, backgroundColor: COLORS.blackSoft, borderTopColor: COLORS.border, borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: RADIUS.md },
  rejectBtn: { backgroundColor: COLORS.error },
  rejectTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
  acceptBtn: { backgroundColor: COLORS.gold },
  acceptTxt: { color: COLORS.black, fontWeight: "800", fontSize: 15 },
});
