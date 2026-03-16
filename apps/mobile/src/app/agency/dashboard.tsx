import React from "react";
import { Text } from "react-native";
import { Screen, Card, SectionHeader } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

export default function AgencyDashboardRoute() {
  const dashboard = trpc.agency.getAgencyDashboard.useQuery(undefined, { retry: false });
  const commission = trpc.agency.getCommissionSummary.useQuery(undefined, { retry: false });

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
    </Screen>
  );
}