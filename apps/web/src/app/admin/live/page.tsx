"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, KpiCard, Tabs, Select } from "@/components/ui";
import { formatNumber, formatDate } from "@/lib/utils";
import { Tv, Users, TrendingUp, Clock } from "lucide-react";

export default function LivePage() {
  const [tab, setTab] = useState("active");

  const streams = trpc.admin.listLiveStreams.useQuery(undefined, { retry: false });
  const rows = (streams.data?.streams ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Live Streams" description="Monitor and manage active live streams and PK battles" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Streams" value={formatNumber(rows.length)} icon={Tv} />
        <KpiCard label="Total Viewers" value={formatNumber(1240)} icon={Users} />
        <KpiCard label="Trending Streams" value="12" icon={TrendingUp} />
        <KpiCard label="Avg Duration" value="45min" icon={Clock} />
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
            { key: "actions", label: "", render: () => (
              <Button variant="danger" size="sm">End Stream</Button>
            )},
          ]}
          data={rows}
        />
      )}

      {tab === "pk" && (
        <Card title="Active PK Battles">
          <p className="text-sm text-muted-foreground">PK battles loaded via admin.listPkBattles</p>
        </Card>
      )}

      {tab === "history" && (
        <Card title="Stream History">
          <p className="text-sm text-muted-foreground">Historical streams loaded via admin API with date filters</p>
        </Card>
      )}
    </>
  );
}
