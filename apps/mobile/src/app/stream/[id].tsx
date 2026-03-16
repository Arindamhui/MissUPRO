import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { RenderModeType, RtcSurfaceView, VideoSourceType } from "react-native-agora";
import { useSocket } from "@/hooks/useSocket";
import { useLiveRtc } from "@/hooks/useLiveRtc";
import { Avatar, Button, Card, CoinDisplay, SectionHeader } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { useAuthStore, useUIStore } from "@/store";
import { SOCKET_EVENTS } from "@missu/types";
import { trpc } from "@/lib/trpc";

const { width, height } = Dimensions.get("window");

interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  username: string;
  timestamp: number;
}

type StreamSyncEvent = {
  event: string;
  payload: Record<string, any>;
};

type GiftOverlayEvent = {
  giftId?: string;
  giftName?: string;
  senderName?: string;
  quantity?: number;
  effect?: string;
};

export default function StreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const streamId = String(id);
  const { emit, emitWithAck, on } = useSocket();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const roomQuery = trpc.live.getViewerRoom.useQuery({ streamId }, { enabled: !!id, retry: false });
  const me = trpc.user.getMe.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const joinStream = trpc.live.joinStream.useMutation();
  const leaveStream = trpc.live.leaveStream.useMutation();
  const issueViewerToken = trpc.live.issueViewerToken.useMutation();
  const issueHostToken = trpc.live.issueHostToken.useMutation();
  const endStream = trpc.live.endStream.useMutation({
    onSuccess: () => {
      Alert.alert("Live ended", "The stream has been closed.");
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Unable to end live", error?.message ?? "Try again in a moment.");
    },
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [giftEvents, setGiftEvents] = useState<GiftOverlayEvent[]>([]);
  const [rtcCredentials, setRtcCredentials] = useState<any | null>(null);
  const [rtcBootstrapError, setRtcBootstrapError] = useState<string | null>(null);
  const joinedPresenceRef = useRef(false);

  const stream = (roomQuery.data as any)?.stream;
  const topSupporters = ((roomQuery.data as any)?.topSupporters ?? []) as any[];
  const activeViewers = ((roomQuery.data as any)?.activeViewers ?? []) as any[];
  const featureHints = (roomQuery.data as any)?.liveConfig?.uiLayoutHints;
  const isHost = !!stream?.hostUserId && stream.hostUserId === me.data?.id;
  const layoutHints = (roomQuery.data as any)?.liveConfig?.layout;
  const meResolved = !isAuthenticated || me.isFetched || !!me.error;

  const rtc = useLiveRtc({
    enabled: Boolean(rtcCredentials && isAuthenticated && stream),
    role: isHost ? "host" : "viewer",
    credentials: rtcCredentials,
  });

  const primaryRemoteUid = rtc.remoteUids[0];
  const localCanvas = useMemo(() => ({
    uid: 0,
    renderMode: RenderModeType.RenderModeHidden,
    sourceType: VideoSourceType.VideoSourceCameraPrimary,
  }), []);
  const remoteCanvas = useMemo(() => ({
    uid: primaryRemoteUid,
    renderMode: RenderModeType.RenderModeHidden,
  }), [primaryRemoteUid]);

  useEffect(() => {
    setMessages((((roomQuery.data as any)?.recentChat ?? []) as ChatMessage[]).slice(-100));
    setViewerCount(Number(stream?.viewerCount ?? 0));
  }, [roomQuery.data, stream?.viewerCount]);

  useEffect(() => {
    setRtcCredentials(null);
    setRtcBootstrapError(null);

    if (!stream || !streamId || !isAuthenticated || !meResolved) {
      return;
    }

    let disposed = false;

    const bootstrapRtc = async () => {
      try {
        if (isHost) {
          const hostRtc = await issueHostToken.mutateAsync({ streamId });
          if (!disposed) {
            setRtcCredentials(hostRtc);
          }
          return;
        }

        await joinStream.mutateAsync({ streamId });
        joinedPresenceRef.current = true;

        const viewerRtc = await issueViewerToken.mutateAsync({ streamId });
        if (!disposed) {
          setRtcCredentials(viewerRtc);
        }
      } catch (error: any) {
        if (!disposed) {
          setRtcBootstrapError(error?.message ?? "Unable to connect to the live stream.");
        }
      }
    };

    void bootstrapRtc();

    return () => {
      disposed = true;
      setRtcCredentials(null);
      if (joinedPresenceRef.current && !isHost) {
        joinedPresenceRef.current = false;
        void leaveStream.mutateAsync({ streamId }).catch(() => undefined);
      }
    };
  }, [isAuthenticated, isHost, issueHostToken, issueViewerToken, joinStream, leaveStream, meResolved, stream?.streamId, streamId]);

  useEffect(() => {
    if (!id) return;

    emit(SOCKET_EVENTS.STREAM.JOIN, { roomId: id });
    emit(SOCKET_EVENTS.STREAM.SYNC_REQUEST, { roomId: id, limit: 30 });

    const pushMessage = (msg: any) => {
      setMessages((prev) => [...prev.slice(-100), { ...msg, id: String(msg.id ?? Date.now()) }]);
    };

    const unsub1 = on(SOCKET_EVENTS.STREAM.CHAT_MESSAGE, (msg: ChatMessage) => {
      pushMessage(msg);
    });

    const unsub2 = on(SOCKET_EVENTS.STREAM.VIEWER_JOINED, (payload: { viewerCount?: number }) => {
      if (typeof payload?.viewerCount === "number") {
        setViewerCount(payload.viewerCount);
        return;
      }
      setViewerCount((c) => c + 1);
    });

    const unsub3 = on(SOCKET_EVENTS.STREAM.VIEWER_LEFT, (payload: { viewerCount?: number }) => {
      if (typeof payload?.viewerCount === "number") {
        setViewerCount(payload.viewerCount);
        return;
      }
      setViewerCount((c) => Math.max(0, c - 1));
    });

    const unsub4 = on(SOCKET_EVENTS.STREAM.SYNC_STATE, (payload: { viewerCount: number; recentEvents: StreamSyncEvent[]; recentMessages?: ChatMessage[] }) => {
      setViewerCount(payload.viewerCount ?? 0);
      const replayedMessages = (payload.recentMessages?.length
        ? payload.recentMessages
        : (payload.recentEvents ?? [])
          .filter((event) => event.event === SOCKET_EVENTS.STREAM.CHAT_MESSAGE)
          .map((event, index) => ({ ...(event.payload as ChatMessage), id: String((event.payload as any).id ?? `replay-${index}`) }))) as ChatMessage[];
      setMessages(replayedMessages.slice(-100));
    });

    const unsub5 = on(SOCKET_EVENTS.GIFT.RECEIVED_LIVE, (payload: GiftOverlayEvent) => {
      setGiftEvents((current) => [payload, ...current].slice(0, 4));
    });

    return () => {
      emit(SOCKET_EVENTS.STREAM.LEAVE, { roomId: id });
      unsub1?.();
      unsub2?.();
      unsub3?.();
      unsub4?.();
      unsub5?.();
    };
  }, [id]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const response = await emitWithAck<{ ok: boolean }>(SOCKET_EVENTS.STREAM.CHAT, { roomId: id, message: inputText.trim() }).catch(() => ({ ok: false }));
    if (!response?.ok) return;
    setInputText("");
  };

  const ranking = useMemo(() => {
    return topSupporters.map((supporter, index) => ({
      ...supporter,
      rank: index + 1,
    }));
  }, [topSupporters]);

  const rtcMessage = rtc.error
    ?? rtcBootstrapError
    ?? (!isAuthenticated ? "Sign in to watch the live video feed." : null);

  const videoStatus = isHost
    ? (rtc.joined ? "Broadcasting" : rtc.statusLabel === "connecting" ? "Connecting camera" : "Preparing stream")
    : (primaryRemoteUid ? "Live video connected" : rtc.statusLabel === "connecting" ? "Joining live video" : "Waiting for host video");

  if (roomQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!stream) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: SPACING.lg }}>
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: "700", marginBottom: SPACING.sm }}>Stream unavailable</Text>
        <Text style={{ color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.md }}>
          The host may have ended the session.
        </Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ flex: 1, backgroundColor: "#1A1A2E", alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", inset: 0 as any, backgroundColor: "#101427" }} />
        <View style={{ width: width - 24, height: height * 0.44, borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)", padding: 20, justifyContent: "space-between" }}>
          <View style={{ flex: 1, overflow: "hidden", borderRadius: 20, backgroundColor: "#05070F" }}>
            {isHost ? (
              rtcCredentials?.agoraAppId ? (
                <RtcSurfaceView
                  style={{ position: "absolute", inset: 0 as any }}
                  canvas={localCanvas}
                />
              ) : null
            ) : primaryRemoteUid ? (
              <RtcSurfaceView
                key={`remote-${primaryRemoteUid}`}
                style={{ position: "absolute", inset: 0 as any }}
                canvas={remoteCanvas}
              />
            ) : null}

            <View style={{ position: "absolute", inset: 0 as any, backgroundColor: isHost || primaryRemoteUid ? "rgba(0,0,0,0.18)" : "rgba(3,5,12,0.82)" }} />

            <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 12, letterSpacing: 2 }}>VIDEO CONTAINER</Text>
                <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: "800", marginTop: 10 }}>{stream.title ?? "Live stream"}</Text>
                <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 8 }}>{stream.roomName} · {stream.category}</Text>
              </View>

              <View style={{ alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.46)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, maxWidth: "88%" }}>
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>{videoStatus}</Text>
                <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>
                  {rtcMessage ?? "RTC video is active for this room."}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar uri={stream.avatarUrl} size={52} online />
              <View>
                <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>{stream.hostDisplayName ?? stream.hostUsername ?? "Host"}</Text>
                <Text style={{ color: "rgba(255,255,255,0.56)", fontSize: 12 }}>#{Math.max(1, Math.round(Number(stream.trendingScore ?? 0)))}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <CoinDisplay amount={Number(stream.giftRevenueCoins ?? 0)} size="md" />
              <Text style={{ color: "rgba(255,255,255,0.48)", fontSize: 12, marginTop: 4 }}>Gift revenue</Text>
            </View>
          </View>

          {isHost && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={rtc.toggleLocalAudio}
                style={{ backgroundColor: "rgba(0,0,0,0.42)", borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>{rtc.isLocalAudioMuted ? "UNMUTE MIC" : "MUTE MIC"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={rtc.toggleLocalVideo}
                style={{ backgroundColor: "rgba(0,0,0,0.42)", borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>{rtc.isLocalVideoMuted ? "START CAM" : "STOP CAM"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={rtc.switchCamera}
                style={{ backgroundColor: "rgba(0,0,0,0.42)", borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>FLIP</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {layoutHints?.giftAnimationLayer !== false && (
          <View style={{ position: "absolute", right: 16, top: 120, width: 180, gap: 8 }}>
            {giftEvents.length > 0 ? giftEvents.map((giftEvent, index) => (
              <View key={`${giftEvent.giftName ?? "gift"}-${index}`} style={{ backgroundColor: "rgba(255,184,77,0.18)", borderWidth: 1, borderColor: "rgba(255,184,77,0.24)", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: "#FFD89E", fontSize: 11, fontWeight: "700", marginBottom: 4 }}>GIFT ANIMATION</Text>
                <Text style={{ color: COLORS.white, fontSize: 13 }} numberOfLines={2}>{giftEvent.senderName ?? "Fan"} sent {giftEvent.quantity ?? 1}x {giftEvent.giftName ?? "Gift"}</Text>
              </View>
            )) : (
              <View style={{ backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Gift animation layer ready</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ position: "absolute", top: 50, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{
            backgroundColor: "rgba(0,0,0,0.5)", width: 36, height: 36, borderRadius: 18,
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ color: COLORS.white, fontSize: 20 }}>←</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full }}>
              <Text style={{ color: COLORS.white, fontSize: 12 }}>👁 {viewerCount}</Text>
            </View>
            {isHost && (
              <TouchableOpacity
                onPress={() => endStream.mutate({ streamId: String(id), reason: "NORMAL" })}
                style={{ backgroundColor: COLORS.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full }}
              >
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>END</Text>
              </TouchableOpacity>
            )}
            <View style={{ backgroundColor: COLORS.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full }}>
              <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>LIVE</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: height * 0.4 }}>
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ flex: 1.25, justifyContent: "flex-end" }}>
            {layoutHints?.chatOverlay !== false && (
              <FlatList
                data={messages}
                inverted
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, paddingTop: 24 }}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: "row", marginBottom: 8, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 }}>
                    <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: "600", marginRight: 6 }}>
                      {item.username}
                    </Text>
                    <Text style={{ color: COLORS.white, fontSize: 13, flex: 1 }}>{item.message}</Text>
                  </View>
                )}
                ListHeaderComponent={
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    <SectionHeader title="Chat Overlay" />
                  </View>
                }
              />
            )}
          </View>

          {layoutHints?.viewerList !== false && (
            <View style={{ width: 150, marginRight: 12, marginBottom: 68 }}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 16, gap: 8 }}>
                <Card style={{ backgroundColor: "rgba(8,10,18,0.72)", marginBottom: SPACING.sm }}>
                  <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>VIEWER LIST</Text>
                  {activeViewers.length > 0 ? activeViewers.slice(0, 6).map((viewer) => (
                    <View key={String(viewer.userId)} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Avatar uri={viewer.avatarUrl} size={28} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "600" }} numberOfLines={1}>{viewer.displayName ?? viewer.username ?? "Viewer"}</Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 10 }}>{viewer.giftCoinsSent ?? 0} coins</Text>
                      </View>
                    </View>
                  )) : <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>No active viewers yet.</Text>}
                </Card>

                <Card style={{ backgroundColor: "rgba(8,10,18,0.72)" }}>
                  <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>LIVE RANKING</Text>
                  {ranking.length > 0 ? ranking.slice(0, 5).map((supporter) => (
                    <View key={String(supporter.userId)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>#{supporter.rank}</Text>
                      <Text style={{ color: COLORS.white, fontSize: 12, flex: 1, marginLeft: 8 }} numberOfLines={1}>{supporter.displayName ?? supporter.username ?? "Fan"}</Text>
                      <Text style={{ color: COLORS.gold, fontSize: 11 }}>{supporter.totalCoins ?? 0}</Text>
                    </View>
                  )) : <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>Ranking starts after the first gift.</Text>}
                </Card>
              </ScrollView>
            </View>
          )}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{
            flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: "rgba(0,0,0,0.7)", gap: 8,
          }}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Say something..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={{
                flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: RADIUS.full,
                paddingHorizontal: 16, paddingVertical: 8, color: COLORS.white, fontSize: 14,
              }}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              editable={featureHints?.chatEnabled !== false}
            />
            <TouchableOpacity
              onPress={() => useUIStore.getState().openGiftDrawer({ userId: String(stream.hostUserId), context: "LIVE_STREAM", roomId: streamId })}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: featureHints?.giftingEnabled === false ? COLORS.textSecondary : COLORS.primary, alignItems: "center", justifyContent: "center",
              }}
              disabled={featureHints?.giftingEnabled === false}
            >
              <Text style={{ fontSize: 22 }}>🎁</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
