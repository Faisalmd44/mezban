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
The backend auto-seeds 23 menu items + 3 coupons on first startup.

## Env variables
See `.env.example`. Populate `backend/.env` and `frontend/.env`.

## Admin
- Open Profile tab → Admin Panel (in the app)
- All admin write APIs require header `X-Admin-Passcode: MEZBAAN2026`

## Publishing an Android APK
This project runs on **Emergent Cloud**. To generate a production APK / IPA and to deploy the backend, use the **Publish** button in the top-right of the Emergent editor. It handles:
- Backend deploy (with your MONGO_URL provisioning)
- Android APK / iOS IPA build via EAS

## Downloading the source
Use the platform's **Save to GitHub** action, or the built-in project download from Emergent to get the full ZIP. `/app` is the project root.

## Deferred integrations
Razorpay, real OTP auth, Google Maps live tracking, delivery-partner app, and push notifications are hooks-ready but not wired in this MVP. Add credentials and swap the placeholders in `checkout.tsx` + `tracking/[id].tsx` when ready.
