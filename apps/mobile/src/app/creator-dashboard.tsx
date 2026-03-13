import { Screen, Card, SectionHeader } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { Text } from "react-native";

export default function CreatorDashboardScreen() {
  const modelStats = trpc.model.getMyStats.useQuery(undefined, { retry: false });
  const stats = (modelStats.data ?? {}) as Record<string, unknown>;

  return (
    <Screen scroll>
      <SectionHeader title="Creator Dashboard" />
      <Card>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Performance</Text>
        <Text style={{ marginTop: 8 }}>Total call minutes: {String(stats.totalCallMinutes ?? 0)}</Text>
        <Text>Total gifts received: {String(stats.totalGiftsReceived ?? 0)}</Text>
        <Text>Current level: {String(stats.level ?? 1)}</Text>
      </Card>
    </Screen>
  );
}
