import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // We handle session recovery from deep links manually in the
    // reset-password screen, so disable automatic URL detection to
    // avoid race conditions with the auth guard in _layout.tsx.
    detectSessionInUrl: false,
  },
});
