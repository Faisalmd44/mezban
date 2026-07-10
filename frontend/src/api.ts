import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
console.log("BASE URL =", BASE);
export const ADMIN_PASSCODE = "MEZBAAN2026";

async function authHeader(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem("mez_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, opts: RequestInit = {}, withAuth = true, admin = false) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (withAuth) Object.assign(headers, await authHeader());
  if (admin) headers["X-Admin-Passcode"] = ADMIN_PASSCODE;
  
  console.log("BASE URL =", BASE);
  console.log("FETCH URL:", `${BASE}/api${path}`);
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  signup: (name: string, phone: string) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify({ name, phone }) }, false),
  me: () => request("/auth/me"),
  toggleWishlist: (id: string) => request(`/auth/wishlist/${id}`, { method: "POST" }),
  menu: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (search) params.append("search", search);
    return request(`/menu?${params.toString()}`, {}, false);
  },
  categories: () => request("/menu/categories", {}, false),
  item: (id: string) => request(`/menu/${id}`, {}, false),
  coupons: () => request("/coupons", {}, false),
  placeOrder: (payload: any) =>
    request("/orders", { method: "POST", body: JSON.stringify(payload) }),
  myOrders: () => request("/orders"),
  order: (id: string) => request(`/orders/${id}`),
  // admin
  adminOrders: () => request("/admin/orders", {}, false, true),
  adminUpdateStatus: (id: string, status: string) =>
    request(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, false, true),
  adminStats: () => request("/admin/stats", {}, false, true),
  adminToggleStock: (id: string, in_stock: boolean) =>
    request(`/admin/menu/${id}`, { method: "PATCH", body: JSON.stringify({ in_stock }) }, false, true),
};
