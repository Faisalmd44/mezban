import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mezbaan-api`;

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
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = text || `Request failed: ${res.status}`;
    try { const j = JSON.parse(text); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export type GoogleLoginPayload = {
  id_token: string; email: string; name: string; picture?: string; google_id: string; device_id: string;
};

export type EmailPasswordLoginPayload = {
  supabase_token: string; email: string; name?: string; device_id: string;
};

export const api = {
  googleLogin: (payload: GoogleLoginPayload) => request("/auth/google", { method: "POST", body: JSON.stringify(payload) }, false),
  emailPasswordLogin: (payload: EmailPasswordLoginPayload) => request("/auth/email-password", { method: "POST", body: JSON.stringify(payload) }, false),
  updateMobile: (phone: string) => request("/auth/update-mobile", { method: "PATCH", body: JSON.stringify({ phone }) }),
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
  registerFCMToken: (token: string) => request("/auth/fcm-token", { method: "POST", body: JSON.stringify({ token }) }),
};
