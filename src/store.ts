import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Platform } from "react-native";

export type CartLine = {
  item_id: string; name: string; price: number; quantity: number;
  image: string; variant?: string;
};

export type User = {
  id: string; name: string; email?: string; phone?: string;
  picture?: string; wallet?: number; referral_code?: string;
  wishlist?: string[]; recently_viewed?: string[];
  addresses?: { id: string; label: string; line: string; is_default?: boolean }[];
};

type AppState = {
  user: User | null;
  cart: CartLine[];
  token: string | null;
  wishlist: string[];
  recentlyViewed: string[];
  setUser: (u: User | null) => void;
  setToken: (t: string | null) => void;
  addToCart: (line: CartLine) => void;
  updateQty: (id: string, variant: string | undefined, qty: number) => void;
  clearCart: () => void;
  toggleWishlist: (id: string) => void;
  pushRecentlyViewed: (id: string) => void;
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      cart: [],
      token: null,
      wishlist: [],
      recentlyViewed: [],
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      addToCart: (line) =>
        set((s) => {
          const idx = s.cart.findIndex((l) => l.item_id === line.item_id && l.variant === line.variant);
          if (idx >= 0) {
            const cart = [...s.cart];
            cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + line.quantity };
            return { cart };
          }
          return { cart: [...s.cart, line] };
        }),
      updateQty: (id, variant, qty) =>
        set((s) => ({
          cart: qty <= 0 ? s.cart.filter((l) => !(l.item_id === id && l.variant === variant)) : s.cart.map((l) => (l.item_id === id && l.variant === variant ? { ...l, quantity: qty } : l)),
        })),
      clearCart: () => set({ cart: [] }),
      toggleWishlist: (id) =>
        set((s) => ({
          wishlist: s.wishlist.includes(id) ? s.wishlist.filter((w) => w !== id) : [...s.wishlist, id],
        })),
      pushRecentlyViewed: (id) =>
        set((s) => ({
          recentlyViewed: [id, ...s.recentlyViewed.filter((r) => r !== id)].slice(0, 10),
        })),
    }),
    { name: "mezbaan-store", storage: createJSONStorage(() => AsyncStorage) }
  )
);

export async function saveToken(token: string) {
  await AsyncStorage.setItem("mez_token", token);
  useApp.getState().setToken(token);
}

export async function getDeviceId(): Promise<string> {
  if (Platform.OS === "web") {
    let id = await AsyncStorage.getItem("mez_device_id");
    if (!id) {
      id = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem("mez_device_id", id);
    }
    return id;
  }
  return Application.androidId || Application.iosIdForVendor || `device-${Date.now()}`;
}
