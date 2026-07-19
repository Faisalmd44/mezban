import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import {
  AppContext, AppUser, CartLine, loadCart, loadToken, saveCart, clearToken,
  loadRecentlyViewed, saveRecentlyViewed,
} from "@/src/store";
import { api } from "@/src/api";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const [bootDone, setBootDone] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      try {
        const token = await loadToken();
        if (token) {
          try { const me = await api.me(); setUser(me); } catch { await clearToken(); }
        }
        setCart(await loadCart());
        setRecentlyViewed(await loadRecentlyViewed());
      } finally { setBootDone(true); }
    })();
  }, []);

  useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);

  useEffect(() => {
    if (!bootDone) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)/login");
    else if (user && inAuth) router.replace("/(tabs)");
  }, [bootDone, user, segments, router]);

  useEffect(() => { saveCart(cart); }, [cart]);
  useEffect(() => { saveRecentlyViewed(recentlyViewed); }, [recentlyViewed]);

  const addToCart = useCallback((line: CartLine) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.item_id === line.item_id && l.variant === line.variant);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], quantity: next[idx].quantity + line.quantity }; return next; }
      return [...prev, line];
    });
  }, []);

  const updateQty = useCallback((item_id: string, variant: string | undefined, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((l) => !(l.item_id === item_id && l.variant === variant));
      return prev.map((l) => l.item_id === item_id && l.variant === variant ? { ...l, quantity: qty } : l);
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);
  const refreshUser = useCallback(async () => { try { setUser(await api.me()); } catch {} }, []);

  const toggleWishlist = useCallback(async (id: string) => {
    try { const res = await api.toggleWishlist(id); setUser((u) => u ? { ...u, wishlist: res.wishlist } : u); } catch {}
  }, []);

  const pushRecentlyViewed = useCallback((id: string) => {
    setRecentlyViewed((prev) => { const next = [id, ...prev.filter((x) => x !== id)].slice(0, 20); api.pushRecentlyViewed(id).catch(() => {}); return next; });
  }, []);

  if (!loaded && !error) return null;
  if (!bootDone) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContext.Provider value={{ user, setUser, cart, addToCart, updateQty, clearCart, wishlist: user?.wishlist || [], toggleWishlist, refreshUser, recentlyViewed, pushRecentlyViewed }}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0A0A" } }} />
        </AppContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
