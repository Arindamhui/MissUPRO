"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, Tabs, Modal, Input, Select } from "@/components/ui";
import { formatDate, formatNumber, formatCurrency } from "@/lib/utils";

export default function ModelsPage() {
  const [tab, setTab] = useState("all");
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const models = trpc.admin.listModels.useQuery({ status: tab === "all" ? undefined : tab, limit: 20 }, { retry: false });
  const apps = trpc.admin.listModelApplications.useQuery({ status: "submitted", limit: 10 }, { retry: false });

  const modelRows = (models.data?.models ?? []) as Record<string, unknown>[];
  const appRows = (apps.data?.applications ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Model Management" description="Manage models, applications, and payouts" />

      <Tabs
        tabs={[
          { id: "all", label: "All Models" },
          { id: "active", label: "Active" },
          { id: "suspended", label: "Suspended" },
          { id: "applications", label: `Applications (${appRows.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab !== "applications" ? (
        <DataTable
          columns={[
            { key: "id", label: "ID", render: (r) => String(r.id).slice(0, 8) },
            { key: "displayName", label: "Name" },
            { key: "audioMinutes", label: "Audio Min", render: (r) => formatNumber(Number(r.totalAudioMinutes ?? 0)) },
            { key: "videoMinutes", label: "Video Min", render: (r) => formatNumber(Number(r.totalVideoMinutes ?? 0)) },
            { key: "pendingPayout", label: "Pending Payout", render: (r) => formatCurrency(Number(r.pendingPayout ?? 0)) },
            { key: "level", label: "Level" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "active")} /> },
            { key: "actions", label: "", render: (r) => (
              <Button variant="ghost" size="sm" onClick={() => setSelectedModel(r)}>Details</Button>
            )},
          ]}
          data={modelRows}
        />
      ) : (
        <DataTable
          columns={[
            { key: "id", label: "App ID" },
            { key: "userId", label: "User" },
            { key: "displayName", label: "Name" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
            { key: "createdAt", label: "Applied", render: (r) => r.createdAt ? formatDate(String(r.createdAt)) : "-" },
            { key: "actions", label: "", render: (r) => (
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => setSelectedApp(r)}>Review</Button>
              </div>
            )},
          ]}
          data={appRows}
        />
      )}

      {/* Model Detail Modal */}
      <Modal open={!!selectedModel} onClose={() => setSelectedModel(null)} title={`Model: ${selectedModel?.displayName ?? ""}`}>
        {selectedModel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Audio Minutes:</span> {formatNumber(Number(selectedModel.totalAudioMinutes ?? 0))}</div>
              <div><span className="text-muted-foreground">Video Minutes:</span> {formatNumber(Number(selectedModel.totalVideoMinutes ?? 0))}</div>
              <div><span className="text-muted-foreground">Total Earnings:</span> {formatCurrency(Number(selectedModel.totalEarnings ?? 0))}</div>
              <div><span className="text-muted-foreground">Pending Payout:</span> {formatCurrency(Number(selectedModel.pendingPayout ?? 0))}</div>
              <div><span className="text-muted-foreground">Level:</span> {selectedModel.level ?? 1}</div>
              <div><span className="text-muted-foreground">Joined:</span> {selectedModel.createdAt ? formatDate(String(selectedModel.createdAt)) : "-"}</div>
            </div>
            <div className="flex gap-2 pt-3 border-t">
              <Button variant="secondary" size="sm">Suspend</Button>
              <Button variant="primary" size="sm">Trigger Payout</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Application Review Modal */}
      <Modal open={!!selectedApp} onClose={() => setSelectedApp(null)} title="Review Application">
        {selectedApp && (
          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <p><span className="text-muted-foreground">User ID:</span> {selectedApp.userId}</p>
              <p><span className="text-muted-foreground">Display Name:</span> {selectedApp.displayName}</p>
              <p><span className="text-muted-foreground">Documents:</span> Submitted</p>
              <p><span className="text-muted-foreground">Intro Video:</span> Submitted</p>
            </div>
            <div className="flex gap-2 pt-3 border-t">
              <Button variant="primary" size="sm">Approve</Button>
              <Button variant="danger" size="sm">Reject</Button>
              <Button variant="secondary" size="sm">Request Resubmission</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
