import { useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

WebBrowser.maybeCompleteAuthSession();

export type GoogleUser = {
  id_token: string; email: string; name: string; picture?: string; google_id: string;
};

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri: makeRedirectUri({}),
    scopes: ["openid", "profile", "email"],
    responseType: "id_token",
  });

  const signIn = useCallback(async (): Promise<GoogleUser | null> => {
    setError("");
    if (!GOOGLE_WEB_CLIENT_ID) {
      setError("Google Sign-In is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
      return null;
    }
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result?.type !== "success" || !result.params) {
        if (result?.type === "dismiss") return null;
        setError(result?.type === "error" ? (result.error?.message || "Google sign-in failed") : "Sign-in cancelled");
        return null;
      }
      const id_token = result.params.id_token;
      if (!id_token) { setError("No id_token returned from Google"); return null; }
      const payloadB64 = id_token.split(".")[1];
      const payloadJson = JSON.parse(
        decodeURIComponent(
          Array.from(atob(payloadB64)).map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
        )
      );
      return {
        id_token,
        email: payloadJson.email || "",
        name: payloadJson.name || payloadJson.email?.split("@")[0] || "Guest",
        picture: payloadJson.picture,
        google_id: payloadJson.sub,
      };
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, [promptAsync]);

  return { signIn, loading, error, request, response };
}
