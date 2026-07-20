import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(raw: string): string | null {
  const email = (raw || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const email = normalizeEmail(body.email);
    if (!email) return json({ error: "Please enter a valid email address" }, 400);

    if (action === "send") {
      const { error: sendError } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (sendError) {
        // Rate-limit / user-exists errors still mean a code was sent previously.
        const msg = sendError.message.toLowerCase();
        if (!msg.includes("rate") && !msg.includes("already")) {
          return json({ error: sendError.message }, 400);
        }
      }
      return json({
        success: true,
        message: "A 6-digit verification code was sent to your email.",
        expires_in: 300,
        resend_in: 30,
      });
    }

    if (action === "verify") {
      const code = String(body.code || "").trim();
      if (!/^\d{6}$/.test(code)) return json({ error: "Please enter the 6-digit code" }, 400);

      const { data, error: verifyError } = await client.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (verifyError) {
        return json({ error: verifyError.message }, 400);
      }
      const accessToken = data.session?.access_token;
      if (!accessToken) return json({ error: "Verification succeeded but no session was created" }, 500);
      return json({ success: true, email, supabase_token: accessToken });
    }

    return json({ error: "Unknown action. Use 'send' or 'verify'." }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email OTP request failed";
    return json({ error: message }, 500);
  }
});
