"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button, Card, DataTable, Input, KpiCard, Modal, PageHeader, StatusBadge, Tabs } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";
import { AlertTriangle, Ban, Eye, Shield } from "lucide-react";

type ReportRow = Record<string, unknown>;
type BanRow = Record<string, unknown>;
type FraudFlagRow = Record<string, unknown>;
type MediaScanRow = Record<string, unknown>;

export default function ModerationPage() {
  const [tab, setTab] = useState("reports");
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [reportNotes, setReportNotes] = useState("");
  const [banNotes, setBanNotes] = useState("Policy violation during admin review.");

  const reportsQuery = trpc.admin.listReports.useQuery({ limit: 50 }, { retry: false });
  const bansQuery = trpc.admin.listBans.useQuery({ limit: 50 }, { retry: false });
  const fraudFlagsQuery = trpc.admin.listFraudFlags.useQuery({ limit: 50 }, { retry: false });
  const mediaQuery = trpc.admin.listMediaScanResults.useQuery({ limit: 50 }, { retry: false });

  const reviewReport = trpc.admin.reviewReport.useMutation({
    onSuccess: async () => {
      setSelectedReport(null);
      setReportNotes("");
      await reportsQuery.refetch();
      await bansQuery.refetch();
    },
  });

  const imposeBan = trpc.admin.imposeBan.useMutation({
    onSuccess: async () => {
      setSelectedReport(null);
      await reportsQuery.refetch();
      await bansQuery.refetch();
    },
  });

  const revokeBan = trpc.admin.revokeBan.useMutation({
    onSuccess: async () => {
      await bansQuery.refetch();
    },
  });

  const resolveFraudFlag = trpc.admin.resolveFraudFlag.useMutation({
    onSuccess: async () => {
      await fraudFlagsQuery.refetch();
    },
  });

  const reports = (reportsQuery.data?.items ?? []) as ReportRow[];
  const bans = (bansQuery.data?.items ?? []) as BanRow[];
  const fraudFlags = (fraudFlagsQuery.data?.items ?? []) as FraudFlagRow[];
  const mediaResults = (mediaQuery.data?.items ?? []) as MediaScanRow[];

  const openReports = reports.filter((row) => String(row.status ?? "") === "OPEN").length;
  const activeBans = bans.filter((row) => String(row.status ?? "") === "ACTIVE").length;
  const openFraudFlags = fraudFlags.filter((row) => String(row.status ?? "") === "OPEN").length;
  const unresolvedMedia = mediaResults.filter((row) => String(row.scanStatus ?? "") !== "COMPLETED").length;

  return (
    <>
      <PageHeader title="Moderation" description="Review abuse reports, manage bans, resolve fraud flags, and inspect media scanning results." />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="Open Reports" value={formatNumber(openReports)} icon={AlertTriangle} />
        <KpiCard label="Active Bans" value={formatNumber(activeBans)} icon={Ban} />
        <KpiCard label="Open Fraud Flags" value={formatNumber(openFraudFlags)} icon={Shield} />
        <KpiCard label="Pending Media Scans" value={formatNumber(unresolvedMedia)} icon={Eye} />
      </div>

      <Tabs
        tabs={[
          { id: "reports", label: `Reports (${reports.length})` },
          { id: "bans", label: `Bans (${bans.length})` },
          { id: "fraud", label: `Fraud (${fraudFlags.length})` },
          { id: "media", label: `Media (${mediaResults.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "reports" ? (
        <Card title="Abuse Reports">
          <DataTable
            columns={[
              { key: "id", label: "Report", render: (row) => String(row.id).slice(0, 8) },
              { key: "reporter", label: "Reporter", render: (row) => String((row.reporter as { displayName?: string } | null)?.displayName ?? row.reporterUserId ?? "-") },
              { key: "entityType", label: "Entity" },
              { key: "reasonCode", label: "Reason" },
              { key: "priorityScore", label: "Priority", render: (row) => formatNumber(Number(row.priorityScore ?? 0)) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "OPEN")} /> },
              { key: "createdAt", label: "Submitted", render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-" },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReport(row)}>
                    Review
                  </Button>
                ),
              },
            ]}
            data={reports}
          />
        </Card>
      ) : null}

      {tab === "bans" ? (
        <Card title="Ban Registry">
          <DataTable
            columns={[
              { key: "id", label: "Ban", render: (row) => String(row.id).slice(0, 8) },
              { key: "user", label: "User", render: (row) => String((row.user as { displayName?: string } | null)?.displayName ?? row.userId ?? "-") },
              { key: "scope", label: "Scope" },
              { key: "reason", label: "Reason" },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "ACTIVE")} /> },
              { key: "startsAt", label: "Started", render: (row) => row.startsAt ? formatDate(String(row.startsAt)) : "-" },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={String(row.status ?? "") !== "ACTIVE" || revokeBan.isPending}
                    onClick={() => revokeBan.mutate({ banId: String(row.id), notes: "Revoked from admin console." })}
                  >
                    Revoke
                  </Button>
                ),
              },
            ]}
            data={bans}
          />
        </Card>
      ) : null}

      {tab === "fraud" ? (
        <Card title="Fraud Flags">
          <DataTable
            columns={[
              { key: "id", label: "Flag", render: (row) => String(row.id).slice(0, 8) },
              { key: "entityType", label: "Entity Type" },
              { key: "entityId", label: "Entity", render: (row) => String(row.entityId ?? "-").slice(0, 8) },
              { key: "riskLevel", label: "Risk", render: (row) => <StatusBadge status={String(row.riskLevel ?? "LOW")} /> },
              { key: "riskScore", label: "Score", render: (row) => formatNumber(Number(row.riskScore ?? 0)) },
              { key: "status", label: "Status", render: (row) => <StatusBadge status={String(row.status ?? "OPEN")} /> },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={String(row.status ?? "") === "RESOLVED" || resolveFraudFlag.isPending}
                    onClick={() => resolveFraudFlag.mutate({ flagId: String(row.id), action: "Resolved from admin console." })}
                  >
                    Resolve
                  </Button>
                ),
              },
            ]}
            data={fraudFlags}
          />
        </Card>
      ) : null}

      {tab === "media" ? (
        <Card title="Media Scan Results">
          <DataTable
            columns={[
              { key: "id", label: "Scan", render: (row) => String(row.id).slice(0, 8) },
              { key: "mediaAssetId", label: "Asset", render: (row) => String(row.mediaAssetId ?? "-").slice(0, 8) },
              { key: "scannerName", label: "Scanner" },
              { key: "scanStatus", label: "Status", render: (row) => <StatusBadge status={String(row.scanStatus ?? "PENDING")} /> },
              { key: "scannedAt", label: "Scanned", render: (row) => row.scannedAt ? formatDate(String(row.scannedAt)) : "-" },
              { key: "createdAt", label: "Queued", render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-" },
            ]}
            data={mediaResults}
          />
        </Card>
      ) : null}

      <Modal open={!!selectedReport} onClose={() => setSelectedReport(null)} title="Review Report">
        {selectedReport ? (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Reporter:</span> {String(((selectedReport.reporter as { displayName?: string } | null)?.displayName) ?? selectedReport.reporterUserId ?? "-")}</p>
              <p><span className="text-muted-foreground">Entity:</span> {String(selectedReport.entityType)} / {String(selectedReport.entityId)}</p>
              <p><span className="text-muted-foreground">Reason:</span> {String(selectedReport.reasonCode)}</p>
              <p><span className="text-muted-foreground">Description:</span> {String(selectedReport.description ?? "-")}</p>
              <p><span className="text-muted-foreground">Current Status:</span> {String(selectedReport.status)}</p>
            </div>

            <Input
              label="Resolution notes"
              value={reportNotes}
              onChange={(event) => setReportNotes(event.target.value)}
              placeholder="Add reviewer notes"
            />

            <Input
              label="Ban notes"
              value={banNotes}
              onChange={(event) => setBanNotes(event.target.value)}
              placeholder="Explain the moderation action"
            />

            <div className="flex flex-wrap gap-2 pt-3 border-t">
              <Button
                disabled={reviewReport.isPending}
                onClick={() => reviewReport.mutate({
                  reportId: String(selectedReport.id),
                  status: "UNDER_REVIEW",
                  resolutionNotes: reportNotes || "Marked under review.",
                })}
              >
                Mark Under Review
              </Button>
              <Button
                variant="secondary"
                disabled={reviewReport.isPending}
                onClick={() => reviewReport.mutate({
                  reportId: String(selectedReport.id),
                  status: "ACTIONED",
                  resolutionNotes: reportNotes || "Action taken by admin.",
                })}
              >
                Mark Actioned
              </Button>
              <Button
                variant="danger"
                disabled={imposeBan.isPending}
                onClick={() => imposeBan.mutate({
                  userId: String(selectedReport.entityId),
                  scope: "ACCOUNT",
                  reason: "POLICY_VIOLATION",
                  notes: banNotes,
                  sourceReportId: String(selectedReport.id),
                })}
              >
                Ban User
              </Button>
              <Button
                variant="secondary"
                disabled={reviewReport.isPending}
                onClick={() => reviewReport.mutate({
                  reportId: String(selectedReport.id),
                  status: "DISMISSED",
                  resolutionNotes: reportNotes || "Dismissed after review.",
                })}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
