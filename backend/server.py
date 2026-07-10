"""Mezbaan Restro - FastAPI backend.

Customer + admin food ordering API on top of MongoDB.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client["Mezbaan"]

app = FastAPI(title="Mezbaan Restro API")
api = APIRouter(prefix="/api")

ADMIN_PASSCODE = "MEZBAAN2026"
FREE_DELIVERY_THRESHOLD = 250
DELIVERY_FEE = 30

STATUS_FLOW = ["received", "preparing", "packed", "out_for_delivery", "delivered"]


# ----- Models -----
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SignupRequest(BaseModel):
    name: str
    phone: str


class User(BaseModel):
    id: str
    name: str
    phone: str
    wallet: float = 0.0
    loyalty_points: int = 0
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
    payment_method: str  # "cod" | "upi"
    coupon_code: Optional[str] = None
    notes: Optional[str] = None
    use_loyalty: bool = False


class OrderStatusUpdate(BaseModel):
    status: str


class Coupon(BaseModel):
    code: str
    description: str
    discount_percent: int
    min_order: float = 0
    active: bool = True


# ----- Auth helpers -----
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    user = await db.users.find_one({"id": token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


async def require_admin(x_admin_passcode: Optional[str] = Header(None)) -> bool:
    if x_admin_passcode != ADMIN_PASSCODE:
        raise HTTPException(status_code=403, detail="Admin passcode required")
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
    {"code": "WELCOME20", "description": "Get 20% off on your first order", "discount_percent": 20, "min_order": 199, "active": True},
    {"code": "MEZBAAN10", "description": "Flat 10% off on orders above ₹299", "discount_percent": 10, "min_order": 299, "active": True},
    {"code": "FEAST15", "description": "15% off on the Mezbaan Feast", "discount_percent": 15, "min_order": 499, "active": True},
]


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
    coupon_count = await db.coupons.count_documents({})
    if coupon_count == 0:
        await db.coupons.insert_many([dict(c) for c in SEED_COUPONS])
        logging.info("Seeded coupons")


# ----- Routes -----
@api.get("/")
async def root():
    return {"app": "Mezbaan Restro", "tagline": "Freshly Crafted, Honestly Served"}


@api.post("/auth/signup")
async def signup(req: SignupRequest):
    phone = req.phone.strip()
    name = req.name.strip()
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    if not name:
        raise HTTPException(status_code=400, detail="Name required")

    existing = await db.users.find_one({"phone": phone}, {"_id": 0})
    if existing:
        return {"token": existing["id"], "user": existing}

    user_id = str(uuid.uuid4())
    referral_code = f"MEZ{phone[-4:]}{user_id[:4].upper()}"
    user_doc = {
        "id": user_id,
        "name": name,
        "phone": phone,
        "is_admin": phone in 
        ["8595244548", "7503244548"],
        "wallet": 0.0,
        "loyalty_points": 50,  # signup bonus
        "referral_code": referral_code,
        "wishlist": [],
        "addresses": [],
        "created_at": now_iso(),
    }
    await db.users.insert_one(dict(user_doc))
    user_doc.pop("_id", None)
    return {"token": user_id, "user": user_doc}


@api.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user


@api.post("/auth/wishlist/{item_id}")
async def toggle_wishlist(item_id: str, current_user: dict = Depends(get_current_user)):
    wl = current_user.get("wishlist", [])
    if item_id in wl:
        wl.remove(item_id)
    else:
        wl.append(item_id)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"wishlist": wl}})
    return {"wishlist": wl}


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


# ---- Orders ----
def calculate_totals(items: List[CartItem], coupon: Optional[dict], use_loyalty_points: int) -> dict:
    subtotal = sum(i.price * i.quantity for i in items)
    discount = 0.0
    if coupon and subtotal >= coupon.get("min_order", 0):
        discount = round(subtotal * coupon["discount_percent"] / 100, 2)
    delivery_fee = 0 if subtotal >= FREE_DELIVERY_THRESHOLD else DELIVERY_FEE
    loyalty_discount = min(use_loyalty_points, int(subtotal * 0.1))  # max 10% via loyalty
    total = max(0, subtotal - discount - loyalty_discount + delivery_fee)
    return {
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "loyalty_discount": loyalty_discount,
        "delivery_fee": delivery_fee,
        "total": round(total, 2),
    }


@api.post("/orders")
async def place_order(req: PlaceOrderRequest, current_user: dict = Depends(get_current_user)):
    if not req.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    coupon = None
    if req.coupon_code:
        coupon = await db.coupons.find_one({"code": req.coupon_code.upper(), "active": True}, {"_id": 0})
        if not coupon:
            raise HTTPException(status_code=400, detail="Invalid coupon code")

    use_pts = current_user.get("loyalty_points", 0) if req.use_loyalty else 0
    totals = calculate_totals(req.items, coupon, use_pts)
    earned_points = int(totals["total"] / 20)  # 5% back as points

    order_id = str(uuid.uuid4())
    order_no = f"MZB{int(datetime.now().timestamp())}"
    order = {
        "id": order_id,
        "order_no": order_no,
        "user_id": current_user["id"],
        "user_name": req.name,
        "user_phone": req.phone,
        "address": req.address,
        "items": [i.dict() for i in req.items],
        "payment_method": req.payment_method,
        "coupon_code": req.coupon_code,
        "notes": req.notes,
        **totals,
        "earned_points": earned_points,
        "status": "received",
        "status_history": [{"status": "received", "at": now_iso()}],
        "created_at": now_iso(),
    }
    await db.orders.insert_one(dict(order))

    # update user loyalty
    new_points = current_user.get("loyalty_points", 0) - totals["loyalty_discount"] + earned_points
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"loyalty_points": new_points}})

    order.pop("_id", None)
    return order


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


# ---- Admin ----
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
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": body.status, "status_history": history}},
    )
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
    return {
        "total_orders": total_orders,
        "active_orders": active,
        "total_customers": total_users,
        "revenue": round(revenue, 2),
    }


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
    await seed_database()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
