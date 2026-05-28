-- Platform mix from client_events.meta.platform (generate / queue telemetry)

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
    'suspended_users', (
      SELECT count(*)::int FROM public.admin_profiles WHERE account_status = 'suspended'
    ),
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
    'telemetry_7d', (
      SELECT count(*)::int FROM public.client_events
      WHERE created_at >= now() - interval '7 days'
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
    ),
    'sync_errors', (
      SELECT count(*)::int FROM public.user_sync_meta WHERE last_error IS NOT NULL AND last_error <> ''
    ),
    'events_by_type', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('event_type', e.event_type, 'count', e.c) ORDER BY e.c DESC)
        FROM (
          SELECT event_type, count(*)::int AS c
          FROM public.client_events
          WHERE created_at >= now() - interval '7 days'
          GROUP BY event_type
        ) e
      ),
      '[]'::jsonb
    ),
    'platforms_by_mix', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('platform', p.platform, 'count', p.c) ORDER BY p.c DESC
        )
        FROM (
          SELECT COALESCE(NULLIF(trim(meta->>'platform'), ''), 'unknown') AS platform,
                 count(*)::int AS c
          FROM public.client_events
          WHERE created_at >= now() - interval '7 days'
            AND event_type IN ('generate_completed', 'generate_failed', 'queue_finished')
            AND meta ? 'platform'
          GROUP BY 1
        ) p
      ),
      '[]'::jsonb
    ),
    'billing_sources', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('source', s.source, 'count', s.c) ORDER BY s.c DESC
        )
        FROM (
          SELECT COALESCE(NULLIF(trim(source), ''), 'unknown') AS source,
                 count(*)::int AS c
          FROM public.license_entitlements
          WHERE tier = 'pro'
          GROUP BY 1
        ) s
      ),
      '[]'::jsonb
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_stats_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_stats_overview() TO authenticated;
