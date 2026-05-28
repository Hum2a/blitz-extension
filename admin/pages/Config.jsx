import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useAdminQuery } from "../hooks/useAdminQuery.js";
import PageHeader from "../components/PageHeader.jsx";
import Loading from "../components/Loading.jsx";
import Alert from "../components/Alert.jsx";
import { validateLicenseKey } from "../lib/license-admin.js";
import { logAdminAction } from "../lib/audit.js";

export default function Config() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [testKey, setTestKey] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [form, setForm] = useState(null);

  const { data: config, error, loading, reload } = useAdminQuery(async () => {
    const { data, error: e } = await supabase.rpc("get_app_config");
    if (e) throw e;
    return data;
  }, []);

  useEffect(() => {
    if (!config) return;
    setForm({
      maintenance_mode: config.maintenance_mode || false,
      banner_message: config.banner_message || "",
      min_extension_version: config.min_extension_version || "",
      feature_flags_json: JSON.stringify(config.feature_flags || {}, null, 2),
    });
  }, [config]);

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      let feature_flags = {};
      try {
        feature_flags = JSON.parse(form.feature_flags_json || "{}");
      } catch {
        throw new Error("Feature flags must be valid JSON");
      }
      const { error: e } = await supabase.rpc("set_app_config", {
        p_patch: {
          maintenance_mode: form.maintenance_mode,
          banner_message: form.banner_message || null,
          min_extension_version: form.min_extension_version || null,
          feature_flags,
        },
      });
      if (e) throw e;
      await logAdminAction("app_config_update", null, { maintenance_mode: form.maintenance_mode });
      setMsg("Config saved.");
      reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function testLicense() {
    setTestResult(null);
    try {
      const result = await validateLicenseKey(testKey);
      setTestResult(result);
    } catch (e) {
      setTestResult({ valid: false, message: e.message });
    }
  }

  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!form) return <Loading />;

  return (
    <div>
      <PageHeader title="App config" subtitle="Developer only — extension reads via get_app_config">
        <button type="button" className="btn small primary" disabled={busy} onClick={save}>
          Save
        </button>
      </PageHeader>
      {err && <Alert>{err}</Alert>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card stack" style={{ maxWidth: 560 }}>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.maintenance_mode}
            onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
          />
          Maintenance mode (extension shows banner)
        </label>
        <label>
          Banner message
          <input
            value={form.banner_message}
            onChange={(e) => setForm({ ...form, banner_message: e.target.value })}
            placeholder="Optional message for all users"
          />
        </label>
        <label>
          Minimum extension version
          <input
            value={form.min_extension_version}
            onChange={(e) => setForm({ ...form, min_extension_version: e.target.value })}
            placeholder="e.g. 1.2.0"
          />
        </label>
        <label>
          Feature flags (JSON)
          <textarea
            className="code-area"
            rows={8}
            value={form.feature_flags_json}
            onChange={(e) => setForm({ ...form, feature_flags_json: e.target.value })}
            placeholder={'{\n  "disable_generation": false,\n  "disable_queue": false,\n  "disable_widget": false,\n  "disable_fill": false\n}'}
          />
        </label>
      </div>

      <section className="section">
        <h2>Test license key</h2>
        <div className="toolbar">
          <input
            value={testKey}
            onChange={(e) => setTestKey(e.target.value)}
            placeholder="License key"
          />
          <button type="button" className="btn small" onClick={testLicense}>
            Validate
          </button>
        </div>
        {testResult && (
          <pre className="code-block">{JSON.stringify(testResult, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}
