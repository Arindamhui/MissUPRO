"use client";

import { useMemo, useState } from "react";
import { Flag, Globe, Layers3, ToggleLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatNumber } from "@/lib/utils";
import {
  AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard,
  AdminModal, AdminPageHeader, AdminPanelCard, AdminSearchField,
  AdminSelect, AdminStatusPill,
} from "@/features/admin/components/admin-ui";
import { useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";

type FlagRow = {
  id: string;
  flagKey: string;
  featureName: string;
  flagType: string;
  enabled: boolean;
  platform: string;
  appVersion?: string | null;
  description?: string | null;
  percentageValue?: number | null;
  userIdsJson?: string[] | null;
  regionCodesJson?: string[] | null;
};

type FormState = {
  id?: string;
  key: string;
  featureName: string;
  type: string;
  isEnabled: boolean;
  platform: string;
  appVersion: string;
  description: string;
  percentageValue: string;
  userIds: string;
  regionCodes: string;
};

const emptyForm: FormState = {
  key: "", featureName: "", type: "BOOLEAN", isEnabled: true, platform: "ALL",
  appVersion: "", description: "", percentageValue: "", userIds: "", regionCodes: "",
};

export default function FeatureFlagsPage() {
  const notify = useAdminNotifier();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");

  const listQuery = trpc.admin.listFeatureFlags.useQuery(undefined, { retry: false });
  const upsertMut = trpc.admin.upsertFeatureFlag.useMutation({
    onSuccess: async () => { notify.success("Feature flag saved"); setShowModal(false); setForm(emptyForm); await listQuery.refetch(); },
    onError: (e: any) => notify.error("Failed", e.message),
  });

  const allRows = (listQuery.data ?? []) as FlagRow[];
  const rows = allRows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [r.flagKey, r.featureName, r.platform, r.description].some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  const metrics = useMemo(() => ({
    total: allRows.length,
    enabled: allRows.filter((r) => r.enabled).length,
    disabled: allRows.filter((r) => !r.enabled).length,
    percentage: allRows.filter((r) => r.flagType === "PERCENTAGE").length,
  }), [allRows]);

  function openCreate() { setForm(emptyForm); setShowModal(true); }
  function openEdit(row: FlagRow) {
    setForm({
      id: row.id, key: row.flagKey, featureName: row.featureName, type: row.flagType,
      isEnabled: row.enabled, platform: row.platform, appVersion: row.appVersion ?? "",
      description: row.description ?? "", percentageValue: String(row.percentageValue ?? ""),
      userIds: (row.userIdsJson ?? []).join(", "), regionCodes: (row.regionCodesJson ?? []).join(", "),
    });
    setShowModal(true);
  }

  function save() {
    const payload = {
      key: form.key,
      featureName: form.featureName || form.key,
      type: form.type as "BOOLEAN" | "PERCENTAGE" | "USER_LIST" | "REGION",
      isEnabled: form.isEnabled,
      platform: form.platform as "ALL" | "MOBILE" | "WEB" | "ANDROID" | "IOS",
      appVersion: form.appVersion || undefined,
      description: form.description || undefined,
      percentageValue: form.percentageValue ? Number(form.percentageValue) : undefined,
      userIds: form.userIds ? form.userIds.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      regionCodes: form.regionCodes ? form.regionCodes.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    };
    upsertMut.mutate(payload);
  }

  function toggleFlag(row: FlagRow) {
    upsertMut.mutate({ key: row.flagKey, featureName: row.featureName, type: row.flagType as any, isEnabled: !row.enabled, platform: row.platform as any });
  }

  const F = (key: keyof FormState, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Platform Control"
        title="Feature Flags"
        description="Toggle features for specific platforms, regions, or user segments. Percentage rollouts supported."
        actions={<AdminButton onClick={openCreate}>Create Flag</AdminButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Flags" value={formatNumber(metrics.total)} icon={Flag} />
        <AdminMetricCard label="Enabled" value={formatNumber(metrics.enabled)} icon={ToggleLeft} tone="emerald" />
        <AdminMetricCard label="Disabled" value={formatNumber(metrics.disabled)} icon={ToggleLeft} tone="amber" />
        <AdminMetricCard label="% Rollouts" value={formatNumber(metrics.percentage)} icon={Globe} tone="sky" />
      </div>

      <AdminPanelCard
        title="Feature Flag Registry"
        subtitle="All feature toggles for the platform."
        actions={<div className="w-full min-w-[260px] lg:w-80"><AdminSearchField value={search} onChange={setSearch} placeholder="Search flag, feature, platform..." /></div>}
      >
        <AdminDataTable
          rows={rows}
          rowKey={(r) => r.id}
          isLoading={listQuery.isLoading}
          emptyMessage="No feature flags configured."
          columns={[
            { key: "flagKey", label: "Key", sortable: true, render: (r) => <span className="font-mono text-xs font-semibold text-violet-700">{r.flagKey}</span> },
            { key: "featureName", label: "Feature", sortable: true, render: (r) => r.featureName },
            { key: "flagType", label: "Type", sortable: true, render: (r) => (
              <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">{r.flagType}</span>
            )},
            { key: "platform", label: "Platform", render: (r) => r.platform },
            { key: "enabled", label: "Status", render: (r) => (
              <button onClick={() => toggleFlag(r)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${r.enabled ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-red-50 text-red-700 hover:bg-red-100"}`}>
                <span className={`h-2 w-2 rounded-full ${r.enabled ? "bg-emerald-500" : "bg-red-500"}`} />
                {r.enabled ? "ON" : "OFF"}
              </button>
            )},
            { key: "actions", label: "", render: (r) => <AdminButton variant="ghost" onClick={() => openEdit(r)}>Edit</AdminButton> },
          ]}
        />
      </AdminPanelCard>

      <AdminModal open={showModal} onClose={() => setShowModal(false)} title={form.id ? "Edit Feature Flag" : "Create Feature Flag"}>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Flag Key"><AdminInput value={form.key} onChange={(e) => F("key", e.target.value)} placeholder="live_streaming" disabled={Boolean(form.id)} /></AdminField>
          <AdminField label="Feature Name"><AdminInput value={form.featureName} onChange={(e) => F("featureName", e.target.value)} placeholder="Live Streaming" /></AdminField>
          <AdminField label="Type">
            <AdminSelect value={form.type} onChange={(e) => F("type", e.target.value)}>
              <option value="BOOLEAN">Boolean</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="USER_LIST">User List</option>
              <option value="REGION">Region</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Platform">
            <AdminSelect value={form.platform} onChange={(e) => F("platform", e.target.value)}>
              <option value="ALL">All</option>
              <option value="MOBILE">Mobile</option>
              <option value="WEB">Web</option>
              <option value="ANDROID">Android</option>
              <option value="IOS">iOS</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="Enabled">
            <AdminSelect value={form.isEnabled ? "true" : "false"} onChange={(e) => F("isEnabled", e.target.value === "true")}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </AdminSelect>
          </AdminField>
          <AdminField label="App Version"><AdminInput value={form.appVersion} onChange={(e) => F("appVersion", e.target.value)} placeholder="Optional" /></AdminField>
          {form.type === "PERCENTAGE" && (
            <AdminField label="Percentage (0-100)"><AdminInput type="number" value={form.percentageValue} onChange={(e) => F("percentageValue", e.target.value)} placeholder="50" /></AdminField>
          )}
          {form.type === "USER_LIST" && (
            <AdminField label="User IDs (comma separated)"><AdminInput value={form.userIds} onChange={(e) => F("userIds", e.target.value)} placeholder="uuid1, uuid2" /></AdminField>
          )}
          {form.type === "REGION" && (
            <AdminField label="Region Codes (comma separated)"><AdminInput value={form.regionCodes} onChange={(e) => F("regionCodes", e.target.value)} placeholder="US, IN, GB" /></AdminField>
          )}
          <div className="md:col-span-2">
            <AdminField label="Description"><AdminInput value={form.description} onChange={(e) => F("description", e.target.value)} placeholder="What this flag controls..." /></AdminField>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => setShowModal(false)}>Cancel</AdminButton>
          <AdminButton onClick={save} disabled={upsertMut.isPending}>Save Flag</AdminButton>
        </div>
      </AdminModal>
    </div>
  );
}
