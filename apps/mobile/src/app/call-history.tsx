import React from "react";
import { View, Text, FlatList } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Card, EmptyState, SectionHeader, CoinDisplay } from "@/components/ui";
import { COLORS, SPACING } from "@/theme";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function CallHistoryScreen() {
  const history = trpc.calls.myCallHistory.useQuery({ limit: 40 }, { retry: false });
  const items = (history.data?.items ?? []) as any[];

  return (
    <Screen>
      <SectionHeader title="Call History" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: "700" }}>
                {item.callType === "VIDEO" ? "Video call" : "Audio call"}
              </Text>
              <Text style={{ color: item.finalStatus === "ENDED" ? COLORS.success : COLORS.textSecondary, fontSize: 12, fontWeight: "700" }}>
                {item.finalStatus}
              </Text>
            </View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 }}>
              {item.direction === "outgoing" ? "Outgoing" : "Incoming"} · {formatDuration(Number(item.totalDurationSeconds ?? 0))}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 }}>
              Peer: {String(item.otherUserId).slice(0, 8)}
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 }}>
              Billable minutes: {Number(item.billableMinutes ?? 0)}
            </Text>
            <CoinDisplay amount={Number(item.totalCoinsSpent ?? 0)} size="sm" />
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="📞" title="No Call History" subtitle="Your completed and failed calls will appear here." />}
      />
    </Screen>
  );
}