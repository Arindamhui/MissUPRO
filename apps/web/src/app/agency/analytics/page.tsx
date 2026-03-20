"use client";

import { trpc } from "@/lib/trpc";
import { Card, PageHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AgencyAnalyticsPage() {
  const commission = trpc.agency.getCommissionSummary.useQuery(undefined, { retry: false });

  const { chartRows, totals } = useMemo(() => {
    const items = ((commission.data as any)?.items ?? []) as Array<any>;
    const byDay = new Map<string, { day: string; gross: number; commission: number }>();

    for (const row of items) {
      const createdAt = row?.createdAt ? new Date(row.createdAt) : null;
      const key = createdAt ? formatDayKey(createdAt) : "unknown";
      const prev = byDay.get(key) ?? { day: key, gross: 0, commission: 0 };
      prev.gross += Number(row?.grossRevenueUsd ?? 0);
      prev.commission += Number(row?.commissionAmountUsd ?? 0);
      byDay.set(key, prev);
    }

    const rows = Array.from(byDay.values())
      .filter((r) => r.day !== "unknown")
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-30);

    const totals = {
      gross: Number((commission.data as any)?.totalGrossRevenueUsd ?? 0),
      commission: Number((commission.data as any)?.totalCommissionUsd ?? 0),
    };

    return { chartRows: rows, totals };
  }, [commission.data]);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Track revenue and model performance trends."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <Card title="Gross revenue (last 30 days)">
          <div className="text-sm text-gray-600 mb-3">
            Total gross: <span className="font-semibold">{formatCurrency(totals.gross)}</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Area type="monotone" dataKey="gross" stroke="#6C5CE7" fill="#6C5CE7" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Commission earned (last 30 days)">
          <div className="text-sm text-gray-600 mb-3">
            Total commission: <span className="font-semibold">{formatCurrency(totals.commission)}</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Area type="monotone" dataKey="commission" stroke="#00B894" fill="#00B894" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Notes">
        <div className="text-sm text-gray-600">
          This analytics view is derived from agency commission records. More granular metrics (daily active models, calls, gift volume) can be added as data endpoints are exposed.
        </div>
      </Card>
    </>
  );
}

