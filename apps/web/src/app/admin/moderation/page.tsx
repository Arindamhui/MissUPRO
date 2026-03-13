"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, KpiCard, Tabs, Modal } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";
import { Shield, AlertTriangle, Eye, Ban } from "lucide-react";

export default function ModerationPage() {
  const [tab, setTab] = useState("reports");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const fraudFlags = trpc.admin.listFraudFlags.useQuery(undefined, { retry: false });
  const flagRows = (fraudFlags.data?.flags ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Moderation" description="Content moderation, abuse reports, and fraud detection" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Open Reports" value={formatNumber(23)} icon={AlertTriangle} />
        <KpiCard label="Flagged Users" value={formatNumber(flagRows.length)} icon={Ban} />
        <KpiCard label="Auto-Blocked" value="12" icon={Shield} />
        <KpiCard label="Reviews Today" value="45" icon={Eye} />
      </div>

      <Tabs
        tabs={[
          { id: "reports", label: "Abuse Reports" },
          { id: "fraud", label: "Fraud Flags" },
          { id: "media", label: "Media Scan" },
          { id: "chat", label: "Chat Moderation" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "reports" && (
        <Card title="Pending Reports">
          <DataTable
            columns={[
              { key: "id", label: "Report ID" },
              { key: "reporterId", label: "Reporter" },
              { key: "targetId", label: "Target" },
              { key: "reason", label: "Reason" },
              { key: "status", label: "Status", render: (r: Record<string, any>) => <StatusBadge status={String(r.status ?? "pending")} /> },
              { key: "actions", label: "", render: (r) => (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReport(r)}>Review</Button>
                  <Button variant="danger" size="sm">Action</Button>
                </div>
              )},
            ]}
            data={[]}
          />
        </Card>
      )}

      {tab === "fraud" && (
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "userId", label: "User" },
            { key: "flagType", label: "Flag Type" },
            { key: "riskScore", label: "Risk Score" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "active")} /> },
            { key: "createdAt", label: "Flagged At", render: (r) => r.createdAt ? formatDate(String(r.createdAt)) : "-" },
            { key: "actions", label: "", render: () => (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Investigate</Button>
                <Button variant="secondary" size="sm">Dismiss</Button>
              </div>
            )},
          ]}
          data={flagRows}
        />
      )}

      {tab === "media" && (
        <Card title="Media Scan Results">
          <p className="text-sm text-muted-foreground">Quarantined media items from automated content scanning</p>
        </Card>
      )}

      {tab === "chat" && (
        <Card title="Chat Moderation">
          <p className="text-sm text-muted-foreground">Auto-flagged messages with contact info, profanity, and spam detection</p>
        </Card>
      )}

      <Modal open={!!selectedReport} onClose={() => setSelectedReport(null)} title="Report Review">
        {selectedReport && (
          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <p><span className="text-muted-foreground">Reporter:</span> {selectedReport.reporterId}</p>
              <p><span className="text-muted-foreground">Target:</span> {selectedReport.targetId}</p>
              <p><span className="text-muted-foreground">Reason:</span> {selectedReport.reason}</p>
              <p><span className="text-muted-foreground">Description:</span> {selectedReport.description ?? "N/A"}</p>
            </div>
            <div className="flex gap-2 pt-3 border-t">
              <Button variant="primary" size="sm">Warn User</Button>
              <Button variant="danger" size="sm">Suspend User</Button>
              <Button variant="secondary" size="sm">Dismiss Report</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
