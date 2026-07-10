import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";
import RazorpayWebView, { RazorpaySuccessPayload } from "@/src/components/RazorpayWebView";

export default function Checkout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, user, clearCart, refreshUser } = useApp();

  const [address, setAddress] = useState("Abul Fazal Enclave, Jamia Nagar, New Delhi");
  const [phone, setPhone] = useState(user?.phone || "");
  const [name, setName] = useState(user?.name || "");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<"cod" | "upi" | "razorpay">("cod");
  const [coupon, setCoupon] = useState("");
  const [coupons, setCoupons] = useState<any[]>([]);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [showUpi, setShowUpi] = useState(false);
  const [showCoupons, setShowCoupons] = useState(false);

  // Razorpay
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [rzpOrder, setRzpOrder] = useState<{
    order_id: string;
    razorpay_order_id: string;
    amount: number;
  } | null>(null);
  const [showRzp, setShowRzp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { api.coupons().then(setCoupons); }, []);
  useEffect(() => {
    api.razorpayConfig()
      .then((r: any) => {
        setRazorpayConfigured(!!r?.configured);
        setRazorpayKeyId(r?.key_id || "");
      })
      .catch(() => setRazorpayConfigured(false));
  }, []);

  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const validCoupon = coupons.find((c) => c.code === coupon.toUpperCase() && subtotal >= c.min_order);
  const discount = validCoupon ? Math.round((subtotal * validCoupon.discount_percent) / 100) : 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  const placeOrder = async () => {
    setError("");
    if (!name.trim() || phone.trim().length < 10 || !address.trim()) {
      setError("Please fill name, phone & address");
      return;
    }
    if (payment === "upi") {
      setShowUpi(true);
      return;
    }
    await submit();
  };

  const submit = async () => {
    setPlacing(true);
    try {
      const res = await api.placeOrder({
        items: cart,
        address, phone, name,
        payment_method: payment,
        coupon_code: validCoupon?.code,
        notes,
      });
      if (payment === "razorpay") {
        // Do NOT clear the cart yet -- payment must succeed first.
        setRzpOrder({
          order_id: res.id,
          razorpay_order_id: res.razorpay_order_id,
          amount: Math.round(res.total * 100),
        });
        setShowRzp(true);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clearCart();
      refreshUser();
      setShowUpi(false);
      router.replace(`/tracking/${res.id}`);
    } catch (e: any) {
      setError(e.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const onRazorpaySuccess = async (payload: RazorpaySuccessPayload) => {
    if (!rzpOrder) return;
    setVerifying(true);
    try {
      const verifyRes = await api.verifyRazorpay({
        order_id: rzpOrder.order_id,
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_payment_id: payload.razorpay_payment_id,
        razorpay_signature: payload.razorpay_signature,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clearCart();
      refreshUser();
      setShowRzp(false);
      setRzpOrder(null);
      router.replace(`/tracking/${verifyRes.order.id}`);
    } catch (e: any) {
      setError(e.message || "Payment verification failed");
      setShowRzp(false);
    } finally {
      setVerifying(false);
    }
  };

  const onRazorpayFailure = async (msg: string) => {
    setError(msg || "Payment failed. Please try again.");
    if (rzpOrder) {
      try { await api.cancelRazorpay(rzpOrder.order_id); } catch {}
    }
    setShowRzp(false);
    setRzpOrder(null);
  };

  const onRazorpayDismiss = async () => {
    if (rzpOrder) {
      try { await api.cancelRazorpay(rzpOrder.order_id); } catch {}
    }
    setShowRzp(false);
    setRzpOrder(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Pressable testID="checkout-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 180 }}>
        <Text style={styles.section}>Delivery Details</Text>
        <View style={styles.input}>
          <Ionicons name="person" size={18} color={COLORS.textSecondary} />
          <TextInput value={name} onChangeText={setName} placeholder="Name" style={styles.txt} testID="co-name" />
        </View>
        <View style={styles.input}>
          <Ionicons name="call" size={18} color={COLORS.textSecondary} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="number-pad" style={styles.txt} testID="co-phone" />
        </View>
        <View style={styles.input}>
          <Ionicons name="location" size={18} color={COLORS.textSecondary} />
          <TextInput value={address} onChangeText={setAddress} placeholder="Address" multiline style={styles.txt} testID="co-address" />
        </View>
        <View style={styles.input}>
          <Ionicons name="chatbox" size={18} color={COLORS.textSecondary} />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Delivery instructions (optional)" style={styles.txt} testID="co-notes" />
        </View>

        <Text style={styles.section}>Apply Coupon</Text>
        <View style={styles.input}>
          <Ionicons name="pricetag" size={18} color={COLORS.gold} />
          <TextInput
            value={coupon}
            onChangeText={(t) => setCoupon(t.toUpperCase())}
            placeholder="Enter code"
            autoCapitalize="characters"
            style={styles.txt}
            testID="co-coupon"
          />
          <Pressable onPress={() => setShowCoupons(true)} testID="co-view-coupons">
            <Text style={{ color: COLORS.brand, fontWeight: "800" }}>View</Text>
          </Pressable>
        </View>
        {validCoupon ? <Text style={styles.couponGood}>✓ {validCoupon.discount_percent}% off applied!</Text> : null}

        <Text style={styles.section}>Payment Method</Text>
        <Pressable testID="pay-cod" onPress={() => setPayment("cod")} style={[styles.payRow, payment === "cod" && styles.payActive]}>
          <Ionicons name="cash" size={22} color={COLORS.success} />
          <Text style={styles.payLbl}>Cash on Delivery</Text>
          {payment === "cod" ? <Ionicons name="checkmark-circle" size={20} color={COLORS.brand} /> : null}
        </Pressable>
        <Pressable testID="pay-upi" onPress={() => setPayment("upi")} style={[styles.payRow, payment === "upi" && styles.payActive]}>
          <Ionicons name="qr-code" size={22} color={COLORS.brand} />
          <Text style={styles.payLbl}>UPI QR Code</Text>
          {payment === "upi" ? <Ionicons name="checkmark-circle" size={20} color={COLORS.brand} /> : null}
        </Pressable>
        <Pressable
          testID="pay-razorpay"
          onPress={() => {
            if (!razorpayConfigured) {
              setError("Online payment is not available right now. Please choose COD or UPI.");
              return;
            }
            setError("");
            setPayment("razorpay");
          }}
          style={[styles.payRow, payment === "razorpay" && styles.payActive, !razorpayConfigured && { opacity: 0.55 }]}
        >
          <Ionicons name="card" size={22} color={COLORS.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.payLbl}>Pay Online (Razorpay)</Text>
            <Text style={styles.paySub}>
              {razorpayConfigured ? "Cards, UPI, Netbanking, Wallets" : "Unavailable — key not configured"}
            </Text>
          </View>
          {payment === "razorpay" ? <Ionicons name="checkmark-circle" size={20} color={COLORS.brand} /> : null}
        </Pressable>

        <View style={styles.totals}>
          <Row lbl="Subtotal" val={`₹${subtotal.toFixed(0)}`} />
          {discount > 0 ? <Row lbl={`Coupon (${validCoupon.code})`} val={`-₹${discount}`} good /> : null}
          <Row lbl="Delivery fee" val={deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`} good={deliveryFee === 0} />
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLbl}>Total</Text>
            <Text style={styles.totalVal}>₹{total.toFixed(0)}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Pressable testID="place-order-btn" onPress={placeOrder} disabled={placing} style={styles.placeBtn}>
          {placing ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.placeTxt}>Place Order</Text>
              <Text style={styles.placePrice}>₹{total.toFixed(0)}</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Coupons Modal */}
      <Modal visible={showCoupons} transparent animationType="slide" onRequestClose={() => setShowCoupons(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { padding: SPACING.lg }]}>
            <Text style={styles.modalTitle}>Available Coupons</Text>
            {coupons.map((c) => (
              <Pressable
                key={c.code}
                testID={`coupon-${c.code}`}
                onPress={() => { setCoupon(c.code); setShowCoupons(false); }}
                style={styles.couponCard}
              >
                <View style={styles.couponBadge}>
                  <Text style={styles.couponPct}>{c.discount_percent}%</Text>
                  <Text style={styles.couponOff}>OFF</Text>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.couponCode}>{c.code}</Text>
                  <Text style={styles.couponDesc}>{c.description}</Text>
                  <Text style={styles.couponMin}>Min order ₹{c.min_order}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowCoupons(false)} style={[styles.modalBtn, { backgroundColor: COLORS.brand, marginTop: SPACING.md }]}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* Razorpay Checkout Modal */}
      <Modal
        visible={showRzp}
        transparent={false}
        animationType="slide"
        onRequestClose={onRazorpayDismiss}
      >
        {rzpOrder && razorpayKeyId ? (
          <View style={{ flex: 1 }}>
            <RazorpayWebView
              keyId={razorpayKeyId}
              razorpayOrderId={rzpOrder.razorpay_order_id}
              amount={rzpOrder.amount}
              name="Mezbaan Restro"
              description={`Order ${rzpOrder.order_id.slice(0, 8)}`}
              prefill={{ name, contact: phone, email: "" }}
              onSuccess={onRazorpaySuccess}
              onFailure={onRazorpayFailure}
              onDismiss={onRazorpayDismiss}
            />
            {verifying ? (
              <View style={styles.verifyOverlay} testID="razorpay-verifying">
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ color: "#fff", marginTop: 12, fontWeight: "700" }}>
                  Verifying payment…
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Row({ lbl, val, good }: any) {
  return (
    <View style={styles.totRow}>
      <Text style={styles.totLbl}>{lbl}</Text>
      <Text style={[styles.totVal, good && { color: COLORS.success }]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: "#fff" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceAlt },
  title: { fontSize: 17, fontWeight: "800" },
  section: { fontWeight: "800", fontSize: 15, color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  input: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm, minHeight: 48, gap: 8 },
  txt: { flex: 1, color: COLORS.textPrimary, paddingVertical: SPACING.sm },
  couponGood: { color: COLORS.success, fontWeight: "700", marginTop: 4 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.border, padding: 2 },
  toggleOn: { backgroundColor: COLORS.brand },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  toggleDotOn: { alignSelf: "flex-end" },
  payRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, gap: 12, borderWidth: 1.5, borderColor: "transparent" },
  payActive: { borderColor: COLORS.brand, backgroundColor: COLORS.surfaceTint },
  payLbl: { flex: 1, fontWeight: "700", color: COLORS.textPrimary },
  paySub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  totals: { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totLbl: { color: COLORS.textSecondary },
  totVal: { fontWeight: "700", color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLbl: { fontWeight: "800", fontSize: 16 },
  totalVal: { fontWeight: "900", fontSize: 20, color: COLORS.brand },
  error: { color: COLORS.error, textAlign: "center", marginTop: SPACING.md },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, ...SHADOW.strong },
  placeBtn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.pill, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: SPACING.xl, alignItems: "center" },
  placeTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  placePrice: { color: COLORS.gold, fontWeight: "900", fontSize: 18 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: SPACING.xl + 20, alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.textPrimary, marginBottom: SPACING.lg },
  qr: { width: 180, height: 180, borderRadius: RADIUS.md, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  upiId: { fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACING.md },
  amount: { fontSize: 22, fontWeight: "900", color: COLORS.brand, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.pill, alignItems: "center" },
  couponCard: { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceTint, marginBottom: SPACING.sm, alignSelf: "stretch" },
  couponBadge: { backgroundColor: COLORS.brand, padding: SPACING.sm, borderRadius: RADIUS.sm, alignItems: "center", minWidth: 64 },
  couponPct: { color: "#fff", fontWeight: "900", fontSize: 18 },
  couponOff: { color: "#fff", fontWeight: "700", fontSize: 10 },
  couponCode: { fontWeight: "900", color: COLORS.textPrimary },
  couponDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  couponMin: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  verifyOverlay: {
    position: "absolute",
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
});
