-- ═════════════════════════════════════════════════════════════════════════════════
-- ESMARC COMPLETE PLATFORM - DATABASE MIGRATIONS
-- Run these in Supabase SQL Editor
-- ═════════════════════════════════════════════════════════════════════════════════

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_orders_shop;
DROP INDEX IF EXISTS idx_orders_payment_ref;
DROP INDEX IF EXISTS idx_order_items_order;
DROP INDEX IF EXISTS idx_contact_messages_shop;

-- ═════════════════════════════════════════════════════════════════════════════════
-- EXISTING TABLES (from v0)
-- ═════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text,
  total numeric NOT NULL,
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'unpaid',
  payment_ref text,
  utm_source text DEFAULT 'direct',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL,
  unit_price numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_name text,
  customer_phone text,
  message text NOT NULL,
  status text DEFAULT 'unread',
  created_at timestamptz DEFAULT now()
);

-- ═════════════════════════════════════════════════════════════════════════════════
-- NEW TABLES (v2.0 Features)
-- ═════════════════════════════════════════════════════════════════════════════════

-- VIDEOS (with approval workflow)
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  status text DEFAULT 'pending', -- pending, approved, rejected
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- MESSAGES (two-way: customer ↔ shop owner, shop owner ↔ super admin)
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text DEFAULT 'customer', -- customer, admin, superadmin
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- NOTIFICATIONS (one-way alerts: super admin → shop owner, shop owner → customers)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ANALYTICS EVENTS (track traffic sources: Telegram, YouTube, TikTok, Instagram, etc.)
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- order_created, page_view, etc.
  source text DEFAULT 'direct', -- direct, telegram, youtube, tiktok, instagram, etc.
  metadata jsonb, -- additional data like order_id, customer_id, etc.
  created_at timestamptz DEFAULT now()
);

-- FEATURE FLAGS (super admin controls which features are locked/unlocked for each shop)
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  feature text NOT NULL, -- video, analytics, notifications, etc.
  enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, feature)
);

-- ═════════════════════════════════════════════════════════════════════════════════
-- UPDATE PRODUCTS TABLE (add video_url column if not exists)
-- ═════════════════════════════════════════════════════════════════════════════════

ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url text;

-- ═════════════════════════════════════════════════════════════════════════════════
-- UPDATE SHOPS TABLE (add verification_status for super admin control)
-- ═════════════════════════════════════════════════════════════════════════════════

ALTER TABLE shops ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';
-- values: pending, agreed, active, rejected

-- ═════════════════════════════════════════════════════════════════════════════════
-- INDEXES (for performance)
-- ═════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_shop ON contact_messages(shop_id);
CREATE INDEX IF NOT EXISTS idx_videos_shop ON videos(shop_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_analytics_shop ON analytics_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_analytics_source ON analytics_events(source);
CREATE INDEX IF NOT EXISTS idx_feature_flags_shop ON feature_flags(shop_id);

-- ═════════════════════════════════════════════════════════════════════════════════
-- DONE! All tables created
-- ═════════════════════════════════════════════════════════════════════════════════
