import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext } from "react";

export type CartLine = {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
  image?: string;
};

export type AppUser = {
  id: string;
  name: string;
  phone: string;
  wallet: number;
  loyalty_points: number;
  referral_code: string;
  wishlist?: string[];
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
};

export const AppContext = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error("AppContext missing");
  return c;
};

export async function loadToken(): Promise<string | null> {
  return AsyncStorage.getItem("mez_token");
}

export async function saveToken(token: string) {
  await AsyncStorage.setItem("mez_token", token);
}

export async function clearToken() {
  await AsyncStorage.removeItem("mez_token");
}

export async function loadCart(): Promise<CartLine[]> {
  const raw = await AsyncStorage.getItem("mez_cart");
  return raw ? JSON.parse(raw) : [];
}

export async function saveCart(c: CartLine[]) {
  await AsyncStorage.setItem("mez_cart", JSON.stringify(c));
}

export const cartTotal = (cart: CartLine[]) =>
  cart.reduce((sum, l) => sum + l.price * l.quantity, 0);

export const cartCount = (cart: CartLine[]) =>
  cart.reduce((sum, l) => sum + l.quantity, 0);
