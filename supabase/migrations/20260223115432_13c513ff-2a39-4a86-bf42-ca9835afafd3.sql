
-- Fix: All RLS policies are RESTRICTIVE, need to be PERMISSIVE
-- Drop and recreate as PERMISSIVE

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- CATEGORIES
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;

CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'ADMIN'::app_role));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- ITEMS
DROP POLICY IF EXISTS "Authenticated users can view items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can insert items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can update items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items" ON public.items;

CREATE POLICY "Authenticated users can view items" ON public.items FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can insert items" ON public.items FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can update items" ON public.items FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Admins can delete items" ON public.items FOR DELETE USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- MOVEMENTS
DROP POLICY IF EXISTS "Authenticated users can view movements" ON public.movements;
DROP POLICY IF EXISTS "Authenticated users can insert movements" ON public.movements;

CREATE POLICY "Authenticated users can view movements" ON public.movements FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can insert movements" ON public.movements FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
