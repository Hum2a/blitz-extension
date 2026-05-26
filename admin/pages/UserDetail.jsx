import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import DataTable from "../components/DataTable.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { formatDate, formatRelative, copyText } from "../lib/format.js";
import {
  linkLicenseKeyForUser,
  resetApplicationsUsed,
  setLicenseExpiry,
  setUserLicenseTier,
} from "../lib/license-admin.js";
import {
  canDeleteUsers,
  canModerateUsers,
  canResetSync,
  canManageRoles,
} from "../lib/roles.js";
import {
  addSupportNote,
  deleteUserAccount,
  resetUserSync,
  revokeUserSessions,
  setAccountStatus,
} from "../lib/admin-actions.js";

export default function UserDetail({ userId, onBack, staffRole, onDeleted }) {
  const [licenseKey, setLicenseKey] = useState("");
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const { data, error, loading, reload } = useAdminQuery(async () => {
    const { data: usage, error: uErr } = await supabase.rpc("admin_user_usage", {
      p_user_id: userId,
    });
    if (uErr) throw uErr;
    return usage;
  }, [userId]);

  const summary = data?.summary;

  async function runAction(fn) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await fn();
      setMsg("Saved.");
      reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!summary) return <Alert>User not found.</Alert>;

  return (
    <div>
      <PageHeader title={summary.email || "User"} subtitle={summary.user_id}>
        <button type="button" className="btn small ghost" onClick={onBack}>
          ← Users
        </button>
        <button
          type="button"
          className="btn small"
          onClick={() => copyText(summary.user_id).then(() => setMsg("ID copied"))}
        >
          Copy ID
        </button>
      </PageHeader>

      {err && <Alert>{err}</Alert>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="grid">
        <div className="stat">
          <div className="stat-label">Role</div>
          <div className="stat-value stat-value-sm">
            <span className="badge">{summary.role}</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">License</div>
          <div className="stat-value stat-value-sm">{summary.tier || "none"}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Applications used</div>
          <div className="stat-value">{summary.applications_used ?? 0}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Sync documents</div>
          <div className="stat-value">{summary.sync_doc_count}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Synced apps</div>
          <div className="stat-value">{summary.synced_app_count}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Devices</div>
          <div className="stat-value">{summary.device_count}</div>
        </div>
      </div>

      <section className="section">
        <h2>Activity</h2>
        <ul className="kv-list">
          <li>
            <span>Joined</span>
            <strong>{formatDate(summary.joined_at)}</strong>
          </li>
          <li>
            <span>Last seen</span>
            <strong>{formatRelative(summary.last_seen_at)}</strong>
          </li>
          <li>
            <span>Last full sync</span>
            <strong>{formatDate(summary.last_full_sync_at)}</strong>
          </li>
          <li>
            <span>Last doc update</span>
            <strong>{formatDate(summary.last_doc_sync_at)}</strong>
          </li>
          <li>
            <span>Encryption</span>
            <strong>{summary.encryption_version || "—"}</strong>
          </li>
          <li>
            <span>License source</span>
            <strong>{summary.license_source || "—"}</strong>
          </li>
          <li>
            <span>Expires</span>
            <strong>{formatDate(summary.license_expires_at)}</strong>
          </li>
          <li>
            <span>Account status</span>
            <strong>{summary.account_status || "active"}</strong>
          </li>
          {summary.sync_last_error && (
            <li>
              <span>Sync error</span>
              <strong className="error">{summary.sync_last_error}</strong>
            </li>
          )}
        </ul>
      </section>

      {canModerateUsers(staffRole) && (
        <section className="section">
          <h2>Account moderation</h2>
          <div className="actions-row">
            {summary.account_status === "suspended" ? (
              <button
                type="button"
                className="btn small"
                disabled={busy}
                onClick={() =>
                  runAction(() => setAccountStatus(userId, "active"))
                }
              >
                Unsuspend
              </button>
            ) : (
              <button
                type="button"
                className="btn small"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    title: "Suspend account",
                    message:
                      "User cannot sync while suspended. They can still use local extension features.",
                    action: () => setAccountStatus(userId, "suspended"),
                  })
                }
              >
                Suspend
              </button>
            )}
            <button
              type="button"
              className="btn small ghost"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  title: "Revoke sessions",
                  message: "Signs the user out of all devices immediately.",
                  action: () => revokeUserSessions(userId),
                })
              }
            >
              Force sign-out
            </button>
          </div>
        </section>
      )}

      {canManageRoles(staffRole) && (
        <section className="section">
          <h2>Support notes (developer)</h2>
          <div className="stack" style={{ maxWidth: 480 }}>
            <textarea
              className="code-area"
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Internal note — not visible to user"
            />
            <button
              type="button"
              className="btn small"
              disabled={busy || !noteText.trim()}
              onClick={() => runAction(() => addSupportNote(userId, noteText)).then(() => setNoteText(""))}
            >
              Add note
            </button>
          </div>
        </section>
      )}

      <section className="section">
        <h2>License actions</h2>
        <div className="actions-row">
          <button
            type="button"
            className="btn small"
            disabled={busy}
            onClick={() => runAction(() => setUserLicenseTier(userId, "pro"))}
          >
            Set Pro
          </button>
          <button
            type="button"
            className="btn small ghost"
            disabled={busy}
            onClick={() => runAction(() => setUserLicenseTier(userId, "free"))}
          >
            Set Free
          </button>
          <button
            type="button"
            className="btn small ghost"
            disabled={busy}
            onClick={() => runAction(() => resetApplicationsUsed(userId))}
          >
            Reset usage count
          </button>
        </div>
        <div className="stack" style={{ maxWidth: 420, marginTop: "0.75rem" }}>
          <label className="muted small">
            Link license key (validates with Cloudflare worker)
            <input
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="XXXX-XXXX-…"
              disabled={busy}
            />
          </label>
          <button
            type="button"
            className="btn small"
            disabled={busy || !licenseKey.trim()}
            onClick={() => runAction(() => linkLicenseKeyForUser(userId, licenseKey))}
          >
            Validate & link key
          </button>
          <label className="muted small">
            Pro expiry (ISO datetime, empty = none)
            <input
              type="datetime-local"
              disabled={busy}
              onBlur={(e) => {
                const v = e.target.value;
                if (!v) return;
                runAction(() => setLicenseExpiry(userId, new Date(v).toISOString()));
              }}
            />
          </label>
        </div>
      </section>

      <section className="section">
        <h2>Synced document keys</h2>
        <DataTable
          columns={[
            { label: "Key", key: "doc_key" },
            { label: "Updated", render: (r) => formatDate(r.updated_at) },
            { label: "Device", key: "device_id", className: "mono small" },
          ]}
          rows={data.documents || []}
          rowKey="doc_key"
          emptyMessage="No sync documents."
        />
      </section>

      <section className="section">
        <h2>Synced applications (metadata)</h2>
        <DataTable
          columns={[
            { label: "ID", render: (r) => String(r.id).slice(0, 8) + "…", className: "mono small" },
            { label: "Updated", render: (r) => formatDate(r.updated_at) },
            { label: "Device", key: "device_id", className: "mono small" },
          ]}
          rows={data.applications || []}
          rowKey="id"
          emptyMessage="No synced applications."
        />
      </section>

      <section className="section">
        <h2>Admin audit (this user)</h2>
        <DataTable
          columns={[
            { label: "When", render: (r) => formatDate(r.created_at) },
            { label: "Action", key: "action" },
            { label: "Meta", render: (r) => JSON.stringify(r.meta || {}) },
          ]}
          rows={data.audit_for_user || []}
          rowKey="id"
          emptyMessage="No audit entries."
        />
      </section>

      {(canResetSync(staffRole) || canDeleteUsers(staffRole)) && (
        <section className="section danger-zone">
          <h2>Danger zone</h2>
          <div className="actions-row">
            {canResetSync(staffRole) && (
              <button
                type="button"
                className="btn small danger"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    title: "Reset cloud sync",
                    message:
                      "Deletes all sync_documents, synced_applications, and user_sync_meta for this user. Local extension data is untouched.",
                    destructive: true,
                    action: () => resetUserSync(userId),
                  })
                }
              >
                Reset cloud sync
              </button>
            )}
            {canDeleteUsers(staffRole) && (
              <button
                type="button"
                className="btn small danger"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    title: "Delete cloud account",
                    message:
                      "Permanently deletes auth user and all cloud rows. Cannot be undone.",
                    destructive: true,
                    confirmLabel: "Delete account",
                    action: async () => {
                      await deleteUserAccount(userId);
                      onDeleted?.();
                    },
                  })
                }
              >
                Delete account
              </button>
            )}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        destructive={confirm?.destructive}
        confirmLabel={confirm?.confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const action = confirm?.action;
          setConfirm(null);
          if (action) await runAction(action);
        }}
      />
    </div>
  );
}
