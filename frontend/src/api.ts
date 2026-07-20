import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function authHeader(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem("mez_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, opts: RequestInit = {}, withAuth = true) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (withAuth) Object.assign(headers, await authHeader());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, { ...opts, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export type GoogleLoginPayload = {
  id_token: string; email: string; name: string; picture?: string; google_id: string; device_id: string;
};

export const api = {
  googleLogin: (payload: GoogleLoginPayload) => request("/auth/google", { method: "POST", body: JSON.stringify(payload) }, false),
  updateMobile: (phone: string) => request("/auth/mobile", { method: "POST", body: JSON.stringify({ phone }) }),
  me: () => request("/auth/me"),
  toggleWishlist: (id: string) => request(`/auth/wishlist/${id}`, { method: "POST" }),
  saveAddress: (payload: { label: string; line: string; is_default?: boolean }) => request("/auth/address", { method: "POST", body: JSON.stringify(payload) }),
  deleteAddress: (id: string) => request(`/auth/address/${id}`, { method: "DELETE" }),
  pushRecentlyViewed: (id: string) => request("/auth/recent", { method: "POST", body: JSON.stringify({ item_id: id }) }),
  menu: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (search) params.append("search", search);
    return request(`/menu?${params.toString()}`, {}, false);
  },
  categories: () => request("/menu/categories", {}, false),
  item: (id: string) => request(`/menu/${id}`, {}, false),
  coupons: () => request("/coupons", {}, false),
  validateCoupon: (code: string, subtotal: number) => request(`/coupons/validate?code=${encodeURIComponent(code)}&subtotal=${subtotal}`),
  placeOrder: (payload: any) => request("/orders", { method: "POST", body: JSON.stringify(payload) }),
  myOrders: () => request("/orders"),
  order: (id: string) => request(`/orders/${id}`),
  razorpayConfig: () => request("/payments/razorpay/config", {}, false),
  verifyRazorpay: (payload: { order_id: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => request("/payments/razorpay/verify", { method: "POST", body: JSON.stringify(payload) }),
  cancelRazorpay: (order_id: string) => request("/payments/razorpay/cancel", { method: "POST", body: JSON.stringify({ order_id }) }),
  adminOrders: () => request("/admin/orders"),
  adminUpdateStatus: (id: string, status: string) => request(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  adminStats: () => request("/admin/stats"),
  adminToggleStock: (id: string, in_stock: boolean) => request(`/admin/menu/${id}`, { method: "PATCH", body: JSON.stringify({ in_stock }) }),
  adminListCoupons: () => request("/admin/coupons"),
  adminUpdateCoupon: (code: string, payload: any) => request(`/admin/coupons/${code}`, { method: "PATCH", body: JSON.stringify(payload) }),
};
