import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Screen, Card, SectionHeader } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

export default function AgencyDashboardRoute() {
  const dashboard = trpc.agency.getAgencyDashboard.useQuery(undefined, { retry: false });
  const commission = trpc.agency.getCommissionSummary.useQuery(undefined, { retry: false });
  const recent = useMemo(() => ((commission.data?.items ?? []) as any[]).slice(0, 5), [commission.data?.items]);

  return (
    <Screen scroll>
      <SectionHeader title="Agency" />
      <Card>
        <Text style={{ color: COLORS.text, fontWeight: "700" }}>{dashboard.data?.agency?.agencyName ?? "Agency"}</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>Hosts: {dashboard.data?.hostCount ?? 0}</Text>
      </Card>
      <Card>
        <Text style={{ color: COLORS.text, fontWeight: "700" }}>Commission Summary</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>Total commission: ${Number(commission.data?.totalCommissionUsd ?? 0).toFixed(2)}</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>Gross revenue: ${Number(commission.data?.totalGrossRevenueUsd ?? 0).toFixed(2)}</Text>
      </Card>

      <SectionHeader title="Recent Commission" />
      {recent.length === 0 ? (
        <Card>
          <Text style={{ color: COLORS.textSecondary }}>No commission records yet.</Text>
        </Card>
      ) : (
        recent.map((row) => (
          <Card key={String(row.id ?? row.createdAt ?? Math.random())}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontWeight: "700" }}>Model: {String(row.hostUserId ?? "").slice(0, 10)}</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>
                  Gross: ${Number(row.grossRevenueUsd ?? 0).toFixed(2)} • Commission: ${Number(row.commissionAmountUsd ?? 0).toFixed(2)}
                </Text>
              </View>
              <Text style={{ color: COLORS.textSecondary }}>
                {row.status ?? ""}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}