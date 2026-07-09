import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Switch } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";

export default function AdminMenu() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const d = await api.menu();
    setItems(d);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (item: any) => {
    await api.adminToggleStock(item.id, !item.in_stock);
    setItems((arr) => arr.map((i) => i.id === item.id ? { ...i, in_stock: !i.in_stock } : i));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable testID="amenu-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Manage Menu</Text>
        <View style={styles.iconBtn} />
      </View>
      {loading ? <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: SPACING.lg }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`amenu-${item.id}`}>
              <Image source={item.image} style={styles.img} contentFit="cover" />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.category} • ₹{item.price}</Text>
                <View style={[styles.tag, { backgroundColor: item.in_stock ? "#E8F5E9" : "#FFEBEE" }]}>
                  <Text style={{ color: item.in_stock ? COLORS.success : COLORS.error, fontWeight: "700", fontSize: 11 }}>
                    {item.in_stock ? "IN STOCK" : "OUT OF STOCK"}
                  </Text>
                </View>
              </View>
              <Switch
                testID={`stock-${item.id}`}
                value={item.in_stock}
                onValueChange={() => toggle(item)}
                trackColor={{ true: COLORS.brand, false: COLORS.border }}
                thumbColor="#fff"
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: "#fff" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceAlt },
  title: { fontWeight: "800", fontSize: 17 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card },
  img: { width: 56, height: 56, borderRadius: 8 },
  name: { fontWeight: "800", color: COLORS.textPrimary },
  meta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  tag: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
});
