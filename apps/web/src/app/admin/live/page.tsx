"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, KpiCard, Tabs, Select } from "@/components/ui";
import { formatNumber, formatDate } from "@/lib/utils";
import { Tv, Users, TrendingUp, Clock } from "lucide-react";

export default function LivePage() {
  const [tab, setTab] = useState("active");

  const streams = trpc.admin.listLiveStreams.useQuery(undefined, { retry: false });
  const pkSessions = trpc.admin.listPkSessions.useQuery({ limit: 20 }, { retry: false, enabled: tab === "pk" });
  const endStreamMut = trpc.live.endStream.useMutation({ onSuccess: () => streams.refetch() });

  const rows = (streams.data?.streams ?? []) as Record<string, unknown>[];
  const pkRows = (pkSessions.data?.sessions ?? []) as Record<string, unknown>[];
  const totalViewers = rows.reduce((sum, r) => sum + Number(r.viewerCount ?? 0), 0);

  return (
    <>
      <PageHeader title="Live Streams" description="Monitor and manage active live streams and PK battles" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Streams" value={formatNumber(rows.length)} icon={Tv} />
        <KpiCard label="Total Viewers" value={formatNumber(totalViewers)} icon={Users} />
        <KpiCard label="PK Battles" value={formatNumber(pkRows.length)} icon={TrendingUp} />
        <KpiCard label="Avg Duration" value="-" icon={Clock} />
      </div>

      <Tabs
        tabs={[
          { id: "active", label: "Active Streams" },
          { id: "pk", label: "PK Battles" },
          { id: "history", label: "Stream History" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "active" && (
        <DataTable
          columns={[
            { key: "id", label: "Room ID", render: (r) => String(r.id).slice(0, 8) },
            { key: "hostId", label: "Host" },
            { key: "title", label: "Title" },
            { key: "viewerCount", label: "Viewers", render: (r) => formatNumber(Number(r.viewerCount ?? 0)) },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "active")} /> },
            { key: "startedAt", label: "Started", render: (r) => r.startedAt ? formatDate(String(r.startedAt)) : "-" },
            { key: "actions", label: "", render: (r) => (
              <Button
                variant="danger"
                size="sm"
                onClick={() => endStreamMut.mutate({ streamId: String(r.id), reason: "Ended by admin" })}
              >End Stream</Button>
            )},
          ]}
          data={rows}
        />
      )}

      {tab === "pk" && (
        <DataTable
          columns={[
            { key: "id", label: "PK ID", render: (r) => String(r.id).slice(0, 8) },
            { key: "challengerId", label: "Challenger" },
            { key: "challengedId", label: "Challenged" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "active")} /> },
            { key: "createdAt", label: "Started", render: (r) => r.createdAt ? formatDate(String(r.createdAt)) : "-" },
          ]}
          data={pkRows}
        />
      )}

      {tab === "history" && (
        <Card title="Stream History">
          <p className="text-sm text-muted-foreground">Ended streams are archived. Use the Active Streams tab to manage current streams.</p>
        </Card>
      )}
    </>
  );
}
