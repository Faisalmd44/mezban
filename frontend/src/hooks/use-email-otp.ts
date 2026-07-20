import { useState, useCallback, useRef } from "react";

export type OtpState = "email" | "otp";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/email-otp`;

export function useEmailOtp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendTimer = useCallback((seconds = 30) => {
    setResendTimer(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const sendOtp = useCallback(
    async (email: string): Promise<boolean> => {
      setError("");
      if (!email || !email.includes("@")) {
        setError("Please enter a valid email address");
        return false;
      }
      setLoading(true);
      try {
        const res = await fetch(EDGE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ action: "send", email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const cooldown = data.cooldown_seconds;
          if (typeof cooldown === "number" && cooldown > 0) startResendTimer(cooldown);
          setError(data.error || "Failed to send OTP");
          return false;
        }
        if (typeof data.expires_in === "number") setOtpExpiry(data.expires_in);
        startResendTimer(data.resend_in ?? 30);
        return true;
      } catch (e: any) {
        setError(e?.message || "Failed to send OTP");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [startResendTimer]
  );

  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<string | null> => {
      setError("");
      if (!token || token.length !== 6) {
        setError("Please enter the 6-digit code");
        return null;
      }
      setLoading(true);
      try {
        const res = await fetch(EDGE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ action: "verify", email, code: token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "OTP verification failed");
          return null;
        }
        return data.supabase_token || null;
      } catch (e: any) {
        setError(e?.message || "OTP verification failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { sendOtp, verifyOtp, loading, error, resendTimer, otpExpiry, setError };
}
