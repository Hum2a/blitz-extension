-- Roles: user < admin < developer (developer = highest)
-- Run after 001_initial.sql

-- ---------------------------------------------------------------------------
-- Role type
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'developer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tables (before functions that reference them)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  granted_by uuid REFERENCES auth.users (id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles (role);

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- Role helpers (after user_roles exists)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()),
    'user'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(required public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.get_my_role()
    WHEN 'developer' THEN true
    WHEN 'admin' THEN required IN ('user', 'admin')
    WHEN 'user' THEN required = 'user'
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_developer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() = 'developer'::public.app_role;
$$;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_min_role(public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_developer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_min_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_developer() TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: user_roles, admin_profiles, admin_audit_log
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role('admin'));

DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
CREATE POLICY user_roles_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_developer());

DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
CREATE POLICY user_roles_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_developer())
  WITH CHECK (public.is_developer());

DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
CREATE POLICY user_roles_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_developer() AND user_id <> auth.uid());

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_profiles_select ON public.admin_profiles;
CREATE POLICY admin_profiles_select ON public.admin_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role('admin'));

DROP POLICY IF EXISTS admin_profiles_update_own ON public.admin_profiles;
CREATE POLICY admin_profiles_update_own ON public.admin_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_audit_log_select ON public.admin_audit_log;
CREATE POLICY admin_audit_log_select ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_min_role('admin'));

DROP POLICY IF EXISTS admin_audit_log_insert ON public.admin_audit_log;
CREATE POLICY admin_audit_log_insert ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('admin') AND actor_id = auth.uid());

DROP POLICY IF EXISTS admin_audit_log_delete ON public.admin_audit_log;
CREATE POLICY admin_audit_log_delete ON public.admin_audit_log
  FOR DELETE TO authenticated
  USING (public.is_developer());

-- ---------------------------------------------------------------------------
-- Auth signup: default role + profile
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.admin_profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::public.app_role FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.admin_profiles (user_id, email)
SELECT id, email FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

-- ---------------------------------------------------------------------------
-- Replace RLS on sync tables
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_sync_meta_select ON public.user_sync_meta;
DROP POLICY IF EXISTS user_sync_meta_insert ON public.user_sync_meta;
DROP POLICY IF EXISTS user_sync_meta_update ON public.user_sync_meta;

CREATE POLICY user_sync_meta_select ON public.user_sync_meta
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role('admin'));

CREATE POLICY user_sync_meta_insert ON public.user_sync_meta
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_sync_meta_update ON public.user_sync_meta
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_developer())
  WITH CHECK (auth.uid() = user_id OR public.is_developer());

DROP POLICY IF EXISTS sync_documents_select ON public.sync_documents;
DROP POLICY IF EXISTS sync_documents_insert ON public.sync_documents;
DROP POLICY IF EXISTS sync_documents_update ON public.sync_documents;
DROP POLICY IF EXISTS sync_documents_delete ON public.sync_documents;

CREATE POLICY sync_documents_select ON public.sync_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role('admin'));

CREATE POLICY sync_documents_insert ON public.sync_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY sync_documents_update ON public.sync_documents
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_developer())
  WITH CHECK (auth.uid() = user_id OR public.is_developer());

CREATE POLICY sync_documents_delete ON public.sync_documents
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_developer());

DROP POLICY IF EXISTS synced_applications_select ON public.synced_applications;
DROP POLICY IF EXISTS synced_applications_insert ON public.synced_applications;
DROP POLICY IF EXISTS synced_applications_update ON public.synced_applications;
DROP POLICY IF EXISTS synced_applications_delete ON public.synced_applications;

CREATE POLICY synced_applications_select ON public.synced_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role('admin'));

CREATE POLICY synced_applications_insert ON public.synced_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY synced_applications_update ON public.synced_applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_developer())
  WITH CHECK (auth.uid() = user_id OR public.is_developer());

CREATE POLICY synced_applications_delete ON public.synced_applications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_developer());

DROP POLICY IF EXISTS license_entitlements_select ON public.license_entitlements;
DROP POLICY IF EXISTS license_entitlements_no_client_write ON public.license_entitlements;
DROP POLICY IF EXISTS license_entitlements_no_client_update ON public.license_entitlements;

CREATE POLICY license_entitlements_select ON public.license_entitlements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role('admin'));

CREATE POLICY license_entitlements_admin_insert ON public.license_entitlements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role('admin'));

CREATE POLICY license_entitlements_admin_update ON public.license_entitlements
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role('admin'))
  WITH CHECK (public.has_min_role('admin'));

CREATE POLICY license_entitlements_admin_delete ON public.license_entitlements
  FOR DELETE TO authenticated
  USING (public.is_developer());
