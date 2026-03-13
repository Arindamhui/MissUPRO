import { Screen, Card, SectionHeader, EmptyState } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { Text } from "react-native";

export default function EventsScreen() {
  const eventConfigs = trpc.config.listEventConfigs.useQuery(undefined, { retry: false });
  const rows = (eventConfigs.data ?? []) as Array<{ configKey?: string; eventType?: string }>;

  return (
    <Screen scroll>
      <SectionHeader title="Events" />
      {rows.length === 0 ? (
        <EmptyState icon="📅" title="No Active Event Config" subtitle="Events are driven by admin event configurations." />
      ) : (
        rows.map((item, idx) => (
          <Card key={`${item.configKey ?? "event"}-${idx}`}>
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{item.configKey ?? "Event Config"}</Text>
            <Text style={{ marginTop: 6 }}>Type: {item.eventType ?? "GENERAL"}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
