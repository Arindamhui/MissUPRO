import React from "react";
import { Alert, Text } from "react-native";
import { Screen, Card, SectionHeader, Button } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

export default function AgencyMembersRoute() {
  const roster = trpc.agency.getHostRoster.useQuery({ limit: 25 }, { retry: false });
  const removeHost = trpc.agency.removeHost.useMutation({
    onSuccess: () => void roster.refetch(),
    onError: (error: unknown) => Alert.alert("Unable to remove host", error instanceof Error ? error.message : "Please try again."),
  });

  return (
    <Screen scroll>
      <SectionHeader title="Agency Members" />
      {((roster.data?.items ?? []) as any[]).map((host) => (
        <Card key={String(host.userId)}>
          <Text style={{ color: COLORS.text, fontWeight: "700" }}>{host.displayName}</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>Status: {host.status}</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>Quality score: {host.qualityScore ?? "N/A"}</Text>
          <Button title="Remove Host" variant="outline" onPress={() => removeHost.mutate({ hostUserId: String(host.userId) })} style={{ marginTop: 12 }} />
        </Card>
      ))}
    </Screen>
  );
}