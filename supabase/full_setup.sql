-- ====================================================================
-- PriceProof: Initial Database Schema Migration
-- 16 Normalized Tables, Constraints, Indexes, and Audit Logging
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    city TEXT DEFAULT 'Mumbai',
    preferred_currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. User Roles Table (Strict RBAC: 'customer', 'administrator')
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'administrator')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Canonical Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Product Variants Table (Packages, Quantities & Units)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL CHECK (unit IN ('g', 'kg', 'ml', 'l', 'piece', 'pack')),
    barcode TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Stores Table (Retailers: DMart, JioMart, BigBasket, Blinkit, etc.)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    website_url TEXT,
    store_type TEXT NOT NULL DEFAULT 'online' CHECK (store_type IN ('online', 'hypermarket', 'quick_commerce', 'supermarket')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (delivery_charge >= 0),
    min_free_delivery NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (min_free_delivery >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Store Listings Table (Variant-Store Mapping with live pricing)
CREATE TABLE IF NOT EXISTS public.store_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sku TEXT,
    store_product_url TEXT,
    current_price NUMERIC(10,2) NOT NULL CHECK (current_price >= 0),
    mrp NUMERIC(10,2) CHECK (mrp >= current_price),
    is_in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(variant_id, store_id)
);

-- 10. Price History Table (Immutable Historical Observations)
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.store_listings(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    mrp NUMERIC(10,2),
    is_in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    source TEXT NOT NULL DEFAULT 'manual_entry',
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Wishlists Table
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, variant_id)
);

-- 12. Shopping Lists Table
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Shopping List Items Table
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_checked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(list_id, variant_id)
);

-- 14. Price Alerts Table
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    target_price NUMERIC(10,2) NOT NULL CHECK (target_price > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES public.price_alerts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Import Jobs Table (Feed and batch automation status)
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    source_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_records INT NOT NULL DEFAULT 0,
    imported_records INT NOT NULL DEFAULT 0,
    failed_records INT NOT NULL DEFAULT 0,
    error_log TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Administrative Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- Indexes for High Performance Querying
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_store_listings_variant ON public.store_listings(variant_id);
CREATE INDEX IF NOT EXISTS idx_store_listings_store ON public.store_listings(store_id);
CREATE INDEX IF NOT EXISTS idx_store_listings_price ON public.store_listings(current_price);
CREATE INDEX IF NOT EXISTS idx_price_history_listing ON public.price_history(listing_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list ON public.shopping_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- ====================================================================
-- Automatic updated_at Trigger Function
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_store_listings_updated_at ON public.store_listings;
CREATE TRIGGER trg_store_listings_updated_at BEFORE UPDATE ON public.store_listings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_shopping_lists_updated_at ON public.shopping_lists;
CREATE TRIGGER trg_shopping_lists_updated_at BEFORE UPDATE ON public.shopping_lists FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_price_alerts_updated_at ON public.price_alerts;
CREATE TRIGGER trg_price_alerts_updated_at BEFORE UPDATE ON public.price_alerts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- ====================================================================
-- PriceProof: Row Level Security (RLS) Policies
-- Enforces User Isolation & Role-Based Access Control (RBAC)
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current authenticated user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'administrator'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------
-- PROFILES POLICIES
-- --------------------------------------------------------------------
CREATE POLICY "Public profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- --------------------------------------------------------------------
-- USER_ROLES POLICIES
-- --------------------------------------------------------------------
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage user roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- CATALOG READ POLICIES (Public Anonymous & Authenticated Read)
-- --------------------------------------------------------------------
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Brands are viewable by everyone" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Product variants are viewable by everyone" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Stores are viewable by everyone" ON public.stores FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Store listings are viewable by everyone" ON public.store_listings FOR SELECT USING (true);
CREATE POLICY "Price history is viewable by everyone" ON public.price_history FOR SELECT USING (true);

-- --------------------------------------------------------------------
-- CATALOG WRITE POLICIES (Admin Only)
-- --------------------------------------------------------------------
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage brands" ON public.brands FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage product variants" ON public.product_variants FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage stores" ON public.stores FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage store listings" ON public.store_listings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can manage price history" ON public.price_history FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- USER DATA POLICIES (Private, Isolated per User)
-- --------------------------------------------------------------------
-- Wishlists
CREATE POLICY "Users can view their own wishlist"
    ON public.wishlists FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist"
    ON public.wishlists FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist"
    ON public.wishlists FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Shopping Lists
CREATE POLICY "Users can view their own shopping lists"
    ON public.shopping_lists FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create shopping lists"
    ON public.shopping_lists FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping lists"
    ON public.shopping_lists FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping lists"
    ON public.shopping_lists FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Shopping List Items
CREATE POLICY "Users can view items in their shopping lists"
    ON public.shopping_list_items FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.shopping_lists
        WHERE shopping_lists.id = shopping_list_items.list_id
        AND shopping_lists.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert items to their shopping lists"
    ON public.shopping_list_items FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.shopping_lists
        WHERE shopping_lists.id = shopping_list_items.list_id
        AND shopping_lists.user_id = auth.uid()
    ));

CREATE POLICY "Users can update items in their shopping lists"
    ON public.shopping_list_items FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.shopping_lists
        WHERE shopping_lists.id = shopping_list_items.list_id
        AND shopping_lists.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.shopping_lists
        WHERE shopping_lists.id = shopping_list_items.list_id
        AND shopping_lists.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete items in their shopping lists"
    ON public.shopping_list_items FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.shopping_lists
        WHERE shopping_lists.id = shopping_list_items.list_id
        AND shopping_lists.user_id = auth.uid()
    ));

-- Price Alerts
CREATE POLICY "Users can view own price alerts"
    ON public.price_alerts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price alerts"
    ON public.price_alerts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price alerts"
    ON public.price_alerts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own price alerts"
    ON public.price_alerts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Import Jobs & Audit Logs (Admin Only)
CREATE POLICY "Admins can view import jobs" ON public.import_jobs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can manage import jobs" ON public.import_jobs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "System/Admins can write audit logs" ON public.admin_audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
-- ====================================================================
-- PriceProof: Realistic Demonstration Seed Data
-- 9 Categories, 8 Retailers, 14 Brands, 50+ Products, 70+ Variants,
-- 200+ Store Listings, and 500+ Historical Price Observations
-- ====================================================================

-- 1. STORES (8 Major Indian Grocery Retailers)
INSERT INTO public.stores (id, name, slug, logo_url, website_url, store_type, delivery_charge, min_free_delivery) VALUES
('11111111-1111-1111-1111-111111111101', 'DMart Ready', 'dmart', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100', 'https://www.dmart.in', 'hypermarket', 49.00, 1000.00),
('11111111-1111-1111-1111-111111111102', 'BigBasket', 'bigbasket', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100', 'https://www.bigbasket.com', 'online', 30.00, 500.00),
('11111111-1111-1111-1111-111111111103', 'Blinkit', 'blinkit', 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=100', 'https://blinkit.com', 'quick_commerce', 25.00, 0.00),
('11111111-1111-1111-1111-111111111104', 'Zepto', 'zepto', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=100', 'https://www.zeptonow.com', 'quick_commerce', 29.00, 0.00),
('11111111-1111-1111-1111-111111111105', 'JioMart', 'jiomart', 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=100', 'https://www.jiomart.com', 'online', 0.00, 250.00),
('11111111-1111-1111-1111-111111111106', 'Amazon Fresh', 'amazon-fresh', 'https://images.unsplash.com/photo-1523474253246-f3be1ad42e6c?w=100', 'https://www.amazon.in/fresh', 'online', 39.00, 799.00),
('11111111-1111-1111-1111-111111111107', 'Flipkart Grocery', 'flipkart-grocery', 'https://images.unsplash.com/photo-1555529771-7888783a18d3?w=100', 'https://www.flipkart.com/grocery', 'online', 40.00, 600.00),
('11111111-1111-1111-1111-111111111108', 'Local Supermarket', 'local-supermarket', 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=100', 'https://example.com/local', 'supermarket', 0.00, 0.00)
ON CONFLICT (slug) DO NOTHING;

-- 2. CATEGORIES (9 Canonical Indian Grocery Categories)
INSERT INTO public.categories (id, name, slug, icon, description, display_order) VALUES
('22222222-2222-2222-2222-222222222201', 'Rice and Pulses', 'rice-and-pulses', '🌾', 'Basmati, sona masoori, toor dal, moong dal, and staple grains', 1),
('22222222-2222-2222-2222-222222222202', 'Milk and Dairy', 'milk-and-dairy', '🥛', 'Fresh milk, paneer, curd, butter, and ghee', 2),
('22222222-2222-2222-2222-222222222203', 'Vegetables and Fruits', 'vegetables-and-fruits', '🥔', 'Daily essentials like onions, potatoes, tomatoes, and seasonal produce', 3),
('22222222-2222-2222-2222-222222222204', 'Packaged Foods', 'packaged-foods', '🍞', 'Atta, noodles, biscuits, breakfast cereals, and snacks', 4),
('22222222-2222-2222-2222-222222222205', 'Personal Care', 'personal-care', '🧴', 'Soaps, toothpaste, shampoo, and hygiene essentials', 5),
('22222222-2222-2222-2222-222222222206', 'Cleaning Products', 'cleaning-products', '🧼', 'Detergent powders, dishwash liquids, and floor cleaners', 6),
('22222222-2222-2222-2222-222222222207', 'Cooking Oils', 'cooking-oils', '🛢️', 'Sunflower oil, mustard oil, groundnut oil, and olive oil', 7),
('22222222-2222-2222-2222-222222222208', 'Beverages', 'beverages', '☕', 'Tea, filter coffee, health drinks, and juices', 8),
('22222222-2222-2222-2222-222222222209', 'Other Household Essentials', 'other-essentials', '🧂', 'Salt, spices, sugar, matches, and foil paper', 9)
ON CONFLICT (slug) DO NOTHING;

-- 3. BRANDS (14 Leading FMCG & Grocery Brands in India)
INSERT INTO public.brands (id, name, slug, logo_url, description) VALUES
('33333333-3333-3333-3333-333333333301', 'India Gate', 'india-gate', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100', 'Premium basmati rice and aged rice products'),
('33333333-3333-3333-3333-333333333302', 'Daawat', 'daawat', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100', 'Finest aromatic basmati rice'),
('33333333-3333-3333-3333-333333333303', 'Aashirvaad', 'aashirvaad', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100', 'Whole wheat atta, salt, and spices from ITC'),
('33333333-3333-3333-3333-333333333304', 'Tata Sampann', 'tata-sampann', 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=100', 'Unpolished dal, besan, and organic pantry staples'),
('33333333-3333-3333-3333-333333333305', 'Amul', 'amul', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=100', 'The Taste of India — milk, butter, ghee, and cheese'),
('33333333-3333-3333-3333-333333333306', 'Mother Dairy', 'mother-dairy', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100', 'Fresh toned milk, curd, paneer, and ice creams'),
('33333333-3333-3333-3333-333333333307', 'Fortune', 'fortune', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=100', 'Refined sunflower oil, mustard oil, and basmati rice'),
('33333333-3333-3333-3333-333333333308', 'Saffola', 'saffola', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=100', 'Heart-healthy blended edible oils and oats'),
('33333333-3333-3333-3333-333333333309', 'Surf Excel', 'surf-excel', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=100', 'Stain removal detergent powder and liquid'),
('33333333-3333-3333-3333-333333333310', 'Vim', 'vim', 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=100', 'Dishwash bar and concentrated lemon gel'),
('33333333-3333-3333-3333-333333333311', 'Colgate', 'colgate', 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=100', 'Oral health toothpaste and toothbrushes'),
('33333333-3333-3333-3333-333333333312', 'Britannia', 'britannia', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100', 'Good Day, Marie Gold, breads, and dairy products'),
('33333333-3333-3333-3333-333333333313', 'Parle', 'parle', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100', 'Parle-G, Monaco, and Krackjack biscuits'),
('33333333-3333-3333-3333-333333333314', 'Tata Tea', 'tata-tea', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=100', 'Tata Tea Gold, Premium, and Agni tea blends')
ON CONFLICT (slug) DO NOTHING;

-- 4. PRODUCTS & VARIANTS & STORE LISTINGS
-- Function to safely insert a complete product suite with variants, store listings, and history
DO $$
DECLARE
    -- Category IDs
    cat_rice UUID := '22222222-2222-2222-2222-222222222201';
    cat_dairy UUID := '22222222-2222-2222-2222-222222222202';
    cat_veg UUID := '22222222-2222-2222-2222-222222222203';
    cat_pack UUID := '22222222-2222-2222-2222-222222222204';
    cat_pers UUID := '22222222-2222-2222-2222-222222222205';
    cat_clean UUID := '22222222-2222-2222-2222-222222222206';
    cat_oil UUID := '22222222-2222-2222-2222-222222222207';
    cat_bev UUID := '22222222-2222-2222-2222-222222222208';
    cat_oth UUID := '22222222-2222-2222-2222-222222222209';

    -- Brand IDs
    b_indiagate UUID := '33333333-3333-3333-3333-333333333301';
    b_daawat UUID := '33333333-3333-3333-3333-333333333302';
    b_aashirvaad UUID := '33333333-3333-3333-3333-333333333303';
    b_tatasampann UUID := '33333333-3333-3333-3333-333333333304';
    b_amul UUID := '33333333-3333-3333-3333-333333333305';
    b_motherdairy UUID := '33333333-3333-3333-3333-333333333306';
    b_fortune UUID := '33333333-3333-3333-3333-333333333307';
    b_saffola UUID := '33333333-3333-3333-3333-333333333308';
    b_surfexcel UUID := '33333333-3333-3333-3333-333333333309';
    b_vim UUID := '33333333-3333-3333-3333-333333333310';
    b_colgate UUID := '33333333-3333-3333-3333-333333333311';
    b_britannia UUID := '33333333-3333-3333-3333-333333333312';
    b_parle UUID := '33333333-3333-3333-3333-333333333313';
    b_tatatea UUID := '33333333-3333-3333-3333-333333333314';

    -- Store IDs
    s_dmart UUID := '11111111-1111-1111-1111-111111111101';
    s_bb UUID := '11111111-1111-1111-1111-111111111102';
    s_blinkit UUID := '11111111-1111-1111-1111-111111111103';
    s_zepto UUID := '11111111-1111-1111-1111-111111111104';
    s_jiomart UUID := '11111111-1111-1111-1111-111111111105';
    s_amazon UUID := '11111111-1111-1111-1111-111111111106';
    s_flipkart UUID := '11111111-1111-1111-1111-111111111107';
    s_local UUID := '11111111-1111-1111-1111-111111111108';

    p_id UUID;
    v1_id UUID;
    v2_id UUID;
    l_id UUID;
BEGIN
    -- PRODUCT 1: India Gate Basmati Rice Classic
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444001', 'India Gate Basmati Rice Classic', 'india-gate-basmati-rice-classic', cat_rice, b_indiagate, 'Aged aromatic long grain basmati rice ideal for biryani and pulao', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    -- Variant 1: 1 kg
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555001', p_id, '1 kg Pouch', 1.0, 'kg', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    -- Variant 2: 5 kg
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555002', p_id, '5 kg Bag', 5.0, 'kg', false)
    ON CONFLICT DO NOTHING RETURNING id INTO v2_id;

    -- Listings for 1 kg: DMart (₹175, MRP ₹230), BigBasket (₹189, MRP ₹230), Blinkit (₹210, MRP ₹230), JioMart (₹180, MRP ₹230)
    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock)
    VALUES ('66666666-6666-6666-6666-666666666001', '55555555-5555-5555-5555-555555555001', s_dmart, 175.00, 230.00, true)
    ON CONFLICT (variant_id, store_id) DO UPDATE SET current_price = EXCLUDED.current_price RETURNING id INTO l_id;
    -- History for DMart 1kg
    INSERT INTO public.price_history (listing_id, price, mrp, observed_at) VALUES
    (l_id, 185.00, 230.00, NOW() - INTERVAL '30 days'),
    (l_id, 180.00, 230.00, NOW() - INTERVAL '15 days'),
    (l_id, 175.00, 230.00, NOW() - INTERVAL '2 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock)
    VALUES ('66666666-6666-6666-6666-666666666002', '55555555-5555-5555-5555-555555555001', s_bb, 189.00, 230.00, true)
    ON CONFLICT (variant_id, store_id) DO UPDATE SET current_price = EXCLUDED.current_price RETURNING id INTO l_id;
    INSERT INTO public.price_history (listing_id, price, mrp, observed_at) VALUES
    (l_id, 195.00, 230.00, NOW() - INTERVAL '30 days'),
    (l_id, 189.00, 230.00, NOW() - INTERVAL '7 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock)
    VALUES ('66666666-6666-6666-6666-666666666003', '55555555-5555-5555-5555-555555555001', s_blinkit, 210.00, 230.00, true)
    ON CONFLICT (variant_id, store_id) DO UPDATE SET current_price = EXCLUDED.current_price RETURNING id INTO l_id;
    INSERT INTO public.price_history (listing_id, price, mrp, observed_at) VALUES
    (l_id, 215.00, 230.00, NOW() - INTERVAL '20 days'),
    (l_id, 210.00, 230.00, NOW() - INTERVAL '5 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock)
    VALUES ('66666666-6666-6666-6666-666666666004', '55555555-5555-5555-5555-555555555001', s_jiomart, 180.00, 230.00, true)
    ON CONFLICT (variant_id, store_id) DO UPDATE SET current_price = EXCLUDED.current_price;

    -- Listings for 5 kg: DMart (₹815, MRP ₹1050 -> ₹163/kg), BigBasket (₹860, MRP ₹1050 -> ₹172/kg), Zepto (₹920, MRP ₹1050)
    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock)
    VALUES ('66666666-6666-6666-6666-666666666005', '55555555-5555-5555-5555-555555555002', s_dmart, 815.00, 1050.00, true)
    ON CONFLICT (variant_id, store_id) DO UPDATE SET current_price = EXCLUDED.current_price RETURNING id INTO l_id;
    INSERT INTO public.price_history (listing_id, price, mrp, observed_at) VALUES
    (l_id, 850.00, 1050.00, NOW() - INTERVAL '40 days'),
    (l_id, 830.00, 1050.00, NOW() - INTERVAL '18 days'),
    (l_id, 815.00, 1050.00, NOW() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock)
    VALUES ('66666666-6666-6666-6666-666666666006', '55555555-5555-5555-5555-555555555002', s_bb, 860.00, 1050.00, true)
    ON CONFLICT (variant_id, store_id) DO UPDATE SET current_price = EXCLUDED.current_price;

    -- PRODUCT 2: Daawat Rozana Super Basmati Rice
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444002', 'Daawat Rozana Super Basmati Rice', 'daawat-rozana-super-basmati-rice', cat_rice, b_daawat, 'Medium slender basmati rice for daily home cooking', 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555003', p_id, '5 kg Bag', 5.0, 'kg', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666007', v1_id, s_dmart, 410.00, 550.00, true),
    ('66666666-6666-6666-6666-666666666008', v1_id, s_bb, 435.00, 550.00, true),
    ('66666666-6666-6666-6666-666666666009', v1_id, s_blinkit, 460.00, 550.00, true),
    ('66666666-6666-6666-6666-666666666010', v1_id, s_amazon, 425.00, 550.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 3: Tata Sampann Unpolished Toor Dal
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444003', 'Tata Sampann Unpolished Toor Dal', 'tata-sampann-unpolished-toor-dal', cat_rice, b_tatasampann, 'Natural wholesome toor dal rich in protein without water or stone polishing', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555004', p_id, '1 kg Pouch', 1.0, 'kg', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666011', v1_id, s_dmart, 178.00, 215.00, true),
    ('66666666-6666-6666-6666-666666666012', v1_id, s_bb, 185.00, 215.00, true),
    ('66666666-6666-6666-6666-666666666013', v1_id, s_zepto, 195.00, 215.00, true),
    ('66666666-6666-6666-6666-666666666014', v1_id, s_jiomart, 180.00, 215.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 4: Aashirvaad Superior MP Sharbati Atta
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444004', 'Aashirvaad Superior MP Sharbati Atta', 'aashirvaad-superior-mp-sharbati-atta', cat_pack, b_aashirvaad, '100% pure whole wheat grain flour with 0% maida for soft rotis', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555005', p_id, '5 kg Bag', 5.0, 'kg', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555006', p_id, '10 kg Bag', 10.0, 'kg', false)
    ON CONFLICT DO NOTHING RETURNING id INTO v2_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666015', v1_id, s_dmart, 275.00, 310.00, true),
    ('66666666-6666-6666-6666-666666666016', v1_id, s_bb, 289.00, 310.00, true),
    ('66666666-6666-6666-6666-666666666017', v1_id, s_blinkit, 305.00, 310.00, true),
    ('66666666-6666-6666-6666-666666666018', v1_id, s_jiomart, 280.00, 310.00, true),
    ('66666666-6666-6666-6666-666666666019', v2_id, s_dmart, 520.00, 610.00, true),
    ('66666666-6666-6666-6666-666666666020', v2_id, s_bb, 545.00, 610.00, true),
    ('66666666-6666-6666-6666-666666666021', v2_id, s_amazon, 535.00, 610.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 5: Fortune Sunlite Refined Sunflower Oil
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444005', 'Fortune Sunlite Refined Sunflower Oil', 'fortune-sunlite-refined-sunflower-oil', cat_oil, b_fortune, 'Light and healthy edible oil enriched with Vitamin A and D', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555007', p_id, '1 Litre Pouch', 1.0, 'l', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555008', p_id, '5 Litre Can', 5.0, 'l', false)
    ON CONFLICT DO NOTHING RETURNING id INTO v2_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666022', v1_id, s_dmart, 138.00, 165.00, true),
    ('66666666-6666-6666-6666-666666666023', v1_id, s_bb, 145.00, 165.00, true),
    ('66666666-6666-6666-6666-666666666024', v1_id, s_blinkit, 155.00, 165.00, true),
    ('66666666-6666-6666-6666-666666666025', v1_id, s_zepto, 152.00, 165.00, true),
    ('66666666-6666-6666-6666-666666666026', v2_id, s_dmart, 650.00, 810.00, true),
    ('66666666-6666-6666-6666-666666666027', v2_id, s_bb, 690.00, 810.00, true),
    ('66666666-6666-6666-6666-666666666028', v2_id, s_flipkart, 675.00, 810.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 6: Saffola Gold Pro Healthy Lifestyle Edible Oil
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444006', 'Saffola Gold Blended Edible Oil', 'saffola-gold-blended-edible-oil', cat_oil, b_saffola, 'Dual-seed blend of Rice Bran and Sunflower oil with antioxidant powers', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555009', p_id, '1 Litre Pouch', 1.0, 'l', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666029', v1_id, s_dmart, 162.00, 205.00, true),
    ('66666666-6666-6666-6666-666666666030', v1_id, s_bb, 175.00, 205.00, true),
    ('66666666-6666-6666-6666-666666666031', v1_id, s_blinkit, 190.00, 205.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 7: Amul Taaza Homogenised Toned Milk
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444007', 'Amul Taaza Toned Milk', 'amul-taaza-toned-milk', cat_dairy, b_amul, 'UHT treated long life toned milk with 3.0% fat and 8.5% SNF', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555010', p_id, '1 Litre Tetra Pack', 1.0, 'l', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555011', p_id, '500 ml Pouch', 500.0, 'ml', false)
    ON CONFLICT DO NOTHING RETURNING id INTO v2_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666032', v1_id, s_dmart, 68.00, 74.00, true),
    ('66666666-6666-6666-6666-666666666033', v1_id, s_bb, 72.00, 74.00, true),
    ('66666666-6666-6666-6666-666666666034', v1_id, s_blinkit, 74.00, 74.00, true),
    ('66666666-6666-6666-6666-666666666035', v1_id, s_zepto, 74.00, 74.00, true),
    ('66666666-6666-6666-6666-666666666036', v2_id, s_blinkit, 28.00, 28.00, true),
    ('66666666-6666-6666-6666-666666666037', v2_id, s_local, 28.00, 28.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 8: Amul Butter Pasteurised
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444008', 'Amul Butter Pasteurised', 'amul-butter-pasteurised', cat_dairy, b_amul, 'Delicious Utterly Butterly Amul pure salted butter', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555012', p_id, '100 g Pack', 100.0, 'g', false)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555013', p_id, '500 g Pack', 500.0, 'g', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v2_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666038', v1_id, s_dmart, 56.00, 58.00, true),
    ('66666666-6666-6666-6666-666666666039', v1_id, s_blinkit, 58.00, 58.00, true),
    ('66666666-6666-6666-6666-666666666040', v2_id, s_dmart, 268.00, 285.00, true),
    ('66666666-6666-6666-6666-666666666041', v2_id, s_bb, 275.00, 285.00, true),
    ('66666666-6666-6666-6666-666666666042', v2_id, s_zepto, 285.00, 285.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 9: Surf Excel Matic Top Load Detergent Powder
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444009', 'Surf Excel Matic Top Load Detergent Powder', 'surf-excel-matic-top-load-detergent-powder', cat_clean, b_surfexcel, 'Specially designed washing machine detergent for tough stains in 1 wash', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555014', p_id, '2 kg Pouch', 2.0, 'kg', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555015', p_id, '4 kg Pack with Tub', 4.0, 'kg', false)
    ON CONFLICT DO NOTHING RETURNING id INTO v2_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666043', v1_id, s_dmart, 415.00, 520.00, true),
    ('66666666-6666-6666-6666-666666666044', v1_id, s_bb, 449.00, 520.00, true),
    ('66666666-6666-6666-6666-666666666045', v1_id, s_blinkit, 499.00, 520.00, true),
    ('66666666-6666-6666-6666-666666666046', v2_id, s_dmart, 780.00, 999.00, true),
    ('66666666-6666-6666-6666-666666666047', v2_id, s_amazon, 829.00, 999.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 10: Vim Dishwash Gel Lemon
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444010', 'Vim Dishwash Gel Lemon', 'vim-dishwash-gel-lemon', cat_clean, b_vim, 'Concentrated dishwashing gel with the power of 100 lemons', 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555016', p_id, '750 ml Bottle', 750.0, 'ml', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666048', v1_id, s_dmart, 155.00, 210.00, true),
    ('66666666-6666-6666-6666-666666666049', v1_id, s_bb, 175.00, 210.00, true),
    ('66666666-6666-6666-6666-666666666050', v1_id, s_zepto, 195.00, 210.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 11: Colgate Strong Teeth Toothpaste
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444011', 'Colgate Strong Teeth Dental Cream', 'colgate-strong-teeth-dental-cream', cat_pers, b_colgate, 'Calcium boost formula to nourish teeth and provide cavity protection', 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555017', p_id, '500 g Saver Pack', 500.0, 'g', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666051', v1_id, s_dmart, 225.00, 290.00, true),
    ('66666666-6666-6666-6666-666666666052', v1_id, s_bb, 248.00, 290.00, true),
    ('66666666-6666-6666-6666-666666666053', v1_id, s_blinkit, 275.00, 290.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 12: Tata Tea Gold
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444012', 'Tata Tea Gold Rich Taste & Aroma', 'tata-tea-gold-rich-taste-aroma', cat_bev, b_tatatea, 'Exquisite blend of valley grown Assam CTC teas with gently rolled long leaves', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555018', p_id, '500 g Pouch', 500.0, 'g', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555019', p_id, '1 kg Pouch', 1.0, 'kg', false)
    ON CONFLICT DO NOTHING RETURNING id INTO v2_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666054', v1_id, s_dmart, 285.00, 360.00, true),
    ('66666666-6666-6666-6666-666666666055', v1_id, s_bb, 310.00, 360.00, true),
    ('66666666-6666-6666-6666-666666666056', v1_id, s_zepto, 345.00, 360.00, true),
    ('66666666-6666-6666-6666-666666666057', v2_id, s_dmart, 540.00, 710.00, true),
    ('66666666-6666-6666-6666-666666666058', v2_id, s_bb, 580.00, 710.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 13: Britannia Good Day Cashew Cookies
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444013', 'Britannia Good Day Cashew Cookies', 'britannia-good-day-cashew-cookies', cat_pack, b_britannia, 'Crunchy butter cookies embedded with rich roasted cashews', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555020', p_id, '600 g Family Pack', 600.0, 'g', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666059', v1_id, s_dmart, 115.00, 150.00, true),
    ('66666666-6666-6666-6666-666666666060', v1_id, s_bb, 128.00, 150.00, true),
    ('66666666-6666-6666-6666-666666666061', v1_id, s_blinkit, 140.00, 150.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 14: Parle-G Original Glucose Biscuits
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444014', 'Parle-G Original Glucose Biscuits', 'parle-g-original-glucose-biscuits', cat_pack, b_parle, 'Iconic Indian glucose biscuits packed with wheat and milk nutrition', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555021', p_id, '800 g Value Pack', 800.0, 'g', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666062', v1_id, s_dmart, 68.00, 80.00, true),
    ('66666666-6666-6666-6666-666666666063', v1_id, s_bb, 74.00, 80.00, true),
    ('66666666-6666-6666-6666-666666666064', v1_id, s_zepto, 80.00, 80.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 15: Fresh Onions (Pyaaz)
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444015', 'Fresh Farm Onions (Pyaaz)', 'fresh-farm-onions-pyaaz', cat_veg, NULL, 'Grade-A Nashik red onions fresh from mandis', 'https://images.unsplash.com/photo-1508747703725-719777637510?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555022', p_id, '1 kg Net Bag', 1.0, 'kg', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555023', p_id, '5 kg Bulk Sack', 5.0, 'kg', false)
    ON CONFLICT DO NOTHING RETURNING id INTO v2_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666065', v1_id, s_dmart, 32.00, 45.00, true),
    ('66666666-6666-6666-6666-666666666066', v1_id, s_bb, 36.00, 45.00, true),
    ('66666666-6666-6666-6666-666666666067', v1_id, s_blinkit, 42.00, 45.00, true),
    ('66666666-6666-6666-6666-666666666068', v1_id, s_zepto, 40.00, 45.00, true),
    ('66666666-6666-6666-6666-666666666069', v2_id, s_dmart, 145.00, 200.00, true),
    ('66666666-6666-6666-6666-666666666070', v2_id, s_bb, 165.00, 200.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 16: Fresh Potatoes (Aloo)
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444016', 'Fresh Farm Potatoes (Aloo)', 'fresh-farm-potatoes-aloo', cat_veg, NULL, 'Cleaned round fresh potatoes suitable for curries and baking', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555024', p_id, '1 kg Poly Bag', 1.0, 'kg', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666071', v1_id, s_dmart, 28.00, 38.00, true),
    ('66666666-6666-6666-6666-666666666072', v1_id, s_bb, 32.00, 38.00, true),
    ('66666666-6666-6666-6666-666666666073', v1_id, s_blinkit, 35.00, 38.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 17: Tata Salt Vacuum Evaporated Iodised
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444017', 'Tata Salt Vacuum Evaporated Iodised', 'tata-salt-vacuum-evaporated-iodised', cat_oth, b_tatasampann, 'Desh ka Namak — pure iodised white table salt', 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555025', p_id, '1 kg Pouch', 1.0, 'kg', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666074', v1_id, s_dmart, 26.00, 28.00, true),
    ('66666666-6666-6666-6666-666666666075', v1_id, s_bb, 27.00, 28.00, true),
    ('66666666-6666-6666-6666-666666666076', v1_id, s_blinkit, 28.00, 28.00, true),
    ('66666666-6666-6666-6666-666666666077', v1_id, s_zepto, 28.00, 28.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 18: Amul Fresh Paneer
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444018', 'Amul Fresh Malai Paneer', 'amul-fresh-malai-paneer', cat_dairy, b_amul, 'Soft, rich and creamy Indian cottage cheese block', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555026', p_id, '200 g Pack', 200.0, 'g', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666078', v1_id, s_dmart, 84.00, 92.00, true),
    ('66666666-6666-6666-6666-666666666079', v1_id, s_bb, 88.00, 92.00, true),
    ('66666666-6666-6666-6666-666666666080', v1_id, s_blinkit, 92.00, 92.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 19: Maggi 2-Minute Masala Noodles
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444019', 'Maggi 2-Minute Masala Instant Noodles', 'maggi-2-minute-masala-instant-noodles', cat_pack, NULL, 'Classic favourite instant noodles with signature tastemaker masala', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555027', p_id, 'Pack of 4 (280g)', 280.0, 'g', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;
    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555028', p_id, 'Pack of 12 (840g)', 840.0, 'g', false)
    ON CONFLICT DO NOTHING RETURNING id INTO v2_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666081', v1_id, s_dmart, 52.00, 58.00, true),
    ('66666666-6666-6666-6666-666666666082', v1_id, s_bb, 55.00, 58.00, true),
    ('66666666-6666-6666-6666-666666666083', v1_id, s_zepto, 58.00, 58.00, true),
    ('66666666-6666-6666-6666-666666666084', v2_id, s_dmart, 148.00, 168.00, true),
    ('66666666-6666-6666-6666-666666666085', v2_id, s_bb, 158.00, 168.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- PRODUCT 20: Dettol Original Liquid Handwash
    INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url)
    VALUES ('44444444-4444-4444-4444-444444444020', 'Dettol Original Germ Protection Handwash', 'dettol-original-germ-protection-handwash', cat_pers, NULL, 'Trusted antibacterial handwash with 100% better germ protection', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO p_id;

    INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default)
    VALUES ('55555555-5555-5555-5555-555555555029', p_id, '1500 ml Refill Pouch', 1500.0, 'ml', true)
    ON CONFLICT DO NOTHING RETURNING id INTO v1_id;

    INSERT INTO public.store_listings (id, variant_id, store_id, current_price, mrp, is_in_stock) VALUES
    ('66666666-6666-6666-6666-666666666086', v1_id, s_dmart, 189.00, 269.00, true),
    ('66666666-6666-6666-6666-666666666087', v1_id, s_bb, 219.00, 269.00, true),
    ('66666666-6666-6666-6666-666666666088', v1_id, s_blinkit, 249.00, 269.00, true)
    ON CONFLICT (variant_id, store_id) DO NOTHING;

    -- Additional Products 21-50 created similarly with concise batch inserts
    -- (We will seed the rest through a clean batch data set to reach 50+ total)
END $$;

-- Batch insert additional realistic household grocery products (21 to 50)
INSERT INTO public.products (id, name, slug, category_id, brand_id, description, image_url) VALUES
('44444444-4444-4444-4444-444444444021', 'Tata Sampann Chana Dal', 'tata-sampann-chana-dal', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333304', 'High dietary fiber unpolished yellow chana dal', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'),
('44444444-4444-4444-4444-444444444022', 'Tata Sampann Moong Dal Split', 'tata-sampann-moong-dal-split', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333304', 'Easy to digest split yellow moong lentils', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'),
('44444444-4444-4444-4444-444444444023', 'Aashirvaad Select 100% Sharbati Atta', 'aashirvaad-select-sharbati-atta', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333303', 'Crafted from the golden fields of Sehore Madhya Pradesh', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500'),
('44444444-4444-4444-4444-444444444024', 'Fortune Premium Kachi Ghani Mustard Oil', 'fortune-kachi-ghani-mustard-oil', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333307', 'Cold pressed pungent mustard oil for authentic taste', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'),
('44444444-4444-4444-4444-444444444025', 'Mother Dairy Cow Milk', 'mother-dairy-cow-milk', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333306', 'Nutritious pasteurised cow milk with natural sweet taste', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500'),
('44444444-4444-4444-4444-444444444026', 'Amul Pure Ghee', 'amul-pure-ghee', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'Traditional granular pure clarified cow milk fat', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500'),
('44444444-4444-4444-4444-444444444027', 'Fresh Local Tomatoes (Tamatar)', 'fresh-local-tomatoes-tamatar', '22222222-2222-2222-2222-222222222203', NULL, 'Juicy red hybrid tomatoes ideal for curries and salads', 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=500'),
('44444444-4444-4444-4444-444444444028', 'Fresh Green Chillies (Hari Mirchi)', 'fresh-green-chillies-hari-mirchi', '22222222-2222-2222-2222-222222222203', NULL, 'Pungent spicy dark green chillies', 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=500'),
('44444444-4444-4444-4444-444444444029', 'Fresh Ginger (Adrak)', 'fresh-ginger-adrak', '22222222-2222-2222-2222-222222222203', NULL, 'Clean aromatic farm ginger root', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=500'),
('44444444-4444-4444-4444-444444444030', 'Surf Excel Quick Wash Liquid Detergent', 'surf-excel-quick-wash-liquid-detergent', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333309', 'Fast dissolving stain remover liquid for buckets and washing machines', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500'),
('44444444-4444-4444-4444-444444444031', 'Colgate MaxFresh Spicy Red Gel', 'colgate-maxfresh-spicy-red-gel', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333311', 'Cooling crystals with invigorating spicy cinnamon blast', 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=500'),
('44444444-4444-4444-4444-444444444032', 'Tata Tea Premium Desh Ki Chai', 'tata-tea-premium-desh-ki-chai', '22222222-2222-2222-2222-222222222208', '33333333-3333-3333-3333-333333333314', 'Unique blend of big tea grains for taste and small grains for strength', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500'),
('44444444-4444-4444-4444-444444444033', 'Britannia Marie Gold Biscuits', 'britannia-marie-gold-biscuits', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333312', 'Crisp and light tea time companion enriched with 10 essential vitamins', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500'),
('44444444-4444-4444-4444-444444444034', 'Parle Monaco Classic Salted Crackers', 'parle-monaco-classic-salted-crackers', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333313', 'Light, crispy and salted round snack biscuits', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500'),
('44444444-4444-4444-4444-444444444035', 'Saffola Total Pro Cardio Heart Oil', 'saffola-total-pro-cardio-heart-oil', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333308', 'Clinically proven dual seed edible oil to manage cholesterol', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'),
('44444444-4444-4444-4444-444444444036', 'Fortune Soya Health Refined Soyabean Oil', 'fortune-soya-health-refined-soyabean-oil', '22222222-2222-2222-2222-222222222207', '33333333-3333-3333-3333-333333333307', 'Nutritious refined soyabean oil rich in Omega 3 and Vitamin E', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'),
('44444444-4444-4444-4444-444444444037', 'Daawat Super Basmati Rice Regular', 'daawat-super-basmati-rice-regular', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333302', 'Pearl white aromatic grain basmati for special family dinners', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500'),
('44444444-4444-4444-4444-444444444038', 'India Gate Sona Masoori Rice', 'india-gate-sona-masoori-rice', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 'Lightweight aromatic non-basmati rice popular in South India', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500'),
('44444444-4444-4444-4444-444444444039', 'Tata Sampann Fine Besan Gram Flour', 'tata-sampann-fine-besan-gram-flour', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333304', '100% unpolished chana dal ground besan for dhoklas and pakodas', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500'),
('44444444-4444-4444-4444-444444444040', 'Mother Dairy Classic Dahi Curd', 'mother-dairy-classic-dahi-curd', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333306', 'Thick homestyle set curd rich in beneficial probiotic cultures', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500'),
('44444444-4444-4444-4444-444444444041', 'Amul Processed Cheese Slices', 'amul-processed-cheese-slices', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 'Individually wrapped creamy cheddar cheese slices for sandwiches', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500'),
('44444444-4444-4444-4444-444444444042', 'Vim Dishwash Bar with Lemon Fragrance', 'vim-dishwash-bar-lemon', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333310', 'Anti-smell formulation with active lemon power for spotless utensils', 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500'),
('44444444-4444-4444-4444-444444444043', 'Surf Excel Easy Wash Detergent Powder', 'surf-excel-easy-wash-detergent-powder', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333309', 'Superior hand-wash detergent powder removing tough stains easily', 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500'),
('44444444-4444-4444-4444-444444444044', 'Tata Tea Agni Special Leaf Tea', 'tata-tea-agni-special-leaf-tea', '22222222-2222-2222-2222-222222222208', '33333333-3333-3333-3333-333333333314', 'Extra strong blend with 10% extra long leaves for energizing mornings', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500'),
('44444444-4444-4444-4444-444444444045', 'Britannia Little Hearts Sugar Glazed Biscuits', 'britannia-little-hearts-biscuits', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333312', 'Iconic sweet golden heart-shaped puff biscuits', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500'),
('44444444-4444-4444-4444-444444444046', 'Parle Krackjack Sweet & Salty Crackers', 'parle-krackjack-crackers', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333313', 'The original sweet and salty crispy cracker biscuit', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500'),
('44444444-4444-4444-4444-444444444047', 'Catch Super Garam Masala Powder', 'catch-super-garam-masala-powder', '22222222-2222-2222-2222-222222222209', NULL, 'Authentic blend of aromatic whole spices for north Indian gravies', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500'),
('44444444-4444-4444-4444-444444444048', 'Madhur Pure & Hygienic Sugar', 'madhur-pure-and-hygienic-sugar', '22222222-2222-2222-2222-222222222209', NULL, 'Refined sulfur-free clean white sparkling crystal sugar', 'https://images.unsplash.com/photo-1610450949065-27a3a5f458e0?w=500'),
('44444444-4444-4444-4444-444444444049', 'Fresh Garlic (Lahsun)', 'fresh-garlic-lahsun', '22222222-2222-2222-2222-222222222203', NULL, 'Farm plucked white cloves garlic with sharp aroma', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500'),
('44444444-4444-4444-4444-444444444050', 'Fresh Cauliflower (Phool Gobhi)', 'fresh-cauliflower-phool-gobhi', '22222222-2222-2222-2222-222222222203', NULL, 'Firm white fresh cauliflower heads harvested locally', 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=500')
ON CONFLICT (slug) DO NOTHING;

-- Variants for products 21 to 50
INSERT INTO public.product_variants (id, product_id, variant_name, quantity, unit, is_default) VALUES
('55555555-5555-5555-5555-555555555031', '44444444-4444-4444-4444-444444444021', '1 kg Pouch', 1.0, 'kg', true),
('55555555-5555-5555-5555-555555555032', '44444444-4444-4444-4444-444444444022', '1 kg Pouch', 1.0, 'kg', true),
('55555555-5555-5555-5555-555555555033', '44444444-4444-4444-4444-444444444023', '5 kg Bag', 5.0, 'kg', true),
('55555555-5555-5555-5555-555555555034', '44444444-4444-4444-4444-444444444024', '1 Litre Bottle', 1.0, 'l', true),
('55555555-5555-5555-5555-555555555035', '44444444-4444-4444-4444-444444444025', '1 Litre Pouch', 1.0, 'l', true),
('55555555-5555-5555-5555-555555555036', '44444444-4444-4444-4444-444444444026', '1 Litre Tin', 1.0, 'l', true),
('55555555-5555-5555-5555-555555555037', '44444444-4444-4444-4444-444444444027', '1 kg Pack', 1.0, 'kg', true),
('55555555-5555-5555-5555-555555555038', '44444444-4444-4444-4444-444444444028', '200 g Pack', 200.0, 'g', true),
('55555555-5555-5555-5555-555555555039', '44444444-4444-4444-4444-444444444029', '250 g Pack', 250.0, 'g', true),
('55555555-5555-5555-5555-555555555040', '44444444-4444-4444-4444-444444444030', '1 Litre Bottle', 1.0, 'l', true),
('55555555-5555-5555-5555-555555555041', '44444444-4444-4444-4444-444444444031', '150 g Tube', 150.0, 'g', true),
('55555555-5555-5555-5555-555555555042', '44444444-4444-4444-4444-444444444032', '1 kg Pouch', 1.0, 'kg', true),
('55555555-5555-5555-5555-555555555043', '44444444-4444-4444-4444-444444444033', '250 g Pack', 250.0, 'g', true),
('55555555-5555-5555-5555-555555555044', '44444444-4444-4444-4444-444444444034', '200 g Pack', 200.0, 'g', true),
('55555555-5555-5555-5555-555555555045', '44444444-4444-4444-4444-444444444035', '1 Litre Pouch', 1.0, 'l', true),
('55555555-5555-5555-5555-555555555046', '44444444-4444-4444-4444-444444444036', '1 Litre Pouch', 1.0, 'l', true),
('55555555-5555-5555-5555-555555555047', '44444444-4444-4444-4444-444444444037', '1 kg Pouch', 1.0, 'kg', true),
('55555555-5555-5555-5555-555555555048', '44444444-4444-4444-4444-444444444038', '5 kg Bag', 5.0, 'kg', true),
('55555555-5555-5555-5555-555555555049', '44444444-4444-4444-4444-444444444039', '500 g Pouch', 500.0, 'g', true),
('55555555-5555-5555-5555-555555555050', '44444444-4444-4444-4444-444444444040', '400 g Cup', 400.0, 'g', true),
('55555555-5555-5555-5555-555555555051', '44444444-4444-4444-4444-444444444041', '200 g (10 Slices)', 200.0, 'g', true),
('55555555-5555-5555-5555-555555555052', '44444444-4444-4444-4444-444444444042', '300 g Bar Pack of 3', 300.0, 'g', true),
('55555555-5555-5555-5555-555555555053', '44444444-4444-4444-4444-444444444043', '1 kg Pouch', 1.0, 'kg', true),
('55555555-5555-5555-5555-555555555054', '44444444-4444-4444-4444-444444444044', '500 g Pouch', 500.0, 'g', true),
('55555555-5555-5555-5555-555555555055', '44444444-4444-4444-4444-444444444045', '75 g Pack of 4', 300.0, 'g', true),
('55555555-5555-5555-5555-555555555056', '44444444-4444-4444-4444-444444444046', '200 g Pack', 200.0, 'g', true),
('55555555-5555-5555-5555-555555555057', '44444444-4444-4444-4444-444444444047', '100 g Box', 100.0, 'g', true),
('55555555-5555-5555-5555-555555555058', '44444444-4444-4444-4444-444444444048', '1 kg Pouch', 1.0, 'kg', true),
('55555555-5555-5555-5555-555555555059', '44444444-4444-4444-4444-444444444049', '250 g Pack', 250.0, 'g', true),
('55555555-5555-5555-5555-555555555060', '44444444-4444-4444-4444-444444444050', '1 Piece (~500g)', 1.0, 'piece', true)
ON CONFLICT DO NOTHING;

-- Store listings for products 21 to 50 (DMart, BigBasket, Blinkit)
INSERT INTO public.store_listings (variant_id, store_id, current_price, mrp, is_in_stock) VALUES
-- Tata Chana Dal
('55555555-5555-5555-5555-555555555031', '11111111-1111-1111-1111-111111111101', 98.00, 125.00, true),
('55555555-5555-5555-5555-555555555031', '11111111-1111-1111-1111-111111111102', 105.00, 125.00, true),
('55555555-5555-5555-5555-555555555031', '11111111-1111-1111-1111-111111111103', 115.00, 125.00, true),
-- Tata Moong Dal Split
('55555555-5555-5555-5555-555555555032', '11111111-1111-1111-1111-111111111101', 135.00, 160.00, true),
('55555555-5555-5555-5555-555555555032', '11111111-1111-1111-1111-111111111102', 142.00, 160.00, true),
-- Aashirvaad Select Atta 5kg
('55555555-5555-5555-5555-555555555033', '11111111-1111-1111-1111-111111111101', 315.00, 360.00, true),
('55555555-5555-5555-5555-555555555033', '11111111-1111-1111-1111-111111111102', 335.00, 360.00, true),
('55555555-5555-5555-5555-555555555033', '11111111-1111-1111-1111-111111111103', 355.00, 360.00, true),
-- Fortune Mustard Oil 1L
('55555555-5555-5555-5555-555555555034', '11111111-1111-1111-1111-111111111101', 148.00, 185.00, true),
('55555555-5555-5555-5555-555555555034', '11111111-1111-1111-1111-111111111102', 158.00, 185.00, true),
-- Mother Dairy Cow Milk 1L
('55555555-5555-5555-5555-555555555035', '11111111-1111-1111-1111-111111111103', 56.00, 56.00, true),
('55555555-5555-5555-5555-555555555035', '11111111-1111-1111-1111-111111111104', 56.00, 56.00, true),
-- Amul Pure Ghee 1L
('55555555-5555-5555-5555-555555555036', '11111111-1111-1111-1111-111111111101', 595.00, 650.00, true),
('55555555-5555-5555-5555-555555555036', '11111111-1111-1111-1111-111111111102', 620.00, 650.00, true),
('55555555-5555-5555-5555-555555555036', '11111111-1111-1111-1111-111111111105', 605.00, 650.00, true),
-- Tomatoes 1kg
('55555555-5555-5555-5555-555555555037', '11111111-1111-1111-1111-111111111101', 28.00, 40.00, true),
('55555555-5555-5555-5555-555555555037', '11111111-1111-1111-1111-111111111103', 35.00, 40.00, true),
-- Green Chillies 200g
('55555555-5555-5555-5555-555555555038', '11111111-1111-1111-1111-111111111102', 18.00, 25.00, true),
('55555555-5555-5555-5555-555555555038', '11111111-1111-1111-1111-111111111103', 22.00, 25.00, true),
-- Adrak 250g
('55555555-5555-5555-5555-555555555039', '11111111-1111-1111-1111-111111111103', 29.00, 35.00, true),
-- Surf Excel Quick Wash Liquid 1L
('55555555-5555-5555-5555-555555555040', '11111111-1111-1111-1111-111111111101', 195.00, 245.00, true),
('55555555-5555-5555-5555-555555555040', '11111111-1111-1111-1111-111111111102', 215.00, 245.00, true),
-- Colgate MaxFresh 150g
('55555555-5555-5555-5555-555555555041', '11111111-1111-1111-1111-111111111101', 99.00, 125.00, true),
('55555555-5555-5555-5555-555555555041', '11111111-1111-1111-1111-111111111103', 115.00, 125.00, true),
-- Tata Tea Premium 1kg
('55555555-5555-5555-5555-555555555042', '11111111-1111-1111-1111-111111111101', 465.00, 560.00, true),
('55555555-5555-5555-5555-555555555042', '11111111-1111-1111-1111-111111111102', 495.00, 560.00, true),
-- Marie Gold 250g
('55555555-5555-5555-5555-555555555043', '11111111-1111-1111-1111-111111111101', 32.00, 40.00, true),
('55555555-5555-5555-5555-555555555043', '11111111-1111-1111-1111-111111111103', 38.00, 40.00, true),
-- Monaco 200g
('55555555-5555-5555-5555-555555555044', '11111111-1111-1111-1111-111111111101', 28.00, 35.00, true),
('55555555-5555-5555-5555-555555555044', '11111111-1111-1111-1111-111111111104', 35.00, 35.00, true),
-- Saffola Total 1L
('55555555-5555-5555-5555-555555555045', '11111111-1111-1111-1111-111111111101', 195.00, 240.00, true),
('55555555-5555-5555-5555-555555555045', '11111111-1111-1111-1111-111111111102', 215.00, 240.00, true),
-- Fortune Soya Oil 1L
('55555555-5555-5555-5555-555555555046', '11111111-1111-1111-1111-111111111101', 125.00, 150.00, true),
('55555555-5555-5555-5555-555555555046', '11111111-1111-1111-1111-111111111102', 135.00, 150.00, true),
-- Daawat Super Basmati 1kg
('55555555-5555-5555-5555-555555555047', '11111111-1111-1111-1111-111111111101', 165.00, 210.00, true),
('55555555-5555-5555-5555-555555555047', '11111111-1111-1111-1111-111111111102', 180.00, 210.00, true),
-- India Gate Sona Masoori 5kg
('55555555-5555-5555-5555-555555555048', '11111111-1111-1111-1111-111111111101', 340.00, 420.00, true),
('55555555-5555-5555-5555-555555555048', '11111111-1111-1111-1111-111111111102', 365.00, 420.00, true),
-- Tata Sampann Besan 500g
('55555555-5555-5555-5555-555555555049', '11111111-1111-1111-1111-111111111101', 58.00, 75.00, true),
('55555555-5555-5555-5555-555555555049', '11111111-1111-1111-1111-111111111103', 68.00, 75.00, true),
-- Mother Dairy Dahi 400g
('55555555-5555-5555-5555-555555555050', '11111111-1111-1111-1111-111111111103', 45.00, 45.00, true),
-- Amul Cheese Slices 200g
('55555555-5555-5555-5555-555555555051', '11111111-1111-1111-1111-111111111101', 135.00, 150.00, true),
('55555555-5555-5555-5555-555555555051', '11111111-1111-1111-1111-111111111102', 145.00, 150.00, true),
-- Vim Bar 300g
('55555555-5555-5555-5555-555555555052', '11111111-1111-1111-1111-111111111101', 48.00, 60.00, true),
('55555555-5555-5555-5555-555555555052', '11111111-1111-1111-1111-111111111103', 55.00, 60.00, true),
-- Surf Excel Easy Wash 1kg
('55555555-5555-5555-5555-555555555053', '11111111-1111-1111-1111-111111111101', 128.00, 155.00, true),
('55555555-5555-5555-5555-555555555053', '11111111-1111-1111-1111-111111111102', 139.00, 155.00, true),
-- Tata Tea Agni 500g
('55555555-5555-5555-5555-555555555054', '11111111-1111-1111-1111-111111111101', 145.00, 185.00, true),
('55555555-5555-5555-5555-555555555054', '11111111-1111-1111-1111-111111111102', 160.00, 185.00, true),
-- Little Hearts 300g
('55555555-5555-5555-5555-555555555055', '11111111-1111-1111-1111-111111111101', 65.00, 80.00, true),
('55555555-5555-5555-5555-555555555055', '11111111-1111-1111-1111-111111111103', 75.00, 80.00, true),
-- Krackjack 200g
('55555555-5555-5555-5555-555555555056', '11111111-1111-1111-1111-111111111101', 32.00, 40.00, true),
('55555555-5555-5555-5555-555555555056', '11111111-1111-1111-1111-111111111104', 38.00, 40.00, true),
-- Catch Garam Masala 100g
('55555555-5555-5555-5555-555555555057', '11111111-1111-1111-1111-111111111101', 78.00, 98.00, true),
('55555555-5555-5555-5555-555555555057', '11111111-1111-1111-1111-111111111102', 88.00, 98.00, true),
-- Madhur Sugar 1kg
('55555555-5555-5555-5555-555555555058', '11111111-1111-1111-1111-111111111101', 52.00, 60.00, true),
('55555555-5555-5555-5555-555555555058', '11111111-1111-1111-1111-111111111102', 56.00, 60.00, true),
-- Garlic 250g
('55555555-5555-5555-5555-555555555059', '11111111-1111-1111-1111-111111111103', 75.00, 90.00, true),
-- Cauliflower 1pc
('55555555-5555-5555-5555-555555555060', '11111111-1111-1111-1111-111111111103', 38.00, 50.00, true)
ON CONFLICT (variant_id, store_id) DO NOTHING;

-- Generate historical prices for all store listings spanning 90 days
INSERT INTO public.price_history (listing_id, price, mrp, observed_at, source)
SELECT 
    id as listing_id,
    ROUND((current_price * (1 + (RANDOM() * 0.12 - 0.05)))::numeric, 2) as price,
    mrp,
    NOW() - (i || ' days')::interval as observed_at,
    'seed_generator' as source
FROM public.store_listings
CROSS JOIN generate_series(5, 75, 10) as i
ON CONFLICT DO NOTHING;
