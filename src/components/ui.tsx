import { View, Text, StyleSheet, Animated, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";

export function VegBadge({ veg, size = 14 }: { veg: boolean; size?: number }) {
  return (
    <View style={[styles.veg, { width: size, height: size, borderColor: veg ? COLORS.veg : COLORS.nonVeg }]}>
      <View style={[styles.vegDot, { width: size * 0.42, height: size * 0.42, borderRadius: (size * 0.42) / 2, backgroundColor: veg ? COLORS.veg : COLORS.nonVeg }]} />
    </View>
  );
}

export function BestsellerBadge() {
  return (
    <View style={styles.bestseller}>
      <Ionicons name="flame" size={10} color={COLORS.black} />
      <Text style={styles.bestsellerTxt}>BESTSELLER</Text>
    </View>
  );
}

export function RatingPill({ rating, count }: { rating: number; count?: number }) {
  return (
    <View style={styles.rating}>
      <Ionicons name="star" size={11} color={COLORS.black} />
      <Text style={styles.ratingTxt}>{rating.toFixed(1)}</Text>
      {count ? <Text style={styles.ratingCount}> ({count})</Text> : null}
    </View>
  );
}

export function PrepTimePill({ minutes }: { minutes: number }) {
  return (
    <View style={styles.prepTime}>
      <Ionicons name="time-outline" size={11} color={COLORS.gold} />
      <Text style={styles.prepTimeTxt}>{minutes} min</Text>
    </View>
  );
}

export function NewBadge() {
  return (
    <View style={styles.newBadge}>
      <Text style={styles.newBadgeTxt}>NEW</Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: any) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {actionLabel && onAction ? <AnimatedButton onPress={onAction} label={actionLabel} /> : null}
    </View>
  );
}

function AnimatedButton({ onPress, label }: { onPress: () => void; label: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale }], marginTop: SPACING.lg }}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} style={styles.emptyBtn}>
        <Text style={styles.emptyBtnTxt}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function Shimmer({ width, height = 16, radius = 8 }: { width: number | string; height?: number; radius?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);
  return <Animated.View style={[styles.shimmer, { width: width as any, height, borderRadius: radius, opacity }]} />;
}

export function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll ? <Pressable onPress={onSeeAll}><Text style={styles.seeAll}>See all</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  veg: { borderWidth: 1.5, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  vegDot: {},
  bestseller: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  bestsellerTxt: { color: COLORS.black, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  ratingTxt: { color: COLORS.black, fontSize: 11, fontWeight: "800" },
  ratingCount: { color: COLORS.black, fontSize: 10, fontWeight: "600" },
  prepTime: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.surfaceTint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.xs },
  prepTimeTxt: { color: COLORS.gold, fontSize: 10, fontWeight: "700" },
  newBadge: { backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.xs },
  newBadgeTxt: { color: COLORS.black, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl, gap: 6 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.white, marginTop: SPACING.md },
  emptySub: { color: COLORS.textSecondary, textAlign: "center" },
  emptyBtn: { backgroundColor: COLORS.gold, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: RADIUS.pill },
  emptyBtnTxt: { color: COLORS.black, fontWeight: "800" },
  shimmer: { backgroundColor: COLORS.surfaceTint },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: SPACING.lg, marginTop: SPACING.xl, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.white },
  seeAll: { color: COLORS.gold, fontWeight: "700", fontSize: 13 },
});
