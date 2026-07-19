import { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";
import { VegBadge, BestsellerBadge, RatingPill, PrepTimePill, EmptyState } from "@/src/components/ui";

type Item = {
  id: string; name: string; category: string; price: number; image: string; veg: boolean;
  description: string; in_stock: boolean; variants: { name: string; price: number }[];
  popular?: boolean; rating?: number; prep_time?: number;
};

type Filter = "all" | "veg" | "nonveg" | "popular";

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cat, q } = useLocalSearchParams<{ cat?: string; q?: string }>();
  const { addToCart, cart, toggleWishlist, wishlist, pushRecentlyViewed } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<string[]>(["All"]);
  const [selected, setSelected] = useState(cat || "All");
  const [search, setSearch] = useState(q || "");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"popularity" | "price-low" | "price-high" | "rating">("popularity");

  const load = useCallback(async () => {
    try {
      const [menu, c] = await Promise.all([api.menu(), api.categories()]);
      setItems(menu); setCats(["All", ...c.categories]);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected(cat || "All"); }, [cat]);
  useEffect(() => { setSearch(q || ""); }, [q]);

  const filtered = useMemo(() => {
    let list = items;
    if (selected !== "All") list = list.filter((i) => i.category === selected);
    if (filter === "veg") list = list.filter((i) => i.veg);
    else if (filter === "nonveg") list = list.filter((i) => !i.veg);
    else if (filter === "popular") list = list.filter((i) => i.popular);
    const query = search.trim().toLowerCase();
    if (query) list = list.filter((i) => i.name.toLowerCase().includes(query) || i.description.toLowerCase().includes(query) || i.category.toLowerCase().includes(query));
    const sorted = [...list];
    if (sort === "price-low") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "rating") sorted.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
    else sorted.sort((a, b) => Number(b.popular || false) - Number(a.popular || false));
    return sorted;
  }, [items, selected, filter, search, sort]);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const openProduct = (id: string) => { pushRecentlyViewed(id); router.push(`/product/${id}`); };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable testID="menu-back" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="chevron-back" size={22} color={COLORS.white} /></Pressable>
        <Text style={styles.headerTitle}>Our Menu</Text>
        <Pressable testID="menu-search-clear" onPress={() => setSearch("")} style={styles.iconBtn}>{search ? <Ionicons name="close-circle" size={20} color={COLORS.gold} /> : <View />}</Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.gold} />
        <TextInput testID="menu-search-input" placeholder="Search dishes, cuisines..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} style={styles.searchInput} />
      </View>

      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {cats.map((c) => {
            const active = c === selected;
            return (
              <Pressable key={c} testID={`chip-${c}`} onPress={() => setSelected(c)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.filterRow}>
        {([{ key: "all", label: "All", icon: "grid" }, { key: "veg", label: "Veg", icon: "leaf" }, { key: "nonveg", label: "Non-Veg", icon: "flame" }, { key: "popular", label: "Bestseller", icon: "star" }] as const).map((f) => (
          <Pressable key={f.key} testID={`filter-${f.key}`} onPress={() => setFilter(f.key)} style={[styles.filterChip, filter === f.key && styles.filterActive]}>
            <Ionicons name={f.icon as any} size={13} color={filter === f.key ? COLORS.black : COLORS.gold} />
            <Text style={[styles.filterTxt, filter === f.key && styles.filterTxtActive]}>{f.label}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable testID="sort-btn" onPress={() => { const opts: typeof sort[] = ["popularity", "price-low", "price-high", "rating"]; setSort(opts[(opts.indexOf(sort) + 1) % opts.length]); }} style={styles.sortBtn}>
          <Ionicons name="swap-vertical" size={14} color={COLORS.gold} />
          <Text style={styles.sortTxt}>{sort.replace("-", " ")}</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered} keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: cartCount ? 120 : SPACING.xl, paddingHorizontal: SPACING.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.gold} colors={[COLORS.gold]} />}
          ListEmptyComponent={<EmptyState icon="🍽️" title="No items found" subtitle="Try a different category or search" actionLabel="Browse all" onAction={() => { setSelected("All"); setFilter("all"); setSearch(""); }} />}
          renderItem={({ item }) => (
            <MenuRow item={item} inWishlist={wishlist.includes(item.id)} onPress={() => openProduct(item.id)}
              onAdd={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); addToCart({ item_id: item.id, name: item.name, price: item.variants.length ? item.variants[0].price : item.price, quantity: 1, variant: item.variants.length ? item.variants[0].name : undefined, image: item.image }); }}
              onWish={() => toggleWishlist(item.id)}
            />
          )}
        />
      )}

      {cartCount > 0 ? (
        <Pressable testID="menu-cart-fab" onPress={() => router.push("/(tabs)/cart")} style={[styles.cartFab, { bottom: 78 + insets.bottom * 0.2 }]}>
          <Text style={styles.cartFabTxt}>{cartCount} item{cartCount > 1 ? "s" : ""} • ₹{cartTotal.toFixed(0)}</Text>
          <Text style={styles.cartFabCta}>View Cart →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MenuRow({ item, inWishlist, onPress, onAdd, onWish }: any) {
  const startPrice = item.variants.length ? item.variants[0].price : item.price;
  return (
    <Pressable testID={`menu-item-${item.id}`} onPress={onPress} style={styles.row}>
      <View style={{ flex: 1, paddingRight: SPACING.md }}>
        <View style={styles.badgeRow}><VegBadge veg={item.veg} />{item.popular ? <BestsellerBadge /> : null}</View>
        <Text style={styles.rowName}>{item.name}</Text>
        <View style={styles.metaRow}><RatingPill rating={item.rating || 4.5} />{item.prep_time ? <PrepTimePill minutes={item.prep_time} /> : null}</View>
        <Text style={styles.rowPrice}>₹{startPrice}{item.variants.length ? " onwards" : ""}</Text>
        <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
      </View>
      <View>
        <Image source={item.image} style={styles.rowImg} contentFit="cover" transition={250} />
        <View style={styles.rowActions}>
          <Pressable testID={`wish-${item.id}`} onPress={onWish} style={styles.wishBtn}><Ionicons name={inWishlist ? "heart" : "heart-outline"} size={14} color={inWishlist ? COLORS.gold : COLORS.white} /></Pressable>
          <Pressable testID={`add-${item.id}`} onPress={onAdd} style={styles.addPill} hitSlop={8}>
            <Text style={styles.addPillTxt}>ADD</Text><Ionicons name="add" size={14} color={COLORS.black} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: COLORS.charcoal },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.white },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: SPACING.lg, paddingHorizontal: SPACING.md, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.charcoal, gap: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14 },
  chipsRow: { height: 50, justifyContent: "center" },
  chipsContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: { height: 36, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.pill, backgroundColor: COLORS.charcoal, alignItems: "center", justifyContent: "center", flexShrink: 0, borderWidth: 1, borderColor: "transparent" },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipTxt: { fontWeight: "700", color: COLORS.white, fontSize: 13 },
  chipTxtActive: { color: COLORS.black },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, gap: 8, marginBottom: SPACING.sm },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.charcoal, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  filterTxt: { fontSize: 11, fontWeight: "700", color: COLORS.gold },
  filterTxtActive: { color: COLORS.black },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.charcoal, borderWidth: 1, borderColor: COLORS.border },
  sortTxt: { fontSize: 11, fontWeight: "700", color: COLORS.gold, textTransform: "capitalize" },
  row: { flexDirection: "row", paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  metaRow: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 4 },
  rowName: { fontSize: 15, fontWeight: "800", color: COLORS.white, marginTop: 2 },
  rowPrice: { fontSize: 14, color: COLORS.gold, fontWeight: "700", marginTop: 4 },
  rowDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  rowImg: { width: 110, height: 110, borderRadius: RADIUS.md },
  rowActions: { position: "absolute", bottom: -10, left: 10, right: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wishBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.charcoal, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  addPill: { backgroundColor: COLORS.gold, borderRadius: RADIUS.sm, paddingVertical: 6, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, ...SHADOW.gold },
  addPillTxt: { fontWeight: "900", color: COLORS.black, fontSize: 12, letterSpacing: 1 },
  cartFab: { position: "absolute", left: SPACING.lg, right: SPACING.lg, backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.lg, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...SHADOW.strong },
  cartFabTxt: { color: COLORS.black, fontWeight: "800" },
  cartFabCta: { color: COLORS.black, fontWeight: "900" },
});
