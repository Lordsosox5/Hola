# Supabase Integration Guide for Tawsel App

## Overview
The Tawsel app has been successfully integrated with Supabase for backend services including authentication, data persistence, and real-time updates.

## Setup Completed

### 1. **Environment Configuration**
- Supabase credentials are already configured in `.env`:
  - `EXPO_PUBLIC_SUPABASE_URL=https://khpattkykgsxpimzbavk.supabase.co`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY=<your_key_here>`

### 2. **Dependencies Installed**
```bash
npm install @supabase/supabase-js expo-secure-store
```

### 3. **Core Files Created/Updated**

#### **`lib/supabase.ts`** (Already configured)
- Initializes the Supabase client
- Configures secure token storage using `expo-secure-store`
- Sets up session persistence and auto-refresh

#### **`lib/supabase-service.ts`** (NEW - Service Layer)
Contains modular services for:
- **AuthService** - User authentication (sign up, sign in, sign out, session management)
- **UserService** - User profile operations
- **OrderService** - Order creation, retrieval, and status updates
- **FavoritesService** - Product and restaurant favorites management
- **AddressService** - Delivery address CRUD operations
- **RestaurantService** - Restaurant data and menus
- **ProductService** - Product search and retrieval
- **CategoryService** - Product categories

#### **`hooks/useSupabaseAuth.ts`** (NEW - Custom Hook)
React hook that:
- Manages authentication state
- Listens to auth state changes
- Provides `signIn`, `signUp`, `signOut` methods
- Returns user object and loading states

#### **`app/index.tsx`** (UPDATED - Main App)
Integrated Supabase operations:
- User authentication via `useSupabaseAuth()` hook
- Orders saved to Supabase on payment submission
- Favorites synced to Supabase (products and restaurants)
- Delivery addresses saved to Supabase database

## Database Schema Requirements

Create these tables in your Supabase project:

### **users** table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **orders** table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  order_id TEXT NOT NULL,
  restaurant TEXT NOT NULL,
  items JSONB NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  delivery_address TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_last4 TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Migration for last 4 digits sync**
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS transaction_last4 TEXT;
```

### Migration for live delivery coordinates
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION;

ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
```

This keeps the customer-entered payment suffix in the order record so the admin dashboard can read the real final four digits from Supabase.

### **favorite_products** table
```sql
CREATE TABLE favorite_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

### **favorite_restaurants** table
```sql
CREATE TABLE favorite_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);
```

### **addresses** table
```sql
CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **restaurants** table
```sql
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  image_url TEXT,
  rating DECIMAL(3, 2),
  delivery_time TEXT,
  delivery_fee DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Migration for restaurant type
```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS type TEXT;
```

### **products** table
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT REFERENCES restaurants(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Migration for non-food products
```sql
ALTER TABLE public.products
  ALTER COLUMN restaurant_id DROP NOT NULL;
```

### **categories** table
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Required RLS Policies

### Driver earnings migration
```sql
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS earnings DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

CREATE TABLE IF NOT EXISTS public.driver_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Run this migration before creating or calling payout RPC functions.
ALTER TABLE public.driver_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can read their payout requests" ON public.driver_payout_requests;
CREATE POLICY "Drivers can read their payout requests"
  ON public.driver_payout_requests FOR SELECT TO authenticated
  USING (driver_id = (SELECT auth.uid()));

ALTER TABLE public.driver_payout_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can read their payout requests" ON public.driver_payout_requests;
CREATE POLICY "Drivers can read their payout requests"
  ON public.driver_payout_requests FOR SELECT TO authenticated
  USING (driver_id = (SELECT auth.uid()));
```

Run this block in the Supabase SQL Editor after creating the tables. It fixes the
`42501 new row violates row-level security policy for table "orders"` error
without allowing users to access another user's orders.

```sql
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
CREATE POLICY "Users can insert their own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their own orders" ON public.orders;
CREATE POLICY "Users can read their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own addresses" ON public.addresses;
CREATE POLICY "Users can read their own addresses"
  ON public.addresses FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
CREATE POLICY "Users can insert their own addresses"
  ON public.addresses FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
CREATE POLICY "Users can update their own addresses"
  ON public.addresses FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;
CREATE POLICY "Users can delete their own addresses"
  ON public.addresses FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Keep public.users in sync with auth.users so the orders foreign key succeeds.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill profiles for accounts created before the trigger.
INSERT INTO public.users (id, email, full_name, phone)
SELECT id, COALESCE(email, ''), raw_user_meta_data ->> 'name', raw_user_meta_data ->> 'phone'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Keep driver accounts in public.drivers. This also repairs driver accounts
-- that were created before the driver profile sync was added to the app.
CREATE OR REPLACE FUNCTION public.sync_driver_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data ->> 'role', '') = 'driver' THEN
    INSERT INTO public.drivers (id, name, phone, vehicle, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email, 'سائق'),
      COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'vehicle', ''),
      'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      vehicle = EXCLUDED.vehicle;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_driver_created ON auth.users;
CREATE TRIGGER on_auth_driver_created
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_driver_profile();

INSERT INTO public.drivers (id, name, phone, vehicle, status)
SELECT id,
       COALESCE(raw_user_meta_data ->> 'name', email, 'سائق'),
       COALESCE(raw_user_meta_data ->> 'phone', ''),
       COALESCE(raw_user_meta_data ->> 'vehicle', ''),
       'active'
FROM auth.users
WHERE COALESCE(raw_user_meta_data ->> 'role', '') = 'driver'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  vehicle = EXCLUDED.vehicle;

-- Admin dashboard access. The admin account must have app_metadata.role = admin.
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all drivers" ON public.drivers;
CREATE POLICY "Admins can read all drivers" ON public.drivers FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can manage drivers" ON public.drivers;
CREATE POLICY "Admins can manage drivers" ON public.drivers FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Drivers can read their own profile" ON public.drivers;
CREATE POLICY "Drivers can read their own profile" ON public.drivers FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.get_driver_profile(p_driver_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(d) || jsonb_build_object(
    'today_deliveries', COALESCE((
      SELECT COUNT(*)
      FROM public.deliveries AS delivery
      WHERE delivery.assigned_driver_id = d.id
        AND delivery.status = 'completed'
        AND delivery.completed_at::date = CURRENT_DATE
    ), 0),
    'profit', COALESCE((
      SELECT SUM(delivery.earnings)
      FROM public.deliveries AS delivery
      WHERE delivery.assigned_driver_id = d.id
        AND delivery.status = 'completed'
    ), 0)
  )
  FROM public.drivers AS d
  WHERE d.id = p_driver_id
    AND d.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_driver_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_driver_profile(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_available_deliveries_for_driver(p_driver_id UUID)
RETURNS SETOF JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(d) || jsonb_build_object('orders', to_jsonb(o))
  FROM public.deliveries AS d
  INNER JOIN public.orders AS o ON o.id = d.order_id
  WHERE d.status = 'waiting_driver'
    AND d.assigned_driver_id IS NULL
    AND o.status = 'paid'
    AND p_driver_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.drivers AS driver WHERE driver.id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_available_deliveries_for_driver(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_deliveries_for_driver(UUID) TO authenticated;

DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
CREATE POLICY "Admins can read all orders" ON public.orders FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can read all deliveries" ON public.deliveries;
CREATE POLICY "Admins can read all deliveries" ON public.deliveries FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can manage restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Authenticated users can read restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Authenticated users can manage restaurants" ON public.restaurants;
CREATE POLICY "Authenticated users can read restaurants" ON public.restaurants FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage restaurants" ON public.restaurants FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
CREATE POLICY "Authenticated users can read products" ON public.products FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Complete datasets for the hidden operations dashboard.
-- These functions require a signed-in user because the dashboard is inside the app.
CREATE OR REPLACE FUNCTION public.admin_list_drivers()
RETURNS SETOF JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(d) || jsonb_build_object(
    'today_deliveries', COALESCE((
      SELECT COUNT(*)
      FROM public.deliveries AS delivery
      WHERE delivery.assigned_driver_id = d.id
        AND delivery.status = 'completed'
        AND delivery.completed_at::date = CURRENT_DATE
    ), 0),
    'profit', COALESCE((
      SELECT SUM(delivery.earnings)
      FROM public.deliveries AS delivery
      WHERE delivery.assigned_driver_id = d.id
        AND delivery.status = 'completed'
        AND delivery.completed_at::date = CURRENT_DATE
    ), 0)
  )
  FROM public.drivers AS d
  WHERE auth.uid() IS NOT NULL
  ORDER BY d.created_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_orders()
RETURNS SETOF JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(o) || jsonb_build_object(
    'deliveries', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(d) || jsonb_build_object('drivers', to_jsonb(dr))
        ORDER BY d.created_at DESC NULLS LAST
      )
      FROM public.deliveries AS d
      LEFT JOIN public.drivers AS dr ON dr.id = d.assigned_driver_id
      WHERE d.order_id = o.id
    ), '[]'::jsonb)
  )
  FROM public.orders AS o
  WHERE auth.uid() IS NOT NULL
  ORDER BY o.created_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.admin_list_drivers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_drivers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_orders() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_driver(p_driver_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.deliveries
  SET assigned_driver_id = NULL,
      status = CASE WHEN status = 'driver_accepted' THEN 'waiting_driver' ELSE status END,
      updated_at = NOW()
  WHERE assigned_driver_id = p_driver_id;

  DELETE FROM public.drivers
  WHERE id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'driver not found';
  END IF;

  UPDATE auth.users
  SET banned_until = 'infinity'::timestamptz,
      updated_at = NOW()
  WHERE id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'driver auth account not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_driver(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_driver(UUID) TO authenticated;

-- One-time fix for a driver already deleted from public.drivers:
-- replace the email, run this as a Supabase SQL Editor administrator.
UPDATE auth.users
SET banned_until = 'infinity'::timestamptz,
    updated_at = NOW()
WHERE email = 'DELETED_DRIVER_EMAIL@example.com';

CREATE OR REPLACE FUNCTION public.admin_set_driver_status(p_driver_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'invalid driver status';
  END IF;

  UPDATE public.drivers
  SET status = p_status
  WHERE id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'driver not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_driver_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_driver_status(UUID, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.create_driver_payout_request(UUID, NUMERIC, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_driver_payout_request(
  p_driver_id UUID,
  p_amount DECIMAL,
  p_bank_name TEXT,
  p_account_name TEXT,
  p_account_number TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_driver_id THEN
    RAISE EXCEPTION 'driver authentication required';
  END IF;
  IF p_amount <= 0 OR NULLIF(TRIM(p_bank_name), '') IS NULL OR NULLIF(TRIM(p_account_name), '') IS NULL OR NULLIF(TRIM(p_account_number), '') IS NULL THEN
    RAISE EXCEPTION 'complete payout details are required';
  END IF;

  INSERT INTO public.driver_payout_requests (driver_id, amount, bank_name, account_name, account_number)
  VALUES (p_driver_id, p_amount, TRIM(p_bank_name), TRIM(p_account_name), TRIM(p_account_number))
  RETURNING id INTO v_request_id;
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_payout_requests()
RETURNS SETOF JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(request) || jsonb_build_object('driver_name', driver.name)
  FROM public.driver_payout_requests AS request
  JOIN public.drivers AS driver ON driver.id = request.driver_id
  WHERE auth.uid() IS NOT NULL
  ORDER BY request.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.create_driver_payout_request(UUID, DECIMAL, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_payout_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_driver_payout_request(UUID, DECIMAL, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_payout_requests() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.driver_payout_requests
  SET status = 'paid'
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payout request not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_payout_paid(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_payout_paid(UUID) TO authenticated;

-- Create a driver request automatically whenever a customer places an order.
CREATE OR REPLACE FUNCTION public.create_delivery_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.deliveries (order_id, status)
  VALUES (NEW.id, 'waiting_driver');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_created_create_delivery ON public.orders;
CREATE TRIGGER on_order_created_create_delivery
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_delivery_for_order();

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can read available deliveries" ON public.deliveries;
CREATE POLICY "Drivers can read available deliveries"
  ON public.deliveries FOR SELECT TO authenticated
  USING (status = 'waiting_driver' OR assigned_driver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Drivers can claim available deliveries" ON public.deliveries;
CREATE POLICY "Drivers can claim available deliveries"
  ON public.deliveries FOR UPDATE TO authenticated
  USING ((status = 'waiting_driver' AND assigned_driver_id IS NULL) OR assigned_driver_id = (SELECT auth.uid()))
  WITH CHECK (assigned_driver_id = (SELECT auth.uid()));

-- Stronger, database-side delivery claim helper that also updates the linked order.
DROP FUNCTION IF EXISTS public.claim_delivery_for_driver(UUID, UUID);

CREATE OR REPLACE FUNCTION public.claim_delivery_for_driver(delivery_id UUID, driver_id UUID)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  status TEXT,
  assigned_driver_id UUID,
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery public.deliveries%ROWTYPE;
BEGIN
  SELECT d.*
  INTO v_delivery
  FROM public.deliveries AS d
  WHERE d.id = delivery_id
    AND d.status = 'waiting_driver'
    AND d.assigned_driver_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.deliveries AS d
  SET assigned_driver_id = driver_id,
      status = 'driver_accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE d.id = delivery_id
  RETURNING d.* INTO v_delivery;

  UPDATE public.orders AS o
  SET status = 'driver_accepted',
      updated_at = NOW()
  WHERE o.id = v_delivery.order_id;

  RETURN QUERY
  SELECT v_delivery.id,
         v_delivery.order_id,
         v_delivery.status,
         v_delivery.assigned_driver_id,
         v_delivery.accepted_at,
         v_delivery.updated_at,
         v_delivery.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_delivery_for_driver(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_delivery_for_driver(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Customers can track their own deliveries" ON public.deliveries;
CREATE POLICY "Customers can track their own deliveries"
  ON public.deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE public.orders.id = public.deliveries.order_id
      AND public.orders.user_id = (SELECT auth.uid())
  ));

-- Allow a driver to update only the order assigned to that driver.
DROP POLICY IF EXISTS "Drivers can update assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers can update assigned deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Customers can track their own deliveries" ON public.deliveries;

CREATE POLICY "Drivers can update assigned deliveries"
  ON public.deliveries FOR UPDATE TO authenticated
  USING (assigned_driver_id = (SELECT auth.uid()))
  WITH CHECK (assigned_driver_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.set_driver_delivery_status(p_delivery_id UUID, p_driver_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.deliveries AS d
  SET status = p_status,
      updated_at = NOW(),
      completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE d.completed_at END,
      earnings = CASE WHEN p_status = 'completed' THEN COALESCE((
        SELECT r.delivery_fee * 0.80
        FROM public.orders AS order_row
        LEFT JOIN public.restaurants AS r ON r.name = order_row.restaurant
        WHERE order_row.id = d.order_id
      ), 0) ELSE d.earnings END
  WHERE d.id = p_delivery_id
    AND d.assigned_driver_id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'delivery not assigned to this driver';
  END IF;

  UPDATE public.orders AS o
  SET status = CASE
        WHEN p_status = 'picked_up' THEN 'picked_up'
        WHEN p_status = 'completed' THEN 'delivered'
        ELSE o.status
      END,
      updated_at = NOW()
  FROM public.deliveries AS d
  WHERE o.id = d.order_id
    AND d.id = p_delivery_id
    AND d.assigned_driver_id = p_driver_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_driver_delivery_status(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_driver_delivery_status(UUID, UUID, TEXT) TO authenticated;

-- Secure payment confirmation for an admin account.
-- The hidden dashboard is opened from an authenticated app session.

CREATE OR REPLACE FUNCTION public.confirm_order_payment(order_number TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.orders
  SET status = 'paid', updated_at = NOW()
  WHERE order_id = order_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  UPDATE public.deliveries
  SET status = 'waiting_driver',
      assigned_driver_id = NULL,
      accepted_at = NULL,
      updated_at = NOW()
  WHERE order_id IN (
    SELECT id FROM public.orders WHERE order_id = order_number
  );

END;
$$;

REVOKE ALL ON FUNCTION public.confirm_order_payment(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(TEXT) TO authenticated;
```

## Integration Points

### 1. **Authentication Flow**
```typescript
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const { user, loading, error, signIn, signUp, signOut } = useSupabaseAuth();
```

### 2. **Creating Orders**
```typescript
await OrderService.createOrder({
  user_id: user.id,
  order_id: submittedOrder.orderId,
  restaurant: selectedRestaurant.name,
  items: submittedOrder.items,
  total: submittedOrder.total,
  delivery_address: submittedOrder.address,
  payment_method: submittedOrder.paymentMethod,
  status: 'pending',
  created_at: new Date().toISOString(),
});
```

### 3. **Managing Favorites**
```typescript
// Add favorite product
await FavoritesService.addFavoriteProduct(user.id, productId);

// Remove favorite product
await FavoritesService.removeFavoriteProduct(user.id, productId);

// Get all favorite products
const favorites = await FavoritesService.getFavoriteProducts(user.id);
```

### 4. **Managing Addresses**
```typescript
// Create address
await AddressService.createAddress(user.id, {
  label: 'Home',
  address: 'شارع النيل، الخرطوم',
  is_default: true,
});

// Update address
await AddressService.updateAddress(addressId, {
  label: 'Work',
  address: 'شارع الجامعة، الخرطوم',
});

// Delete address
await AddressService.deleteAddress(addressId);
```

## Security Notes

1. **Authentication Tokens**: Securely stored in `expo-secure-store`
2. **Session Persistence**: Automatic with `persistSession: true`
3. **Token Refresh**: Automatic with `autoRefreshToken: true`
4. **Row Level Security (RLS)**: Should be configured in Supabase console for each table

## Next Steps

1. **Set up Row Level Security (RLS) policies** in Supabase to ensure users can only access their own data
2. **Create indexes** on frequently queried columns (user_id, created_at)
3. **Set up real-time subscriptions** for order status updates
4. **Configure backup and recovery** strategies
5. **Test authentication flows** in development environment
6. **Monitor Supabase logs** for errors and performance issues

## Troubleshooting

### Session Issues
- Clear app cache if auth state doesn't update
- Check that secure store is working on the device
- Verify JWT tokens in Supabase console

### Data Sync Issues
- Check user_id is correctly passed from auth
- Verify RLS policies allow the operations
- Check Supabase logs for SQL errors

### Performance
- Create appropriate indexes for filters
- Use pagination for large result sets
- Consider caching frequently accessed data

## References
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase React Native](https://supabase.com/docs/reference/javascript/introduction)
- [Expo Secure Store](https://docs.expo.dev/modules/expo-secure-store/)
