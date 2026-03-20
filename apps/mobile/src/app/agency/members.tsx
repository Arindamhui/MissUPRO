import React, { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Screen, Card, SectionHeader, Button, Input } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

export default function AgencyMembersRoute() {
  const roster = trpc.agency.getHostRoster.useQuery({ limit: 25 }, { retry: false });
  const inviteHost = trpc.agency.inviteHost.useMutation({
    onSuccess: () => {
      void roster.refetch();
      Alert.alert("Invited", "The model has been added to your agency roster.");
    },
    onError: (error: unknown) => Alert.alert("Unable to invite host", error instanceof Error ? error.message : "Please try again."),
  });
  const removeHost = trpc.agency.removeHost.useMutation({
    onSuccess: () => void roster.refetch(),
    onError: (error: unknown) => Alert.alert("Unable to remove host", error instanceof Error ? error.message : "Please try again."),
  });

  const rows = useMemo(() => ((roster.data?.items ?? []) as any[]), [roster.data?.items]);
  const [hostUserId, setHostUserId] = useState("");

  return (
    <Screen scroll>
      <SectionHeader title="Agency Members" />

      <Card>
        <Text style={{ color: COLORS.text, fontWeight: "700" }}>Invite a model</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>
          Enter the model&apos;s User ID (UUID). The API will verify the user is a model.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Input
            label="Model User ID"
            placeholder="e.g. 0f3a0c2d-...."
            value={hostUserId}
            onChangeText={setHostUserId}
            autoCapitalize="none"
          />
          <Button
            title={inviteHost.isPending ? "Inviting..." : "Invite Model"}
            onPress={() => {
              if (!hostUserId.trim()) {
                Alert.alert("Missing ID", "Please enter a model user ID.");
                return;
              }
              inviteHost.mutate({ hostUserId: hostUserId.trim() });
            }}
            disabled={inviteHost.isPending}
          />
        </View>
      </Card>

      {rows.map((host) => (
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