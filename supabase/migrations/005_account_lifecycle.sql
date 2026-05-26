-- Account lifecycle: suspend, support notes, sync errors

ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended'));

ALTER TABLE public.user_sync_meta
  ADD COLUMN IF NOT EXISTS last_error text;

CREATE TABLE IF NOT EXISTS public.support_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_notes_user_idx ON public.support_notes (user_id, created_at DESC);

ALTER TABLE public.support_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_notes_select ON public.support_notes
  FOR SELECT TO authenticated
  USING (public.is_developer());

CREATE POLICY support_notes_insert ON public.support_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_developer() AND author_id = auth.uid());

-- Refresh summary view
DROP VIEW IF EXISTS public.admin_user_summary;

CREATE VIEW public.admin_user_summary
WITH (security_invoker = true)
AS
SELECT
  ap.user_id,
  ap.email,
  COALESCE(ur.role, 'user'::public.app_role) AS role,
  ap.created_at AS joined_at,
  ap.last_seen_at,
  ap.allow_email_login,
  ap.account_status,
  usm.last_full_sync_at,
  usm.encryption_version,
  usm.last_error AS sync_last_error,
  usm.updated_at AS sync_meta_updated_at,
  (usm.user_id IS NOT NULL) AS has_sync_meta,
  (
    SELECT count(*)::int
    FROM public.sync_documents sd
    WHERE sd.user_id = ap.user_id AND sd.deleted_at IS NULL
  ) AS sync_doc_count,
  (
    SELECT count(*)::int
    FROM public.synced_applications sa
    WHERE sa.user_id = ap.user_id AND sa.deleted_at IS NULL
  ) AS synced_app_count,
  (
    SELECT count(DISTINCT sd.device_id)::int
    FROM public.sync_documents sd
    WHERE sd.user_id = ap.user_id AND sd.deleted_at IS NULL
  ) AS device_count,
  (
    SELECT max(sd.updated_at)
    FROM public.sync_documents sd
    WHERE sd.user_id = ap.user_id AND sd.deleted_at IS NULL
  ) AS last_doc_sync_at,
  le.tier,
  le.applications_used,
  le.expires_at AS license_expires_at,
  le.source AS license_source,
  le.updated_at AS license_updated_at
FROM public.admin_profiles ap
LEFT JOIN public.user_roles ur ON ur.user_id = ap.user_id
LEFT JOIN public.user_sync_meta usm ON usm.user_id = ap.user_id
LEFT JOIN public.license_entitlements le ON le.user_id = ap.user_id;

GRANT SELECT ON public.admin_user_summary TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_account_status()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT account_status FROM public.admin_profiles WHERE user_id = auth.uid()),
    'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_account_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  p_user_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_min_role('admin') THEN
    RAISE EXCEPTION 'access denied';
  END IF;
  IF p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.admin_profiles
  SET account_status = p_status
  WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_account_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reset_user_sync(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  docs int;
  apps int;
BEGIN
  IF NOT public.is_developer() THEN
    RAISE EXCEPTION 'access denied';
  END IF;
  DELETE FROM public.sync_documents WHERE user_id = p_user_id;
  GET DIAGNOSTICS docs = ROW_COUNT;
  DELETE FROM public.synced_applications WHERE user_id = p_user_id;
  GET DIAGNOSTICS apps = ROW_COUNT;
  DELETE FROM public.user_sync_meta WHERE user_id = p_user_id;
  RETURN jsonb_build_object('sync_documents_deleted', docs, 'synced_applications_deleted', apps);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_user_sync(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_sync(uuid) TO authenticated;
