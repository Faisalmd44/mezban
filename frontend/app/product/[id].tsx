import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addToCart, wishlist, toggleWishlist } = useApp();
  const [item, setItem] = useState<any>(null);
  const [variant, setVariant] = useState<{ name: string; price: number } | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    api.item(id!).then((d) => {
      setItem(d);
      if (d.variants?.length) setVariant(d.variants[0]);
    });
  }, [id]);

  if (!item) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={COLORS.brand} />
      </View>
    );
  }

  const price = variant ? variant.price : item.price;
  const total = price * qty;
  const inWishlist = wishlist.includes(item.id);

  const onAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addToCart({
      item_id: item.id,
      name: item.name,
      price,
      quantity: qty,
      variant: variant?.name,
      image: item.image,
    });
    router.back();
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={item.image} style={styles.hero} contentFit="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "transparent"]}
            style={[StyleSheet.absoluteFillObject, { height: 120 }]}
          />
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable testID="pd-back" onPress={() => router.back()} style={styles.topBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Pressable testID="pd-wishlist" onPress={() => toggleWishlist(item.id)} style={styles.topBtn}>
              <Ionicons name={inWishlist ? "heart" : "heart-outline"} size={22} color={inWishlist ? COLORS.gold : "#fff"} />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.vegRow}>
            <View style={[styles.vegBox, { borderColor: item.veg ? COLORS.veg : COLORS.nonVeg }]}>
              <View style={[styles.vegDot, { backgroundColor: item.veg ? COLORS.veg : COLORS.nonVeg }]} />
            </View>
            <Text style={styles.cat}>{item.category}</Text>
          </View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.desc}>{item.description}</Text>
          <Text style={styles.priceTag}>₹{price}</Text>

          {item.variants?.length ? (
            <>
              <Text style={styles.sectionTitle}>Choose Size</Text>
              {item.variants.map((v: any) => {
                const active = v.name === variant?.name;
                return (
                  <Pressable
                    key={v.name}
                    testID={`variant-${v.name}`}
                    onPress={() => setVariant(v)}
                    style={[styles.variantRow, active && styles.variantActive]}
                  >
                    <View style={[styles.radio, active && { borderColor: COLORS.brand }]}>
                      {active ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text style={styles.variantName}>{v.name}</Text>
                    <Text style={styles.variantPrice}>₹{v.price}</Text>
                  </Pressable>
                );
              })}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.stepper}>
            <Pressable testID="pd-dec" onPress={() => setQty(Math.max(1, qty - 1))} style={styles.stepBtn}>
              <Ionicons name="remove" size={18} color={COLORS.brand} />
            </Pressable>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable testID="pd-inc" onPress={() => setQty(qty + 1)} style={styles.stepBtn}>
              <Ionicons name="add" size={18} color={COLORS.brand} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Pressable testID="pd-add-cart" onPress={onAdd} style={styles.cta}>
          <Text style={styles.ctaTxt}>Add to Cart</Text>
          <Text style={styles.ctaPrice}>₹{total.toFixed(0)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  heroWrap: { height: 320 },
  hero: { width: "100%", height: "100%" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: SPACING.lg, flexDirection: "row", justifyContent: "space-between" },
  topBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  body: { padding: SPACING.lg },
  vegRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  vegBox: { width: 14, height: 14, borderWidth: 1.5, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  cat: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  name: { fontSize: 26, fontWeight: "900", color: COLORS.textPrimary, marginTop: 4 },
  desc: { color: COLORS.textSecondary, marginTop: 6, lineHeight: 20 },
  priceTag: { fontSize: 22, fontWeight: "900", color: COLORS.brand, marginTop: SPACING.md },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  variantRow: {
    flexDirection: "row", alignItems: "center", padding: SPACING.md, borderWidth: 1.5,
    borderColor: COLORS.border, borderRadius: RADIUS.md, marginBottom: SPACING.sm, gap: 12,
  },
  variantActive: { borderColor: COLORS.brand, backgroundColor: COLORS.surfaceTint },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.brand },
  variantName: { flex: 1, fontWeight: "700", color: COLORS.textPrimary },
  variantPrice: { fontWeight: "900", color: COLORS.textPrimary },
  stepper: {
    flexDirection: "row", alignSelf: "flex-start", borderWidth: 1.5, borderColor: COLORS.brand,
    borderRadius: RADIUS.pill, paddingHorizontal: 4, paddingVertical: 4, alignItems: "center",
  },
  stepBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  qty: { fontWeight: "800", color: COLORS.brand, minWidth: 28, textAlign: "center", fontSize: 16 },
  bottom: { padding: SPACING.lg, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOW.strong },
  cta: { backgroundColor: COLORS.brand, borderRadius: RADIUS.pill, paddingVertical: 16, paddingHorizontal: SPACING.xl, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ctaTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ctaPrice: { color: COLORS.gold, fontWeight: "900", fontSize: 18 },
});
