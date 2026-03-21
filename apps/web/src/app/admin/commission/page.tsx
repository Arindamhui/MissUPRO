"use client";

import { useState } from "react";
import { Award, Building2, DollarSign, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  AdminButton, AdminDataTable, AdminField, AdminInput, AdminMetricCard,
  AdminPageHeader, AdminPanelCard,
} from "@/features/admin/components/admin-ui";
import { useAdminNotifier } from "@/features/admin/hooks/use-admin-panel-api";

type AgencyBreakdownRow = {
  agencyId: string;
  agencyName: string;
  totalCommission: string | number | null;
  totalGross: string | number | null;
  recordCount: number;
};

export default function CommissionPage() {
  const notify = useAdminNotifier();
  const overview = trpc.admin.getCommissionOverview.useQuery(undefined, { retry: false });
  const records = trpc.admin.listAgencyCommissionRecords.useQuery({ limit: 50 }, { retry: false });
  const [giftCommission, setGiftCommission] = useState("20");
  const [callCommission, setCallCommission] = useState("30");

  const updateMut = trpc.admin.updateCommissionSetting.useMutation({
    onSuccess: () => notify.success("Commission updated"),
    onError: (e: any) => notify.error("Failed", e.message),
  });

  const d = overview.data as Record<string, unknown> | undefined;
  const breakdownRows = ((d?.agencyBreakdown ?? []) as AgencyBreakdownRow[]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Finance"
        title="Commission Control"
        description="Platform commission rates, agency earnings breakdown, and settlement overview."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Commission" value={formatCurrency(Number(d?.totalCommissionUsd ?? 0))} icon={Award} tone="emerald" hint="All-time platform earnings" />
        <AdminMetricCard label="Gross Revenue" value={formatCurrency(Number(d?.totalGrossUsd ?? 0))} icon={DollarSign} hint="Total transacted" />
        <AdminMetricCard label="Pending Settlement" value={formatCurrency(Number(d?.pendingSettlementUsd ?? 0))} icon={TrendingUp} tone="amber" hint={`${formatNumber(Number(d?.pendingSettlementCount ?? 0))} records`} />
        <AdminMetricCard label="Total Records" value={formatNumber(Number(d?.totalRecords ?? 0))} icon={Building2} tone="sky" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanelCard title="Commission Settings" subtitle="Set platform commission percentages by category.">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Gift Commission %">
              <AdminInput type="number" value={giftCommission} onChange={(e) => setGiftCommission(e.target.value)} placeholder="20" />
            </AdminField>
            <AdminField label="Call Commission %">
              <AdminInput type="number" value={callCommission} onChange={(e) => setCallCommission(e.target.value)} placeholder="30" />
            </AdminField>
          </div>
          <div className="mt-4 flex gap-3">
            <AdminButton
              onClick={() => updateMut.mutate({ namespace: "gift_commission", commissionPercent: Number(giftCommission) })}
              disabled={updateMut.isPending}
            >Save Gift Commission</AdminButton>
            <AdminButton
              onClick={() => updateMut.mutate({ namespace: "call_commission", commissionPercent: Number(callCommission) })}
              disabled={updateMut.isPending}
            >Save Call Commission</AdminButton>
          </div>
        </AdminPanelCard>

        <AdminPanelCard title="Commission Flow" subtitle="How the economy works.">
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">1</div>
              <p>USER buys coins via coin packages</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">2</div>
              <p>USER sends gift to HOST (coins deducted)</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">3</div>
              <p>SYSTEM takes commission % from gift value</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">4</div>
              <p>HOST earns diamonds (remaining after commission)</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs">5</div>
              <p>AGENCY gets their share from host earnings</p>
            </div>
          </div>
        </AdminPanelCard>
      </div>

      <AdminPanelCard title="Agency Commission Breakdown" subtitle="Per-agency commission and gross revenue breakdown.">
        <AdminDataTable
          rows={breakdownRows}
          rowKey={(r) => r.agencyId}
          isLoading={overview.isLoading}
          emptyMessage="No commission records."
          columns={[
            { key: "agencyName", label: "Agency", sortable: true, render: (r) => <span className="font-medium">{r.agencyName}</span> },
            { key: "totalGross", label: "Gross Revenue", sortable: true, render: (r) => formatCurrency(Number(r.totalGross ?? 0)) },
            { key: "totalCommission", label: "Commission", sortable: true, render: (r) => formatCurrency(Number(r.totalCommission ?? 0)) },
            { key: "recordCount", label: "Records", sortable: true, render: (r) => formatNumber(r.recordCount) },
          ]}
        />
      </AdminPanelCard>
    </div>
  );
}
