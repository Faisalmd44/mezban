import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";

type Item = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  veg: boolean;
  description: string;
  in_stock: boolean;
  variants: { name: string; price: number }[];
};

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cat, q } = useLocalSearchParams<{ cat?: string; q?: string }>();
  const { addToCart, cart } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<string[]>(["All"]);
  const [selected, setSelected] = useState(cat || "All");
  const [search, setSearch] = useState(q || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelected(cat || "All");
  }, [cat]);

  useEffect(() => {
    (async () => {
      const c = await api.categories();
      setCats(["All", ...c.categories]);
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    api.menu(selected === "All" ? undefined : selected, search || undefined).then((d) => {
      setItems(d);
      setLoading(false);
    });
  }, [selected, search]);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const data = useMemo(() => items, [items]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable testID="menu-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Our Menu</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          testID="menu-search-input"
          placeholder="Search items..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {cats.map((c) => {
            const active = c === selected;
            return (
              <Pressable
                key={c}
                testID={`chip-${c}`}
                onPress={() => setSelected(c)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: cartCount ? 120 : SPACING.xl, paddingHorizontal: SPACING.lg }}
          ListEmptyComponent={
            <Text style={styles.empty}>No items found</Text>
          }
          renderItem={({ item }) => (
            <MenuRow
              item={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onAdd={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                addToCart({
                  item_id: item.id,
                  name: item.name,
                  price: item.variants.length ? item.variants[0].price : item.price,
                  quantity: 1,
                  variant: item.variants.length ? item.variants[0].name : undefined,
                  image: item.image,
                });
              }}
            />
          )}
        />
      )}

      {cartCount > 0 ? (
        <Pressable
          testID="menu-cart-fab"
          onPress={() => router.push("/(tabs)/cart")}
          style={[styles.cartFab, { bottom: 78 + insets.bottom * 0.2 }]}
        >
          <Text style={styles.cartFabTxt}>{cartCount} item{cartCount > 1 ? "s" : ""} • ₹{cartTotal.toFixed(0)}</Text>
          <Text style={styles.cartFabCta}>View Cart →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MenuRow({ item, onPress, onAdd }: { item: Item; onPress: () => void; onAdd: () => void }) {
  const startPrice = item.variants.length ? item.variants[0].price : item.price;
  return (
    <Pressable testID={`menu-item-${item.id}`} onPress={onPress} style={styles.row}>
      <View style={{ flex: 1, paddingRight: SPACING.md }}>
        <View style={styles.vegMarker}>
          <View style={[styles.vegBox, { borderColor: item.veg ? COLORS.veg : COLORS.nonVeg }]}>
            <View style={[styles.vegDot, { backgroundColor: item.veg ? COLORS.veg : COLORS.nonVeg }]} />
          </View>
        </View>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowPrice}>₹{startPrice}{item.variants.length ? " onwards" : ""}</Text>
        <Text style={styles.rowDesc} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <View>
        <Image source={item.image} style={styles.rowImg} contentFit="cover" />
        <Pressable
          testID={`add-${item.id}`}
          onPress={onAdd}
          style={styles.addPill}
          hitSlop={8}
        >
          <Text style={styles.addPillTxt}>ADD</Text>
          <Ionicons name="add" size={14} color={COLORS.brand} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: COLORS.surfaceAlt },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  chipsRow: { height: 56, justifyContent: "center" },
  chipsContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: {
    height: 36,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipTxt: { fontWeight: "700", color: COLORS.textPrimary, fontSize: 13 },
  chipTxtActive: { color: "#fff" },
  empty: { textAlign: "center", color: COLORS.textMuted, marginTop: 40 },
  row: {
    flexDirection: "row",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vegMarker: { marginBottom: 4 },
  vegBox: { width: 14, height: 14, borderWidth: 1.5, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  rowName: { fontSize: 15, fontWeight: "800", color: COLORS.textPrimary, marginTop: 2 },
  rowPrice: { fontSize: 14, color: COLORS.textPrimary, fontWeight: "700", marginTop: 2 },
  rowDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  rowImg: { width: 110, height: 110, borderRadius: RADIUS.md },
  addPill: {
    position: "absolute",
    bottom: -10,
    left: 15,
    right: 15,
    backgroundColor: "#fff",
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
    ...SHADOW.card,
  },
  addPillTxt: { fontWeight: "900", color: COLORS.brand, fontSize: 12, letterSpacing: 1 },
  cartFab: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...SHADOW.strong,
  },
  cartFabTxt: { color: "#fff", fontWeight: "800" },
  cartFabCta: { color: COLORS.gold, fontWeight: "900" },
});
