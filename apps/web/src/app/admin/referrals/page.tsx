"use client";
import { Gift, ShieldAlert, UserPlus, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, DataTable, KpiCard, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

export default function ReferralsPage() {
  const rules = trpc.config.listReferralRules.useQuery(undefined, { retry: false });
  const overview = trpc.admin.getReferralOverview.useQuery({ limit: 25 }, { retry: false });

  const summary = (overview.data?.summary ?? {}) as {
    total?: number;
    pending?: number;
    qualified?: number;
    rewarded?: number;
    openFraudFlags?: number;
  };
  const rulesRows = (rules.data ?? []) as Record<string, unknown>[];
  const recentReferrals = (overview.data?.recentReferrals ?? []) as Record<string, unknown>[];
  const recentRewards = (overview.data?.recentRewards ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title="Referral System"
        description="Monitor invite performance, qualification flow, and referral fraud holds."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
        <KpiCard label="Total Referrals" value={formatNumber(summary.total ?? 0)} icon={Users} />
        <KpiCard label="Pending Review" value={formatNumber(summary.pending ?? 0)} icon={UserPlus} />
        <KpiCard label="Rewards Granted" value={formatNumber(summary.rewarded ?? 0)} icon={Gift} />
        <KpiCard label="Open Fraud Flags" value={formatNumber(summary.openFraudFlags ?? 0)} icon={ShieldAlert} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Referral Rules">
          <DataTable
            columns={[
              { key: "ruleKey", label: "Rule Key" },
              {
                key: "qualificationJson",
                label: "Qualification",
                render: (row) => JSON.stringify(row.qualificationJson ?? {}),
              },
              {
                key: "inviterRewardJson",
                label: "Inviter Reward",
                render: (row) => JSON.stringify(row.inviterRewardJson ?? {}),
              },
              {
                key: "isActive",
                label: "Status",
                render: (row) => <StatusBadge status={row.isActive === true ? "active" : "inactive"} />,
              },
            ]}
            data={rulesRows}
          />
        </Card>

        <Card title="Recent Referrals">
          <DataTable
            columns={[
              { key: "referralCode", label: "Code" },
              { key: "inviterDisplayName", label: "Inviter" },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={String(row.status ?? "pending")} />,
              },
              {
                key: "createdAt",
                label: "Created",
                render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-",
              },
            ]}
            data={recentReferrals}
          />
        </Card>
      </div>

      <Card title="Recent Rewards" className="mt-6">
        <DataTable
          columns={[
            { key: "rewardType", label: "Reward Type" },
            {
              key: "rewardValueJson",
              label: "Reward",
              render: (row) => JSON.stringify(row.rewardValueJson ?? {}),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge status={String(row.status ?? "pending")} />,
            },
            {
              key: "createdAt",
              label: "Created",
              render: (row) => row.createdAt ? formatDate(String(row.createdAt)) : "-",
            },
          ]}
          data={recentRewards}
        />
      </Card>
    </>
  );
}
