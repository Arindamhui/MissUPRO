import { Screen, Card, SectionHeader, EmptyState } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { Text } from "react-native";

export default function NotificationsScreen() {
  const campaigns = trpc.admin.listNotificationCampaigns.useQuery({ limit: 20 }, { retry: false });
  const rows = (campaigns.data?.items ?? []) as Array<{ name?: string; status?: string }>;

  return (
    <Screen scroll>
      <SectionHeader title="Notifications" />
      {rows.length === 0 ? (
        <EmptyState icon="🔔" title="No Notification Campaigns" subtitle="Notification behavior is controlled from admin configuration." />
      ) : (
        rows.map((item, idx) => (
          <Card key={`${item.name ?? "campaign"}-${idx}`}>
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{item.name ?? "Campaign"}</Text>
            <Text style={{ marginTop: 6 }}>Status: {item.status ?? "DRAFT"}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
