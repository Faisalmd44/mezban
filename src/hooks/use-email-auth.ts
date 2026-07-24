import { useState, useCallback } from "react";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/src/lib/supabase";

const RESET_REDIRECT_URI = makeRedirectUri({
  scheme: "mezbaan-customer",
  path: "reset-password",
});

export function useEmailAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signUp = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      setError("");
      setLoading(true);
      try {
        const { data, error: sbError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: RESET_REDIRECT_URI },
        });
        if (sbError) {
          setError(sbError.message);
          return null;
        }
        if (!data.session || !data.session.access_token) {
          setError("Sign up succeeded but no session was returned. Please try signing in.");
          return null;
        }
        return data.session.access_token;
      } catch (e: any) {
        setError(e?.message || "Sign up failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      setError("");
      setLoading(true);
      try {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({ email, password });
        if (sbError) {
          setError(sbError.message);
          return null;
        }
        if (!data.session || !data.session.access_token) {
          setError("Login failed — no session returned");
          return null;
        }
        return data.session.access_token;
      } catch (e: any) {
        setError(e?.message || "Login failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resetPassword = useCallback(
    async (email: string): Promise<boolean> => {
      setError("");
      setLoading(true);
      try {
        const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: RESET_REDIRECT_URI,
        });
        if (sbError) {
          setError(sbError.message);
          return false;
        }
        return true;
      } catch (e: any) {
        setError(e?.message || "Failed to send reset email");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { signUp, signIn, resetPassword, loading, error, setError };
}
