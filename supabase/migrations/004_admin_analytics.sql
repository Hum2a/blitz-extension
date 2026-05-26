-- Admin dashboard: aggregated views & RPCs (metadata only; no ciphertext)

-- ---------------------------------------------------------------------------
-- Per-user summary (security invoker — respects RLS on underlying tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_user_summary
WITH (security_invoker = true)
AS
SELECT
  ap.user_id,
  ap.email,
  COALESCE(ur.role, 'user'::public.app_role) AS role,
  ap.created_at AS joined_at,
  ap.last_seen_at,
  ap.allow_email_login,
  usm.last_full_sync_at,
  usm.encryption_version,
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

-- ---------------------------------------------------------------------------
-- RPC: dashboard + analytics overview
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_stats_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_min_role('admin') THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*)::int FROM public.admin_profiles),
    'pro_users', (
      SELECT count(*)::int FROM public.license_entitlements WHERE tier = 'pro'
    ),
    'free_users', (
      SELECT count(*)::int FROM public.license_entitlements WHERE tier = 'free'
    ),
    'sync_enabled_users', (
      SELECT count(*)::int FROM public.user_sync_meta
    ),
    'total_sync_docs', (
      SELECT count(*)::int FROM public.sync_documents WHERE deleted_at IS NULL
    ),
    'total_synced_apps', (
      SELECT count(*)::int FROM public.synced_applications WHERE deleted_at IS NULL
    ),
    'audit_actions_7d', (
      SELECT count(*)::int FROM public.admin_audit_log
      WHERE created_at >= now() - interval '7 days'
    ),
    'active_7d', (
      SELECT count(*)::int FROM public.admin_profiles
      WHERE last_seen_at >= now() - interval '7 days'
    ),
    'active_30d', (
      SELECT count(*)::int FROM public.admin_profiles
      WHERE last_seen_at >= now() - interval '30 days'
    ),
    'signups_by_day', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('day', d.day, 'count', d.c) ORDER BY d.day)
        FROM (
          SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS c
          FROM public.admin_profiles
          WHERE created_at >= now() - interval '30 days'
          GROUP BY 1
        ) d
      ),
      '[]'::jsonb
    ),
    'pro_vs_free', jsonb_build_object(
      'pro', (SELECT count(*)::int FROM public.license_entitlements WHERE tier = 'pro'),
      'free', (SELECT count(*)::int FROM public.license_entitlements WHERE tier = 'free'),
      'none', (
        SELECT count(*)::int FROM public.admin_profiles ap
        WHERE NOT EXISTS (
          SELECT 1 FROM public.license_entitlements le WHERE le.user_id = ap.user_id
        )
      )
    ),
    'doc_keys', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('doc_key', k.doc_key, 'count', k.c) ORDER BY k.c DESC)
        FROM (
          SELECT doc_key, count(*)::int AS c
          FROM public.sync_documents
          WHERE deleted_at IS NULL
          GROUP BY doc_key
        ) k
      ),
      '[]'::jsonb
    ),
    'top_by_synced_apps', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', t.user_id,
            'email', t.email,
            'synced_app_count', t.synced_app_count
          )
          ORDER BY t.synced_app_count DESC
        )
        FROM (
          SELECT user_id, email, synced_app_count
          FROM public.admin_user_summary
          WHERE synced_app_count > 0
          ORDER BY synced_app_count DESC
          LIMIT 10
        ) t
      ),
      '[]'::jsonb
    ),
    'top_by_applications_used', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', t.user_id,
            'email', t.email,
            'applications_used', t.applications_used
          )
          ORDER BY t.applications_used DESC
        )
        FROM (
          SELECT user_id, email, applications_used
          FROM public.admin_user_summary
          WHERE applications_used > 0
          ORDER BY applications_used DESC
          LIMIT 10
        ) t
      ),
      '[]'::jsonb
    ),
    'stale_sync_users', (
      SELECT count(*)::int
      FROM public.user_sync_meta
      WHERE last_full_sync_at IS NULL
         OR last_full_sync_at < now() - interval '7 days'
    ),
    'sync_no_apps', (
      SELECT count(*)::int
      FROM public.admin_user_summary
      WHERE has_sync_meta AND synced_app_count = 0
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_stats_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_stats_overview() TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: per-user usage (metadata)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_user_usage(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_min_role('admin') THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  SELECT jsonb_build_object(
    'summary', (
      SELECT row_to_json(s)::jsonb
      FROM public.admin_user_summary s
      WHERE s.user_id = p_user_id
    ),
    'documents', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'doc_key', d.doc_key,
            'updated_at', d.updated_at,
            'device_id', d.device_id,
            'content_hash', d.content_hash
          )
          ORDER BY d.updated_at DESC
        )
        FROM public.sync_documents d
        WHERE d.user_id = p_user_id AND d.deleted_at IS NULL
      ),
      '[]'::jsonb
    ),
    'applications', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'updated_at', a.updated_at,
            'device_id', a.device_id,
            'content_hash', a.content_hash
          )
          ORDER BY a.updated_at DESC
        )
        FROM public.synced_applications a
        WHERE a.user_id = p_user_id AND a.deleted_at IS NULL
        LIMIT 50
      ),
      '[]'::jsonb
    ),
    'audit_for_user', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', l.id,
            'action', l.action,
            'actor_id', l.actor_id,
            'created_at', l.created_at,
            'meta', l.meta
          )
          ORDER BY l.created_at DESC
        )
        FROM public.admin_audit_log l
        WHERE l.target_user_id = p_user_id
        LIMIT 30
      ),
      '[]'::jsonb
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_usage(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Touch last_seen (extension + admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_admin_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.admin_profiles
  SET last_seen_at = now()
  WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.touch_admin_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_admin_last_seen() TO authenticated;
