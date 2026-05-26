import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import DataTable from "../components/DataTable.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";
import { formatDate } from "../lib/format.js";
import { resetApplicationsUsed, setLicenseExpiry, setUserLicenseTier } from "../lib/license-admin.js";

export default function Licenses({ onOpenUser }) {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const { data: rows, error, loading, reload } = useAdminQuery(async () => {
    const { data, error: e } = await supabase
      .from("admin_user_summary")
      .select("user_id, email, tier, applications_used, license_source, license_expires_at, license_updated_at")
      .not("tier", "is", null)
      .order("license_updated_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (e) throw e;
    return data || [];
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter(
      (r) => r.email?.toLowerCase().includes(q) || r.user_id?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function act(userId, fn) {
    setBusy(userId);
    setErr(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader title="Licenses" subtitle="Pro / Free entitlements">
        <button type="button" className="btn small" onClick={reload}>
          Refresh
        </button>
      </PageHeader>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search email or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {err && <Alert>{err}</Alert>}
      {loading && <Loading />}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && (
        <DataTable
          columns={[
            {
              label: "Email",
              render: (r) => (
                <button type="button" className="link-btn" onClick={() => onOpenUser(r.user_id)}>
                  {r.email || "—"}
                </button>
              ),
            },
            { label: "Tier", key: "tier" },
            { label: "Used", key: "applications_used" },
            { label: "Source", key: "license_source" },
            { label: "Expires", render: (r) => formatDate(r.license_expires_at) },
            {
              label: "Actions",
              render: (r) => (
                <div className="actions">
                  <button
                    type="button"
                    className="btn small"
                    disabled={busy === r.user_id}
                    onClick={() => act(r.user_id, () => setUserLicenseTier(r.user_id, "pro"))}
                  >
                    Pro
                  </button>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={busy === r.user_id}
                    onClick={() => act(r.user_id, () => setUserLicenseTier(r.user_id, "free"))}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={busy === r.user_id}
                    onClick={() => act(r.user_id, () => resetApplicationsUsed(r.user_id))}
                  >
                    Reset used
                  </button>
                </div>
              ),
            },
          ]}
          rows={filtered}
          rowKey="user_id"
          emptyMessage="No license rows — users without entitlements appear only on Users."
        />
      )}
    </div>
  );
}
