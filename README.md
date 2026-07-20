# Mezbaan Restro

Food ordering app built with Expo (React Native) + FastAPI (MongoDB backend).

## Build Android APK

The Android APK is built via GitHub Actions. Push to `main` or trigger the workflow manually to build.

Artifacts are uploaded to the workflow run and can be downloaded from the Actions tab.

## Environment Variables

See `frontend/.env.example` and `backend/.env.example` for required variables.

## Email OTP Authentication

Email OTP login uses a Supabase Edge Function (`email-otp`) that wraps
Supabase Auth's `signInWithOtp` / `verifyOtp` flow.

- **Frontend** (`frontend/src/hooks/use-email-otp.ts`) calls
  `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/email-otp` with the anon key.
- **Edge Function** (`supabase/functions/email-otp/index.ts`) is deployed
  to Supabase and must be ACTIVE for "Send Code" to work.
- **Backend** (`backend/server.py` `/auth/email-otp`) exchanges the
  Supabase access token for the app's own JWT.

If "Send Code" shows "Network request failed", verify the edge function
is deployed (Supabase dashboard > Edge Functions) and that
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present
in `frontend/.env`.
