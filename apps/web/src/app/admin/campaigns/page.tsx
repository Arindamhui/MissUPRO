"use client";
import { useState } from "react";
import { Gift, Megaphone, Sparkles, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button, DataTable, Input, KpiCard, Modal, PageHeader, Select, StatusBadge } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

type CampaignFormState = {
  name: string;
  campaignType: string;
  startAt: string;
  endAt: string;
  status: string;
};

const initialForm: CampaignFormState = {
  name: "",
  campaignType: "REACTIVATION",
  startAt: "",
  endAt: "",
  status: "DRAFT",
};

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CampaignFormState>(initialForm);

  const campaigns = trpc.admin.listCampaigns.useQuery({ limit: 50 }, { retry: false });
  const analytics = trpc.admin.getCampaignAnalytics.useQuery(undefined, { retry: false });
  const upsertCampaign = trpc.admin.upsertCampaign.useMutation({
    onSuccess: () => {
      setForm(initialForm);
      setShowCreate(false);
      void campaigns.refetch();
      void analytics.refetch();
    },
  });
  const distributeRewards = trpc.admin.distributeCampaignRewards.useMutation({
    onSuccess: () => {
      void campaigns.refetch();
      void analytics.refetch();
    },
  });

  const rows = (campaigns.data?.items ?? []) as Record<string, unknown>[];
  const summary = (analytics.data?.summary ?? {}) as {
    totalCampaigns?: number;
    activeCampaigns?: number;
    participants?: number;
    rewards?: number;
  };

  const handleCreate = () => {
    if (!form.name || !form.startAt || !form.endAt) {
      return;
    }

    upsertCampaign.mutate({
      name: form.name,
      campaignType: form.campaignType,
      startAt: new Date(form.startAt),
      endAt: new Date(form.endAt),
      status: form.status,
      rewardRuleJson: { rewards: [{ rewardType: "COINS", amount: 100, minProgress: 1 }] },
    });
  };

  return (
    <>
      <PageHeader
        title="Campaign Management"
        description="Manage growth campaigns, user targeting, and automated reward grants."
        actions={<Button onClick={() => setShowCreate(true)}>Create Campaign</Button>}
      />

      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <KpiCard label="Total Campaigns" value={formatNumber(summary.totalCampaigns ?? 0)} icon={Megaphone} />
        <KpiCard label="Active Campaigns" value={formatNumber(summary.activeCampaigns ?? 0)} icon={Sparkles} />
        <KpiCard label="Participants" value={formatNumber(summary.participants ?? 0)} icon={Users} />
        <KpiCard label="Rewards" value={formatNumber(summary.rewards ?? 0)} icon={Gift} />
      </div>

      <DataTable
        columns={[
          { key: "name", label: "Campaign" },
          { key: "campaignType", label: "Type" },
          { key: "participantCount", label: "Participants" },
          { key: "rewardCount", label: "Rewards" },
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
                onClick={() => distributeRewards.mutate({ campaignId: String(row.id), limit: 200 })}
                disabled={distributeRewards.isPending}
              >
                Grant Rewards
              </Button>
            ),
          },
        ]}
        data={rows}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Campaign">
        <div className="space-y-4">
          <Input
            label="Campaign Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Win-back bonus"
          />
          <Select
            label="Type"
            value={form.campaignType}
            onChange={(event) => setForm((current) => ({ ...current, campaignType: event.target.value }))}
            options={[
              { value: "REACTIVATION", label: "Reactivation" },
              { value: "BONUS_MULTIPLIER", label: "Bonus Multiplier" },
              { value: "SEASONAL", label: "Seasonal" },
            ]}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "SCHEDULED", label: "Scheduled" },
              { value: "ACTIVE", label: "Active" },
            ]}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Start"
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))}
            />
            <Input
              label="End"
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} disabled={upsertCampaign.isPending}>Save Campaign</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
