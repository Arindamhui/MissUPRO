import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { Alert, FlatList, ImageBackground, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { trpc } from "@/lib/trpc";
import { Avatar, Badge, Card, SectionHeader, Button, Input, EmptyState } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useAuthStore } from "@/store";
import { router } from "expo-router";

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const [roomName, setRoomName] = useState("Creator Lounge");
  const [category, setCategory] = useState("Chat");
  const [title, setTitle] = useState("Going live now");
  const authMode = useAuthStore((state) => state.authMode);
  const isAuthenticated = authMode === "authenticated";
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
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <StatusBar style="light" />
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(17,23,70,0.18)", "rgba(10,18,60,0.72)", "rgba(8,14,47,0.97)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={16} />

      <FlatList
        data={streamList}
        numColumns={2}
        keyExtractor={(item) => item.streamId}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: SPACING.md, paddingBottom: 124 }}
        columnWrapperStyle={{ gap: SPACING.sm }}
        ListHeaderComponent={
          <>
            <View style={{ marginBottom: SPACING.lg }}>
              <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800" }}>Live</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 6 }}>Browse active rooms or start your own live session.</Text>
            </View>

            <Card style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <SectionHeader title="Go Live" />
              {isAuthenticated ? (
                myActiveStream.data ? (
                  <>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.white, marginBottom: SPACING.xs }}>
                      You are live
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.72)", marginBottom: SPACING.md }}>
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
                    <Input label="Room name" value={roomName} onChangeText={setRoomName} placeholder="Creator Lounge" style={{ backgroundColor: "rgba(8,12,32,0.36)", color: COLORS.white }} />
                    <Input label="Category" value={category} onChangeText={setCategory} placeholder="Chat" style={{ backgroundColor: "rgba(8,12,32,0.36)", color: COLORS.white }} />
                    <Input label="Stream title" value={title} onChangeText={setTitle} placeholder="Going live now" style={{ backgroundColor: "rgba(8,12,32,0.36)", color: COLORS.white }} />
                    <Button title="Start Live" onPress={goLive} loading={startLiveSession.isPending} />
                  </>
                )
              ) : (
                <>
                  <Text style={{ color: "rgba(255,255,255,0.78)", lineHeight: 20, marginBottom: SPACING.md }}>Guest users can watch public rooms, but going live and PK battles require a signed-in account.</Text>
                  <Button title="Sign In To Go Live" onPress={() => router.replace("/(auth)/login")} />
                </>
              )}
            </Card>

            {battleList.length > 0 && isAuthenticated ? (
              <>
                <SectionHeader title="PK Battles" />
                {battleList.map((battle) => {
                  const isInvitedHost = userId != null && battle.hostBUserId === userId && battle.status === "CREATED";
                  const isActiveBattle = battle.status === "ACTIVE" || battle.status === "VOTING";
                  const opponentUserId = battle.hostAUserId === userId ? battle.hostBUserId : battle.hostAUserId;

                  return (
                    <Card key={String(battle.id)} style={{ backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.white }}>
                        Battle with {String(opponentUserId ?? "host").slice(0, 8)}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 6 }}>
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
            ) : null}

            <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg, flexWrap: "wrap" }}>
              {(activeCategories.length > 0 ? activeCategories : ["Trending", "Chat", "Music", "Gaming"]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.white }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <SectionHeader title="Live Now" />
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/stream/${item.streamId}` as never)}
            style={{
              flex: 1, borderRadius: RADIUS.lg, overflow: "hidden",
              marginBottom: SPACING.sm, backgroundColor: "rgba(255,255,255,0.1)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <ImageBackground source={item.thumbnailUrl ? { uri: item.thumbnailUrl } : item.avatarUrl ? { uri: item.avatarUrl } : undefined} style={{ height: 200, backgroundColor: "#271D74", alignItems: "center", justifyContent: "center" }} imageStyle={{ opacity: 0.9 }}>
              <LinearGradient colors={["rgba(8,11,32,0.1)", "rgba(8,11,32,0.8)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
              {!item.thumbnailUrl && !item.avatarUrl ? <Text style={{ fontSize: 48 }}>📺</Text> : null}
              <View style={{ position: "absolute", top: 8, right: 8, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.56)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full }}>
                <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "600" }}>👁 {item.viewerCount ?? 0}</Text>
              </View>
              <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full }}>
                <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: "700" }}>LIVE</Text>
              </View>
            </ImageBackground>
            <View style={{ padding: SPACING.sm, flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
              <Avatar uri={item.avatarUrl} size={32} online />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.white }} numberOfLines={1}>{item.title ?? "Live Stream"}</Text>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>{item.hostDisplayName ?? item.displayName ?? "Host"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Badge text={String(item.category ?? "Live")} color={COLORS.primary} />
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.62)" }}>#{Math.max(1, Math.round(Number(item.trendingScore ?? 0)))}</Text>
                </View>
                {canChallenge && item.hostUserId && item.hostUserId !== userId ? (
                  <TouchableOpacity
                    onPress={() => requestPkBattle.mutate({ opponentHostId: String(item.hostUserId) })}
                    style={{ marginTop: 8, alignSelf: "flex-start", backgroundColor: "rgba(178,218,255,0.18)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full }}
                    disabled={requestPkBattle.isPending}
                  >
                    <Text style={{ color: "#DCEBFF", fontSize: 12, fontWeight: "700" }}>Challenge PK</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="📺" title="No Live Streams" subtitle="Start your own session to create the first room." />}
      />
    </View>
  );
}
