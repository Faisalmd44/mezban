import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import { COLORS } from "@/src/theme";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AppContext, AppUser, CartLine, loadCart, loadRecentlyViewed, loadToken, saveCart, saveRecentlyViewed, useApp } from "@/src/store";
import { api } from "@/src/api";

SplashScreen.preventAutoHideAsync();

type MezbaanAppState = {
  user: AppUser | null;
  cart: CartLine[];
  wishlist: string[];
  recentlyViewed: string[];
};

const initialState: MezbaanAppState = {
  user: null,
  cart: [],
  wishlist: [],
  recentlyViewed: [],
};

function MezbaanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MezbaanAppState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      const cart = await loadCart();
      const recent = await loadRecentlyViewed();
      let user: AppUser | null = null;
      if (token) {
        try {
          user = await api.me();
        } catch {
          user = null;
        }
      }
      setState({ user, cart, wishlist: user?.wishlist || [], recentlyViewed: recent });
      setReady(true);
    })();
  }, []);

  const setUser = (u: AppUser | null) => setState((s) => ({ ...s, user: u, wishlist: u?.wishlist || [] }));

  const addToCart = (line: CartLine) =>
    setState((s) => {
      const idx = s.cart.findIndex((l) => l.item_id === line.item_id && l.variant === line.variant);
      let cart: CartLine[];
      if (idx >= 0) {
        cart = [...s.cart];
        cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + line.quantity };
      } else {
        cart = [...s.cart, line];
      }
      saveCart(cart);
      return { ...s, cart };
    });

  const updateQty = (item_id: string, variant: string | undefined, qty: number) =>
    setState((s) => {
      const cart = qty <= 0
        ? s.cart.filter((l) => !(l.item_id === item_id && l.variant === variant))
        : s.cart.map((l) => (l.item_id === item_id && l.variant === variant ? { ...l, quantity: qty } : l));
      saveCart(cart);
      return { ...s, cart };
    });

  const clearCart = () => {
    saveCart([]);
    setState((s) => ({ ...s, cart: [] }));
  };

  const toggleWishlist = async (id: string) => {
    await api.toggleWishlist(id);
    const { user } = await api.me();
    setState((s) => ({ ...s, user, wishlist: user?.wishlist || [] }));
  };

  const refreshUser = async () => {
    const user = await api.me();
    setState((s) => ({ ...s, user, wishlist: user?.wishlist || [] }));
  };

  const pushRecentlyViewed = (id: string) =>
    setState((s) => {
      const recentlyViewed = [id, ...s.recentlyViewed.filter((r) => r !== id)].slice(0, 10);
      saveRecentlyViewed(recentlyViewed);
      return { ...s, recentlyViewed };
    });

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.black }}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <AppContext.Provider value={{ user: state.user, setUser, cart: state.cart, addToCart, updateQty, clearCart, wishlist: state.wishlist, toggleWishlist, refreshUser, recentlyViewed: state.recentlyViewed, pushRecentlyViewed }}>
      {children}
    </AppContext.Provider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useIconFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <MezbaanProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="tracking/[id]" />
        <Stack.Screen name="offers" />
        <Stack.Screen name="wishlist" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </MezbaanProvider>
  );
}
