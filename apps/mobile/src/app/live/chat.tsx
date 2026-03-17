import React, { useMemo } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Avatar, Button, Card, Screen } from "@/components/ui";
import { COLORS, SPACING } from "@/theme";

export default function LiveChatRoute() {
  const params = useLocalSearchParams<{ streamId?: string }>();
  const activeStreams = trpc.live.activeStreams.useQuery(undefined, { retry: false });
  const fallbackStreamId = String((activeStreams.data?.streams ?? [])[0]?.streamId ?? "");
  const streamId = String(params.streamId ?? fallbackStreamId);
  const room = trpc.live.getViewerRoom.useQuery({ streamId }, { enabled: !!streamId, retry: false });
  const messages = useMemo(() => ((room.data as any)?.recentChat ?? []) as Array<{ id?: string; username?: string; message?: string }>, [room.data]);
  const stream = (room.data as any)?.stream;

  if (!streamId) {
    return (
      <Screen>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>No active stream</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.sm }}>Open a live room first to view chat dynamically.</Text>
          <Button title="Open Live" onPress={() => router.replace("/(tabs)/live")} style={{ marginTop: SPACING.md }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ padding: SPACING.md }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text }}>Live Chat</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>{stream?.title ?? "Room chat"}</Text>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item, index) => String(item.id ?? `message-${index}`)}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl }}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <Avatar size={36} />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>{item.username ?? "Viewer"}</Text>
              <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{item.message ?? ""}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Card style={{ marginTop: SPACING.sm }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>No recent chat</Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>Messages will appear here when viewers chat in this stream.</Text>
          </Card>
        }
        ListHeaderComponent={
          stream ? (
            <TouchableOpacity onPress={() => router.push(`/stream/${streamId}` as never)} style={{ marginBottom: SPACING.sm }}>
              <Card>
                <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>{stream.hostDisplayName ?? stream.hostUsername ?? "Host"}</Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{stream.viewerCount ?? 0} viewers live now</Text>
              </Card>
            </TouchableOpacity>
          ) : null
        }
      />
    </Screen>
  );
}