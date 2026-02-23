
-- 1. Add active column to profiles for soft delete
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 2. Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_name text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity, entity_id);

-- 3. Fix RESTRICTIVE RLS policies -> PERMISSIVE

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;

CREATE POLICY "Auth can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- items
DROP POLICY IF EXISTS "Authenticated users can view items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can insert items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can update items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items" ON public.items;

CREATE POLICY "Auth can view items" ON public.items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Non-viewers can insert items" ON public.items FOR INSERT TO authenticated WITH CHECK (NOT public.has_role(auth.uid(), 'VIEWER'));
CREATE POLICY "Non-viewers can update items" ON public.items FOR UPDATE TO authenticated USING (NOT public.has_role(auth.uid(), 'VIEWER'));
CREATE POLICY "Admins can delete items" ON public.items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- movements
DROP POLICY IF EXISTS "Authenticated users can view movements" ON public.movements;
DROP POLICY IF EXISTS "Authenticated users can insert movements" ON public.movements;

CREATE POLICY "Auth can view movements" ON public.movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Non-viewers can insert movements" ON public.movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND NOT public.has_role(auth.uid(), 'VIEWER'));
