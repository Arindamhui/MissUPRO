"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Tabs, Modal } from "@/components/ui";
import { formatDate, formatNumber, formatCurrency } from "@/lib/utils";

export default function ModelsPage() {
  const [tab, setTab] = useState("all");
  const [selectedModel, setSelectedModel] = useState<Record<string, unknown> | null>(null);
  const [selectedApp, setSelectedApp] = useState<Record<string, unknown> | null>(null);

  const models = trpc.admin.listModels.useQuery({ status: tab === "all" ? undefined : tab, limit: 20 }, { retry: false });
  const apps = trpc.admin.listModelApplications.useQuery({ status: "PENDING", limit: 10 }, { retry: false });
  const availability = trpc.admin.getModelAvailability.useQuery(
    { modelUserId: String(selectedModel?.id ?? "00000000-0000-0000-0000-000000000000") },
    { retry: false, enabled: !!selectedModel?.id },
  );
  const demoVideos = trpc.admin.listModelDemoVideos.useQuery(
    { modelUserId: String(selectedModel?.id ?? "00000000-0000-0000-0000-000000000000") },
    { retry: false, enabled: !!selectedModel?.id },
  );

  const recalcLevel = trpc.level.recalculateModelLevel.useMutation({
    onSuccess: () => {
      void models.refetch();
    },
  });
  const approveApplication = trpc.admin.approveModelApplication.useMutation({
    onSuccess: () => {
      setSelectedApp(null);
      void apps.refetch();
      void models.refetch();
    },
  });
  const rejectApplication = trpc.admin.rejectModelApplication.useMutation({
    onSuccess: () => {
      setSelectedApp(null);
      void apps.refetch();
    },
  });
  const overrideAvailability = trpc.admin.overrideModelAvailability.useMutation({
    onSuccess: () => {
      void availability.refetch();
      void models.refetch();
    },
  });
  const reviewDemoVideo = trpc.admin.reviewModelDemoVideo.useMutation({
    onSuccess: () => {
      void demoVideos.refetch();
      void models.refetch();
    },
  });

  const modelRows = (models.data?.models ?? []) as Record<string, unknown>[];
  const appRows = (apps.data?.items ?? []) as Record<string, unknown>[];
  const availabilitySummary = (availability.data ?? {}) as {
    availabilityStatus?: string;
    isOnlineOverride?: boolean;
    schedule?: Array<{ dayOfWeek: string; startTime: string; endTime: string; timezone: string }>;
    nextSlot?: { dayOfWeek: string; startTime: string; timezone: string } | null;
  };
  const demoVideoRows = (demoVideos.data ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Model Management" description="Manage models, applications, availability, and demo video review." />

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
            { key: "id", label: "ID", render: (row) => String(row.id).slice(0, 8) },
            { key: "displayName", label: "Name" },
            { key: "totalAudioMinutes", label: "Audio Min", render: (row) => formatNumber(Number(row.totalAudioMinutes ?? 0)) },
            { key: "totalVideoMinutes", label: "Video Min", render: (row) => formatNumber(Number(row.totalVideoMinutes ?? 0)) },
            { key: "pendingPayout", label: "Pending Payout", render: (row) => formatCurrency(Number(row.pendingPayout ?? 0)) },
            { key: "level", label: "Level", render: (row) => formatNumber(Number(row.level ?? 1)) },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "ACTIVE")} /> },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <Button variant="ghost" size="sm" onClick={() => setSelectedModel(row)}>Details</Button>
              ),
            },
          ]}
          data={modelRows}
        />
      ) : (
        <DataTable
          columns={[
            { key: "id", label: "App ID", render: (row) => String(row.id).slice(0, 8) },
            { key: "userId", label: "User", render: (row) => String(row.userId).slice(0, 8) },
            { key: "displayName", label: "Name" },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status)} /> },
            { key: "submittedAt", label: "Applied", render: (row) => row.submittedAt ? formatDate(String(row.submittedAt)) : "-" },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <Button variant="primary" size="sm" onClick={() => setSelectedApp(row)}>Review</Button>
              ),
            },
          ]}
          data={appRows}
        />
      )}

      <Modal open={!!selectedModel} onClose={() => setSelectedModel(null)} title={`Model: ${String(selectedModel?.displayName ?? "")}`}>
        {selectedModel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Audio Minutes:</span> {formatNumber(Number(selectedModel.totalAudioMinutes ?? 0))}</div>
              <div><span className="text-muted-foreground">Video Minutes:</span> {formatNumber(Number(selectedModel.totalVideoMinutes ?? 0))}</div>
              <div><span className="text-muted-foreground">Pending Payout:</span> {formatCurrency(Number(selectedModel.pendingPayout ?? 0))}</div>
              <div><span className="text-muted-foreground">Level:</span> {formatNumber(Number(selectedModel.level ?? 1))}</div>
              <div><span className="text-muted-foreground">Availability:</span> {availabilitySummary.availabilityStatus ?? "Loading..."}</div>
              <div><span className="text-muted-foreground">Demo Videos:</span> {formatNumber(demoVideoRows.length)}</div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium mb-2">Availability Schedule</p>
              {(availabilitySummary.schedule ?? []).length > 0 ? (
                <div className="space-y-1">
                  {(availabilitySummary.schedule ?? []).map((slot) => (
                    <p key={`${slot.dayOfWeek}-${slot.startTime}`}>
                      {slot.dayOfWeek}: {slot.startTime} - {slot.endTime} ({slot.timezone})
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No recurring schedule configured.</p>
              )}
              {availabilitySummary.nextSlot && (
                <p className="text-muted-foreground mt-2">
                  Next slot: {availabilitySummary.nextSlot.dayOfWeek} {availabilitySummary.nextSlot.startTime} ({availabilitySummary.nextSlot.timezone})
                </p>
              )}
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium mb-2">Demo Videos</p>
              {demoVideoRows.length > 0 ? (
                <div className="space-y-3">
                  {demoVideoRows.map((video) => (
                    <div key={String(video.id)} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{String(video.title ?? "Untitled demo video")}</p>
                          <p className="text-muted-foreground text-xs">
                            {String(video.durationSeconds ?? "-")}s | {String(video.status)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={reviewDemoVideo.isPending || String(video.status) === "APPROVED"}
                            onClick={() => reviewDemoVideo.mutate({ demoVideoId: String(video.id), status: "APPROVED" })}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={reviewDemoVideo.isPending || String(video.status) === "REJECTED"}
                            onClick={() => reviewDemoVideo.mutate({
                              demoVideoId: String(video.id),
                              status: "REJECTED",
                              rejectionReason: "Rejected during admin review.",
                            })}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No demo videos uploaded.</p>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => recalcLevel.mutate({ modelUserId: String(selectedModel.id) })}
                disabled={recalcLevel.isPending}
              >
                Recalculate Level
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => overrideAvailability.mutate({
                  modelUserId: String(selectedModel.id),
                  isOnline: !availabilitySummary.isOnlineOverride,
                })}
                disabled={overrideAvailability.isPending}
              >
                {availabilitySummary.isOnlineOverride ? "Force Offline" : "Force Online"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!selectedApp} onClose={() => setSelectedApp(null)} title="Review Application">
        {selectedApp && (
          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <p><span className="text-muted-foreground">User ID:</span> {String(selectedApp.userId)}</p>
              <p><span className="text-muted-foreground">Display Name:</span> {String(selectedApp.displayName)}</p>
              <p><span className="text-muted-foreground">Documents:</span> Submitted</p>
              <p><span className="text-muted-foreground">Intro Video:</span> Submitted</p>
            </div>
            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant="primary"
                size="sm"
                disabled={approveApplication.isPending}
                onClick={() => approveApplication.mutate({ applicationId: String(selectedApp.id) })}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={rejectApplication.isPending}
                onClick={() => rejectApplication.mutate({
                  applicationId: String(selectedApp.id),
                  reason: "Rejected during admin review.",
                })}
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
