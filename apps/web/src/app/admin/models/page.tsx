"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Users, Video } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, KpiCard, Modal, PageHeader, StatusBadge, Tabs } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

type ModelRow = {
  id: string;
  modelId?: string | null;
  displayName: string;
  totalAudioMinutes?: number | null;
  totalVideoMinutes?: number | null;
  level?: number | null;
  status: string;
  isOnline?: boolean;
  demoVideoCount?: number | null;
  pendingPayout?: number | null;
  createdAt?: string | Date | null;
};

type ModelApplicationRow = {
  id: string;
  userId: string;
  legalName: string;
  displayName: string;
  country: string;
  city: string;
  talentDescription: string;
  introVideoUrl: string;
  idDocFrontUrl: string;
  idDocBackUrl: string;
  status: string;
  rejectionReason?: string | null;
  talentCategoriesJson?: string[] | null;
  languagesJson?: string[] | null;
  scheduleJson?: Array<Record<string, unknown>> | null;
  submittedAt?: string | Date | null;
  reviewedAt?: string | Date | null;
};

type AvailabilitySummary = {
  availabilityStatus?: string;
  isOnlineOverride?: boolean;
  schedule?: Array<{ dayOfWeek: string; startTime: string; endTime: string; timezone: string }>;
  nextSlot?: { dayOfWeek: string; startTime: string; timezone: string } | null;
};

type DemoVideoRow = {
  id: string;
  title?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  durationSeconds: number;
  status: string;
  rejectionReason?: string | null;
  createdAt?: string | Date | null;
};

export default function ModelsPage() {
  const [tab, setTab] = useState("all");
  const [selectedModel, setSelectedModel] = useState<ModelRow | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ModelApplicationRow | null>(null);

  const models = trpc.admin.listModels.useQuery(
    { status: tab === "all" || tab === "applications" ? undefined : tab, limit: 20 },
    { retry: false },
  );
  const applications = trpc.admin.listModelApplications.useQuery(
    { status: tab === "applications" ? undefined : "PENDING", limit: 20 },
    { retry: false },
  );
  const availability = trpc.admin.getModelAvailability.useQuery(
    { modelUserId: selectedModel?.id ?? "00000000-0000-0000-0000-000000000000" },
    { retry: false, enabled: !!selectedModel?.id },
  );
  const demoVideos = trpc.admin.listModelDemoVideos.useQuery(
    { modelUserId: selectedModel?.id ?? "00000000-0000-0000-0000-000000000000" },
    { retry: false, enabled: !!selectedModel?.id },
  );

  const recalculateModelLevel = trpc.level.recalculateModelLevel.useMutation({
    onSuccess: () => {
      void models.refetch();
    },
  });
  const approveApplication = trpc.admin.approveModelApplication.useMutation({
    onSuccess: () => {
      setSelectedApplication(null);
      void applications.refetch();
      void models.refetch();
    },
  });
  const rejectApplication = trpc.admin.rejectModelApplication.useMutation({
    onSuccess: () => {
      setSelectedApplication(null);
      void applications.refetch();
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

  const modelRows = (models.data?.models ?? []) as ModelRow[];
  const applicationRows = (applications.data?.items ?? []) as ModelApplicationRow[];
  const availabilitySummary = (availability.data ?? {}) as AvailabilitySummary;
  const demoVideoRows = (demoVideos.data ?? []) as DemoVideoRow[];

  const modelKpis = useMemo(() => ({
    totalModels: modelRows.length,
    liveModels: modelRows.filter((row) => Boolean(row.isOnline)).length,
    pendingApplications: applicationRows.filter((row) => row.status === "PENDING").length,
    demoVideosPending: demoVideoRows.filter((row) => row.status === "PENDING_REVIEW").length,
  }), [applicationRows, demoVideoRows, modelRows]);

  return (
    <>
      <PageHeader
        title="Model Verification"
        description="Review creator applications, inspect approved model performance, and moderate demo video inventory."
      />

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <KpiCard label="Approved Models" value={formatNumber(modelKpis.totalModels)} icon={Users} />
        <KpiCard label="Live Right Now" value={formatNumber(modelKpis.liveModels)} icon={CheckCircle2} />
        <KpiCard label="Pending Applications" value={formatNumber(modelKpis.pendingApplications)} icon={Clock3} />
        <KpiCard label="Videos Pending Review" value={formatNumber(modelKpis.demoVideosPending)} icon={Video} />
      </div>

      <Tabs
        tabs={[
          { id: "all", label: "Approved Models" },
          { id: "active", label: "Active" },
          { id: "suspended", label: "Suspended" },
          { id: "applications", label: `Applications (${applicationRows.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab !== "applications" ? (
        <DataTable
          columns={[
            { key: "displayName", label: "Model" },
            { key: "level", label: "Level", render: (row) => formatNumber(Number(row.level ?? 1)) },
            { key: "totalAudioMinutes", label: "Audio Min", render: (row) => formatNumber(Number(row.totalAudioMinutes ?? 0)) },
            { key: "totalVideoMinutes", label: "Video Min", render: (row) => formatNumber(Number(row.totalVideoMinutes ?? 0)) },
            { key: "demoVideoCount", label: "Demo Videos", render: (row) => formatNumber(Number(row.demoVideoCount ?? 0)) },
            { key: "isOnline", label: "Presence", render: (row) => <StatusBadge status={row.isOnline ? "ACTIVE" : "INACTIVE"} /> },
            { key: "status", label: "Account Status", render: (row) => <StatusBadge status={String(row.status)} /> },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <Button size="sm" variant="ghost" onClick={() => setSelectedModel(row)}>
                  Review
                </Button>
              ),
            },
          ]}
          data={modelRows}
        />
      ) : (
        <DataTable
          columns={[
            { key: "displayName", label: "Display Name" },
            { key: "legalName", label: "Legal Name" },
            { key: "location", label: "Location", render: (row) => `${row.city}, ${row.country}` },
            {
              key: "talentCategoriesJson",
              label: "Categories",
              render: (row) => Array.isArray(row.talentCategoriesJson) ? row.talentCategoriesJson.join(", ") : "-",
            },
            {
              key: "submittedAt",
              label: "Submitted",
              render: (row) => row.submittedAt ? formatDate(String(row.submittedAt)) : "-",
            },
            { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status)} /> },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <Button size="sm" onClick={() => setSelectedApplication(row)}>
                  Open Review
                </Button>
              ),
            },
          ]}
          data={applicationRows}
        />
      )}

      <Modal
        open={!!selectedModel}
        onClose={() => setSelectedModel(null)}
        title={selectedModel ? `Model Review: ${selectedModel.displayName}` : "Model Review"}
      >
        {selectedModel ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Card title="Performance Snapshot">
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Model User ID:</span> {selectedModel.id}</p>
                  <p><span className="text-muted-foreground">Level:</span> {formatNumber(Number(selectedModel.level ?? 1))}</p>
                  <p><span className="text-muted-foreground">Audio Minutes:</span> {formatNumber(Number(selectedModel.totalAudioMinutes ?? 0))}</p>
                  <p><span className="text-muted-foreground">Video Minutes:</span> {formatNumber(Number(selectedModel.totalVideoMinutes ?? 0))}</p>
                  <p><span className="text-muted-foreground">Approved Since:</span> {selectedModel.createdAt ? formatDate(String(selectedModel.createdAt)) : "-"}</p>
                </div>
              </Card>
              <Card title="Availability">
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Status:</span> {availabilitySummary.availabilityStatus ?? "Loading..."}</p>
                  <p><span className="text-muted-foreground">Online Override:</span> {availabilitySummary.isOnlineOverride ? "Forced online" : "No override"}</p>
                  {availabilitySummary.nextSlot ? (
                    <p>
                      <span className="text-muted-foreground">Next Slot:</span> {availabilitySummary.nextSlot.dayOfWeek} {availabilitySummary.nextSlot.startTime} ({availabilitySummary.nextSlot.timezone})
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No upcoming slot available.</p>
                  )}
                </div>
              </Card>
            </div>

            <Card title="Schedule">
              {(availabilitySummary.schedule ?? []).length > 0 ? (
                <div className="space-y-2">
                  {(availabilitySummary.schedule ?? []).map((slot) => (
                    <div key={`${slot.dayOfWeek}-${slot.startTime}`} className="rounded-lg border p-3">
                      <p className="font-medium">{slot.dayOfWeek}</p>
                      <p className="text-muted-foreground">{slot.startTime} - {slot.endTime} ({slot.timezone})</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No recurring schedule configured.</p>
              )}
            </Card>

            <Card title="Demo Video Review">
              {demoVideoRows.length > 0 ? (
                <div className="space-y-3">
                  {demoVideoRows.map((video) => (
                    <div key={video.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{video.title || "Untitled demo video"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatNumber(video.durationSeconds)}s • {video.createdAt ? formatDate(String(video.createdAt)) : "recent"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 break-all">{video.videoUrl}</p>
                          {video.rejectionReason ? <p className="text-xs text-danger mt-2">Reason: {video.rejectionReason}</p> : null}
                        </div>
                        <StatusBadge status={video.status} />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={reviewDemoVideo.isPending || video.status === "APPROVED"}
                          onClick={() => reviewDemoVideo.mutate({ demoVideoId: video.id, status: "APPROVED" })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={reviewDemoVideo.isPending || video.status === "REJECTED"}
                          onClick={() => reviewDemoVideo.mutate({
                            demoVideoId: video.id,
                            status: "REJECTED",
                            rejectionReason: "Rejected during admin verification review.",
                          })}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No demo videos uploaded for this model.</p>
              )}
            </Card>

            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant="secondary"
                size="sm"
                disabled={recalculateModelLevel.isPending}
                onClick={() => recalculateModelLevel.mutate({ modelUserId: selectedModel.id })}
              >
                Recalculate Level
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={overrideAvailability.isPending}
                onClick={() => overrideAvailability.mutate({
                  modelUserId: selectedModel.id,
                  isOnline: !Boolean(availabilitySummary.isOnlineOverride),
                })}
              >
                {availabilitySummary.isOnlineOverride ? "Clear Online Override" : "Force Online"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!selectedApplication}
        onClose={() => setSelectedApplication(null)}
        title={selectedApplication ? `Application Review: ${selectedApplication.displayName}` : "Application Review"}
      >
        {selectedApplication ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Card title="Applicant">
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">User ID:</span> {selectedApplication.userId}</p>
                  <p><span className="text-muted-foreground">Legal Name:</span> {selectedApplication.legalName}</p>
                  <p><span className="text-muted-foreground">Display Name:</span> {selectedApplication.displayName}</p>
                  <p><span className="text-muted-foreground">Location:</span> {selectedApplication.city}, {selectedApplication.country}</p>
                  <p><span className="text-muted-foreground">Submitted:</span> {selectedApplication.submittedAt ? formatDate(String(selectedApplication.submittedAt)) : "-"}</p>
                </div>
              </Card>
              <Card title="Profile Disclosure">
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Languages:</span> {Array.isArray(selectedApplication.languagesJson) ? selectedApplication.languagesJson.join(", ") : "-"}</p>
                  <p><span className="text-muted-foreground">Categories:</span> {Array.isArray(selectedApplication.talentCategoriesJson) ? selectedApplication.talentCategoriesJson.join(", ") : "-"}</p>
                  <p><span className="text-muted-foreground">Intro Video:</span> {selectedApplication.introVideoUrl}</p>
                  <p><span className="text-muted-foreground">ID Front:</span> {selectedApplication.idDocFrontUrl}</p>
                  <p><span className="text-muted-foreground">ID Back:</span> {selectedApplication.idDocBackUrl}</p>
                </div>
              </Card>
            </div>

            <Card title="Talent Description">
              <p>{selectedApplication.talentDescription}</p>
            </Card>

            <Card title="Declared Schedule">
              {Array.isArray(selectedApplication.scheduleJson) && selectedApplication.scheduleJson.length > 0 ? (
                <div className="space-y-2">
                  {selectedApplication.scheduleJson.map((slot, index) => (
                    <div key={`${selectedApplication.id}-${index}`} className="rounded-lg border p-3">
                      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(slot, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No schedule payload supplied.</p>
              )}
            </Card>

            {selectedApplication.rejectionReason ? (
              <Card title="Last Rejection">
                <p className="text-danger">{selectedApplication.rejectionReason}</p>
              </Card>
            ) : null}

            <div className="flex gap-2 pt-3 border-t">
              <Button
                size="sm"
                disabled={approveApplication.isPending}
                onClick={() => approveApplication.mutate({ applicationId: selectedApplication.id })}
              >
                Approve Application
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={rejectApplication.isPending}
                onClick={() => rejectApplication.mutate({
                  applicationId: selectedApplication.id,
                  reason: "Rejected during admin verification review.",
                })}
              >
                Reject Application
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
