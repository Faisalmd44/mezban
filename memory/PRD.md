# Mezbaan Restro - Product Requirements

## App
- **Name**: Mezbaan Restro
- **Tagline**: Freshly Crafted, Honestly Served
- **Location**: Abul Fazal Enclave, Jamia Nagar, New Delhi
- **Phone**: +91 859 524 4548
- **Brand colors**: Gold #F4C430 · Dark Red #B71C1C · Black #121212 · White #FFFFFF

## Stack
- Frontend: React Native + Expo (SDK 54), expo-router
- Backend: FastAPI + MongoDB (motor)
- Auth: Guest-style phone + name (no OTP)
- Payments: Cash on Delivery + UPI QR (mock). Razorpay hooks can be added later.

## MVP Features Delivered
- Guest login (phone + name)
- Home with hero banner, categories, popular picks, free delivery strip
- Full menu with search + category chips (7 categories, 23 items seeded)
- Product detail with variants (nuggets 6/9/12 pcs), quantity stepper, wishlist toggle
- Cart with quantity steppers, free-delivery progress bar, subtotal calculation
- Checkout with address, coupons (3 seeded), loyalty points redemption, COD + UPI QR modal
- Live animated order tracking (5-step timeline with pulse animation, 5s polling)
- Orders history with Repeat Last Order
- Profile with wallet, loyalty points, referral code, WhatsApp support link
- Wishlist screen
- Offers/Coupons screen
- **Admin Panel** (in-app, passcode gated on backend): dashboard stats, orders manager with status advance flow, menu manager (stock toggle)

## Status Flow
`received → preparing → packed → out_for_delivery → delivered`

## API Endpoints (all prefixed `/api`)
- `POST /auth/signup`, `GET /auth/me`, `POST /auth/wishlist/{item_id}`
- `GET /menu`, `GET /menu/categories`, `GET /menu/{id}`, `GET /coupons`
- `POST /orders`, `GET /orders`, `GET /orders/{id}`
- Admin (header `X-Admin-Passcode: MEZBAAN2026`): `GET /admin/stats`, `GET /admin/orders`, `PATCH /admin/orders/{id}/status`, `POST /admin/menu`, `PATCH /admin/menu/{id}`, `DELETE /admin/menu/{id}`

## Deferred (Phase 2)
- Real OTP login, Google Sign-In
- Live Razorpay payments
- Google Maps live tracking
- Delivery Partner app
- Push notifications, AI recommendations, Reviews & Ratings, Multi-branch
