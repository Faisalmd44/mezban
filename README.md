# Mezbaan Restro

Food ordering app built with Expo (React Native) + FastAPI (MongoDB backend).

## Authentication

The app supports two sign-in methods:

1. **Google Sign-In** — uses `expo-auth-session` with a Google Web Client ID.
2. **Email + Password** — uses Supabase Auth (`supabase.auth.signUp` /
   `signInWithPassword`). Password resets are handled via
   `supabase.auth.resetPasswordForEmail`.

- **Frontend** (`frontend/src/hooks/use-email-auth.ts`) calls Supabase
  Auth directly using `@supabase/supabase-js`.
- **Backend** (`backend/server.py` `/auth/email-password`) exchanges the
  Supabase access token for the app's own JWT.

## Build Android APK

The Android APK is built via GitHub Actions. Push to `main` or trigger the
workflow manually to build. Artifacts are uploaded to the workflow run and can
be downloaded from the Actions tab.

## Environment Variables

See `frontend/.env.example` and `backend/.env.example` for required variables.
