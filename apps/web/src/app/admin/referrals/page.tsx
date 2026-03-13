"use client";
import { trpc } from "@/lib/trpc";
import { PageHeader, Card, DataTable, StatusBadge } from "@/components/ui";

export default function ReferralsPage() {
  const rules = trpc.config.listReferralRules.useQuery(undefined, { retry: false });
  const rows = (rules.data ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader title="Referral System" description="Configure referral qualification, rewards, and anti-fraud policy" />
      <Card title="Referral Rules">
        <DataTable
          columns={[
            { key: "ruleKey", label: "Rule Key" },
            { key: "qualificationJson", label: "Qualification", render: (r) => JSON.stringify(r.qualificationJson) },
            { key: "inviterRewardJson", label: "Inviter Reward", render: (r) => JSON.stringify(r.inviterRewardJson) },
            { key: "isActive", label: "Status", render: (r) => <StatusBadge status={r.isActive ? "active" : "inactive"} /> },
          ]}
          data={rows}
        />
      </Card>
    </>
  );
}
