import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";
import { EmptyState, VegBadge, RatingPill } from "@/src/components/ui";

export default function Wishlist() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wishlist, toggleWishlist, addToCart, pushRecentlyViewed } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (wishlist.length === 0) { setItems([]); setLoading(false); return; }
      const all = await api.menu();
      setItems(all.filter((m: any) => wishlist.includes(m.id)));
      setLoading(false);
    })();
  }, [wishlist]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable testID="wl-back" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color={COLORS.white} /></Pressable>
        <Text style={styles.title}>My Wishlist</Text><View style={styles.iconBtn} />
      </View>
      {loading ? <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} /> :
        items.length === 0 ? (
          <EmptyState icon="💝" title="No favorites yet" subtitle="Tap the heart icon on items you love" actionLabel="Browse Menu" onAction={() => router.push("/(tabs)/menu")} />
        ) : (
          <FlatList
            data={items} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: SPACING.lg }}
            renderItem={({ item }) => (
              <Pressable testID={`wl-item-${item.id}`} onPress={() => { pushRecentlyViewed(item.id); router.push(`/product/${item.id}`); }} style={styles.card}>
                <Image source={item.image} style={styles.img} contentFit="cover" transition={250} />
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <View style={styles.vegRow}><VegBadge veg={item.veg} /><Text style={styles.cat}>{item.category}</Text></View>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.metaRow}><RatingPill rating={item.rating || 4.5} /><Text style={styles.price}>₹{item.price}</Text></View>
                </View>
                <View style={styles.actions}>
                  <Pressable testID={`wl-add-${item.id}`} onPress={() => addToCart({ item_id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image })} style={styles.addBtn}><Ionicons name="add" size={18} color={COLORS.black} /></Pressable>
                  <Pressable testID={`wl-remove-${item.id}`} onPress={() => toggleWishlist(item.id)} style={styles.heartBtn}><Ionicons name="heart" size={18} color={COLORS.gold} /></Pressable>
                </View>
              </Pressable>
            )}
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: COLORS.blackSoft },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.charcoal },
  title: { fontWeight: "800", fontSize: 17, color: COLORS.white },
  card: { flexDirection: "row", alignItems: "center", padding: SPACING.md, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  img: { width: 72, height: 72, borderRadius: RADIUS.sm },
  vegRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cat: { fontSize: 10, color: COLORS.gold, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  name: { fontWeight: "800", color: COLORS.white, fontSize: 15, marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4 },
  price: { color: COLORS.gold, fontWeight: "900", fontSize: 16 },
  actions: { gap: 8 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.gold, alignItems: "center", justifyContent: "center" },
  heartBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceTint, borderWidth: 1, borderColor: COLORS.border },
});
