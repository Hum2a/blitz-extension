-- User-facing analytics (own data only; no ciphertext)

CREATE OR REPLACE FUNCTION public.get_my_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('signed_in', false);
  END IF;

  RETURN jsonb_build_object(
    'signed_in', true,
    'license', (
      SELECT row_to_json(le)::jsonb
      FROM public.license_entitlements le
      WHERE le.user_id = uid
    ),
    'sync_meta', (
      SELECT row_to_json(usm)::jsonb
      FROM public.user_sync_meta usm
      WHERE usm.user_id = uid
    ),
    'sync_doc_count', (
      SELECT count(*)::int
      FROM public.sync_documents sd
      WHERE sd.user_id = uid AND sd.deleted_at IS NULL
    ),
    'synced_app_count', (
      SELECT count(*)::int
      FROM public.synced_applications sa
      WHERE sa.user_id = uid AND sa.deleted_at IS NULL
    ),
    'device_count', (
      SELECT count(DISTINCT sd.device_id)::int
      FROM public.sync_documents sd
      WHERE sd.user_id = uid AND sd.deleted_at IS NULL
    ),
    'last_doc_sync_at', (
      SELECT max(sd.updated_at)
      FROM public.sync_documents sd
      WHERE sd.user_id = uid AND sd.deleted_at IS NULL
    ),
    'cloud_apps_by_day', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('day', d.day, 'count', d.c) ORDER BY d.day)
        FROM (
          SELECT date_trunc('day', updated_at)::date AS day, count(*)::int AS c
          FROM public.synced_applications
          WHERE user_id = uid AND deleted_at IS NULL
            AND updated_at >= now() - interval '90 days'
          GROUP BY 1
        ) d
      ),
      '[]'::jsonb
    ),
    'sync_docs_by_key', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('doc_key', k.doc_key, 'count', 1) ORDER BY k.doc_key)
        FROM (
          SELECT doc_key
          FROM public.sync_documents
          WHERE user_id = uid AND deleted_at IS NULL
        ) k
      ),
      '[]'::jsonb
    ),
    'events_by_day', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('day', d.day, 'count', d.c) ORDER BY d.day)
        FROM (
          SELECT date_trunc('day', created_at)::date AS day, count(*)::int AS c
          FROM public.client_events
          WHERE user_id = uid
            AND created_at >= now() - interval '30 days'
          GROUP BY 1
        ) d
      ),
      '[]'::jsonb
    ),
    'events_by_type', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('event_type', t.event_type, 'count', t.c) ORDER BY t.c DESC)
        FROM (
          SELECT event_type, count(*)::int AS c
          FROM public.client_events
          WHERE user_id = uid
            AND created_at >= now() - interval '90 days'
          GROUP BY 1
        ) t
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_analytics() TO authenticated;
