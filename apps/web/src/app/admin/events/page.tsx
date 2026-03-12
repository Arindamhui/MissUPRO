"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, KpiCard, Tabs, Modal, Input, Select } from "@/components/ui";
import { formatNumber, formatDate } from "@/lib/utils";
import { Calendar, Users, Trophy, Star } from "lucide-react";

export default function EventsPage() {
  const [tab, setTab] = useState("active");
  const [showCreate, setShowCreate] = useState(false);

  const events = trpc.admin.listEvents.useQuery(undefined, { retry: false });
  const rows = (events.data?.events ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Events"
        description="Manage platform events, competitions, and leaderboards"
        actions={<Button onClick={() => setShowCreate(true)}>Create Event</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Events" value={formatNumber(rows.filter(r => r.status === "active").length)} icon={Calendar} />
        <KpiCard label="Total Participants" value={formatNumber(4500)} icon={Users} />
        <KpiCard label="Leaderboards" value="6" icon={Trophy} />
        <KpiCard label="Rewards Given" value="890" icon={Star} />
      </div>

      <Tabs
        tabs={[
          { id: "active", label: "Active Events" },
          { id: "upcoming", label: "Upcoming" },
          { id: "past", label: "Past Events" },
          { id: "leaderboards", label: "Global Leaderboards" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <DataTable
        columns={[
          { key: "id", label: "ID", render: (r) => String(r.id).slice(0, 8) },
          { key: "name", label: "Name" },
          { key: "type", label: "Type" },
          { key: "participantCount", label: "Participants" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={String(r.status ?? "active")} /> },
          { key: "startDate", label: "Start", render: (r) => r.startDate ? formatDate(String(r.startDate)) : "-" },
          { key: "endDate", label: "End", render: (r) => r.endDate ? formatDate(String(r.endDate)) : "-" },
          { key: "actions", label: "", render: () => (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">Edit</Button>
              <Button variant="danger" size="sm">End</Button>
            </div>
          )},
        ]}
        data={rows}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Event">
        <div className="space-y-4">
          <Input label="Event Name" placeholder="Enter event name" />
          <Select label="Type" options={[
            { value: "competition", label: "Competition" },
            { value: "seasonal", label: "Seasonal" },
            { value: "special", label: "Special Event" },
          ]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="datetime-local" />
            <Input label="End Date" type="datetime-local" />
          </div>
          <Input label="Description" placeholder="Event description" />
          <div className="flex gap-2 pt-2">
            <Button>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
