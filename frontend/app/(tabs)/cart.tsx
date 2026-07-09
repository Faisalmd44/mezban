import { View, Text, StyleSheet, FlatList, Pressable, Image as RNImage } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { useApp } from "@/src/store";

export default function CartTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, updateQty } = useApp();
  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const deliveryFee = subtotal >= 250 || subtotal === 0 ? 0 : 30;
  const remainingForFree = Math.max(0, 250 - subtotal);
  const progress = Math.min(1, subtotal / 250);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="cart-back">
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Your Cart ({cart.length})</Text>
        <View style={styles.iconBtn} />
      </View>

      {cart.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add some delicious food to get started</Text>
          <Pressable
            testID="cart-browse-btn"
            onPress={() => router.push("/(tabs)/menu")}
            style={styles.browseBtn}
          >
            <Text style={styles.browseTxt}>Browse Menu</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(i, idx) => `${i.item_id}-${i.variant || "v"}-${idx}`}
            contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 220 }}
            ListHeaderComponent={
              <View style={styles.freeCard}>
                <View style={styles.freeHead}>
                  <Ionicons name="bicycle" size={18} color={COLORS.gold} />
                  <Text style={styles.freeTxt}>
                    {remainingForFree > 0
                      ? `Add ₹${remainingForFree.toFixed(0)} more for FREE delivery`
                      : "🎉 You unlocked FREE delivery!"}
                  </Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
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
                  <Pressable
                    testID={`cart-dec-${item.item_id}`}
                    onPress={() => updateQty(item.item_id, item.variant, item.quantity - 1)}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="remove" size={16} color={COLORS.brand} />
                  </Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable
                    testID={`cart-inc-${item.item_id}`}
                    onPress={() => updateQty(item.item_id, item.variant, item.quantity + 1)}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="add" size={16} color={COLORS.brand} />
                  </Pressable>
                </View>
              </View>
            )}
          />

          <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.row}>
              <Text style={styles.lbl}>Item total</Text>
              <Text style={styles.val}>₹{subtotal.toFixed(0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.lbl}>Delivery fee</Text>
              <Text style={[styles.val, deliveryFee === 0 && { color: COLORS.success }]}>
                {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
              </Text>
            </View>
            <View style={[styles.row, styles.totalRow]}>
              <Text style={styles.totalLbl}>To Pay</Text>
              <Text style={styles.totalVal}>₹{(subtotal + deliveryFee).toFixed(0)}</Text>
            </View>
            <Pressable
              testID="checkout-btn"
              onPress={() => router.push("/checkout")}
              style={styles.checkoutBtn}
            >
              <Text style={styles.checkoutTxt}>Proceed to Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: COLORS.white,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceAlt },
  title: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.xl, gap: 8 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary, marginTop: SPACING.md },
  emptySub: { color: COLORS.textSecondary },
  browseBtn: {
    backgroundColor: COLORS.brand, paddingHorizontal: SPACING.xl, paddingVertical: 14,
    borderRadius: RADIUS.pill, marginTop: SPACING.lg,
  },
  browseTxt: { color: "#fff", fontWeight: "800" },
  freeCard: { backgroundColor: COLORS.black, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  freeHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  freeTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.gold },
  cartCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card,
  },
  cartImg: { width: 56, height: 56, borderRadius: 8 },
  cartName: { fontWeight: "800", color: COLORS.textPrimary },
  cartVariant: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  cartPrice: { fontWeight: "900", color: COLORS.textPrimary, marginTop: 4 },
  stepper: {
    flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.brand,
    borderRadius: RADIUS.sm, paddingHorizontal: 4, paddingVertical: 2,
  },
  stepBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  qty: { fontWeight: "800", color: COLORS.brand, minWidth: 20, textAlign: "center" },
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff",
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, ...SHADOW.strong,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  lbl: { color: COLORS.textSecondary },
  val: { color: COLORS.textPrimary, fontWeight: "700" },
  totalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm, paddingTop: SPACING.sm },
  totalLbl: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary },
  totalVal: { fontSize: 18, fontWeight: "900", color: COLORS.brand },
  checkoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.brand, borderRadius: RADIUS.pill, paddingVertical: 14, gap: 8, marginTop: SPACING.md,
  },
  checkoutTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
