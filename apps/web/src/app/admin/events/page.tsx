"use client";
import { useState } from "react";
import { Calendar, Star, Trophy, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button, DataTable, Input, KpiCard, Modal, PageHeader, Select, StatusBadge, Tabs } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

type EventFormState = {
  title: string;
  description: string;
  eventType: string;
  startDate: string;
  endDate: string;
};

const initialForm: EventFormState = {
  title: "",
  description: "",
  eventType: "COMPETITION",
  startDate: "",
  endDate: "",
};

export default function EventsPage() {
  const [tab, setTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<EventFormState>(initialForm);

  const events = trpc.admin.listEvents.useQuery({ limit: 50 }, { retry: false });
  const createEvent = trpc.admin.createEvent.useMutation({
    onSuccess: () => {
      setForm(initialForm);
      setShowCreate(false);
      void events.refetch();
    },
  });
  const distributeRewards = trpc.admin.distributeEventRewards.useMutation({
    onSuccess: () => void events.refetch(),
  });

  const response = (events.data ?? {}) as {
    events?: Array<Record<string, unknown>>;
    summary?: {
      active?: number;
      upcoming?: number;
      ended?: number;
      totalParticipants?: number;
      totalRewardsGranted?: number;
    };
  };

  const rows = (response.events ?? []).filter((row) => {
    if (tab === "all") return true;
    return String(row.status ?? "").toLowerCase() === tab;
  });
  const summary = response.summary ?? {};

  const handleCreate = () => {
    if (!form.title || !form.description || !form.startDate || !form.endDate) {
      return;
    }

    createEvent.mutate({
      title: form.title,
      description: form.description,
      eventType: form.eventType,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
    });
  };

  return (
    <>
      <PageHeader
        title="Events"
        description="Manage event schedules, participation, and reward distribution."
        actions={<Button onClick={() => setShowCreate(true)}>Create Event</Button>}
      />

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <KpiCard label="Active Events" value={formatNumber(summary.active ?? 0)} icon={Calendar} />
        <KpiCard label="Upcoming Events" value={formatNumber(summary.upcoming ?? 0)} icon={Trophy} />
        <KpiCard label="Participants" value={formatNumber(summary.totalParticipants ?? 0)} icon={Users} />
        <KpiCard label="Rewards Granted" value={formatNumber(summary.totalRewardsGranted ?? 0)} icon={Star} />
      </div>

      <Tabs
        tabs={[
          { id: "all", label: "All" },
          { id: "active", label: "Active" },
          { id: "upcoming", label: "Upcoming" },
          { id: "ended", label: "Ended" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <DataTable
        columns={[
          {
            key: "title",
            label: "Event",
            render: (row) => (
              <div>
                <div className="font-medium">{String(row.title ?? "Event")}</div>
                <div className="text-xs text-muted-foreground">{String(row.description ?? "")}</div>
              </div>
            ),
          },
          { key: "eventType", label: "Type" },
          { key: "participantCount", label: "Participants" },
          {
            key: "status",
            label: "Status",
            render: (row) => <StatusBadge status={String(row.status ?? "draft")} />,
          },
          {
            key: "startAt",
            label: "Start",
            render: (row) => row.startAt ? formatDate(String(row.startAt)) : "-",
          },
          {
            key: "endAt",
            label: "End",
            render: (row) => row.endAt ? formatDate(String(row.endAt)) : "-",
          },
          {
            key: "actions",
            label: "",
            render: (row) => (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => distributeRewards.mutate({ eventId: String(row.id) })}
                disabled={distributeRewards.isPending}
              >
                Grant Rewards
              </Button>
            ),
          },
        ]}
        data={rows}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Event">
        <div className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Spring leaderboard sprint"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Describe the event rules and rewards."
          />
          <Select
            label="Type"
            value={form.eventType}
            onChange={(event) => setForm((current) => ({ ...current, eventType: event.target.value }))}
            options={[
              { value: "COMPETITION", label: "Competition" },
              { value: "SEASONAL", label: "Seasonal" },
              { value: "SPECIAL", label: "Special" },
            ]}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Start Date"
              type="datetime-local"
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
            />
            <Input
              label="End Date"
              type="datetime-local"
              value={form.endDate}
              onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} disabled={createEvent.isPending}>Create Event</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
