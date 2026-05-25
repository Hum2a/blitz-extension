-- Blitz cloud sync schema (run in Supabase SQL editor or via CLI)
-- Requires Supabase Auth enabled (Google + Email OTP recommended)

-- ---------------------------------------------------------------------------
-- user_sync_meta
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sync_meta (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  schema_version int NOT NULL DEFAULT 1,
  last_full_sync_at timestamptz,
  encryption_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sync_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_sync_meta_select ON public.user_sync_meta
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_sync_meta_insert ON public.user_sync_meta
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_sync_meta_update ON public.user_sync_meta
  FOR UPDATE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- sync_documents (encrypted key-value blobs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  doc_key text NOT NULL,
  ciphertext text NOT NULL,
  content_hash text NOT NULL,
  updated_at timestamptz NOT NULL,
  device_id text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, doc_key)
);

CREATE INDEX IF NOT EXISTS sync_documents_user_updated_idx
  ON public.sync_documents (user_id, updated_at DESC);

ALTER TABLE public.sync_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_documents_select ON public.sync_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY sync_documents_insert ON public.sync_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sync_documents_update ON public.sync_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY sync_documents_delete ON public.sync_documents
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- synced_applications (encrypted IDB history records)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.synced_applications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  content_hash text NOT NULL,
  updated_at timestamptz NOT NULL,
  device_id text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS synced_applications_user_updated_idx
  ON public.synced_applications (user_id, updated_at DESC);

ALTER TABLE public.synced_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY synced_applications_select ON public.synced_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY synced_applications_insert ON public.synced_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY synced_applications_update ON public.synced_applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY synced_applications_delete ON public.synced_applications
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- license_entitlements (server-side Pro tier; linked from extension)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  source text NOT NULL DEFAULT 'manual',
  expires_at timestamptz,
  applications_used int NOT NULL DEFAULT 0,
  license_key_hash text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.license_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY license_entitlements_select ON public.license_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Inserts/updates only via service role (Edge Functions)
CREATE POLICY license_entitlements_no_client_write ON public.license_entitlements
  FOR INSERT WITH CHECK (false);

CREATE POLICY license_entitlements_no_client_update ON public.license_entitlements
  FOR UPDATE USING (false);
