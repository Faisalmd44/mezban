import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";

export default function Wishlist() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wishlist, toggleWishlist, addToCart } = useApp();
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
        <Pressable testID="wl-back" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} /></Pressable>
        <Text style={styles.title}>My Wishlist</Text>
        <View style={styles.iconBtn} />
      </View>
      {loading ? <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} /> :
        items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>💔</Text>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySub}>Tap the heart icon on items you love</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: SPACING.lg }}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/product/${item.id}`)} style={styles.card}>
                <Image source={item.image} style={styles.img} contentFit="cover" />
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.price}>₹{item.price}</Text>
                </View>
                <Pressable testID={`wl-add-${item.id}`} onPress={() => addToCart({ item_id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image })} style={styles.addBtn}>
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
                <Pressable testID={`wl-remove-${item.id}`} onPress={() => toggleWishlist(item.id)} style={styles.heartBtn}>
                  <Ionicons name="heart" size={18} color={COLORS.brand} />
                </Pressable>
              </Pressable>
            )}
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: "#fff" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceAlt },
  title: { fontWeight: "800", fontSize: 17 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: SPACING.md },
  emptySub: { color: COLORS.textSecondary },
  card: { flexDirection: "row", alignItems: "center", padding: SPACING.md, backgroundColor: "#fff", borderRadius: RADIUS.md, marginBottom: SPACING.sm, ...SHADOW.card },
  img: { width: 64, height: 64, borderRadius: 8 },
  name: { fontWeight: "800", color: COLORS.textPrimary },
  price: { color: COLORS.brand, fontWeight: "900", marginTop: 4 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center", marginRight: 8 },
  heartBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceTint },
});
