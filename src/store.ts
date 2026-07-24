import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { createContext, useContext } from "react";
import * as Crypto from "expo-crypto";

export type CartLine = {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
  image?: string;
};

export type SavedAddress = {
  id: string;
  label: string;
  line: string;
  is_default?: boolean;
};

export type AppUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  picture?: string;
  wallet: number;
  referral_code: string;
  wishlist?: string[];
  addresses?: SavedAddress[];
  recently_viewed?: string[];
  is_admin?: boolean;
  google_id?: string;
};

export type AppCtx = {
  user: AppUser | null;
  setUser: (u: AppUser | null) => void;
  cart: CartLine[];
  addToCart: (line: CartLine) => void;
  updateQty: (item_id: string, variant: string | undefined, qty: number) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (id: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  recentlyViewed: string[];
  pushRecentlyViewed: (id: string) => void;
};

export const AppContext = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error("AppContext missing");
  return c;
};

export async function loadToken(): Promise<string | null> { return AsyncStorage.getItem("mez_token"); }
export async function saveToken(token: string) { await AsyncStorage.setItem("mez_token", token); }
export async function clearToken() { await AsyncStorage.removeItem("mez_token"); }
export async function loadCart(): Promise<CartLine[]> { const raw = await AsyncStorage.getItem("mez_cart"); return raw ? JSON.parse(raw) : []; }
export async function saveCart(c: CartLine[]) { await AsyncStorage.setItem("mez_cart", JSON.stringify(c)); }
export async function loadRecentlyViewed(): Promise<string[]> { const raw = await AsyncStorage.getItem("mez_recent"); return raw ? JSON.parse(raw) : []; }
export async function saveRecentlyViewed(ids: string[]) { await AsyncStorage.setItem("mez_recent", JSON.stringify(ids)); }

let _deviceId: string | null = null;
export async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  let id = await AsyncStorage.getItem("mez_device_id");
  if (!id) {
    const native = Application.getAndroidId?.() || "";
    id = native || (await Crypto.randomUUID());
    await AsyncStorage.setItem("mez_device_id", id as string);
  }
  _deviceId = id as string;
  return id as string;
}

export const cartTotal = (cart: CartLine[]) => cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
export const cartCount = (cart: CartLine[]) => cart.reduce((sum, l) => sum + l.quantity, 0);
