import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  popular?: boolean;
};

const CATEGORY_ICONS: Record<string, string> = {
  Burgers: "🍔",
  Pizza: "🍕",
  Pasta: "🍝",
  Fries: "🍟",
  Wraps: "🌯",
  Nuggets: "🍗",
  Combos: "🥡",
};

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, user } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [menu, c] = await Promise.all([api.menu(), api.categories()]);
      setItems(menu);
      setCats(c.categories);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const popular = items.filter((i) => i.popular);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(" ")[0] || "Guest"} 👋</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={COLORS.brand} />
            <Text style={styles.location} numberOfLines={1}>
              Abul Fazal Enclave, Jamia Nagar
            </Text>
          </View>
        </View>
        <Pressable testID="header-profile-btn" onPress={() => router.push("/(tabs)/profile")} style={styles.avatar}>
          <Text style={styles.avatarTxt}>{(user?.name || "G")[0].toUpperCase()}</Text>
        </Pressable>
      </View>

      <Pressable
        testID="search-bar"
        style={styles.searchBar}
        onPress={() => router.push({ pathname: "/(tabs)/menu", params: { q: query } })}
      >
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          placeholder="Search burgers, pizzas, combos..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          onSubmitEditing={() => router.push({ pathname: "/(tabs)/menu", params: { q: query } })}
        />
      </Pressable>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: cartCount ? 120 : SPACING.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Hero Banner */}
        <Pressable testID="hero-banner" onPress={() => router.push("/(tabs)/menu")} style={styles.hero}>
          <Image
            source="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200"
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.85)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeTxt}>NEW DROP</Text>
            </View>
            <Text style={styles.heroTitle}>Mezbaan Royal Feast</Text>
            <Text style={styles.heroSub}>Get 20% OFF • Code WELCOME20</Text>
          </View>
        </Pressable>

        {/* Free delivery strip */}
        <View style={styles.freeStrip}>
          <Ionicons name="bicycle" size={18} color={COLORS.gold} />
          <Text style={styles.freeStripTxt}>FREE Delivery on orders above ₹250</Text>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>What's on your mind?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {cats.map((c) => (
            <Pressable
              testID={`category-${c}`}
              key={c}
              style={styles.catPill}
              onPress={() => router.push({ pathname: "/(tabs)/menu", params: { cat: c } })}
            >
              <Text style={styles.catEmoji}>{CATEGORY_ICONS[c] || "🍽️"}</Text>
              <Text style={styles.catName}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Popular */}
        <View style={styles.popHead}>
          <Text style={styles.sectionTitle}>🔥 Popular Picks</Text>
          <Pressable onPress={() => router.push("/(tabs)/menu")}>
            <Text style={styles.viewAll}>See all</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
        ) : (
          popular.map((it) => (
            <PopularCard key={it.id} item={it} onPress={() => router.push(`/product/${it.id}`)} />
          ))
        )}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>MEZBAAN RESTRO</Text>
          <Text style={styles.footerTag}>Freshly Crafted, Honestly Served</Text>
          <Text style={styles.footerInfo}>📞 +91 859 524 4548</Text>
        </View>
      </ScrollView>

      {cartCount > 0 ? (
        <Pressable testID="floating-cart" onPress={() => router.push("/(tabs)/cart")} style={[styles.cartFab, { bottom: 78 + insets.bottom * 0.2 }]}>
          <View style={styles.cartFabLeft}>
            <View style={styles.cartCountChip}>
              <Text style={styles.cartCountTxt}>{cartCount}</Text>
            </View>
            <Text style={styles.cartFabTxt}>View Cart</Text>
          </View>
          <Text style={styles.cartFabPrice}>₹{cartTotal.toFixed(0)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PopularCard({ item, onPress }: { item: Item; onPress: () => void }) {
  return (
    <Pressable testID={`popular-${item.id}`} style={styles.popCard} onPress={onPress}>
      <Image source={item.image} style={styles.popImg} contentFit="cover" transition={250} />
      <View style={styles.popBody}>
        <View style={styles.vegMarkerRow}>
          <VegBadge veg={item.veg} />
          <Text style={styles.popCat}>{item.category}</Text>
        </View>
        <Text style={styles.popName}>{item.name}</Text>
        <Text style={styles.popDesc} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.popFooter}>
          <Text style={styles.popPrice}>₹{item.price}</Text>
          <View style={styles.addBtn}>
            <Ionicons name="add" size={18} color={COLORS.white} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function VegBadge({ veg }: { veg: boolean }) {
  return (
    <View style={[styles.veg, { borderColor: veg ? COLORS.veg : COLORS.nonVeg }]}>
      <View style={[styles.vegDot, { backgroundColor: veg ? COLORS.veg : COLORS.nonVeg }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: SPACING.md,
  },
  greeting: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  location: { color: COLORS.textSecondary, fontSize: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontWeight: "800" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  hero: {
    marginHorizontal: SPACING.lg,
    height: 180,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroContent: { padding: SPACING.lg },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  heroBadgeTxt: { fontSize: 10, fontWeight: "900", color: COLORS.black, letterSpacing: 1 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  heroSub: { color: "rgba(255,255,255,0.9)", marginTop: 4 },
  freeStrip: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.black,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  freeStripTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  catRow: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  catPill: {
    alignItems: "center",
    width: 76,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surfaceTint,
    borderRadius: RADIUS.md,
  },
  catEmoji: { fontSize: 28 },
  catName: { fontSize: 12, fontWeight: "700", color: COLORS.brand, marginTop: 4 },
  popHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: SPACING.lg,
  },
  viewAll: { color: COLORS.brand, fontWeight: "700", marginTop: SPACING.xl },
  popCard: {
    flexDirection: "row",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  popImg: { width: 120, height: 130 },
  popBody: { flex: 1, padding: SPACING.md, gap: 4 },
  vegMarkerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  popCat: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  popName: { fontSize: 15, fontWeight: "800", color: COLORS.textPrimary },
  popDesc: { fontSize: 12, color: COLORS.textSecondary },
  popFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  popPrice: { fontSize: 16, fontWeight: "900", color: COLORS.textPrimary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  veg: { width: 14, height: 14, borderWidth: 1.5, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  footer: { alignItems: "center", paddingVertical: SPACING.xl, gap: 4 },
  footerBrand: { fontWeight: "900", letterSpacing: 3, color: COLORS.brand },
  footerTag: { color: COLORS.textSecondary, fontStyle: "italic", fontSize: 12 },
  footerInfo: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  cartFab: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...SHADOW.strong,
  },
  cartFabLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  cartCountChip: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  cartCountTxt: { fontWeight: "800", fontSize: 13, color: COLORS.black },
  cartFabTxt: { color: "#fff", fontWeight: "800" },
  cartFabPrice: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
