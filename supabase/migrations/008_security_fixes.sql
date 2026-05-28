-- Security: admin RPC authorization + one license key per account

-- 1) admin_licenses_expiring must require admin role (was callable by any authenticated user)
CREATE OR REPLACE FUNCTION public.admin_licenses_expiring(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_min_role('admin') THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'user_id', s.user_id,
          'email', s.email,
          'tier', s.tier,
          'license_expires_at', s.license_expires_at
        )
        ORDER BY s.license_expires_at
      ),
      '[]'::jsonb
    )
    FROM public.admin_user_summary s
    WHERE s.license_expires_at IS NOT NULL
      AND s.license_expires_at <= now() + (p_days || ' days')::interval
      AND s.license_expires_at > now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_licenses_expiring(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_licenses_expiring(int) TO authenticated;

-- 2) Prevent the same license key hash from being linked to multiple users
CREATE UNIQUE INDEX IF NOT EXISTS license_entitlements_license_key_hash_unique
  ON public.license_entitlements (license_key_hash)
  WHERE license_key_hash IS NOT NULL;
