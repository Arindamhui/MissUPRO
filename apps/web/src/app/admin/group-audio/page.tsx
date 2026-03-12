"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, KpiCard, Tabs } from "@/components/ui";
import { formatNumber, formatDate, formatCurrency } from "@/lib/utils";
import { AudioLines, Users, Clock, DollarSign } from "lucide-react";

export default function GroupAudioPage() {
  const [tab, setTab] = useState("active");

  const rooms = trpc.admin.listGroupAudioRooms.useQuery(undefined, { retry: false });
  const rows = (rooms.data?.rooms ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Group Audio Rooms" description="Monitor and manage group audio sessions" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Rooms" value={formatNumber(rows.length)} icon={AudioLines} />
        <KpiCard label="Total Participants" value={formatNumber(340)} icon={Users} />
        <KpiCard label="Avg Duration" value="32min" icon={Clock} />
        <KpiCard label="Revenue Today" value={formatCurrency(2150)} icon={DollarSign} />
      </div>

      <Tabs
        tabs={[
          { id: "active", label: "Active Rooms" },
          { id: "history", label: "Room History" },
          { id: "billing", label: "Billing" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "active" && (
        <DataTable
          columns={[
            { key: "id", label: "Room ID", render: (r) => String(r.id).slice(0, 8) },
            { key: "hostId", label: "Host" },
            { key: "topic", label: "Topic" },
            { key: "participantCount", label: "Participants" },
            { key: "speakerCount", label: "Speakers" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "active")} /> },
            { key: "startedAt", label: "Started", render: (r) => r.startedAt ? formatDate(String(r.startedAt)) : "-" },
            { key: "actions", label: "", render: () => (
              <Button variant="danger" size="sm">End Room</Button>
            )},
          ]}
          data={rows}
        />
      )}

      {tab === "history" && (
        <Card title="Room History">
          <p className="text-sm text-muted-foreground">Historical group audio rooms with duration and billing data</p>
        </Card>
      )}

      {tab === "billing" && (
        <Card title="Billing Overview">
          <p className="text-sm text-muted-foreground">Group audio billing ticks and revenue breakdown</p>
        </Card>
      )}
    </>
  );
}
