import React from "react";
import { View, Text, FlatList } from "react-native";
import { Screen, Card, Button, Badge, EmptyState } from "@/components/ui";
import { useI18n } from "@/i18n";
import { trpc } from "@/lib/trpc";
import { COLORS, SPACING } from "@/theme";

type Event = {
  id: string;
  title?: string;
  description?: string;
  eventType?: string;
  status?: string;
  startAt?: string;
  endAt?: string;
};

export default function EventsScreen() {
  const { t, isRTL } = useI18n();
  const events = trpc.events.listEvents.useQuery({ limit: 20 }, { retry: false });
  const joinEvent = trpc.events.joinEvent.useMutation();
  const items = (events.data?.items ?? []) as Event[];

  const activeEvents = items.filter((event) => event.status === "ACTIVE" || event.status === "UPCOMING");
  const pastEvents = items.filter((event) => event.status === "ENDED");

  const handleJoin = (eventId: string) => {
    joinEvent.mutate({ eventId }, { onSuccess: () => events.refetch() });
  };

  return (
    <Screen>
      <FlatList
        data={[...activeEvents, ...pastEvents]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.md }}
        ListEmptyComponent={<EmptyState icon="..." title={t("events.emptyTitle")} subtitle={t("events.emptySubtitle")} />}
        renderItem={({ item }) => {
          const isActive = item.status === "ACTIVE";
          const isUpcoming = item.status === "UPCOMING";

          return (
            <Card style={{ marginBottom: SPACING.sm }}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: COLORS.text, textAlign: isRTL ? "right" : "left" }}>
                  {item.title ?? t("events.fallbackTitle")}
                </Text>
                <Badge
                  label={item.status ?? "UNKNOWN"}
                  color={isActive ? COLORS.success : isUpcoming ? COLORS.warning : COLORS.textSecondary}
                />
              </View>

              {item.description ? (
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: isRTL ? "right" : "left" }} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}

              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: SPACING.md, marginTop: SPACING.sm }}>
                {item.startAt ? (
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                    {t("events.starts", { date: new Date(item.startAt).toLocaleDateString() })}
                  </Text>
                ) : null}
                {item.endAt ? (
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                    {t("events.ends", { date: new Date(item.endAt).toLocaleDateString() })}
                  </Text>
                ) : null}
              </View>

              {(isActive || isUpcoming) ? (
                <Button
                  title={t("events.join")}
                  variant="primary"
                  size="sm"
                  onPress={() => handleJoin(item.id)}
                  style={{ marginTop: SPACING.sm, alignSelf: isRTL ? "flex-end" : "flex-start" }}
                />
              ) : null}
            </Card>
          );
        }}
      />
    </Screen>
  );
}
