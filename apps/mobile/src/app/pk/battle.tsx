import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Avatar, Badge, Button, Card, EmptyState, Screen, SectionHeader } from "@/components/ui";
import { COLORS, RADIUS, SPACING } from "@/theme";
import { useAuthStore, useUIStore } from "@/store";
import { useSocket } from "@/hooks/useSocket";
import { SOCKET_EVENTS } from "@missu/types";

export default function PkBattleRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const userId = useAuthStore((s) => s.userId);
  const { emit, emitWithAck, on } = useSocket();
  const acceptBattle = trpc.pk.acceptPKBattle.useMutation();
  const battleState = trpc.pk.getPKBattleRealtimeState.useQuery(
    { pkSessionId: sessionId!, limit: 20 },
    { enabled: !!sessionId, retry: false, refetchInterval: 15000 },
  );
  const [liveState, setLiveState] = useState<any | null>(null);

  useEffect(() => {
    if (battleState.data) {
      setLiveState(battleState.data);
    }
  }, [battleState.data]);

  useEffect(() => {
    if (!sessionId) return;

    const applyState = (payload: any) => {
      const nextState = payload?.state ?? payload;
      if (nextState?.session) {
        setLiveState(nextState);
      }
    };

    const unsubscribeScoreUpdate = on(SOCKET_EVENTS.PK.SCORE_UPDATE, (payload: any) => {
      if (payload?.sessionId === sessionId) {
        applyState(payload);
      }
    });
    const unsubscribeSyncState = on(SOCKET_EVENTS.PK.SYNC_STATE, (payload: any) => {
      if (payload?.sessionId === sessionId) {
        applyState(payload);
      }
    });
    const unsubscribeEnded = on(SOCKET_EVENTS.PK.ENDED, (payload: any) => {
      if (payload?.sessionId === sessionId) {
        applyState(payload);
      }
    });

    void emitWithAck<any>(SOCKET_EVENTS.PK.JOIN, { sessionId })
      .then((response) => {
        if (response?.state) {
          setLiveState(response.state);
          return;
        }
        emit(SOCKET_EVENTS.PK.SYNC_REQUEST, { sessionId, limit: 20 });
      })
      .catch(() => {
        emit(SOCKET_EVENTS.PK.SYNC_REQUEST, { sessionId, limit: 20 });
      });

    return () => {
      unsubscribeScoreUpdate?.();
      unsubscribeSyncState?.();
      unsubscribeEnded?.();
    };
  }, [emit, emitWithAck, on, sessionId]);

  const session = liveState?.session as any;
  const hostA = trpc.user.getUserSummary.useQuery({ userId: session?.hostAUserId }, { enabled: !!session?.hostAUserId, retry: false });
  const hostB = trpc.user.getUserSummary.useQuery({ userId: session?.hostBUserId }, { enabled: !!session?.hostBUserId, retry: false });
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!session?.startedAt || !session?.battleDurationSeconds || session?.status !== "ACTIVE") {
      setRemainingSeconds(Number(session?.battleDurationSeconds ?? 0));
      return;
    }

    const update = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
      const remaining = Math.max(0, Number(session.battleDurationSeconds) - elapsed);
      setRemainingSeconds(remaining);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [session?.battleDurationSeconds, session?.startedAt, session?.status]);

  const winnerLabel = useMemo(() => {
    if (!session) return null;
    if (session.resultType === "DRAW") return "Draw";
    if (session.winnerUserId === session.hostAUserId) return hostA.data?.displayName ?? "Host A wins";
    if (session.winnerUserId === session.hostBUserId) return hostB.data?.displayName ?? "Host B wins";
    return null;
  }, [hostA.data?.displayName, hostB.data?.displayName, session]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const openGiftDrawer = (targetUserId: string) => {
    if (!sessionId) return;
    useUIStore.getState().openGiftDrawer({ userId: targetUserId, context: "PK_BATTLE", roomId: sessionId });
    router.push("/gifts");
  };

  const handleAccept = () => {
    if (!sessionId) return;
    acceptBattle.mutate(
      { pkSessionId: sessionId },
      {
        onSuccess: () => {
          void battleState.refetch();
          emit(SOCKET_EVENTS.PK.SYNC_REQUEST, { sessionId, limit: 20 });
        },
        onError: (error: any) => {
          Alert.alert("Unable to accept PK battle", error?.message ?? "Try again in a moment.");
        },
      },
    );
  };

  if (!sessionId) {
    return (
      <Screen>
        <EmptyState icon="⚔️" title="No PK battle selected" subtitle="Open a live challenge first to load a battle." />
      </Screen>
    );
  }

  if (battleState.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <EmptyState icon="⚔️" title="Battle unavailable" subtitle="This PK battle could not be found." />
      </Screen>
    );
  }

  const recentScores = (liveState?.recentScores ?? []) as any[];
  const isInvitedHost = userId != null && session.hostBUserId === userId && session.status === "CREATED";

  return (
    <Screen scroll>
      <Card style={{ backgroundColor: "#151B34" }}>
        <Badge text={String(session.status ?? "CREATED").replaceAll("_", " ")} color={session.status === "ACTIVE" ? COLORS.danger : COLORS.primary} />
        <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800", marginTop: 14 }}>PK Battle</Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 8 }}>
          Gift coins convert into score using the configured multiplier. Highest score wins when the timer ends.
        </Text>
        <View style={{ flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg }}>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: RADIUS.lg, padding: SPACING.md }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Time left</Text>
            <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800", marginTop: 6 }}>{formatTime(remainingSeconds)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: RADIUS.lg, padding: SPACING.md }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Multiplier</Text>
            <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800", marginTop: 6 }}>{session.scoreMultiplierPercent ?? 100}%</Text>
          </View>
        </View>
      </Card>

      {winnerLabel ? (
        <Card>
          <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: "800" }}>{winnerLabel}</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>
            Winner reward: {Number(session.winnerRewardCoins ?? 0)} coins · Draw reward: {Number(session.drawRewardCoins ?? 0)} coins each
          </Text>
        </Card>
      ) : null}

      {isInvitedHost ? (
        <Card>
          <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 16 }}>You have a PK challenge waiting</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>Accept to start the timer and open gifting for viewers.</Text>
          <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
            <Button title="Accept PK" onPress={handleAccept} loading={acceptBattle.isPending} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.sm }}>
        {[
          {
            key: "host-a",
            userId: String(session.hostAUserId),
            summary: hostA.data as any,
            score: Number(session.hostAScore ?? 0),
            leading: Number(session.hostAScore ?? 0) > Number(session.hostBScore ?? 0),
            accent: "#4F7CFF",
          },
          {
            key: "host-b",
            userId: String(session.hostBUserId),
            summary: hostB.data as any,
            score: Number(session.hostBScore ?? 0),
            leading: Number(session.hostBScore ?? 0) > Number(session.hostAScore ?? 0),
            accent: "#FF6B6B",
          },
        ].map((host) => (
          <Card key={host.key} style={{ flex: 1, marginBottom: SPACING.sm }}>
            <View style={{ alignItems: "center" }}>
              <Avatar uri={host.summary?.avatarUrl ?? undefined} size={76} online={host.summary?.presenceStatus === "ONLINE"} />
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "700", marginTop: SPACING.sm, textAlign: "center" }} numberOfLines={1}>
                {host.summary?.displayName ?? host.userId.slice(0, 8)}
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }}>
                @{host.summary?.username ?? "host"}
              </Text>
              {host.leading ? <Badge text="Leading" color={host.accent} /> : null}
              <Text style={{ color: host.accent, fontSize: 32, fontWeight: "800", marginTop: SPACING.md }}>{host.score}</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>battle score</Text>
              <Button
                title="Send Gift"
                onPress={() => openGiftDrawer(host.userId)}
                style={{ marginTop: SPACING.md, width: "100%" }}
                disabled={session.status !== "ACTIVE"}
              />
            </View>
          </Card>
        ))}
      </View>

      <SectionHeader title="Recent Gifts" />
      {recentScores.length > 0 ? (
        recentScores.map((entry) => (
          <Card key={String(entry.id)}>
            <Text style={{ color: COLORS.text, fontWeight: "700" }}>
              {String(entry.hostUserId) === String(session.hostAUserId)
                ? hostA.data?.displayName ?? "Host A"
                : hostB.data?.displayName ?? "Host B"}
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>
              +{Number(entry.scoreValue ?? entry.coinValue ?? 0)} score from {Number(entry.coinValue ?? 0)} coin gift
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 4, fontSize: 12 }}>
              Viewer {String(entry.gifterUserId).slice(0, 8)} · {entry.scoredAt ? new Date(entry.scoredAt).toLocaleTimeString() : "just now"}
            </Text>
          </Card>
        ))
      ) : (
        <Card>
          <Text style={{ color: COLORS.textSecondary }}>No gifts have been scored yet.</Text>
        </Card>
      )}
    </Screen>
  );
}