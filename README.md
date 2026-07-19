# Mezbaan Restro

Food ordering mobile app — Customer app + in-app Admin panel.
- Frontend: Expo (React Native, SDK 54)
- Backend: FastAPI + MongoDB
- Repo layout: `/backend`, `/frontend`

## Run locally
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend
cd frontend
yarn install
yarn start   # opens Expo, scan QR from Expo Go
```
The backend auto-seeds 23 menu items + 1 coupon (WELCOME15) on first startup.

## Env variables
See `.env.example`. Populate `backend/.env` and `frontend/.env`.

## Admin
- Open Profile tab → Admin Panel (in the app)
- Admin access is restricted to Google accounts in `ADMIN_EMAILS` (backend config)
- All admin APIs return 403 for unauthorized emails

## Authentication
- Google Sign-In (expo-auth-session)
- Mobile number required on first login before ordering
- Secure JWT tokens (30-day expiry)

## Welcome Offer
- WELCOME15: 15% off, min order ₹299, first order only
- One per Google account + per device

## Publishing an Android APK
A GitHub Actions workflow (`.github/workflows/android-apk.yml`) builds a debug APK on push to `main`. Download the artifact from the Actions tab.

## Deferred integrations
Razorpay, real OTP auth, Google Maps live tracking, delivery-partner app, and push notifications are hooks-ready but not wired in this MVP. Add credentials and swap the placeholders in `checkout.tsx` + `tracking/[id].tsx` when ready.
