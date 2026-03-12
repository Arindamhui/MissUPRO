"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, KpiCard, Tabs } from "@/components/ui";
import { formatNumber, formatDate } from "@/lib/utils";
import { PartyPopper, Users, Gamepad2, Crown } from "lucide-react";

export default function PartyPage() {
  const [tab, setTab] = useState("active");

  const rooms = trpc.admin.listPartyRooms.useQuery(undefined, { retry: false });
  const rows = (rooms.data?.rooms ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Party Rooms" description="Monitor and manage party rooms and activities" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Parties" value={formatNumber(rows.length)} icon={PartyPopper} />
        <KpiCard label="Total Members" value={formatNumber(890)} icon={Users} />
        <KpiCard label="Active Games" value="24" icon={Gamepad2} />
        <KpiCard label="VIP Parties" value="8" icon={Crown} />
      </div>

      <Tabs
        tabs={[
          { id: "active", label: "Active Rooms" },
          { id: "themes", label: "Themes" },
          { id: "activities", label: "Activities" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "active" && (
        <DataTable
          columns={[
            { key: "id", label: "Room ID", render: (r) => String(r.id).slice(0, 8) },
            { key: "hostId", label: "Host" },
            { key: "name", label: "Room Name" },
            { key: "memberCount", label: "Members" },
            { key: "seatCount", label: "Seats" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "active")} /> },
            { key: "createdAt", label: "Created", render: (r) => r.createdAt ? formatDate(String(r.createdAt)) : "-" },
            { key: "actions", label: "", render: () => (
              <Button variant="danger" size="sm">Close Room</Button>
            )},
          ]}
          data={rows}
        />
      )}

      {tab === "themes" && (
        <Card title="Party Themes">
          <p className="text-sm text-muted-foreground">Theme catalog managed via CMS module</p>
        </Card>
      )}

      {tab === "activities" && (
        <Card title="Activity Types">
          <p className="text-sm text-muted-foreground">Activity configuration loaded via admin.listPartyActivities</p>
        </Card>
      )}
    </>
  );
}
