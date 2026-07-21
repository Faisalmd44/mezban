"""Mezbaan Restro - FastAPI backend.

Customer + admin food ordering API on top of MongoDB.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hmac
import hashlib
import logging
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

import razorpay
import jwt as pyjwt
import requests as http_requests
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client["Mezbaan"]

app = FastAPI(title="Mezbaan Restro API")
api = APIRouter(prefix="/api")

FREE_DELIVERY_THRESHOLD = 250
DELIVERY_FEE = 30

STATUS_FLOW = ["received", "preparing", "packed", "out_for_delivery", "delivered"]

# ----- Razorpay client (lazy) -----
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")

# ----- Google OAuth -----
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_TOKEN_SECRET = os.environ.get("GOOGLE_TOKEN_SECRET", "mezbaan-google-secret-2026")

# ---------------------------------------------------------------------------
# ADMIN ACCESS CONTROL
# ---------------------------------------------------------------------------
# Only Google accounts whose email is in this list can see the Admin Panel,
# open admin routes, call admin APIs, or access any admin feature.
# To grant/revoke admin access later, simply edit this list and redeploy —
# no application code changes required.
#
# Emails are matched case-insensitively.
# ---------------------------------------------------------------------------
ADMIN_EMAILS = [
    "Faisalmd44@gmail.com",
    "Mezbaaan@gmail.com",
]

ADMIN_EMAILS_LOWER = [e.strip().lower() for e in ADMIN_EMAILS]


def is_admin_email(email: Optional[str]) -> bool:
    if not email:
        return False
    return email.strip().lower() in ADMIN_EMAILS_LOWER


def get_razorpay_client() -> razorpay.Client:
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        )
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


# ----- Models -----
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class GoogleLoginRequest(BaseModel):
    id_token: str
    email: str
    name: str
    picture: Optional[str] = None
    google_id: str
    device_id: str


class EmailPasswordLoginRequest(BaseModel):
    supabase_token: str
    email: str
    name: Optional[str] = None
    device_id: str


class MobileUpdateRequest(BaseModel):
    phone: str


class AddressRequest(BaseModel):
    label: str
    line: str
    is_default: bool = False


class User(BaseModel):
    id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    picture: Optional[str] = None
    google_id: Optional[str] = None
    wallet: float = 0.0
    referral_code: str
    created_at: str


class MenuVariant(BaseModel):
    name: str
    price: float


class MenuItem(BaseModel):
    id: str
    name: str
    description: str
    category: str
    price: float
    image: str
    veg: bool
    in_stock: bool = True
    variants: List[MenuVariant] = []
    popular: bool = False


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    veg: Optional[bool] = None
    in_stock: Optional[bool] = None
    popular: Optional[bool] = None


class CartItem(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int
    variant: Optional[str] = None
    image: Optional[str] = None


class PlaceOrderRequest(BaseModel):
    items: List[CartItem]
    address: str
    phone: str
    name: str
    payment_method: str  # "cod" | "upi" | "razorpay"
    coupon_code: Optional[str] = None
    notes: Optional[str] = None
    device_id: Optional[str] = None


class RazorpayVerifyRequest(BaseModel):
    order_id: str  # our internal Mezbaan order id
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class OrderStatusUpdate(BaseModel):
    status: str


class Coupon(BaseModel):
    code: str
    description: str
    discount_percent: int
    min_order: float = 0
    active: bool = True
    expiry: Optional[str] = None  # ISO date string
    first_order_only: bool = False


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    discount_percent: Optional[int] = None
    min_order: Optional[float] = None
    active: Optional[bool] = None
    expiry: Optional[str] = None


# ----- Auth helpers -----
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    # Support both JWT (new Google auth) and legacy raw-uuid tokens.
    user_id = None
    try:
        payload = pyjwt.decode(token, GOOGLE_TOKEN_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
    except pyjwt.PyJWTError:
        user_id = token  # legacy token format
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> bool:
    """Admin access is granted solely via Google account email in ADMIN_EMAILS.
    The old X-Admin-Passcode header is no longer accepted — this prevents any
    non-admin user from calling admin APIs even if they knew the passcode."""
    if not is_admin_email(current_user.get("email")):
        raise HTTPException(status_code=403, detail="Admin access restricted to authorized accounts")
    return True


# ----- Seed Menu -----
SEED_MENU = [
    # Burgers
    {"name": "Crispy Veg Patty Burger", "category": "Burgers", "price": 69, "veg": True,
     "description": "Crunchy veg patty with creamy mayo & crisp lettuce.",
     "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600", "popular": True},
    {"name": "Paneer Crunch Burger", "category": "Burgers", "price": 139, "veg": True,
     "description": "Spiced paneer patty, crunch coating, signature sauce.",
     "image": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600"},
    {"name": "Classic Chicken Burger", "category": "Burgers", "price": 129, "veg": False,
     "description": "Tender chicken patty with classic mayo & onions.",
     "image": "https://images.unsplash.com/photo-1606131731446-5568d87113aa?w=600"},
    {"name": "Chicken Zinger Burger", "category": "Burgers", "price": 149, "veg": False,
     "description": "Fiery zinger chicken with peri-peri sauce.",
     "image": "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600", "popular": True},
    # Pizza
    {"name": "Veg Classic Corn & Cheese", "category": "Pizza", "price": 149, "veg": True,
     "description": "8-inch sweet corn & double cheese.",
     "image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600"},
    {"name": "Farmhouse Delight", "category": "Pizza", "price": 169, "veg": True,
     "description": "Onion, capsicum, tomato, mushroom & mozzarella.",
     "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600"},
    {"name": "Mezbaan Royal Paneer", "category": "Pizza", "price": 189, "veg": True,
     "description": "Tandoori paneer with creamy white sauce.",
     "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600", "popular": True},
    {"name": "Mezbaan Chicken Supreme", "category": "Pizza", "price": 249, "veg": False,
     "description": "Loaded chicken, jalapeño & extra cheese.",
     "image": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600"},
    {"name": "Mezbaan Loaded Chicken Feast", "category": "Pizza", "price": 299, "veg": False,
     "description": "Triple chicken toppings, BBQ glaze, mozzarella.",
     "image": "https://images.unsplash.com/photo-1593504049359-74330189a345?w=600", "popular": True},
    # Pasta
    {"name": "Creamy White Sauce Pasta", "category": "Pasta", "price": 129, "veg": True,
     "description": "Penne in creamy alfredo sauce.",
     "image": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600"},
    {"name": "Classic Red Sauce Pasta", "category": "Pasta", "price": 129, "veg": True,
     "description": "Tangy tomato basil pasta.",
     "image": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600"},
    {"name": "Creamy Chicken White Sauce Pasta", "category": "Pasta", "price": 179, "veg": False,
     "description": "Alfredo with grilled chicken chunks.",
     "image": "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600"},
    {"name": "Creamy Chicken Red Sauce Pasta", "category": "Pasta", "price": 179, "veg": False,
     "description": "Spicy arrabiata with grilled chicken.",
     "image": "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600"},
    # Fries
    {"name": "French Fries", "category": "Fries", "price": 69, "veg": True,
     "description": "Golden crispy salted fries.",
     "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600"},
    {"name": "Peri Peri Fries", "category": "Fries", "price": 89, "veg": True,
     "description": "Fries tossed in peri peri spice.",
     "image": "https://images.unsplash.com/photo-1639024471283-03518883512d?w=600", "popular": True},
    {"name": "Loaded Fries", "category": "Fries", "price": 130, "veg": True,
     "description": "Cheese, jalapeño & herbs over crispy fries.",
     "image": "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600"},
    # Wraps
    {"name": "Chicken Wrap", "category": "Wraps", "price": 69, "veg": False,
     "description": "Grilled chicken in soft tortilla.",
     "image": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600"},
    {"name": "Chicken Fry Wrap", "category": "Wraps", "price": 89, "veg": False,
     "description": "Crispy fried chicken wrap with sauce.",
     "image": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600"},
    # Nuggets
    {"name": "Chicken Cheese Burst Nuggets", "category": "Nuggets", "price": 109, "veg": False,
     "description": "Cheesy molten core chicken nuggets.",
     "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600",
     "variants": [{"name": "6 Pieces", "price": 109}, {"name": "9 Pieces", "price": 149}, {"name": "12 Pieces", "price": 189}]},
    # Combos
    {"name": "Veg Burger + Fries + Drink", "category": "Combos", "price": 99, "veg": True,
     "description": "Veg burger, fries & a chilled drink.",
     "image": "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600", "popular": True},
    {"name": "Chicken Patty Burger + Fries + Drink", "category": "Combos", "price": 149, "veg": False,
     "description": "Chicken burger combo with fries & drink.",
     "image": "https://images.unsplash.com/photo-1550317138-10000687a72b?w=600"},
    {"name": "Chicken Zinger Burger + Fries + Drink", "category": "Combos", "price": 199, "veg": False,
     "description": "Zinger burger combo - the heat package.",
     "image": "https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=600"},
    {"name": "6 Nuggets + Fries + Drink", "category": "Combos", "price": 149, "veg": False,
     "description": "Cheese burst nuggets combo.",
     "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600"},
]

SEED_COUPONS = [
    {
        "code": "WELCOME15",
        "description": "15% OFF on your first order above ₹499",
        "discount_percent": 15,
        "min_order": 499,
        "active": True,
        "first_order_only": True,
    }
]


def _merge_field(keep: Any, drop: Any) -> Any:
    """Pick the non-empty value from two candidate fields during account merge."""
    if keep not in (None, "", [], {}):
        return keep
    return drop


async def merge_user_accounts(keep: dict, drop: dict) -> dict:
    """Merge `drop` into `keep` (same email / same user, stale duplicate).

    The kept record retains its identity (`id`) so existing JWTs keep working.
    Wishlist, addresses and recently-viewed are unioned; the first non-empty
    phone/name/picture/google_id wins. Orders are repointed to the kept id.
    """
    merged_fields: Dict[str, Any] = {}
    for key in ("name", "phone", "picture", "google_id"):
        val = _merge_field(keep.get(key), drop.get(key))
        if val != keep.get(key):
            merged_fields[key] = val

    for key in ("wishlist", "addresses", "recently_viewed"):
        kept_list = keep.get(key, []) or []
        drop_list = drop.get(key, []) or []
        if key == "addresses":
            seen = {a.get("id") for a in kept_list if isinstance(a, dict)}
            combined = list(kept_list)
            for a in drop_list:
                if isinstance(a, dict) and a.get("id") not in seen:
                    combined.append(a)
                    seen.add(a.get("id"))
        else:
            combined = list(kept_list)
            for x in drop_list:
                if x not in combined:
                    combined.append(x)
        if len(combined) > len(kept_list):
            merged_fields[key] = combined

    if drop.get("wallet") and (keep.get("wallet") or 0.0) == 0.0:
        merged_fields["wallet"] = drop.get("wallet")

    if merged_fields:
        await db.users.update_one({"id": keep["id"]}, {"$set": merged_fields})
        keep.update(merged_fields)

    await db.orders.update_many({"user_id": drop["id"]}, {"$set": {"user_id": keep["id"]}})
    await db.users.delete_one({"id": drop["id"]})
    logging.info(f"Merged duplicate user {drop['id']} into {keep['id']} (email={keep.get('email')})")
    return keep


async def migrate_duplicate_accounts():
    """Collapse stale duplicate user records produced by prior auth attempts.

    Two sources of duplicates exist in this data set:
      1. Same email created more than once (old phone-OTP flow inserted a row
         per verification attempt before email linking existed).
      2. Same phone on a record with no/empty email plus a newer email-backed
         record — these are the same physical user.
    We keep the oldest record per email and re-point its orders, then collapse
    phone-only duplicates into the matching email record. Safe to re-run.
    """
    collapsed = 0

    # 1) Dedup by email (case-insensitive, ignore empty emails).
    pipeline = [
        {"$match": {"email": {"$exists": True, "$ne": None, "$ne": ""}}},
        {"$group": {"_id": {"$toLower": "$email"}, "ids": {"$push": "$id"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    async for group in db.users.aggregate(pipeline):
        ids = group["ids"]
        docs = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).sort("created_at", ASCENDING).to_list(len(ids))
        keep = docs[0]
        for drop in docs[1:]:
            keep = await merge_user_accounts(keep, drop)
            collapsed += 1

    # 2) Collapse legacy phone-only records into the email-backed record for the
    #    same phone, when exactly one email record holds that phone.
    phone_pipeline = [
        {"$match": {"phone": {"$exists": True, "$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$phone", "ids": {"$push": "$id"}, "emails": {"$addToSet": "$email"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    async for group in db.users.aggregate(phone_pipeline):
        ids = group["ids"]
        docs = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).sort("created_at", ASCENDING).to_list(len(ids))
        email_docs = [d for d in docs if d.get("email")]
        if not email_docs:
            continue
        keep = email_docs[0]
        for drop in docs:
            if drop["id"] == keep["id"]:
                continue
            keep = await merge_user_accounts(keep, drop)
            collapsed += 1

    # 3) Drop the same phone from any remaining orphan records so the unique
    #    phone index (sparse) can be created cleanly.
    orphans = await db.users.find(
        {"phone": {"$exists": True, "$ne": None, "$ne": ""}}, {"_id": 0, "id": 1, "phone": 1, "email": 1, "created_at": 1}
    ).sort("created_at", ASCENDING).to_list(10000)
    seen_phones: Dict[str, str] = {}
    for doc in orphans:
        ph = doc.get("phone")
        if not ph:
            continue
        owner = seen_phones.get(ph)
        if owner is None:
            seen_phones[ph] = doc["id"]
        elif owner != doc["id"]:
            await db.users.update_one({"id": doc["id"]}, {"$set": {"phone": None}})
            collapsed += 1

    if collapsed:
        logging.info(f"migrate_duplicate_accounts: collapsed {collapsed} duplicate user record(s)")


async def ensure_user_indexes():
    """Unique constraints that enforce one email = one user = one phone."""
    try:
        await db.users.create_index("id", unique=True)
    except DuplicateKeyError:
        pass
    # Unique email (sparse so pre-email legacy rows are allowed).
    try:
        await db.users.create_index(
    "email",
    unique=True,
    sparse=True,
    name="uniq_email_lower",
    collation={"locale": "en", "strength": 2},
        )
    except DuplicateKeyError:
        logging.warning("uniq_email_lower index creation skipped: duplicate emails remain")
    # Unique phone (sparse so rows without a phone are allowed).
    try:
        await db.users.create_index(
    "phone",
    unique=True,
    sparse=True,
    name="uniq_phone",
        )
    except DuplicateKeyError:
        logging.warning("uniq_phone index creation skipped: duplicate phones remain")


async def seed_database():
    count = await db.menu.count_documents({})

    if count == 0:
        items = []
        for item in SEED_MENU:
            full = {
                "id": str(uuid.uuid4()),
                "name": item["name"],
                "description": item["description"],
                "category": item["category"],
                "price": float(item["price"]),
                "image": item["image"],
                "veg": item["veg"],
                "in_stock": True,
                "variants": item.get("variants", []),
                "popular": item.get("popular", False),
            }
            items.append(full)

        await db.menu.insert_many(items)
        logging.info(f"Seeded {len(items)} menu items")

    # Reset coupons (testing)
    await db.coupons.delete_many({})
    await db.coupons.insert_many([dict(c) for c in SEED_COUPONS])
    logging.info("Coupons reset successfully")


# ----- Routes -----
@api.get("/")
async def root():
    return {"app": "Mezbaan Restro", "tagline": "Freshly Crafted, Honestly Served"}


# ---- Auth (Google Sign-In) ----
@api.post("/auth/google")
async def google_login(req: GoogleLoginRequest):
    verified_email = None
    verified_google_id = None
    try:
        resp = http_requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": req.id_token},
            timeout=8,
        )
        if resp.status_code == 200:
            data = resp.json()
            if GOOGLE_CLIENT_ID and data.get("aud") != GOOGLE_CLIENT_ID:
                raise HTTPException(status_code=401, detail="Google token audience mismatch")
            verified_email = data.get("email")
            verified_google_id = data.get("sub")
    except http_requests.RequestException:
        pass

    google_id = verified_google_id or req.google_id
    email = (verified_email or req.email or "").lower().strip()
    if not google_id:
        raise HTTPException(status_code=400, detail="Google authentication failed")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    existing = await db.users.find_one({"google_id": google_id}, {"_id": 0})
    if not existing:
        existing = await db.users.find_one({"email": email}, {"_id": 0})

    admin = is_admin_email(email)

    if existing:
        updates = {}
        if not existing.get("google_id"):
            updates["google_id"] = google_id
        if not existing.get("email"):
            updates["email"] = email
        if req.picture and existing.get("picture") != req.picture:
            updates["picture"] = req.picture
        if existing.get("is_admin") != admin:
            updates["is_admin"] = admin
        if updates:
            await db.users.update_one({"id": existing["id"]}, {"$set": updates})
            existing.update(updates)
        token = pyjwt.encode(
            {"sub": existing["id"], "exp": datetime.now(timezone.utc) + timedelta(days=30)},
            GOOGLE_TOKEN_SECRET,
            algorithm="HS256",
        )
        return {"token": token, "user": existing}

    user_id = str(uuid.uuid4())
    referral_code = f"MEZ{user_id[:6].upper()}"
    user_doc = {
        "id": user_id,
        "name": req.name.strip() or email.split("@")[0],
        "email": email,
        "google_id": google_id,
        "picture": req.picture,
        "phone": None,
        "is_admin": admin,
        "wallet": 0.0,
        "referral_code": referral_code,
        "wishlist": [],
        "addresses": [],
        "recently_viewed": [],
        "created_at": now_iso(),
    }
    try:
        await db.users.insert_one(dict(user_doc))
    except DuplicateKeyError:
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=409, detail="Account creation conflict; please sign in instead")
        token = pyjwt.encode(
            {"sub": existing["id"], "exp": datetime.now(timezone.utc) + timedelta(days=30)},
            GOOGLE_TOKEN_SECRET,
            algorithm="HS256",
        )
        return {"token": token, "user": existing}
    user_doc.pop("_id", None)
    token = pyjwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        GOOGLE_TOKEN_SECRET,
        algorithm="HS256",
    )
    return {"token": token, "user": user_doc}


# ---- Auth (Email + Password) ----
@api.post("/auth/email-password")
async def email_password_login(req: EmailPasswordLoginRequest):
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    api_key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
    verified_email = None
    if SUPABASE_URL and api_key:
        try:
            resp = http_requests.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {req.supabase_token}",
                    "apikey": api_key,
                },
                timeout=8,
            )
            if resp.status_code == 200:
                data = resp.json()
                verified_email = data.get("email")
        except http_requests.RequestException:
            pass

    email = (verified_email or req.email or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email authentication failed")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    admin = is_admin_email(email)

    if existing:
        updates = {}
        if not existing.get("email"):
            updates["email"] = email
        if existing.get("is_admin") != admin:
            updates["is_admin"] = admin
        if updates:
            await db.users.update_one({"id": existing["id"]}, {"$set": updates})
            existing.update(updates)
        token = pyjwt.encode(
            {"sub": existing["id"], "exp": datetime.now(timezone.utc) + timedelta(days=30)},
            GOOGLE_TOKEN_SECRET,
            algorithm="HS256",
        )
        return {"token": token, "user": existing}

    user_id = str(uuid.uuid4())
    referral_code = f"MEZ{user_id[:6].upper()}"
    user_doc = {
        "id": user_id,
        "name": (req.name or "").strip() or email.split("@")[0],
        "email": email,
        "google_id": None,
        "picture": None,
        "phone": None,
        "is_admin": admin,
        "wallet": 0.0,
        "referral_code": referral_code,
        "wishlist": [],
        "addresses": [],
        "recently_viewed": [],
        "created_at": now_iso(),
    }
    try:
        await db.users.insert_one(dict(user_doc))
    except DuplicateKeyError:
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=409, detail="Account creation conflict; please sign in instead")
        token = pyjwt.encode(
            {"sub": existing["id"], "exp": datetime.now(timezone.utc) + timedelta(days=30)},
            GOOGLE_TOKEN_SECRET,
            algorithm="HS256",
        )
        return {"token": token, "user": existing}
    user_doc.pop("_id", None)
    token = pyjwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        GOOGLE_TOKEN_SECRET,
        algorithm="HS256",
    )
    return {"token": token, "user": user_doc}


@api.post("/auth/mobile")
async def update_mobile(req: MobileUpdateRequest, current_user: dict = Depends(get_current_user)):
    phone = req.phone.strip()
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Valid 10-digit mobile number required")

    current_email = (current_user.get("email") or "").lower().strip()

    # Any other record holding this phone.
    clash = await db.users.find_one({"phone": phone, "id": {"$ne": current_user["id"]}}, {"_id": 0})
    if clash:
        clash_email = (clash.get("email") or "").lower().strip()
        # Same email (or a legacy no-email record for the same user) -> merge
        # the stale duplicate into the current authenticated account instead
        # of blocking the user from their own phone.
        if not clash_email or clash_email == current_email:
            current_user = await merge_user_accounts(current_user, clash)
        else:
            # Phone genuinely belongs to a different user.
            raise HTTPException(status_code=409, detail="This mobile number is already linked to another account")

    await db.users.update_one({"id": current_user["id"]}, {"$set": {"phone": phone}})
    updated = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return {"user": updated}


@api.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user


@api.post("/auth/wishlist/{item_id}")
async def toggle_wishlist(item_id: str, current_user: dict = Depends(get_current_user)):
    wl = current_user.get("wishlist", []) or []
    if item_id in wl:
        wl.remove(item_id)
    else:
        wl.append(item_id)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"wishlist": wl}})
    return {"wishlist": wl}


@api.post("/auth/address")
async def save_address(req: AddressRequest, current_user: dict = Depends(get_current_user)):
    addr_id = str(uuid.uuid4())
    addr = {"id": addr_id, "label": req.label, "line": req.line, "is_default": req.is_default}
    addresses = current_user.get("addresses", []) or []
    if req.is_default:
        for a in addresses:
            a["is_default"] = False
    addresses.append(addr)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"addresses": addresses}})
    return {"addresses": addresses}


@api.delete("/auth/address/{address_id}")
async def delete_address(address_id: str, current_user: dict = Depends(get_current_user)):
    addresses = [a for a in (current_user.get("addresses", []) or []) if a.get("id") != address_id]
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"addresses": addresses}})
    return {"addresses": addresses}


@api.post("/auth/recent")
async def push_recent(body: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    item_id = body.get("item_id")
    if not item_id:
        return {"recently_viewed": current_user.get("recently_viewed", [])}
    rv = current_user.get("recently_viewed", []) or []
    rv = [i for i in rv if i != item_id]
    rv.insert(0, item_id)
    rv = rv[:20]
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"recently_viewed": rv}})
    return {"recently_viewed": rv}


# ---- Menu ----
@api.get("/menu")
async def list_menu(category: Optional[str] = None, search: Optional[str] = None):
    q: Dict[str, Any] = {}
    if category and category.lower() != "all":
        q["category"] = category
    if search:
        q["name"] = {"$regex": search, "$options": "i"}
    items = await db.menu.find(q, {"_id": 0}).to_list(500)
    return items


@api.get("/menu/categories")
async def categories():
    cats = await db.menu.distinct("category")
    return {"categories": sorted(cats)}


@api.get("/menu/{item_id}")
async def get_item(item_id: str):
    item = await db.menu.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


# ---- Coupons ----
@api.get("/coupons")
async def list_coupons():
    return await db.coupons.find({"active": True}, {"_id": 0}).to_list(50)


@api.get("/coupons/validate")
async def validate_coupon(code: str, subtotal: float, current_user: dict = Depends(get_current_user)):
    coupon = await db.coupons.find_one({"code": code.upper(), "active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid or inactive coupon")
    if subtotal < coupon.get("min_order", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order ₹{coupon.get('min_order', 0)} required")
    if coupon.get("expiry"):
        try:
            if datetime.fromisoformat(coupon["expiry"]) < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Coupon expired")
        except ValueError:
            pass
    if coupon.get("first_order_only"):
        already = await db.orders.count_documents({
            "user_id": current_user["id"],
            "coupon_code": code.upper(),
            "payment_status": {"$in": ["paid", "cod_pending"]},
        })
        if already > 0:
            raise HTTPException(status_code=400, detail="This welcome offer is valid only on your first order")
    discount = round(subtotal * coupon["discount_percent"] / 100, 2)
    return {"valid": True, "code": coupon["code"], "discount": discount, "discount_percent": coupon["discount_percent"]}


# ---- Orders ----
def calculate_totals(items: List[CartItem], coupon: Optional[dict]) -> dict:
    subtotal = sum(i.price * i.quantity for i in items)
    discount = 0.0
    if coupon and subtotal >= coupon.get("min_order", 0):
        discount = round(subtotal * coupon["discount_percent"] / 100, 2)
    delivery_fee = 0 if subtotal >= FREE_DELIVERY_THRESHOLD else DELIVERY_FEE
    total = max(0, subtotal - discount + delivery_fee)
    return {"subtotal": round(subtotal, 2), "discount": round(discount, 2), "delivery_fee": delivery_fee, "total": round(total, 2)}


@api.post("/orders")
async def place_order(req: PlaceOrderRequest, current_user: dict = Depends(get_current_user)):
    if not req.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    if req.payment_method not in ("cod", "upi", "razorpay"):
        raise HTTPException(status_code=400, detail="Invalid payment method")
    coupon = None
    if req.coupon_code:
        coupon = await db.coupons.find_one({"code": req.coupon_code.upper(), "active": True}, {"_id": 0})
        if not coupon:
            raise HTTPException(status_code=400, detail="Invalid coupon code")
        if coupon.get("expiry"):
            try:
                if datetime.fromisoformat(coupon["expiry"]) < datetime.now(timezone.utc):
                    raise HTTPException(status_code=400, detail="Coupon expired")
            except ValueError:
                pass
        if coupon.get("first_order_only"):
            already = await db.orders.count_documents({
                "user_id": current_user["id"],
                "coupon_code": req.coupon_code.upper(),
                "payment_status": {"$in": ["paid", "cod_pending"]},
            })
            if already > 0:
                raise HTTPException(status_code=400, detail="Welcome offer is valid only on your first order")
            if req.device_id:
                device_reuse = await db.orders.count_documents({
                    "device_id": req.device_id,
                    "coupon_code": req.coupon_code.upper(),
                    "payment_status": {"$in": ["paid", "cod_pending"]},
                })
                if device_reuse > 0:
                    raise HTTPException(status_code=400, detail="Welcome offer already used on this device")
    totals = calculate_totals(req.items, coupon)
    order_id = str(uuid.uuid4())
    order_no = f"MZB{int(datetime.now().timestamp())}"
    payment_status = "cod_pending" if req.payment_method == "cod" else "pending"
    razorpay_order_id: Optional[str] = None
    if req.payment_method == "razorpay":
        amount_paise = int(round(totals["total"] * 100))
        if amount_paise <= 0:
            raise HTTPException(status_code=400, detail="Order total must be greater than zero")
        rzp = get_razorpay_client()
        try:
            rzp_order = rzp.order.create({"amount": amount_paise, "currency": "INR", "receipt": order_no[:40], "payment_capture": 1, "notes": {"mezbaan_order_id": order_id, "user_id": current_user["id"]}})
        except Exception as e:
            logger.exception("Razorpay order creation failed")
            raise HTTPException(status_code=502, detail=f"Payment gateway error: {str(e)}")
        razorpay_order_id = rzp_order["id"]
    order = {
        "id": order_id, "order_no": order_no, "user_id": current_user["id"],
        "user_name": req.name, "user_phone": req.phone, "address": req.address,
        "items": [i.dict() for i in req.items], "payment_method": req.payment_method,
        "payment_status": payment_status, "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": None, "razorpay_signature": None,
        "coupon_code": req.coupon_code, "device_id": req.device_id, "notes": req.notes,
        **totals, "status": "received", "status_history": [{"status": "received", "at": now_iso()}], "created_at": now_iso(),
    }
    await db.orders.insert_one(dict(order))
    order.pop("_id", None)
    if razorpay_order_id:
        order["razorpay_key_id"] = RAZORPAY_KEY_ID
    return order


# ---- Razorpay ----
@api.post("/payments/razorpay/verify")
async def verify_razorpay_payment(payload: RazorpayVerifyRequest, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payload.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")
    if order.get("payment_method") != "razorpay":
        raise HTTPException(status_code=400, detail="Order is not a Razorpay order")
    if order.get("razorpay_order_id") != payload.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Razorpay order id mismatch")
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay not configured on server")
    expected = hmac.new(RAZORPAY_KEY_SECRET.encode("utf-8"), f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        await db.orders.update_one({"id": order["id"]}, {"$set": {"payment_status": "failed", "razorpay_payment_id": payload.razorpay_payment_id, "razorpay_signature": payload.razorpay_signature}})
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    await db.orders.update_one({"id": order["id"]}, {"$set": {"payment_status": "paid", "razorpay_payment_id": payload.razorpay_payment_id, "razorpay_signature": payload.razorpay_signature, "paid_at": now_iso()}})
    updated = await db.orders.find_one({"id": order["id"]}, {"_id": 0})
    return {"success": True, "order": updated}


@api.post("/payments/razorpay/cancel")
async def cancel_razorpay_payment(payload: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    order_id = payload.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id required")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")
    if order.get("payment_status") == "paid":
        return {"success": True, "already_paid": True}
    await db.orders.update_one({"id": order_id}, {"$set": {"payment_status": "cancelled", "status": "cancelled"}})
    return {"success": True}


@api.get("/payments/razorpay/config")
async def razorpay_config():
    return {"key_id": RAZORPAY_KEY_ID, "configured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)}


@api.get("/orders")
async def my_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders


@api.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ---- Admin (email-gated via require_admin) ----
@api.get("/admin/orders")
async def admin_orders(_: bool = Depends(require_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


@api.patch("/admin/orders/{order_id}/status")
async def update_status(order_id: str, body: OrderStatusUpdate, _: bool = Depends(require_admin)):
    if body.status not in STATUS_FLOW:
        raise HTTPException(status_code=400, detail="Invalid status")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    history = order.get("status_history", [])
    history.append({"status": body.status, "at": now_iso()})
    await db.orders.update_one({"id": order_id}, {"$set": {"status": body.status, "status_history": history}})
    order["status"] = body.status
    order["status_history"] = history
    return order


@api.get("/admin/stats")
async def admin_stats(_: bool = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    pipeline = [{"$group": {"_id": None, "revenue": {"$sum": "$total"}}}]
    rev_cur = db.orders.aggregate(pipeline)
    revenue = 0
    async for doc in rev_cur:
        revenue = doc.get("revenue", 0)
    active = await db.orders.count_documents({"status": {"$in": ["received", "preparing", "packed", "out_for_delivery"]}})
    return {"total_orders": total_orders, "active_orders": active, "total_customers": total_users, "revenue": round(revenue, 2)}


@api.post("/admin/menu")
async def admin_add_item(item: MenuItem, _: bool = Depends(require_admin)):
    doc = item.dict()
    doc["id"] = str(uuid.uuid4())
    await db.menu.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.patch("/admin/menu/{item_id}")
async def admin_update_item(item_id: str, patch: MenuItemUpdate, _: bool = Depends(require_admin)):
    updates = {k: v for k, v in patch.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.menu.update_one({"id": item_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    item = await db.menu.find_one({"id": item_id}, {"_id": 0})
    return item


@api.delete("/admin/menu/{item_id}")
async def admin_delete_item(item_id: str, _: bool = Depends(require_admin)):
    res = await db.menu.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"deleted": True}


@api.get("/admin/coupons")
async def admin_list_coupons(_: bool = Depends(require_admin)):
    return await db.coupons.find({}, {"_id": 0}).to_list(50)


@api.patch("/admin/coupons/{code}")
async def admin_update_coupon(code: str, patch: CouponUpdate, _: bool = Depends(require_admin)):
    coupon = await db.coupons.find_one({"code": code.upper()}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    updates = {k: v for k, v in patch.dict().items() if v is not None}
    if "code" in updates:
        updates["code"] = updates["code"].upper()
    if updates:
        await db.coupons.update_one({"code": code.upper()}, {"$set": updates})
    updated = await db.coupons.find_one({"code": updates.get("code", code.upper())}, {"_id": 0})
    return updated


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await migrate_duplicate_accounts()
    await ensure_user_indexes()
    await seed_database()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
