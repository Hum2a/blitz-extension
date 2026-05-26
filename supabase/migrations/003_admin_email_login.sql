-- Developer email OTP on admin portal (existing auth users only; no signup)

ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS allow_email_login boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.admin_profiles.allow_email_login IS
  'When true and user_roles.role = developer, this user may use email OTP on the admin login page.';

-- Pre-login check (anon) — does not reveal role, only whether email OTP is enabled for that developer
CREATE OR REPLACE FUNCTION public.admin_portal_email_login_allowed(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    INNER JOIN public.user_roles ur ON ur.user_id = u.id
    INNER JOIN public.admin_profiles ap ON ap.user_id = u.id
    WHERE lower(trim(u.email)) = lower(trim(check_email))
      AND ur.role = 'developer'::public.app_role
      AND ap.allow_email_login = true
  );
$$;

REVOKE ALL ON FUNCTION public.admin_portal_email_login_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_portal_email_login_allowed(text) TO anon, authenticated;

-- Developers may toggle allow_email_login for staff
DROP POLICY IF EXISTS admin_profiles_update_developer ON public.admin_profiles;
CREATE POLICY admin_profiles_update_developer ON public.admin_profiles
  FOR UPDATE TO authenticated
  USING (public.is_developer())
  WITH CHECK (public.is_developer());
