-- Remote config, client telemetry, billing webhook storage

CREATE TABLE IF NOT EXISTS public.app_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode boolean NOT NULL DEFAULT false,
  banner_message text,
  min_extension_version text,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id)
);

INSERT INTO public.app_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_config_select ON public.app_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY app_config_update ON public.app_config
  FOR UPDATE TO authenticated
  USING (public.is_developer())
  WITH CHECK (public.is_developer());

CREATE TABLE IF NOT EXISTS public.client_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_events_type_created_idx
  ON public.client_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS client_events_user_idx
  ON public.client_events (user_id, created_at DESC);

ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_events_insert ON public.client_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY client_events_select ON public.client_events
  FOR SELECT TO authenticated
  USING (public.has_min_role('admin'));

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'lemonsqueezy',
  event_name text NOT NULL,
  external_id text,
  customer_email text,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_email_idx ON public.billing_events (customer_email);
CREATE INDEX IF NOT EXISTS billing_events_created_idx ON public.billing_events (processed_at DESC);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_events_select ON public.billing_events
  FOR SELECT TO authenticated
  USING (public.has_min_role('admin'));

-- No insert policy for authenticated — webhook uses service role

CREATE OR REPLACE FUNCTION public.get_app_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'maintenance_mode', c.maintenance_mode,
    'banner_message', c.banner_message,
    'min_extension_version', c.min_extension_version,
    'feature_flags', c.feature_flags,
    'updated_at', c.updated_at
  )
  FROM public.app_config c
  WHERE c.id = 1;
$$;

REVOKE ALL ON FUNCTION public.get_app_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_config() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_app_config(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_developer() THEN
    RAISE EXCEPTION 'access denied';
  END IF;
  UPDATE public.app_config
  SET
    maintenance_mode = COALESCE((p_patch->>'maintenance_mode')::boolean, maintenance_mode),
    banner_message = COALESCE(p_patch->>'banner_message', banner_message),
    min_extension_version = COALESCE(p_patch->>'min_extension_version', min_extension_version),
    feature_flags = COALESCE(p_patch->'feature_flags', feature_flags),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = 1;
  RETURN public.get_app_config();
END;
$$;

REVOKE ALL ON FUNCTION public.set_app_config(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_app_config(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_audit_trends()
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
  RETURN jsonb_build_object(
    'by_action', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('action', a.action, 'count', a.c) ORDER BY a.c DESC)
        FROM (
          SELECT action, count(*)::int AS c
          FROM public.admin_audit_log
          WHERE created_at >= now() - interval '30 days'
          GROUP BY action
        ) a
      ),
      '[]'::jsonb
    ),
    'by_week', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('week', w.w, 'count', w.c) ORDER BY w.w)
        FROM (
          SELECT date_trunc('week', created_at)::date AS w, count(*)::int AS c
          FROM public.admin_audit_log
          WHERE created_at >= now() - interval '90 days'
          GROUP BY 1
        ) w
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_audit_trends() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_audit_trends() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_licenses_expiring(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND s.license_expires_at > now();
$$;

REVOKE ALL ON FUNCTION public.admin_licenses_expiring(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_licenses_expiring(int) TO authenticated;

-- Extend overview stats (replace function from 004)
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
    )
  ) INTO result;

  RETURN result;
END;
$$;
