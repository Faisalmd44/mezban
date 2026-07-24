import { useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/src/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URI = makeRedirectUri({
  scheme: "mezbaan-customer",
  path: "auth/callback",
});

export type GoogleUser = {
  supabase_token: string;
  email: string;
  name: string;
  picture?: string;
};

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = useCallback(async (): Promise<GoogleUser | null> => {
    setError("");
    setLoading(true);
    try {
      const { data, error: sbError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: REDIRECT_URI,
          skipBrowserRedirect: true,
        },
      });

      if (sbError) {
        setError(sbError.message);
        return null;
      }
      if (!data?.url) {
        setError("No OAuth URL returned from Supabase");
        return null;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URI);

      if (result?.type !== "success") {
        if (result?.type === "dismiss" || result?.type === "cancel") return null;
        setError("Google sign-in was cancelled or failed");
        return null;
      }

      const url = result.url;
      let accessToken: string | null = null;

      const parsed = Linking.parse(url);
      if (parsed.queryParams?.access_token) {
        accessToken = parsed.queryParams.access_token as string;
      } else {
        try {
          const hashParams = new URLSearchParams(new URL(url).hash.replace(/^#/, ""));
          accessToken = hashParams.get("access_token");
        } catch {
          // URL parsing failed, try fallback below
        }
      }

      if (!accessToken) {
        const { data: sessData, error: sessError } = await supabase.auth.getSession();
        if (sessError || !sessData.session) {
          setError("Failed to retrieve session after Google sign-in");
          return null;
        }
        accessToken = sessData.session.access_token;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
      if (userError || !userData.user) {
        setError("Failed to get user info from Supabase");
        return null;
      }

      const user = userData.user;
      return {
        supabase_token: accessToken,
        email: user.email || "",
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Guest",
        picture: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      };
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { signIn, loading, error };
}
