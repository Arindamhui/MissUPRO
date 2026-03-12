"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, Button, Card, Tabs, Modal, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function NotificationsPage() {
  const [tab, setTab] = useState("campaigns");
  const [showCreate, setShowCreate] = useState(false);

  const campaigns = trpc.admin.listNotificationCampaigns.useQuery(undefined, { retry: false });
  const rows = (campaigns.data?.campaigns ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Push notification campaigns and system alerts"
        actions={<Button onClick={() => setShowCreate(true)}>Create Campaign</Button>}
      />

      <Tabs
        tabs={[
          { id: "campaigns", label: "Campaigns" },
          { id: "system", label: "System Alerts" },
          { id: "templates", label: "Templates" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "campaigns" && (
        <DataTable
          columns={[
            { key: "id", label: "ID" },
            { key: "title", label: "Title" },
            { key: "targetAudience", label: "Audience" },
            { key: "sentCount", label: "Sent" },
            { key: "status", label: "Status" },
            { key: "scheduledAt", label: "Scheduled", render: (r) => r.scheduledAt ? formatDate(String(r.scheduledAt)) : "-" },
            { key: "actions", label: "", render: () => (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="primary" size="sm">Send</Button>
              </div>
            )},
          ]}
          data={rows}
        />
      )}

      {tab === "system" && (
        <Card title="System Alerts">
          <p className="text-sm text-muted-foreground">System-wide alert configuration and history</p>
        </Card>
      )}

      {tab === "templates" && (
        <Card title="Notification Templates">
          <p className="text-sm text-muted-foreground">Reusable notification templates for campaigns</p>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Notification Campaign">
        <div className="space-y-4">
          <Input label="Campaign Title" placeholder="Enter title" />
          <Input label="Message Body" placeholder="Notification content..." />
          <Select label="Target Audience" options={[
            { value: "all", label: "All Users" },
            { value: "new", label: "New Users (< 7 days)" },
            { value: "returning", label: "Returning Users" },
            { value: "vip", label: "VIP Users" },
            { value: "inactive", label: "Inactive Users" },
          ]} />
          <Input label="Schedule" type="datetime-local" />
          <div className="flex gap-2 pt-2">
            <Button>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
