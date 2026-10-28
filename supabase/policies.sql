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
