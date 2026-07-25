import { useState, useCallback } from "react";
import { Alert, Platform } from "react-native";
import { supabase, hasSupabaseConfig } from "@/src/lib/supabase";

export function useEmailAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    setError("");
    setLoading(true);
    try {
      if (!hasSupabaseConfig) throw new Error("Supabase is not configured.");
      const { data, error: sbError } = await supabase.auth.signInWithPassword({ email, password });
      if (sbError) throw sbError;
      return data.session?.access_token || null;
    } catch (e: any) {
      setError(e?.message || "Sign in failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    setError("");
    setLoading(true);
    try {
      if (!hasSupabaseConfig) throw new Error("Supabase is not configured.");
      const { data, error: sbError } = await supabase.auth.signUp({ email, password });
      if (sbError) throw sbError;
      return data.session?.access_token || null;
    } catch (e: any) {
      setError(e?.message || "Sign up failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    setError("");
    setLoading(true);
    try {
      if (!hasSupabaseConfig) throw new Error("Supabase is not configured.");
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email);
      if (sbError) throw sbError;
      return true;
    } catch (e: any) {
      setError(e?.message || "Password reset failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { signIn, signUp, resetPassword, loading, error };
}
