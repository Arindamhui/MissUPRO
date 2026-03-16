"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, Button, Card, Tabs, Modal, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function NotificationsPage() {
  const [tab, setTab] = useState("campaigns");
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("push");
  const [formSchedule, setFormSchedule] = useState("");

  const campaigns = trpc.admin.listNotificationCampaigns.useQuery(undefined, { retry: false });
  const createMut = trpc.admin.createNotificationCampaign.useMutation({
    onSuccess: () => { campaigns.refetch(); setShowCreate(false); setFormName(""); },
  });
  const rows = (campaigns.data?.items ?? []) as Record<string, unknown>[];

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMut.mutate({
      name: formName,
      campaignType: formType,
      scheduledAt: formSchedule ? new Date(formSchedule) : undefined,
    });
  };

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
            { key: "id", label: "ID", render: (r) => String(r.id).slice(0, 8) },
            { key: "name", label: "Name" },
            { key: "campaignType", label: "Type" },
            { key: "deliveredCount", label: "Delivered" },
            { key: "openedCount", label: "Opened" },
            { key: "status", label: "Status" },
            { key: "scheduledAt", label: "Scheduled", render: (r) => r.scheduledAt ? formatDate(String(r.scheduledAt)) : "-" },
          ]}
          data={rows}
        />
      )}

      {tab === "system" && (
        <Card title="System Alerts">
          <p className="text-sm text-muted-foreground">System alerts are managed via the Settings page under Feature Flags. Enable or disable platform-wide banners and maintenance notices there.</p>
        </Card>
      )}

      {tab === "templates" && (
        <Card title="Notification Templates">
          <p className="text-sm text-muted-foreground">Templates are defined as campaign types. Create a new campaign and select the appropriate type to use a template.</p>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Notification Campaign">
        <div className="space-y-4">
          <Input label="Campaign Name" placeholder="Enter campaign name" value={formName} onChange={(e: any) => setFormName(e.target.value)} />
          <Select label="Campaign Type" value={formType} onChange={(v: any) => setFormType(v)} options={[
            { value: "push", label: "Push Notification" },
            { value: "in_app", label: "In-App Notification" },
            { value: "email", label: "Email" },
            { value: "sms", label: "SMS" },
          ]} />
          <Input label="Schedule (optional)" type="datetime-local" value={formSchedule} onChange={(e: any) => setFormSchedule(e.target.value)} />
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate}>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
