import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, FlatList } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";
import { VegBadge, BestsellerBadge, RatingPill, PrepTimePill, SectionHeader } from "@/src/components/ui";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addToCart, wishlist, toggleWishlist, pushRecentlyViewed } = useApp();
  const [item, setItem] = useState<any>(null);
  const [variant, setVariant] = useState<{ name: string; price: number } | null>(null);
  const [qty, setQty] = useState(1);
  const [allItems, setAllItems] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    api.item(id).then((d) => { setItem(d); if (d.variants?.length) setVariant(d.variants[0]); pushRecentlyViewed(d.id); });
    api.menu().then(setAllItems).catch(() => {});
  }, [id]);

  if (!item) return <View style={styles.loader}><ActivityIndicator color={COLORS.gold} /></View>;

  const price = variant ? variant.price : item.price;
  const total = price * qty;
  const inWishlist = wishlist.includes(item.id);
  const fbt = allItems.filter((i) => i.category === item.category && i.id !== item.id).slice(0, 4);

  const onAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    addToCart({ item_id: item.id, name: item.name, price, quantity: qty, variant: variant?.name, image: item.image });
    router.back();
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroWrap}>
          <Image source={item.image} style={styles.hero} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(10,10,10,0.6)", "transparent", COLORS.black]} style={StyleSheet.absoluteFill} />
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable testID="pd-back" onPress={() => router.back()} style={styles.topBtn}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
            <Pressable testID="pd-wishlist" onPress={() => toggleWishlist(item.id)} style={styles.topBtn}><Ionicons name={inWishlist ? "heart" : "heart-outline"} size={22} color={inWishlist ? COLORS.gold : "#fff"} /></Pressable>
          </View>
          {item.is_bestseller ? <View style={styles.heroBadge}><BestsellerBadge /></View> : null}
        </View>

        <View style={styles.body}>
          <View style={styles.vegRow}><VegBadge veg={item.is_veg} size={18} /><Text style={styles.cat}>{item.category}</Text></View>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.metaRow}><RatingPill rating={item.rating || 4.5} count={item.rating_count} />{item.prep_time ? <PrepTimePill minutes={item.prep_time} /> : null}</View>
          <Text style={styles.priceTag}>₹{price}</Text>
          <Text style={styles.desc}>{item.description}</Text>

          {item.variants?.length ? (
            <>
              <Text style={styles.sectionTitle}>Choose Size</Text>
              {item.variants.map((v: any) => {
                const active = v.name === variant?.name;
                return (
                  <Pressable key={v.name} testID={`variant-${v.name}`} onPress={() => setVariant(v)} style={[styles.variantRow, active && styles.variantActive]}>
                    <View style={[styles.radio, active && { borderColor: COLORS.gold }]}>{active ? <View style={styles.radioDot} /> : null}</View>
                    <Text style={styles.variantName}>{v.name}</Text><Text style={styles.variantPrice}>₹{v.price}</Text>
                  </Pressable>
                );
              })}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.stepper}>
            <Pressable testID="pd-dec" onPress={() => setQty(Math.max(1, qty - 1))} style={styles.stepBtn}><Ionicons name="remove" size={18} color={COLORS.gold} /></Pressable>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable testID="pd-inc" onPress={() => setQty(qty + 1)} style={styles.stepBtn}><Ionicons name="add" size={18} color={COLORS.gold} /></Pressable>
          </View>

          {fbt.length > 0 ? (
            <>
              <SectionHeader title="🛒 Frequently Bought Together" />
              <FlatList horizontal showsHorizontalScrollIndicator={false} data={fbt} keyExtractor={(i) => i.id} contentContainerStyle={{ gap: SPACING.md, paddingHorizontal: SPACING.lg, marginHorizontal: -SPACING.lg }}
                renderItem={({ item: fbtItem }) => (
                  <Pressable onPress={() => router.push(`/product/${fbtItem.id}`)} style={styles.fbtCard}>
                    <Image source={fbtItem.image} style={styles.fbtImg} contentFit="cover" transition={250} />
                    <Text style={styles.fbtName} numberOfLines={1}>{fbtItem.name}</Text>
                    <Text style={styles.fbtPrice}>₹{fbtItem.price}</Text>
                    <Pressable onPress={() => addToCart({ item_id: fbtItem.id, name: fbtItem.name, price: fbtItem.price, quantity: 1, image: fbtItem.image })} style={styles.fbtAdd}><Ionicons name="add" size={14} color={COLORS.black} /></Pressable>
                  </Pressable>
                )}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Pressable testID="pd-add-cart" onPress={onAdd} style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }]}>
          <Text style={styles.ctaTxt}>Add to Cart</Text><Text style={styles.ctaPrice}>₹{total.toFixed(0)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.black },
  heroWrap: { height: 340 },
  hero: { width: "100%", height: "100%" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: SPACING.lg, flexDirection: "row", justifyContent: "space-between" },
  topBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  heroBadge: { position: "absolute", bottom: 12, left: SPACING.lg },
  body: { padding: SPACING.lg },
  vegRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cat: { fontSize: 11, fontWeight: "700", color: COLORS.gold, textTransform: "uppercase", letterSpacing: 1 },
  name: { fontSize: 26, fontWeight: "900", color: COLORS.white, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: SPACING.sm },
  priceTag: { fontSize: 24, fontWeight: "900", color: COLORS.gold, marginTop: SPACING.md },
  desc: { color: COLORS.textSecondary, marginTop: 6, lineHeight: 22 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: COLORS.white, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  variantRow: { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, marginBottom: SPACING.sm, gap: 12, backgroundColor: COLORS.charcoal },
  variantActive: { borderColor: COLORS.gold, backgroundColor: COLORS.surfaceTint },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold },
  variantName: { flex: 1, fontWeight: "700", color: COLORS.white },
  variantPrice: { fontWeight: "900", color: COLORS.white },
  stepper: { flexDirection: "row", alignSelf: "flex-start", borderWidth: 1.5, borderColor: COLORS.gold, borderRadius: RADIUS.pill, paddingHorizontal: 4, paddingVertical: 4, alignItems: "center" },
  stepBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  qty: { fontWeight: "800", color: COLORS.gold, minWidth: 28, textAlign: "center", fontSize: 16 },
  fbtCard: { width: 130, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  fbtImg: { width: "100%", height: 80, borderRadius: RADIUS.sm, marginBottom: 6 },
  fbtName: { fontSize: 12, fontWeight: "700", color: COLORS.white },
  fbtPrice: { fontSize: 13, fontWeight: "900", color: COLORS.gold, marginTop: 2 },
  fbtAdd: { position: "absolute", bottom: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.gold, alignItems: "center", justifyContent: "center" },
  bottom: { padding: SPACING.lg, backgroundColor: COLORS.blackSoft, borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOW.strong },
  cta: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingVertical: 16, paddingHorizontal: SPACING.xl, flexDirection: "row", justifyContent: "space-between", alignItems: "center", ...SHADOW.gold },
  ctaTxt: { color: COLORS.black, fontWeight: "800", fontSize: 16 },
  ctaPrice: { color: COLORS.black, fontWeight: "900", fontSize: 18 },
});
