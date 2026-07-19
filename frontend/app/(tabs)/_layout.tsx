import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Platform } from "react-native";
import { COLORS } from "@/src/theme";
import { useApp } from "@/src/store";

export default function TabsLayout() {
  const { cart } = useApp();
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.gold,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      tabBarStyle: { backgroundColor: COLORS.black, borderTopColor: COLORS.border, height: Platform.OS === "ios" ? 86 : 64, paddingTop: 6, paddingBottom: Platform.OS === "ios" ? 26 : 8 },
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} /> }} />
      <Tabs.Screen name="cart" options={{ title: "Cart", tabBarIcon: ({ color, size }) => (
        <View>
          <Ionicons name="bag-handle" size={size} color={color} />
          {cartCount > 0 ? (<View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View>) : null}
        </View>
      )}} />
      <Tabs.Screen name="orders" options={{ title: "Orders", tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: { position: "absolute", right: -6, top: -3, backgroundColor: COLORS.gold, borderRadius: 999, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: COLORS.black, fontSize: 9, fontWeight: "800" },
});
