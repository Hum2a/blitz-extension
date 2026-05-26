import { useMemo, useState, useEffect, useCallback } from "react";
import { useApplications } from "../hooks/useApplications.js";
import { useApiUsage } from "../hooks/useApiUsage.js";
import { useLicense } from "../hooks/useLicense.js";
import { getStorage } from "../lib/storage.js";
import { fetchMyCloudAnalytics } from "../lib/my-analytics-api.js";
import { SUPABASE_CONFIGURED } from "../lib/config.js";
import {
  aggregateApplicationAnalytics,
  aggregateApiUsageAnalytics,
  mergeCloudDaySeries,
} from "../lib/user-analytics.js";
import { formatUsd, exportApiUsageToCsv } from "../lib/api-usage-log.js";
import { exportApplicationsToCsv } from "../lib/application-history-utils.js";
import { FadeUp, PulseDots, Btn } from "./motion.jsx";
import { scrollPanelClass } from "../lib/layout.js";
import BarChart from "./charts/BarChart.jsx";
import DonutChart from "./charts/DonutChart.jsx";
import AnalyticsSection, { StatPill, SimpleTable } from "./charts/AnalyticsSection.jsx";
import ApiUsageHistory from "./ApiUsageHistory.jsx";

export default function Analytics({ fullPage = false }) {
  const { applications, loading: appsLoading, refresh: refreshApps } = useApplications();
  const { records: apiRecords, loading: apiLoading, refresh: refreshApi } = useApiUsage();
  const license = useLicense();
  const [queueLen, setQueueLen] = useState(0);
  const [syncLocal, setSyncLocal] = useState(null);
  const [cloud, setCloud] = useState(null);
  const [cloudError, setCloudError] = useState(null);
  const [cloudLoading, setCloudLoading] = useState(false);

  const loadExtras = useCallback(async () => {
    const [queue, syncEnabled, syncState] = await Promise.all([
      getStorage("job_queue"),
      getStorage("sync_enabled"),
      getStorage("sync_state"),
    ]);
    setQueueLen(Array.isArray(queue) ? queue.length : 0);
    setSyncLocal({
      enabled: Boolean(syncEnabled),
      lastSyncAt: syncState?.lastSyncAt,
      lastError: syncState?.lastError,
      pending:
        (syncState?.pendingDocKeys?.length || 0) +
        (syncState?.pendingApplicationIds?.length || 0),
    });
  }, []);

  const loadCloud = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return;
    setCloudLoading(true);
    setCloudError(null);
    try {
      const data = await fetchMyCloudAnalytics();
      setCloud(data);
    } catch (err) {
      setCloudError(err.message || "Could not load cloud analytics");
      setCloud(null);
    } finally {
      setCloudLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExtras();
  }, [loadExtras, applications.length, apiRecords.length]);

  useEffect(() => {
    loadCloud();
  }, [loadCloud]);

  const appAnalytics = useMemo(
    () => aggregateApplicationAnalytics(applications),
    [applications]
  );
  const apiAnalytics = useMemo(() => aggregateApiUsageAnalytics(apiRecords), [apiRecords]);

  const cloudAppsMerged = useMemo(
    () =>
      mergeCloudDaySeries(
        appAnalytics.applicationsByDay,
        cloud?.cloud_apps_by_day?.map((r) => ({
          day: String(r.day).slice(0, 10),
          count: r.count,
        }))
      ),
    [appAnalytics.applicationsByDay, cloud]
  );

  const loading = appsLoading || apiLoading;

  const refreshAll = async () => {
    await Promise.all([refreshApps(), refreshApi(), loadExtras(), loadCloud()]);
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <PulseDots label="Loading analytics…" />
      </div>
    );
  }

  const tier = license.tier === "pro" ? "Pro" : "Free";
  const remaining =
    license.tier === "pro"
      ? "∞"
      : license.remaining === Infinity
        ? "∞"
        : String(license.remaining ?? "—");

  return (
    <FadeUp
      className={`space-y-4 ${scrollPanelClass(fullPage, "max-h-none")}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {!fullPage && (
            <>
              <h2 className="text-base font-bold text-slate-900">Analytics</h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                Applications, AI usage, and account stats. Application & API logs stay on this
                device; cloud section shows encrypted backup metadata when signed in.
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Btn
            type="button"
            onClick={() => exportApplicationsToCsv(applications)}
            disabled={!applications.length}
            className="text-xs border border-slate-300 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Export apps CSV
          </Btn>
          <Btn
            type="button"
            onClick={() => exportApiUsageToCsv(apiRecords)}
            disabled={!apiRecords.length}
            className="text-xs border border-slate-300 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Export API CSV
          </Btn>
          <Btn
            type="button"
            onClick={refreshAll}
            className="text-xs bg-blitz-600 text-white px-3 py-1.5 rounded-lg hover:bg-blitz-700"
          >
            Refresh
          </Btn>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatPill label="Applications" value={appAnalytics.summary.total} />
        <StatPill label="This week" value={appAnalytics.summary.thisWeek} />
        <StatPill label="Interviews" value={appAnalytics.summary.interviews} />
        <StatPill label="Offers" value={appAnalytics.summary.offers} />
        <StatPill label="Response %" value={`${appAnalytics.summary.responseRate}%`} />
        <StatPill
          label="Avg match"
          value={appAnalytics.summary.avgMatchScore ?? "—"}
        />
        <StatPill label="API spent" value={formatUsd(apiAnalytics.summary.totalCostUsd)} />
        <StatPill label="API calls" value={apiAnalytics.summary.totalCalls} />
        <StatPill label="Queue" value={queueLen} />
        <StatPill label="License" value={tier} hint={`${remaining} left`} />
      </div>

      <div
        className={
          fullPage
            ? "grid lg:grid-cols-2 gap-4"
            : "space-y-4"
        }
      >
        <AnalyticsSection
          title="Applications over time (30 days)"
          description="Local history by last update date."
        >
          <BarChart data={appAnalytics.applicationsByDay} />
        </AnalyticsSection>

        <AnalyticsSection
          title="Applied / filled over time"
          description="Entries marked applied or with an applied date."
        >
          <BarChart data={appAnalytics.appliedByDay} />
        </AnalyticsSection>

        <AnalyticsSection title="Status breakdown">
          <DonutChart
            segments={appAnalytics.byStatus.map((s) => ({
              label: s.label,
              count: s.count,
            }))}
          />
        </AnalyticsSection>

        <AnalyticsSection title="Platform breakdown">
          <DonutChart
            segments={appAnalytics.byPlatform.map((s) => ({
              label: s.label,
              count: s.count,
            }))}
          />
        </AnalyticsSection>

        <AnalyticsSection title="Match score distribution">
          <BarChart
            data={appAnalytics.matchScoreBuckets}
            labelKey="label"
            valueKey="count"
            maxBars={10}
            formatLabel={(v) => v}
          />
        </AnalyticsSection>

        <AnalyticsSection title="Activity event types" description="From application timelines.">
          <BarChart
            data={appAnalytics.eventsByType}
            labelKey="label"
            valueKey="count"
            maxBars={12}
            formatLabel={(v) => String(v).replace(/_/g, " ")}
          />
        </AnalyticsSection>

        <AnalyticsSection title="Top companies" className={fullPage ? "lg:col-span-2" : ""}>
          <BarChart
            data={appAnalytics.byCompany}
            labelKey="label"
            valueKey="count"
            maxBars={12}
            formatLabel={(v) => (String(v).length > 10 ? `${String(v).slice(0, 9)}…` : v)}
          />
        </AnalyticsSection>

        <AnalyticsSection
          title="Applications table"
          description="Most recent 25 on this device."
          className={fullPage ? "lg:col-span-2" : ""}
        >
          <SimpleTable
            columns={[
              { key: "date", label: "Date" },
              { key: "title", label: "Title" },
              { key: "company", label: "Company" },
              { key: "platform", label: "Platform" },
              { key: "status", label: "Status" },
              { key: "match", label: "Match" },
            ]}
            rows={appAnalytics.tableRows}
            rowKey="id"
          />
        </AnalyticsSection>

        <AnalyticsSection title="API spend by day (30 days)">
          <BarChart data={apiAnalytics.costByDay} />
        </AnalyticsSection>

        <AnalyticsSection title="API calls by day">
          <BarChart data={apiAnalytics.callsByDay} />
        </AnalyticsSection>

        <AnalyticsSection title="Input tokens by day">
          <BarChart data={apiAnalytics.inputTokensByDay} />
        </AnalyticsSection>

        <AnalyticsSection title="Output tokens by day">
          <BarChart data={apiAnalytics.outputTokensByDay} />
        </AnalyticsSection>

        <AnalyticsSection title="API by provider">
          <DonutChart segments={apiAnalytics.byProvider.map((s) => ({ label: s.label, count: s.count }))} />
        </AnalyticsSection>

        <AnalyticsSection title="API success vs failed">
          <DonutChart segments={apiAnalytics.successVsFailed} />
        </AnalyticsSection>

        <AnalyticsSection title="API by call type">
          <BarChart
            data={apiAnalytics.byType}
            labelKey="label"
            valueKey="count"
            maxBars={8}
            formatLabel={(v) => v}
          />
        </AnalyticsSection>

        <AnalyticsSection title="API by job platform">
          <BarChart
            data={apiAnalytics.byPlatform}
            labelKey="label"
            valueKey="count"
            maxBars={10}
            formatLabel={(v) => v}
          />
        </AnalyticsSection>

        <AnalyticsSection title="Top models used" className={fullPage ? "lg:col-span-2" : ""}>
          <SimpleTable
            columns={[
              { key: "label", label: "Model" },
              { key: "count", label: "Calls" },
            ]}
            rows={apiAnalytics.byModel}
            rowKey="label"
          />
        </AnalyticsSection>
      </div>

      {SUPABASE_CONFIGURED && (
        <AnalyticsSection
          title="Cloud account (signed in)"
          description="Metadata from your encrypted backup — not decrypted content."
          className="border-blitz-200"
        >
          {cloudLoading && <p className="text-sm text-slate-500">Loading cloud stats…</p>}
          {cloudError && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {cloudError}
            </p>
          )}
          {!cloudLoading && cloud?.signed_in === false && (
            <p className="text-sm text-slate-600">
              Sign in under Settings → Account & sync to see cloud backup stats and telemetry.
            </p>
          )}
          {cloud?.signed_in && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatPill
                  label="Cloud apps"
                  value={cloud.synced_app_count ?? 0}
                  hint="Encrypted rows"
                />
                <StatPill label="Cloud docs" value={cloud.sync_doc_count ?? 0} />
                <StatPill label="Devices" value={cloud.device_count ?? 0} />
                <StatPill
                  label="Tier"
                  value={cloud.license?.tier ?? "—"}
                  hint={
                    cloud.license?.applications_used != null
                      ? `${cloud.license.applications_used} used`
                      : undefined
                  }
                />
              </div>
              {syncLocal && (
                <ul className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-3">
                  <li>
                    Local sync: {syncLocal.enabled ? "on" : "off"}
                    {syncLocal.lastSyncAt &&
                      ` · last ${new Date(syncLocal.lastSyncAt).toLocaleString()}`}
                    {syncLocal.pending > 0 && ` · ${syncLocal.pending} pending`}
                  </li>
                  {syncLocal.lastError && (
                    <li className="text-amber-700">Last error: {syncLocal.lastError}</li>
                  )}
                  {cloud.sync_meta?.last_error && (
                    <li className="text-amber-700">Cloud error: {cloud.sync_meta.last_error}</li>
                  )}
                </ul>
              )}
              <div className={fullPage ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Cloud application updates (90d)
                  </p>
                  <BarChart
                    data={cloud.cloud_apps_by_day?.map((r) => ({
                      day: String(r.day).slice(0, 10),
                      count: r.count,
                    }))}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Local vs cloud activity (30d)
                  </p>
                  <SimpleTable
                    columns={[
                      { key: "day", label: "Day" },
                      { key: "count", label: "Local" },
                      {
                        key: "cloud",
                        label: "Cloud",
                        render: (r) => r.cloud ?? 0,
                      },
                    ]}
                    rows={cloudAppsMerged.filter((r) => r.count || r.cloud).slice(-14)}
                    rowKey="day"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Synced document keys</p>
                  <SimpleTable
                    columns={[
                      { key: "doc_key", label: "Key" },
                      { key: "count", label: "Present" },
                    ]}
                    rows={cloud.sync_docs_by_key || []}
                    rowKey="doc_key"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Extension events (30d)</p>
                  <BarChart
                    data={cloud.events_by_day?.map((r) => ({
                      day: String(r.day).slice(0, 10),
                      count: r.count,
                    }))}
                  />
                </div>
                <div className={fullPage ? "md:col-span-2" : ""}>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Event types (90d)</p>
                  <SimpleTable
                    columns={[
                      { key: "event_type", label: "Event" },
                      { key: "count", label: "Count" },
                    ]}
                    rows={cloud.events_by_type || []}
                    rowKey="event_type"
                  />
                </div>
              </div>
            </div>
          )}
        </AnalyticsSection>
      )}

      <AnalyticsSection
        title="API call log"
        description="Full list with expandable details — same data as before."
        className={fullPage ? "" : ""}
      >
        <ApiUsageHistory embedded />
      </AnalyticsSection>
    </FadeUp>
  );
}
