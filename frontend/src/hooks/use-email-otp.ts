import { useState, useCallback, useRef } from "react";
import { supabase } from "@/src/lib/supabase";

export type OtpState = "email" | "otp";

export function useEmailOtp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendTimer = useCallback(() => {
    setResendTimer(30);
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

  const sendOtp = useCallback(async (email: string): Promise<boolean> => {
    setError("");
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (otpError) {
        setError(otpError.message);
        return false;
      }
      startResendTimer();
      return true;
    } catch (e: any) {
      setError(e?.message || "Failed to send OTP");
      return false;
    } finally {
      setLoading(false);
    }
  }, [startResendTimer]);

  const verifyOtp = useCallback(async (email: string, token: string): Promise<string | null> => {
    setError("");
    if (!token || token.length !== 6) {
      setError("Please enter the 6-digit code");
      return null;
    }
    setLoading(true);
    try {
      const { data, error: otpError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (otpError) {
        setError(otpError.message);
        return null;
      }
      return data.session?.access_token || null;
    } catch (e: any) {
      setError(e?.message || "OTP verification failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendOtp, verifyOtp, loading, error, resendTimer, setError };
}
