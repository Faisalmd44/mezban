import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(msg: string, status = 400) {
  return json({ error: msg }, status);
}

async function getAuthUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  const { data, error: e } = await supabase.auth.getUser(token);
  if (e || !data.user) return null;
  return data.user;
}

async function getUserProfile(userId: string) {
  const { data } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  return data;
}

async function upsertUser(userId: string, email: string, name: string, picture?: string, googleId?: string, deviceId?: string) {
  const { data: existing } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (existing) {
    const updates: any = {};
    if (name && name !== existing.name) updates.name = name;
    if (email && email !== existing.email) updates.email = email;
    if (picture && picture !== existing.picture) updates.picture = picture;
    if (googleId && googleId !== existing.google_id) updates.google_id = googleId;
    if (deviceId && deviceId !== existing.device_id) updates.device_id = deviceId;
    if (Object.keys(updates).length > 0) {
      await supabase.from("users").update(updates).eq("id", userId);
    }
    return existing;
  }
  const referralCode = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "MEZ" + Math.floor(Math.random() * 9999);
  const { data, error: e } = await supabase.from("users").insert({
    id: userId, email, name, picture, google_id: googleId, device_id: deviceId,
    referral_code: referralCode, wallet: 0, is_admin: false,
  }).select("*").single();
  if (e) throw new Error(e.message);
  return data;
}

async function verifySupabaseToken(token: string) {
  const { data, error: e } = await supabase.auth.getUser(token);
  if (e || !data.user) return null;
  return data.user;
}

async function createRazorpayOrder(amountInPaise: number, receipt: string): Promise<string | null> {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return null;
  const auth = btoa(`${keyId}:${keySecret}`);
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ amount: amountInPaise, currency: "INR", receipt, payment_capture: 1 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch {
    return null;
  }
}

async function sendAdminPushNotification(supabaseClient: any, order: any) {
  try {
    const { data: admins } = await supabaseClient
      .from("users")
      .select("id")
      .eq("is_admin", true);
    if (!admins || admins.length === 0) return;
    const adminIds = admins.map((a: any) => a.id);
    const { data: tokens } = await supabaseClient
      .from("fcm_tokens")
      .select("token")
      .in("user_id", adminIds);
    if (!tokens || tokens.length === 0) return;
    const serverKey = Deno.env.get("FCM_SERVER_KEY");
    if (!serverKey) return;
    const itemSummary = (order.order_items || []).map((i: any) => `${i.quantity}x ${i.name}`).join(", ");
    const payload = {
      notification: { title: "New Order Received!", body: `Order #${order.order_no} — ${itemSummary || "New order"} • ₹${order.total}`, sound: "alarm" },
      data: { order_id: order.id, order_no: order.order_no, type: "new_order" },
      android: { priority: "high", notification: { sound: "alarm", channel_id: "new-order-alarm", priority: "high" } },
      registration_ids: tokens.map((t: any) => t.token),
    };
    await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `key=${serverKey}` },
      body: JSON.stringify(payload),
    });
  } catch {}
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/mezbaan-api/, "");
    const method = req.method;

    if (path === "/auth/google" && method === "POST") {
      const body = await req.json();
      const { google_id, email, name, picture, device_id } = body;
      if (!email) return error("Email required", 400);
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await upsertUser(user.id, email, name, picture, google_id, device_id);
      return json({ token: (req.headers.get("Authorization") || "").replace("Bearer ", ""), user: profile });
    }

    if (path === "/auth/email-password" && method === "POST") {
      const body = await req.json();
      const { supabase_token, email, name, device_id } = body;
      if (!supabase_token || !email) return error("Missing credentials", 400);
      const authUser = await verifySupabaseToken(supabase_token);
      if (!authUser) return error("Invalid token", 401);
      const profile = await upsertUser(authUser.id, email, name, undefined, undefined, device_id);
      return json({ token: supabase_token, user: profile });
    }

    if (path === "/auth/me" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile) return error("Profile not found", 404);
      return json(profile);
    }

    if (path === "/auth/update-mobile" && method === "PATCH") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { phone } = body;
      const { data, error: e } = await supabase.from("users").update({ phone }).eq("id", user.id).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path === "/auth/address" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { label, line, is_default } = body;
      if (is_default) {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
      }
      const { data, error: e } = await supabase.from("addresses").insert({
        user_id: user.id, label, line, is_default: !!is_default,
      }).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path.match(/^\/auth\/address\/[\w-]+$/) && method === "DELETE") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const id = path.split("/")[3];
      const { error: e } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
      if (e) return error(e.message, 500);
      return json({ success: true });
    }

    if (path.match(/^\/auth\/wishlist\/[\w-]+$/) && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const itemId = path.split("/")[3];
      const { data: profile } = await supabase.from("users").select("wishlist").eq("id", user.id).maybeSingle();
      const wishlist: string[] = Array.isArray(profile?.wishlist) ? profile.wishlist : [];
      const idx = wishlist.indexOf(itemId);
      if (idx >= 0) wishlist.splice(idx, 1);
      else wishlist.push(itemId);
      const { data, error: e } = await supabase.from("users").update({ wishlist }).eq("id", user.id).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path === "/auth/recent" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { item_id } = body;
      if (!item_id) return error("item_id required", 400);
      const { data: profile } = await supabase.from("users").select("recently_viewed").eq("id", user.id).maybeSingle();
      const recent: string[] = Array.isArray(profile?.recently_viewed) ? profile.recently_viewed.filter((id: string) => id !== item_id) : [];
      recent.unshift(item_id);
      const trimmed = recent.slice(0, 20);
      const { data, error: e } = await supabase.from("users").update({ recently_viewed: trimmed }).eq("id", user.id).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path === "/auth/fcm-token" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { token } = body;
      if (!token) return error("Token required", 400);
      const { data: existing } = await supabase.from("fcm_tokens").select("*").eq("user_id", user.id).eq("token", token).maybeSingle();
      if (!existing) {
        await supabase.from("fcm_tokens").insert({ user_id: user.id, token });
      }
      return json({ success: true });
    }

    if (path === "/menu" && method === "GET") {
      const { data, error: e } = await supabase.from("menu_items").select("*").order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path === "/menu/categories" && method === "GET") {
      const { data, error: e } = await supabase.from("menu_items").select("category").order("category");
      if (e) return error(e.message, 500);
      const categories = Array.from(new Set((data || []).map((r: any) => r.category).filter(Boolean)));
      return json({ categories });
    }

    if (path.match(/^\/menu\/[\w-]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const { data, error: e } = await supabase.from("menu_items").select("*").eq("id", id).maybeSingle();
      if (e) return error(e.message, 500);
      if (!data) return error("Item not found", 404);
      return json(data);
    }

    if (path === "/orders" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const { data, error: e } = await supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path === "/orders" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { items, address, total, payment_method, payment_status } = body;
      if (!items || !Array.isArray(items) || items.length === 0) return error("No items in order", 400);
      const orderNo = "MEZ-" + Date.now();
      const { data: order, error: oe } = await supabase.from("orders").insert({
        order_no: orderNo, user_id: user.id, user_name: body.user_name || "",
        user_phone: body.user_phone || "", address: address || "", total: total || 0,
        status: "received", payment_method: payment_method || "cod", payment_status: payment_status || "pending",
      }).select("*").single();
      if (oe) return error(oe.message, 500);
      const orderItems = items.map((item: any) => ({
        order_id: order.id, item_id: item.item_id || null, name: item.name, price: item.price, quantity: item.quantity,
      }));
      const { error: oie } = await supabase.from("order_items").insert(orderItems);
      if (oie) return error(oie.message, 500);
      let razorpayOrderId: string | null = null;
      if ((payment_method || "cod") === "razorpay") {
        razorpayOrderId = await createRazorpayOrder(Math.round(Number(order.total) * 100), order.order_no);
        if (razorpayOrderId) {
          await supabase.from("orders").update({ razorpay_order_id: razorpayOrderId }).eq("id", order.id);
        }
      }
      const { data: fullOrder } = await supabase.from("orders").select("*, order_items(*)").eq("id", order.id).single();
      await sendAdminPushNotification(supabase, fullOrder);
      return json(fullOrder);
    }

    if (path.match(/^\/orders\/[\w-]+$/) && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const id = path.split("/")[2];
      const { data, error: e } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).eq("user_id", user.id).maybeSingle();
      if (e) return error(e.message, 500);
      if (!data) return error("Order not found", 404);
      return json(data);
    }

    if (path === "/coupons" && method === "GET") {
      const { data, error: e } = await supabase.from("coupons").select("*").eq("active", true);
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path === "/coupons/validate" && method === "GET") {
      const code = url.searchParams.get("code");
      const subtotal = url.searchParams.get("subtotal");
      if (!code) return error("Coupon code required", 400);
      const { data: coupon, error: e } = await supabase.from("coupons").select("*").eq("code", code).eq("active", true).maybeSingle();
      if (e) return error(e.message, 500);
      if (!coupon) return error("Invalid or expired coupon", 404);
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return error("Coupon expired", 400);
      if (coupon.max_uses != null && coupon.uses >= coupon.max_uses) return error("Coupon usage limit reached", 400);
      const orderTotal = Number(subtotal || 0);
      if (orderTotal < Number(coupon.min_order)) return error(`Minimum order ₹${coupon.min_order} required`, 400);
      let discount = 0;
      if (coupon.discount_type === "percent") {
        discount = Math.round((orderTotal * Number(coupon.discount_value)) / 100);
      } else {
        discount = Number(coupon.discount_value);
      }
      discount = Math.min(discount, orderTotal);
      return json({ code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value, discount, subtotal: orderTotal, total: orderTotal - discount });
    }

    if (path === "/admin/orders" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const { data, error: e } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path.match(/^\/admin\/orders\/[\w-]+\/status$/) && method === "PATCH") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const id = path.split("/")[3];
      const body = await req.json();
      const { status } = body;
      const { data, error: e } = await supabase.from("orders").update({ status }).eq("id", id).select("*, order_items(*)").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path === "/admin/stats" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const { data: orders } = await supabase.from("orders").select("total, status, payment_method, payment_status, created_at");
      const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true });
      const { count: totalMenu } = await supabase.from("menu_items").select("*", { count: "exact", head: true });
      const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true });
      const revenue = (orders || []).reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      const pending = (orders || []).filter((o: any) => o.status === "received").length;
      const delivered = (orders || []).filter((o: any) => o.status === "delivered").length;
      const cod = (orders || []).filter((o: any) => o.payment_method === "cod").length;
      const online = (orders || []).filter((o: any) => o.payment_method === "razorpay").length;
      return json({ totalOrders, totalMenu, totalUsers, revenue, pending, delivered, cod, online, orders: orders || [] });
    }

    if (path === "/admin/orders/pending" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const { data, error: e } = await supabase.from("orders").select("*, order_items(*)").eq("status", "received").order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data || []);
    }

    if (path === "/admin/menu" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const { data, error: e } = await supabase.from("menu_items").select("*").order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path === "/admin/menu" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const body = await req.json();
      const { name, description, price, category, image, in_stock, is_veg, is_bestseller, rating, prep_time, variants } = body;
      if (!name || price == null) return error("Name and price required", 400);
      const { data, error: e } = await supabase.from("menu_items").insert({
        name, description: description || null, price, category: category || "Main",
        image: image || null, in_stock: in_stock !== false, is_veg: is_veg !== false,
        is_bestseller: !!is_bestseller, rating: rating || 0, prep_time: prep_time || 30, variants: variants || [],
      }).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path.match(/^\/admin\/menu\/[\w-]+$/) && method === "PATCH") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const id = path.split("/")[3];
      const body = await req.json();
      const updates: any = {};
      const allowed = ["name", "description", "price", "category", "image", "in_stock", "is_veg", "is_bestseller", "rating", "prep_time", "variants"];
      for (const key of allowed) { if (key in body) updates[key] = body[key]; }
      if (Object.keys(updates).length === 0) return error("No fields to update", 400);
      const { data, error: e } = await supabase.from("menu_items").update(updates).eq("id", id).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path.match(/^\/admin\/menu\/[\w-]+$/) && method === "DELETE") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const id = path.split("/")[3];
      const { error: e } = await supabase.from("menu_items").delete().eq("id", id);
      if (e) return error(e.message, 500);
      return json({ success: true });
    }

    if (path === "/admin/coupons" && method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const { data, error: e } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path.match(/^\/admin\/coupons\/.+$/) && method === "PATCH") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const profile = await getUserProfile(user.id);
      if (!profile?.is_admin) return error("Forbidden", 403);
      const code = decodeURIComponent(path.split("/")[3]);
      const body = await req.json();
      const updates: any = {};
      const allowed = ["discount_type", "discount_value", "min_order", "max_uses", "uses", "active", "expires_at"];
      for (const key of allowed) { if (key in body) updates[key] = body[key]; }
      if (Object.keys(updates).length === 0) return error("No fields to update", 400);
      const { data, error: e } = await supabase.from("coupons").update(updates).eq("code", code).select("*").single();
      if (e) return error(e.message, 500);
      return json(data);
    }

    if (path === "/payments/razorpay/config" && method === "GET") {
      const key = Deno.env.get("RAZORPAY_KEY_ID");
      const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
      return json({ configured: !!(key && secret), key_id: key || null });
    }

    if (path === "/payments/razorpay/verify" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body;
      const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
      if (!secret) return error("Razorpay not configured", 500);
      const { data: order } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
      if (!order) return error("Order not found", 404);
      const text = razorpay_order_id + "|" + razorpay_payment_id;
      const enc = new TextEncoder().encode(text);
      const keyData = new TextEncoder().encode(secret);
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc);
      const sigHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (sigHex !== razorpay_signature) return error("Invalid signature", 400);
      const { data: updated } = await supabase.from("orders").update({
        payment_status: "paid", razorpay_order_id, razorpay_payment_id,
      }).eq("id", order_id).select("*, order_items(*)").single();
      return json({ order: updated });
    }

    if (path === "/payments/razorpay/cancel" && method === "POST") {
      const user = await getAuthUser(req);
      if (!user) return error("Unauthorized", 401);
      const body = await req.json();
      const { order_id } = body;
      const { data: order } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
      if (!order) return error("Order not found", 404);
      if (order.payment_status === "paid") return error("Order already paid", 400);
      const { data: updated } = await supabase.from("orders").update({
        status: "cancelled", payment_status: "cancelled",
      }).eq("id", order_id).select("*, order_items(*)").single();
      return json(updated);
    }

    return error("Not found", 404);
  } catch (err) {
    return error("Internal server error", 500);
  }
});
