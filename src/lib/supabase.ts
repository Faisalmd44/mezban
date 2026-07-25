import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const hasSupabaseConfig = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as SupabaseClient);
