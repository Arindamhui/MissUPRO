import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { BackgroundCollage } from "@/components/BackgroundCollage";
import { AnimatedSnow } from "@/components/AnimatedSnow";
import { Badge, Button } from "@/components/ui";
import { COLORS, RADIUS, SPACING } from "@/theme";
import { trpc } from "@/lib/trpc";
import { useAuthStore, useCallStore } from "@/store";

type GameInfo = {
  id: string;
  name: string;
  icon: string;
  description: string;
  players: string;
  available: boolean;
};

const GAMES: GameInfo[] = [
  { id: "ludo", name: "Ludo", icon: "🎲", description: "Classic board game — race your pieces to the finish!", players: "2 players", available: true },
  { id: "chess", name: "Chess", icon: "♟️", description: "Strategic battle of wits on a 64-square board.", players: "2 players", available: true },
  { id: "carrom", name: "Carrom", icon: "🎯", description: "Flick and pocket — tabletop precision game.", players: "2 players", available: true },
  { id: "sudoku", name: "Sudoku", icon: "🔢", description: "Fill the grid — logic puzzle challenge.", players: "1-2 players", available: true },
];

export default function GamesScreen() {
  const authMode = useAuthStore((s) => s.authMode);
  const isAuthenticated = authMode === "authenticated";
  const isInCall = useCallStore((s) => s.isInCall);
  const activeCallId = useCallStore((s) => s.activeCallId);
  const otherUserId = useCallStore((s) => s.otherUserId);
  const callType = useCallStore((s) => s.callType);
  const callStatus = useCallStore((s) => s.callStatus);
  const onlineModels = trpc.discovery.getOnlineModels.useQuery({ limit: 4 }, { retry: false, enabled: isAuthenticated && !isInCall });
  const activePeer = trpc.user.getUserSummary.useQuery({ userId: otherUserId! }, { retry: false, enabled: Boolean(otherUserId && isAuthenticated) });
  const startInCallGame = trpc.game.startInCallGame.useMutation({
    onError: (error: unknown) => {
      Alert.alert("Unable to start game", error instanceof Error ? error.message : "Please try again.");
    },
  });

  const handleStartGame = (game: GameInfo) => {
    if (!isInCall || !activeCallId) {
      router.push(`/calls/request?type=${callType === "video" ? "video" : "audio"}` as never);
      return;
    }

    startInCallGame.mutate(
      { callSessionId: activeCallId, gameType: game.id.toUpperCase() as "CHESS" | "LUDO" | "CARROM" | "SUDOKU" },
      {
        onSuccess: (session: any) => {
          router.push({ pathname: `/call/${activeCallId}` as never, params: { game: game.id, sessionId: String(session.id) } } as never);
        },
      },
    );
  };

  const renderGame = ({ item }: { item: GameInfo }) => (
    <TouchableOpacity onPress={() => handleStartGame(item)} activeOpacity={0.7}>
      <LinearGradient
        colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.06)"]}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.md,
          marginBottom: SPACING.sm,
          borderRadius: 20,
          padding: SPACING.md,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <View style={{
          width: 56, height: 56, borderRadius: RADIUS.lg,
          backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 28 }}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.white }}>{item.name}</Text>
            {item.available && <Badge label="Available" color={COLORS.success} />}
          </View>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 2 }}>{item.description}</Text>
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.56)", marginTop: 2 }}>{item.players}</Text>
        </View>
        <MaterialCommunityIcons color="rgba(255,255,255,0.66)" name="play" size={22} />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0C1345" }}>
      <BackgroundCollage variant="home" />
      <LinearGradient colors={["rgba(18,21,71,0.2)", "rgba(10,18,60,0.78)", "rgba(8,14,47,0.98)"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <AnimatedSnow density={16} />

      <View style={{ flex: 1, padding: SPACING.md, paddingTop: SPACING.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }}>
            <MaterialCommunityIcons color="#FFFFFF" name="arrow-left" size={22} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: SPACING.md }}>
            <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900" }}>Games</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Play live call games without leaving the session flow.</Text>
          </View>
          <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" }}>
            <Text style={{ color: COLORS.white, fontWeight: "700" }}>{GAMES.length}</Text>
          </View>
        </View>

        {!isInCall ? (
          <LinearGradient colors={["rgba(103,231,255,0.16)", "rgba(108,92,231,0.12)"]} style={{ padding: SPACING.md, borderRadius: 18, marginBottom: SPACING.md, borderWidth: 1, borderColor: "rgba(103,231,255,0.16)" }}>
            <Text style={{ fontSize: 14, color: "#A4F1FF", textAlign: "center", lineHeight: 20 }}>
              Games unlock inside the real call flow. Start an audio or video call first, then reopen this screen to pin a mini-game challenge.
            </Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
              <Button title="Audio Call" onPress={() => router.push("/calls/request?type=audio" as never)} style={{ flex: 1 }} />
              <Button title="Video Call" variant="outline" onPress={() => router.push("/calls/request?type=video" as never)} style={{ flex: 1, borderColor: "rgba(255,255,255,0.26)", backgroundColor: "rgba(255,255,255,0.08)" }} />
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient colors={["rgba(123,198,255,0.18)", "rgba(121,82,255,0.16)"]} style={{ padding: SPACING.md, borderRadius: 18, marginBottom: SPACING.md, borderWidth: 1, borderColor: "rgba(123,198,255,0.18)" }}>
            <Text style={{ fontSize: 18, color: COLORS.white, fontWeight: "800" }}>Active call ready</Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 6, lineHeight: 18 }}>
              {activePeer.data?.displayName ?? otherUserId ?? "Creator"} • {callType === "video" ? "Video" : "Audio"} • {String(callStatus ?? "active").toLowerCase()}
            </Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
              <Button title="Open Active Call" onPress={() => activeCallId && router.push(`/call/${activeCallId}` as never)} style={{ flex: 1 }} />
              <Button title="Switch Call" variant="outline" onPress={() => router.push("/calls/request?type=audio" as never)} style={{ flex: 1, borderColor: "rgba(255,255,255,0.26)", backgroundColor: "rgba(255,255,255,0.08)" }} />
            </View>
          </LinearGradient>
        )}

        {!isInCall && onlineModels.data?.items?.length ? (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "800", marginBottom: SPACING.sm }}>Online creators</Text>
            {(onlineModels.data?.items ?? []).slice(0, 3).map((item: any, index: number) => {
              const targetId = String(item.userId ?? item.modelId ?? item.id ?? `creator-${index}`);
              return (
                <TouchableOpacity
                  key={targetId}
                  onPress={() => router.push(`/profile/${targetId}` as never)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: 18,
                    paddingHorizontal: SPACING.md,
                    paddingVertical: 14,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    marginBottom: SPACING.sm,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: SPACING.sm }}>
                    <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }} numberOfLines={1}>{String(item.displayName ?? "Creator")}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                      {(callType === "video" ? Number(item.videoPrice ?? 50) : Number(item.audioPrice ?? 30))} coins/min • Open profile to request
                    </Text>
                  </View>
                  <MaterialCommunityIcons color="#7FD1FF" name="chevron-right" size={24} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <FlatList
          data={GAMES}
          keyExtractor={(item) => item.id}
          renderItem={renderGame}
          contentContainerStyle={{ paddingBottom: SPACING.xl }}
          showsVerticalScrollIndicator={false}
          extraData={startInCallGame.isPending}
        />
      </View>
    </View>
  );
}
