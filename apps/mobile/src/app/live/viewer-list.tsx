import React, { useMemo } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Avatar, Button, Card, Screen } from "@/components/ui";
import { COLORS, SPACING } from "@/theme";

export default function ViewerListRoute() {
  const params = useLocalSearchParams<{ streamId?: string }>();
  const activeStreams = trpc.live.activeStreams.useQuery(undefined, { retry: false });
  const fallbackStreamId = String((activeStreams.data?.streams ?? [])[0]?.streamId ?? "");
  const streamId = String(params.streamId ?? fallbackStreamId);
  const room = trpc.live.getViewerRoom.useQuery({ streamId }, { enabled: !!streamId, retry: false });
  const viewers = useMemo(() => ((room.data as any)?.activeViewers ?? []) as Array<{ userId?: string; avatarUrl?: string; displayName?: string; username?: string; giftCoinsSent?: number }>, [room.data]);
  const stream = (room.data as any)?.stream;

  if (!streamId) {
    return (
      <Screen>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>No active stream</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm }}>Open a live room first to inspect the active viewer list.</Text>
          <Button title="Open Live" onPress={() => router.replace("/(tabs)/live")} style={{ marginTop: SPACING.md }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ padding: SPACING.md }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text }}>Viewer List</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>{stream?.title ?? "Active room viewers"}</Text>
      </View>
      <FlatList
        data={viewers}
        keyExtractor={(item, index) => String(item.userId ?? `viewer-${index}`)}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => item.userId && router.push(`/profile/${item.userId}` as never)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <Avatar uri={item.avatarUrl} size={44} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>{item.displayName ?? item.username ?? "Viewer"}</Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{Number(item.giftCoinsSent ?? 0)} gift coins sent</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Card style={{ marginTop: SPACING.sm }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>No active viewers</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>Viewer entries appear here while people are currently watching the stream.</Text>
          </Card>
        }
        ListHeaderComponent={
          stream ? (
            <TouchableOpacity onPress={() => router.push(`/stream/${streamId}` as never)} style={{ marginBottom: SPACING.sm }}>
              <Card>
                <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>{stream.hostDisplayName ?? stream.hostUsername ?? "Host"}</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{stream.viewerCount ?? 0} viewers currently connected</Text>
              </Card>
            </TouchableOpacity>
          ) : null
        }
      />
    </Screen>
  );
}