#!/usr/bin/env node
/**
 * Grant developer role to DEVELOPER_EMAIL (service role required).
 * Usage: npm run db:seed:developer
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env") });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEVELOPER_EMAIL?.trim()?.toLowerCase();

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
if (!email) {
  console.error("Set DEVELOPER_EMAIL in .env (your Supabase auth email)");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listErr } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listErr) {
  console.error(listErr.message);
  process.exit(1);
}

const user = list.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  console.error(`No auth user found for ${email}. Sign in to the extension or admin app once first.`);
  process.exit(1);
}

const { error: roleErr } = await admin.from("user_roles").upsert(
  {
    user_id: user.id,
    role: "developer",
    granted_by: user.id,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "user_id" }
);

if (roleErr) {
  console.error(roleErr.message);
  process.exit(1);
}

await admin.from("admin_audit_log").insert({
  actor_id: user.id,
  action: "seed_developer",
  target_user_id: user.id,
  meta: { email },
});

console.log(`Developer role granted to ${email} (${user.id})`);
