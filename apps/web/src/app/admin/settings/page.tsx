"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, Card, Tabs, Button, Input, DataTable, Select, Modal } from "@/components/ui";

export default function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [showFeatureFlag, setShowFeatureFlag] = useState(false);

  const settings = trpc.admin.listSystemSettings.useQuery(undefined, { retry: false });
  const featureFlags = trpc.admin.listFeatureFlags.useQuery(undefined, { retry: false });

  const settingRows = (settings.data?.settings ?? []) as Record<string, unknown>[];
  const flagRows = (featureFlags.data?.flags ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Settings" description="System configuration, feature flags, and platform controls" />

      <Tabs
        tabs={[
          { id: "general", label: "General" },
          { id: "pricing", label: "Pricing Rules" },
          { id: "features", label: "Feature Flags" },
          { id: "cms", label: "CMS" },
          { id: "cache", label: "Cache" },
          { id: "audit", label: "Audit Log" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "general" && (
        <div className="space-y-4">
          <DataTable
            columns={[
              { key: "key", label: "Setting Key" },
              { key: "value", label: "Value" },
              { key: "category", label: "Category" },
              { key: "actions", label: "", render: () => (
                <Button variant="ghost" size="sm">Edit</Button>
              )},
            ]}
            data={settingRows}
          />
        </div>
      )}

      {tab === "pricing" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Call Pricing Rules">
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Audio base rate: 30 coins/min</p>
                <p className="text-muted-foreground">Video base rate: 50 coins/min</p>
                <p className="text-muted-foreground">Model level multiplier: active</p>
                <p className="text-muted-foreground">Price cap: 200 coins/min</p>
              </div>
              <Button variant="secondary" size="sm">Edit Pricing</Button>
            </div>
          </Card>
          <Card title="Model Level Rules">
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Levels configured: 10</p>
                <p className="text-muted-foreground">XP per model minute: 1</p>
                <p className="text-muted-foreground">Level-based payout rates: active</p>
              </div>
              <Button variant="secondary" size="sm">Edit Levels</Button>
            </div>
          </Card>
          <Card title="Commission Structure">
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Gift commission: 25%</p>
                <p className="text-muted-foreground">Agency commission: tiered</p>
                <p className="text-muted-foreground">Referral commissions: active</p>
              </div>
              <Button variant="secondary" size="sm">Edit Commission</Button>
            </div>
          </Card>
          <Card title="Economy Settings">
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Coins per USD: 100</p>
                <p className="text-muted-foreground">Diamonds per USD: 75</p>
                <p className="text-muted-foreground">Min withdrawal: $10</p>
              </div>
              <Button variant="secondary" size="sm">Edit Economy</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === "features" && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowFeatureFlag(true)}>Create Flag</Button>
          </div>
          <DataTable
            columns={[
              { key: "key", label: "Flag" },
              { key: "enabled", label: "Status", render: (r) => (
                <span className={`text-xs font-medium ${r.enabled ? "text-success" : "text-danger"}`}>
                  {r.enabled ? "Enabled" : "Disabled"}
                </span>
              )},
              { key: "description", label: "Description" },
              { key: "actions", label: "", render: () => (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">Toggle</Button>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              )},
            ]}
            data={flagRows}
          />
        </>
      )}

      {tab === "cms" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Homepage Sections">
            <p className="text-sm text-muted-foreground">Manage homepage layout sections, ordering, and visibility</p>
            <Button variant="secondary" size="sm" className="mt-3">Manage Sections</Button>
          </Card>
          <Card title="Banners">
            <p className="text-sm text-muted-foreground">Create and manage promotional banners</p>
            <Button variant="secondary" size="sm" className="mt-3">Manage Banners</Button>
          </Card>
          <Card title="Themes">
            <p className="text-sm text-muted-foreground">Manage party and profile themes</p>
            <Button variant="secondary" size="sm" className="mt-3">Manage Themes</Button>
          </Card>
          <Card title="UI Layouts">
            <p className="text-sm text-muted-foreground">Configure platform UI layouts</p>
            <Button variant="secondary" size="sm" className="mt-3">Manage Layouts</Button>
          </Card>
        </div>
      )}

      {tab === "cache" && (
        <Card title="Cache Management">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Clear platform caches to force-refresh configuration and data.</p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm">Clear All Caches</Button>
              <Button variant="secondary" size="sm">Clear Settings Cache</Button>
              <Button variant="secondary" size="sm">Clear User Cache</Button>
            </div>
          </div>
        </Card>
      )}

      {tab === "audit" && (
        <Card title="Audit Log">
          <p className="text-sm text-muted-foreground">All admin actions are recorded with admin ID, timestamp, action type, and reason.</p>
          <DataTable
            columns={[
              { key: "adminId", label: "Admin" },
              { key: "action", label: "Action" },
              { key: "target", label: "Target" },
              { key: "reason", label: "Reason" },
              { key: "timestamp", label: "Time" },
            ]}
            data={[]}
          />
        </Card>
      )}

      <Modal open={showFeatureFlag} onClose={() => setShowFeatureFlag(false)} title="Create Feature Flag">
        <div className="space-y-4">
          <Input label="Flag Key" placeholder="e.g. enable_party_rooms" />
          <Input label="Description" placeholder="What this flag controls" />
          <Select label="Default State" options={[
            { value: "enabled", label: "Enabled" },
            { value: "disabled", label: "Disabled" },
          ]} />
          <div className="flex gap-2 pt-2">
            <Button>Create</Button>
            <Button variant="secondary" onClick={() => setShowFeatureFlag(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
