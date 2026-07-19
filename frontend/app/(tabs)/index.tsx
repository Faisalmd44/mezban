import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, RefreshControl, ActivityIndicator, FlatList, Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";
import { VegBadge, BestsellerBadge, RatingPill, PrepTimePill, NewBadge, SectionHeader, Shimmer } from "@/src/components/ui";

type Item = {
  id: string; name: string; category: string; price: number; image: string; veg: boolean;
  description: string; popular?: boolean; rating?: number; prep_time?: number; created_at?: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  Burgers: "🍔", Pizza: "🍕", Pasta: "🍝", Fries: "🍟", Wraps: "🌯", Nuggets: "🍗", Combos: "🥡",
};

const BANNERS = [
  { id: "1", title: "Mezbaan Royal Feast", sub: "Get 15% OFF · Code WELCOME15", img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200", badge: "TODAY'S OFFER" },
  { id: "2", title: "New Arrivals", sub: "Fresh dishes added weekly", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200", badge: "NEW" },
  { id: "3", title: "Free Delivery", sub: "On orders above ₹250", img: "https://images.unsplash.com/photo-1526318896340-12f5f3898e6c?w=1200", badge: "FREE DELIVERY" },
];

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, user, recentlyViewed, pushRecentlyViewed } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const [menu, c] = await Promise.all([api.menu(), api.categories()]);
      setItems(menu); setCats(c.categories);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      setBannerIdx((i) => { const next = (i + 1) % BANNERS.length; bannerRef.current?.scrollToIndex({ index: next, animated: true }); return next; });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const popular = items.filter((i) => i.popular);
  const newArrivals = items.slice().sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 6);
  const recent = items.filter((i) => recentlyViewed.includes(i.id)).sort((a, b) => recentlyViewed.indexOf(a.id) - recentlyViewed.indexOf(b.id));
  const recommended = items.filter((i) => i.popular).slice(0, 5);
  const popularNear = items.slice(0, 5);

  const openProduct = (id: string) => { pushRecentlyViewed(id); router.push(`/product/${id}`); };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(" ")[0] || "Guest"}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={COLORS.gold} />
            <Text style={styles.location} numberOfLines={1}>Abul Fazal Enclave, Jamia Nagar</Text>
          </View>
        </View>
        <Pressable testID="header-profile-btn" onPress={() => router.push("/(tabs)/profile")} style={styles.avatar}>
          {user?.picture ? <Image source={user.picture} style={styles.avatarImg} contentFit="cover" /> : <Text style={styles.avatarTxt}>{(user?.name || "G")[0].toUpperCase()}</Text>}
        </Pressable>
      </View>

      <Pressable testID="search-bar" style={styles.searchBar} onPress={() => router.push({ pathname: "/(tabs)/menu", params: { q: query } })}>
        <Ionicons name="search" size={18} color={COLORS.gold} />
        <TextInput placeholder="Search burgers, pizzas, combos..." placeholderTextColor={COLORS.textMuted} value={query} onChangeText={setQuery} style={styles.searchInput} onSubmitEditing={() => router.push({ pathname: "/(tabs)/menu", params: { q: query } })} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: cartCount ? 120 : SPACING.xl }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.gold} colors={[COLORS.gold]} />}>
        <View style={styles.bannerWrap}>
          <FlatList ref={bannerRef} data={BANNERS} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setBannerIdx(Math.round(e.nativeEvent.contentOffset.x / Dimensions.get("window").width))}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => (
              <Pressable testID="hero-banner" onPress={() => router.push("/(tabs)/menu")} style={styles.banner}>
                <Image source={item.img} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
                <LinearGradient colors={["transparent", "rgba(10,10,10,0.85)", COLORS.black]} style={StyleSheet.absoluteFill} />
                <View style={styles.bannerContent}>
                  <View style={styles.bannerBadge}><Text style={styles.bannerBadgeTxt}>{item.badge}</Text></View>
                  <Text style={styles.bannerTitle}>{item.title}</Text>
                  <Text style={styles.bannerSub}>{item.sub}</Text>
                </View>
              </Pressable>
            )}
          />
          <View style={styles.bannerDots}>
            {BANNERS.map((_, i) => (<View key={i} style={[styles.dot, i === bannerIdx && styles.dotActive]} />))}
          </View>
        </View>

        <View style={styles.freeStrip}>
          <Ionicons name="bicycle" size={18} color={COLORS.gold} />
          <Text style={styles.freeStripTxt}>FREE Delivery on orders above ₹250</Text>
        </View>

        <SectionHeader title="What's on your mind?" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {cats.map((c) => (
            <Pressable testID={`category-${c}`} key={c} style={styles.catPill} onPress={() => router.push({ pathname: "/(tabs)/menu", params: { cat: c } })}>
              <View style={styles.catEmojiWrap}><Text style={styles.catEmoji}>{CATEGORY_ICONS[c] || "🍽️"}</Text></View>
              <Text style={styles.catName}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="🔥 Popular Picks" onSeeAll={() => router.push("/(tabs)/menu")} />
        {loading ? (
          <View style={styles.shimmerRow}>{[1, 2].map((i) => <Shimmer key={i} width={160} height={180} radius={RADIUS.lg} />)}</View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {popular.map((it) => (
              <Pressable key={it.id} testID={`popular-${it.id}`} style={styles.popCard} onPress={() => openProduct(it.id)}>
                <View style={styles.popImgWrap}>
                  <Image source={it.image} style={styles.popImg} contentFit="cover" transition={250} />
                  {it.popular ? <View style={styles.popBadgeWrap}><BestsellerBadge /></View> : null}
                </View>
                <View style={styles.popBody}>
                  <View style={styles.vegRow}><VegBadge veg={it.veg} /><Text style={styles.popCat}>{it.category}</Text></View>
                  <Text style={styles.popName} numberOfLines={1}>{it.name}</Text>
                  <View style={styles.popMeta}><RatingPill rating={it.rating || 4.5} />{it.prep_time ? <PrepTimePill minutes={it.prep_time} /> : null}</View>
                  <View style={styles.popFooter}>
                    <Text style={styles.popPrice}>₹{it.price}</Text>
                    <View style={styles.addBtn}><Ionicons name="add" size={18} color={COLORS.black} /></View>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {!loading && newArrivals.length > 0 ? (
          <>
            <SectionHeader title="✨ New Arrivals" onSeeAll={() => router.push("/(tabs)/menu")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {newArrivals.map((it) => (
                <Pressable key={it.id} style={styles.popCard} onPress={() => openProduct(it.id)}>
                  <View style={styles.popImgWrap}>
                    <Image source={it.image} style={styles.popImg} contentFit="cover" transition={250} />
                    <View style={styles.popBadgeWrap}><NewBadge /></View>
                  </View>
                  <View style={styles.popBody}><Text style={styles.popName} numberOfLines={1}>{it.name}</Text><Text style={styles.popPrice}>₹{it.price}</Text></View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {!loading && recent.length > 0 ? (
          <>
            <SectionHeader title="👀 Recently Viewed" onSeeAll={() => router.push("/(tabs)/menu")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {recent.map((it) => (
                <Pressable key={it.id} style={styles.popCard} onPress={() => openProduct(it.id)}>
                  <Image source={it.image} style={styles.popImg} contentFit="cover" transition={250} />
                  <View style={styles.popBody}><Text style={styles.popName} numberOfLines={1}>{it.name}</Text><Text style={styles.popPrice}>₹{it.price}</Text></View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {!loading && recommended.length > 0 ? (
          <>
            <SectionHeader title="🎯 Recommended For You" />
            {recommended.map((it) => (
              <Pressable key={it.id} style={styles.recCard} onPress={() => openProduct(it.id)}>
                <Image source={it.image} style={styles.recImg} contentFit="cover" />
                <View style={styles.recBody}>
                  <View style={styles.vegRow}><VegBadge veg={it.veg} /><Text style={styles.popCat}>{it.category}</Text></View>
                  <Text style={styles.popName}>{it.name}</Text>
                  <Text style={styles.popDesc} numberOfLines={2}>{it.description}</Text>
                  <View style={styles.popFooter}><Text style={styles.popPrice}>₹{it.price}</Text><RatingPill rating={it.rating || 4.5} /></View>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        {!loading && popularNear.length > 0 ? (
          <>
            <SectionHeader title="📍 Popular Near You" onSeeAll={() => router.push("/(tabs)/menu")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {popularNear.map((it) => (
                <Pressable key={it.id} style={styles.popCard} onPress={() => openProduct(it.id)}>
                  <Image source={it.image} style={styles.popImg} contentFit="cover" transition={250} />
                  <View style={styles.popBody}><Text style={styles.popName} numberOfLines={1}>{it.name}</Text><Text style={styles.popPrice}>₹{it.price}</Text></View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>MEZBAAN RESTRO</Text>
          <Text style={styles.footerTag}>Freshly Crafted, Honestly Served</Text>
          <Text style={styles.footerInfo}>📞 +91 859 524 4548</Text>
        </View>
      </ScrollView>

      {cartCount > 0 ? (
        <Pressable testID="floating-cart" onPress={() => router.push("/(tabs)/cart")} style={[styles.cartFab, { bottom: 78 + insets.bottom * 0.2 }]}>
          <View style={styles.cartFabLeft}>
            <View style={styles.cartCountChip}><Text style={styles.cartCountTxt}>{cartCount}</Text></View>
            <Text style={styles.cartFabTxt}>View Cart</Text>
          </View>
          <Text style={styles.cartFabPrice}>₹{cartTotal.toFixed(0)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm, gap: SPACING.md },
  greeting: { fontSize: 18, fontWeight: "800", color: COLORS.white },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  location: { color: COLORS.textSecondary, fontSize: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.charcoal, borderWidth: 1.5, borderColor: COLORS.gold, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarTxt: { color: COLORS.gold, fontWeight: "800" },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: SPACING.lg, marginBottom: SPACING.md, paddingHorizontal: SPACING.md, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.charcoal, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14 },
  bannerWrap: { marginHorizontal: SPACING.lg, height: 180, borderRadius: RADIUS.lg, overflow: "hidden" },
  banner: { width: Dimensions.get("window").width - SPACING.lg * 2, height: 180, borderRadius: RADIUS.lg, overflow: "hidden", justifyContent: "flex-end" },
  bannerContent: { padding: SPACING.lg },
  bannerBadge: { alignSelf: "flex-start", backgroundColor: COLORS.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm, marginBottom: SPACING.sm },
  bannerBadgeTxt: { fontSize: 10, fontWeight: "900", color: COLORS.black, letterSpacing: 1 },
  bannerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  bannerSub: { color: "rgba(255,255,255,0.9)", marginTop: 4 },
  bannerDots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: SPACING.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.borderLight },
  dotActive: { backgroundColor: COLORS.gold, width: 18 },
  freeStrip: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: SPACING.md, flexDirection: "row", gap: 8, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  freeStripTxt: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  catRow: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  catPill: { alignItems: "center", width: 76 },
  catEmojiWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.charcoal, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  catEmoji: { fontSize: 28 },
  catName: { fontSize: 12, fontWeight: "700", color: COLORS.gold, marginTop: 6 },
  shimmerRow: { flexDirection: "row", gap: SPACING.md, paddingHorizontal: SPACING.lg },
  hScroll: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  popCard: { width: 160, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.lg, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  popImgWrap: { position: "relative" },
  popImg: { width: "100%", height: 110 },
  popBadgeWrap: { position: "absolute", top: 8, left: 8 },
  popBody: { padding: SPACING.md, gap: 4 },
  vegRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  popCat: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  popName: { fontSize: 15, fontWeight: "800", color: COLORS.white },
  popDesc: { fontSize: 12, color: COLORS.textSecondary },
  popMeta: { flexDirection: "row", gap: 6, alignItems: "center" },
  popFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  popPrice: { fontSize: 16, fontWeight: "900", color: COLORS.gold },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.gold, alignItems: "center", justifyContent: "center" },
  recCard: { flexDirection: "row", marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.charcoal, borderRadius: RADIUS.lg, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card },
  recImg: { width: 120, height: 130 },
  recBody: { flex: 1, padding: SPACING.md, gap: 4 },
  footer: { alignItems: "center", paddingVertical: SPACING.xl, gap: 4 },
  footerBrand: { fontWeight: "900", letterSpacing: 3, color: COLORS.gold },
  footerTag: { color: COLORS.textSecondary, fontStyle: "italic", fontSize: 12 },
  footerInfo: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  cartFab: { position: "absolute", left: SPACING.lg, right: SPACING.lg, backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...SHADOW.strong },
  cartFabLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  cartCountChip: { backgroundColor: COLORS.black, paddingHorizontal: 10, paddingVertical: 2, borderRadius: RADIUS.pill },
  cartCountTxt: { fontWeight: "800", fontSize: 13, color: COLORS.gold },
  cartFabTxt: { color: COLORS.black, fontWeight: "800" },
  cartFabPrice: { color: COLORS.black, fontWeight: "900", fontSize: 16 },
});
