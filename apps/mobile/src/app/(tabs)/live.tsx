import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { trpc } from "@/lib/trpc";
import { Screen, Avatar, Badge, Card, SectionHeader, Button, Input, EmptyState } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useAuthStore } from "@/store";
import { router } from "expo-router";

export default function LiveScreen() {
  const [roomName, setRoomName] = useState("Creator Lounge");
  const [category, setCategory] = useState("Chat");
  const [title, setTitle] = useState("Going live now");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.userId);
  const streams = trpc.live.activeStreams.useQuery(undefined, { retry: false });
  const myActiveStream = trpc.live.getMyActiveStream.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const pkFlag = trpc.config.evaluateFeatureFlag.useQuery({ key: "pk_battles", platform: "MOBILE" }, { retry: false });
  const myBattles = trpc.pk.myBattles.useQuery(
    { statuses: ["CREATED", "ACTIVE", "VOTING"], limit: 6 },
    { enabled: isAuthenticated, retry: false, refetchInterval: 5000 },
  );
  const startLiveSession = trpc.live.startLiveSession.useMutation({
    onSuccess: (payload: any) => {
      void streams.refetch();
      void myActiveStream.refetch();
      router.push(`/stream/${payload?.stream?.streamId ?? payload?.streamId}` as never);
    },
    onError: (error: any) => {
      Alert.alert("Unable to start live", error?.message ?? "Try again in a moment.");
    },
  });
  const endStream = trpc.live.endStream.useMutation({
    onSuccess: () => {
      void streams.refetch();
      void myActiveStream.refetch();
      Alert.alert("Live ended", "Your stream has been closed.");
    },
    onError: (error: any) => {
      Alert.alert("Unable to end live", error?.message ?? "Try again in a moment.");
    },
  });
  const requestPkBattle = trpc.live.requestPKBattle.useMutation({
    onSuccess: (session: any) => {
      void myBattles.refetch();
      router.push(`/pk/battle?sessionId=${session.id}` as never);
    },
    onError: (error: any) => {
      Alert.alert("Unable to start PK battle", error?.message ?? "Try again in a moment.");
    },
  });
  const acceptPkBattle = trpc.live.acceptPKBattle.useMutation({
    onSuccess: (_: any, variables: any) => {
      void myBattles.refetch();
      router.push(`/pk/battle?sessionId=${variables.pkSessionId}` as never);
    },
    onError: (error: any) => {
      Alert.alert("Unable to accept PK battle", error?.message ?? "Try again in a moment.");
    },
  });
  const streamList = (streams.data?.streams ?? []) as any[];
  const battleList = (myBattles.data?.items ?? []) as any[];
  const activeCategories = useMemo(() => {
    const seen = new Set<string>();
    const items: string[] = [];
    for (const stream of streamList) {
      const next = String(stream.category ?? "Live");
      if (!seen.has(next)) {
        seen.add(next);
        items.push(next);
      }
    }
    return items.slice(0, 6);
  }, [streamList]);

  const goLive = () => {
    if (!roomName.trim() || !category.trim() || !title.trim()) {
      Alert.alert("Missing details", "Add a room name, category, and stream title.");
      return;
    }

    startLiveSession.mutate({
      roomName: roomName.trim(),
      category: category.trim(),
      title: title.trim(),
      roomType: "PUBLIC",
      streamType: "SOLO",
    });
  };

  const canChallenge = pkFlag.data?.enabled !== false && Boolean(myActiveStream.data?.streamId);

  return (
    <Screen scroll>
      <SectionHeader title="Go Live" />
      <Card>
        {myActiveStream.data ? (
          <>
            <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.xs }}>
              You are live
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginBottom: SPACING.md }}>
              {myActiveStream.data.title} · {myActiveStream.data.viewerCount ?? 0} viewers · {myActiveStream.data.giftRevenueCoins ?? 0} coins
            </Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              <Button title="Open Room" onPress={() => router.push(`/stream/${myActiveStream.data.streamId}` as never)} style={{ flex: 1 }} />
              <Button
                title="End Live"
                variant="danger"
                loading={endStream.isPending}
                onPress={() => endStream.mutate({ streamId: myActiveStream.data.streamId, reason: "NORMAL" })}
                style={{ flex: 1 }}
              />
            </View>
          </>
        ) : (
          <>
            <Input label="Room name" value={roomName} onChangeText={setRoomName} placeholder="Creator Lounge" />
            <Input label="Category" value={category} onChangeText={setCategory} placeholder="Chat" />
            <Input label="Stream title" value={title} onChangeText={setTitle} placeholder="Going live now" />
            <Button title="Start Live" onPress={goLive} loading={startLiveSession.isPending} />
          </>
        )}
      </Card>

      {battleList.length > 0 && (
        <>
          <SectionHeader title="PK Battles" />
          {battleList.map((battle) => {
            const isInvitedHost = userId != null && battle.hostBUserId === userId && battle.status === "CREATED";
            const isActiveBattle = battle.status === "ACTIVE" || battle.status === "VOTING";
            const opponentUserId = battle.hostAUserId === userId ? battle.hostBUserId : battle.hostAUserId;

            return (
              <Card key={String(battle.id)}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>
                  Battle with {String(opponentUserId ?? "host").slice(0, 8)}
                </Text>
                <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>
                  {battle.status} · {battle.hostAScore ?? 0} - {battle.hostBScore ?? 0} · Multiplier {battle.scoreMultiplierPercent ?? 100}%
                </Text>
                <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
                  {isInvitedHost ? (
                    <Button
                      title="Accept PK"
                      onPress={() => acceptPkBattle.mutate({ pkSessionId: String(battle.id) })}
                      loading={acceptPkBattle.isPending}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                  {isActiveBattle ? (
                    <Button title="Open Battle" onPress={() => router.push(`/pk/battle?sessionId=${battle.id}` as never)} style={{ flex: 1 }} />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </>
      )}

      <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md }}>
        <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg }}>
          {(activeCategories.length > 0 ? activeCategories : ["Trending", "Chat", "Music", "Gaming"]).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
                backgroundColor: COLORS.surface,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "500", color: COLORS.text }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <SectionHeader title="Live Now" />

      <FlatList
        data={streamList}
        numColumns={2}
        keyExtractor={(item) => item.streamId}
        contentContainerStyle={{ padding: SPACING.sm }}
        columnWrapperStyle={{ gap: SPACING.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/stream/${item.streamId}` as never)}
            style={{
              flex: 1, borderRadius: RADIUS.lg, overflow: "hidden",
              marginBottom: SPACING.sm, backgroundColor: COLORS.card,
              shadowColor: COLORS.black, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
            }}
          >
            <View style={{ height: 200, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 48 }}>📺</Text>
              {/* Viewer count overlay */}
              <View style={{ position: "absolute", top: 8, right: 8, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full }}>
                <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "600" }}>👁 {item.viewerCount ?? 0}</Text>
              </View>
              {/* Live badge */}
              <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full }}>
                <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "700" }}>LIVE</Text>
              </View>
            </View>
            <View style={{ padding: SPACING.sm, flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
              <Avatar uri={item.avatarUrl} size={32} online />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }} numberOfLines={1}>{item.title ?? "Live Stream"}</Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{item.hostDisplayName ?? "Host"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Badge text={String(item.category ?? "Live")} color={COLORS.primary} />
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>#{Math.max(1, Math.round(Number(item.trendingScore ?? 0)))}</Text>
                </View>
                {canChallenge && item.hostUserId && item.hostUserId !== userId ? (
                  <TouchableOpacity
                    onPress={() => requestPkBattle.mutate({ opponentHostId: String(item.hostUserId) })}
                    style={{ marginTop: 8, alignSelf: "flex-start", backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full }}
                    disabled={requestPkBattle.isPending}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: "700" }}>Challenge PK</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState icon="📺" title="No Live Streams" subtitle="Start your own session to create the first room." />
        }
        scrollEnabled={false}
      />
    </Screen>
  );
}
