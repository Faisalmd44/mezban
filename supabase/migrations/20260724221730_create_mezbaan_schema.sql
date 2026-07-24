-- Mezbaan Customer — Full Database Schema (from Mezban-Admin source of truth)
-- Adds wishlist, recently_viewed columns and variants to menu_items

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text UNIQUE,
  phone text,
  picture text,
  wallet numeric NOT NULL DEFAULT 0,
  referral_code text UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  is_admin boolean NOT NULL DEFAULT false,
  google_id text,
  device_id text,
  wishlist text[] NOT NULL DEFAULT '{}',
  recently_viewed text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Main',
  image text,
  in_stock boolean NOT NULL DEFAULT true,
  is_veg boolean NOT NULL DEFAULT true,
  is_bestseller boolean NOT NULL DEFAULT false,
  rating numeric NOT NULL DEFAULT 0,
  prep_time integer NOT NULL DEFAULT 30,
  variants jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_select_all" ON menu_items;
CREATE POLICY "menu_select_all" ON menu_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "menu_insert_auth" ON menu_items;
CREATE POLICY "menu_insert_auth" ON menu_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "menu_update_auth" ON menu_items;
CREATE POLICY "menu_update_auth" ON menu_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text UNIQUE NOT NULL DEFAULT ('MEZ-' || extract(epoch from now())::bigint),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT '',
  user_phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'received',
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  notes text,
  coupon_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_update_own" ON orders;
CREATE POLICY "orders_update_own" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  variant text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL DEFAULT 'flat',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_select_all" ON coupons;
CREATE POLICY "coupons_select_all" ON coupons FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "coupons_insert_auth" ON coupons;
CREATE POLICY "coupons_insert_auth" ON coupons FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "coupons_update_auth" ON coupons;
CREATE POLICY "coupons_update_auth" ON coupons FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  line text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addr_select_own" ON addresses;
CREATE POLICY "addr_select_own" ON addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "addr_insert_own" ON addresses;
CREATE POLICY "addr_insert_own" ON addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "addr_update_own" ON addresses;
CREATE POLICY "addr_update_own" ON addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "addr_delete_own" ON addresses;
CREATE POLICY "addr_delete_own" ON addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fcm_select_own" ON fcm_tokens;
CREATE POLICY "fcm_select_own" ON fcm_tokens FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fcm_insert_own" ON fcm_tokens;
CREATE POLICY "fcm_insert_own" ON fcm_tokens FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fcm_delete_own" ON fcm_tokens;
CREATE POLICY "fcm_delete_own" ON fcm_tokens FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);

INSERT INTO menu_items (name, description, price, category, image, in_stock, is_veg, is_bestseller, rating, prep_time, variants)
VALUES
  ('Chicken Biryani', 'Aromatic basmati rice cooked with tender chicken, saffron, and traditional spices', 320, 'Main', 'https://images.pexels.com/photos/12737665/pexels-photo-12737665.jpeg?auto=compress&cs=tinysrgb&w=400', true, false, true, 4.5, 35, '[]'),
  ('Veg Biryani', 'Fragrant basmati rice with mixed vegetables, herbs, and biryani spices', 240, 'Main', 'https://images.pexels.com/photos/12737666/pexels-photo-12737666.jpeg?auto=compress&cs=tinysrgb&w=400', true, true, false, 4.2, 30, '[]'),
  ('Mutton Korma', 'Slow-cooked mutton in a rich, creamy curry with yogurt and aromatic spices', 380, 'Main', 'https://images.pexels.com/photos/12737667/pexels-photo-12737667.jpeg?auto=compress&cs=tinysrgb&w=400', true, false, true, 4.7, 45, '[]'),
  ('Paneer Tikka', 'Grilled cottage cheese marinated in spiced yogurt with bell peppers and onions', 280, 'Starter', 'https://images.pexels.com/photos/12737668/pexels-photo-12737668.jpeg?auto=compress&cs=tinysrgb&w=400', true, true, true, 4.6, 25, '[]'),
  ('Butter Naan', 'Soft tandoor-baked flatbread brushed with butter', 40, 'Bread', 'https://images.pexels.com/photos/12737669/pexels-photo-12737669.jpeg?auto=compress&cs=tinysrgb&w=400', true, true, false, 4.3, 15, '[]'),
  ('Gulab Jamun', 'Deep-fried milk dumplings soaked in rose-flavored sugar syrup', 120, 'Dessert', 'https://images.pexels.com/photos/12737670/pexels-photo-12737670.jpeg?auto=compress&cs=tinysrgb&w=400', true, true, true, 4.8, 20, '[]')
ON CONFLICT DO NOTHING;

INSERT INTO coupons (code, discount_type, discount_value, min_order, max_uses, uses, active, expires_at)
VALUES ('WELCOME50', 'flat', 50, 200, null, 0, true, null)
ON CONFLICT (code) DO NOTHING;
