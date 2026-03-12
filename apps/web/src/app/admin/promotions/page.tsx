"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, DataTable, StatusBadge, Button, Card, KpiCard, Tabs, Modal, Input, Select } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Megaphone, Users, Target, TrendingUp } from "lucide-react";

export default function PromotionsPage() {
  const [tab, setTab] = useState("active");
  const [showCreate, setShowCreate] = useState(false);

  const campaigns = trpc.campaign.activeCampaigns.useQuery(undefined, { retry: false });
  const rows = (campaigns.data?.campaigns ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Promotions & Campaigns"
        description="Manage promotional campaigns, rewards, and referral boosts"
        actions={<Button onClick={() => setShowCreate(true)}>Create Campaign</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active Campaigns" value={rows.length} icon={Megaphone} />
        <KpiCard label="Total Participants" value="3,420" icon={Users} />
        <KpiCard label="Rewards Distributed" value={formatCurrency(45200)} icon={TrendingUp} />
        <KpiCard label="Conversion Rate" value="18.5%" icon={Target} />
      </div>

      <Tabs
        tabs={[
          { id: "active", label: "Active" },
          { id: "scheduled", label: "Scheduled" },
          { id: "ended", label: "Ended" },
          { id: "referral", label: "Referral Boosts" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Campaign" },
          { key: "type", label: "Type" },
          { key: "participants", label: "Participants" },
          { key: "budget", label: "Budget", render: (r) => formatCurrency(Number(r.budget ?? 0)) },
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Campaign">
        <div className="space-y-4">
          <Input label="Campaign Name" placeholder="Enter name" />
          <Select label="Type" options={[
            { value: "coin_bonus", label: "Coin Bonus" },
            { value: "seasonal", label: "Seasonal Event" },
            { value: "referral_boost", label: "Referral Boost" },
            { value: "first_purchase", label: "First Purchase" },
            { value: "reactivation", label: "Reactivation" },
          ]} />
          <Select label="Target Audience" options={[
            { value: "all", label: "All Users" },
            { value: "new", label: "New Users" },
            { value: "returning", label: "Returning" },
            { value: "regional", label: "Regional" },
          ]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Budget" type="number" placeholder="10000" />
            <Input label="Reward Amount" type="number" placeholder="100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="datetime-local" />
            <Input label="End Date" type="datetime-local" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button>Create</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
