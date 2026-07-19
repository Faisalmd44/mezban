import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import * as Haptics from "expo-haptics";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { useApp } from "@/src/store";
import { EmptyState } from "@/src/components/ui";

export default function CartTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, updateQty, clearCart, user } = useApp();
  const [refreshing] = useState(false);
  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const deliveryFee = subtotal >= 250 || subtotal === 0 ? 0 : 30;
  const remainingForFree = Math.max(0, 250 - subtotal);
  const progress = Math.min(1, subtotal / 250);

  const checkout = () => {
    if (!user?.phone) {
      Alert.alert("Mobile number required", "Please add a mobile number in your profile before placing an order.", [
        { text: "Add number", onPress: () => router.push("/(auth)/login") },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    router.push("/checkout");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="cart-back"><Ionicons name="chevron-back" size={22} color={COLORS.white} /></Pressable>
        <Text style={styles.title}>Your Cart ({cart.length})</Text>
        {cart.length > 0 ? <Pressable testID="cart-clear" onPress={() => clearCart()} style={styles.iconBtn}><Ionicons name="trash-outline" size={18} color={COLORS.error} /></Pressable> : <View style={styles.iconBtn} />}
      </View>

      {cart.length === 0 ? (
        <EmptyState icon="🛒" title="Your cart is empty" subtitle="Add some delicious food to get started" actionLabel="Browse Menu" onAction={() => router.push("/(tabs)/menu")} />
      ) : (
        <>
          <FlatList
            data={cart} keyExtractor={(i, idx) => `${i.item_id}-${i.variant || "v"}-${idx}`}
            contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 220 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {}} tintColor={COLORS.gold} colors={[COLORS.gold]} />}
            ListHeaderComponent={
              <View style={styles.freeCard}>
                <View style={styles.freeHead}>
                  <Ionicons name="bicycle" size={18} color={COLORS.gold} />
                  <Text style={styles.freeTxt}>{remainingForFree > 0 ? `Add ₹${remainingForFree.toFixed(0)} more for FREE delivery` : "You unlocked FREE delivery!"}</Text>
                </View>
                <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.cartCard}>
                <Image source={item.image} style={styles.cartImg} contentFit="cover" />
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.cartName}>{item.name}</Text>
                  {item.variant ? <Text style={styles.cartVariant}>{item.variant}</Text> : null}
                  <Text style={styles.cartPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable testID={`cart-dec-${item.item_id}`} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); updateQty(item.item_id, item.variant, item.quantity - 1); }} style={styles.stepBtn}><Ionicons name="remove" size={16} color={COLORS.gold} /></Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable testID={`cart-inc-${item.item_id}`} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); updateQty(item.item_id, item.variant, item.quantity + 1); }} style={styles.stepBtn}><Ionicons name="add" size={16} color={COLORS.gold} /></Pressable>
                </View>
              </View>
            )}
          />

          <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.row}><Text style={styles.lbl}>Item total</Text><Text style={styles.val}>₹{subtotal.toFixed(0)}</Text></View>
            <View style={styles.row}><Text style={styles.lbl}>Delivery fee</Text><Text style={[styles.val, deliveryFee === 0 && { color: COLORS.success }]}>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</Text></View>
            <View style={[styles.row, styles.totalRow]}><Text style={styles.totalLbl}>To Pay</Text><Text style={styles.totalVal}>₹{(subtotal + deliveryFee).toFixed(0)}</Text></View>
            <Pressable testID="checkout-btn" onPress={checkout} style={({ pressed }) => [styles.checkoutBtn, pressed && { transform: [{ scale: 0.98 }] }]}>
              <Text style={styles.checkoutTxt}>Proceed to Checkout</Text><Ionicons name="arrow-forward" size={18} color={COLORS.black} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: COLORS.blackSoft },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.charcoal },
  title: { fontSize: 17, fontWeight: "800", color: COLORS.white },
  freeCard: { backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  freeHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  freeTxt: { color: COLORS.white, fontWeight: "700", fontSize: 12 },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceTint, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.gold },
  cartCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  cartImg: { width: 56, height: 56, borderRadius: 8 },
  cartName: { fontWeight: "800", color: COLORS.white },
  cartVariant: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  cartPrice: { fontWeight: "900", color: COLORS.gold, marginTop: 4 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.gold, borderRadius: RADIUS.sm, paddingHorizontal: 4, paddingVertical: 2 },
  stepBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  qty: { fontWeight: "800", color: COLORS.gold, minWidth: 20, textAlign: "center" },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.blackSoft, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.strong },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  lbl: { color: COLORS.textSecondary },
  val: { color: COLORS.white, fontWeight: "700" },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm, paddingTop: SPACING.sm },
  totalLbl: { fontSize: 16, fontWeight: "800", color: COLORS.white },
  totalVal: { fontSize: 18, fontWeight: "900", color: COLORS.gold },
  checkoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingVertical: 14, gap: 8, marginTop: SPACING.md, ...SHADOW.gold },
  checkoutTxt: { color: COLORS.black, fontWeight: "800", fontSize: 16 },
});
