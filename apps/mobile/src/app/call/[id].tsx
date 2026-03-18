import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { RenderModeType, RtcSurfaceView, VideoSourceType } from "react-native-agora";
import { trpc } from "@/lib/trpc";
import { useAuthStore, useCallStore, useWalletStore } from "@/store";
import { useSocket } from "@/hooks/useSocket";
import { useCallRtc } from "@/hooks/useCallRtc";
import { Avatar, Button } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { SOCKET_EVENTS } from "@missu/types";

const { width, height } = Dimensions.get("window");

type AcceptCallAck = {
  ok: boolean;
  accepted?: {
    agoraChannel: string;
    agoraToken: string;
    agoraAppId?: string;
    expiresAt?: string;
  };
};

export default function CallScreen() {
  const { id, game, sessionId } = useLocalSearchParams<{ id: string; game?: string; sessionId?: string }>();
  const userId = useAuthStore((s) => s.userId);
  const coinBalance = useWalletStore((s) => s.coinBalance);
  const {
    isInCall,
    callType,
    callStatus,
    callDirection,
    otherUserId,
    agoraChannel,
    agoraToken,
    agoraAppId,
    tokenExpiresAt,
    lowBalance,
    syncCall,
    setLowBalance,
    setRtcSession,
  } = useCallStore();
  const { emit, emitWithAck, on } = useSocket();
  const [duration, setDuration] = useState(0);

  const refreshRtcToken = trpc.calls.refreshRtcToken.useMutation();
  const peerSummary = trpc.user.getUserSummary.useQuery(
    { userId: otherUserId! },
    { retry: false, enabled: !!otherUserId },
  );

  const billingState = trpc.calls.getBillingState.useQuery(
    { callSessionId: id! },
    { retry: false, enabled: !!id, refetchInterval: isInCall ? 15000 : false },
  );
  const gameState = trpc.game.getGameState.useQuery(
    { sessionId: sessionId! },
    { retry: false, enabled: Boolean(sessionId) },
  );

  const rtcCredentials = useMemo(() => (
    agoraChannel && agoraToken && agoraAppId
      ? { channel: agoraChannel, agoraToken, agoraAppId }
      : null
  ), [agoraAppId, agoraChannel, agoraToken]);

  const rtc = useCallRtc({
    enabled: Boolean(isInCall && rtcCredentials),
    callType,
    credentials: rtcCredentials,
  });

  const peer = peerSummary.data as {
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    presenceStatus?: string | null;
  } | null;

  const primaryRemoteUid = rtc.remoteUids[0];
  const selectedGame = useMemo(() => {
    switch (String(game ?? "").toLowerCase()) {
      case "ludo":
        return { icon: "🎲", title: "Ludo Challenge", subtitle: "Take turns and track moves together on the call." };
      case "chess":
        return { icon: "♟️", title: "Chess Match", subtitle: "Use the call to narrate moves and keep score live." };
      case "carrom":
        return { icon: "🎯", title: "Carrom Duel", subtitle: "Race through trick shots and call your winning rounds." };
      case "sudoku":
        return { icon: "🔢", title: "Sudoku Sprint", subtitle: "Solve grids together and compare timings in real time." };
      default:
        return null;
    }
  }, [game]);
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
    const totalSeconds = billingState.data?.session?.totalDurationSeconds ?? 0;
    if (totalSeconds > 0) {
      setDuration(totalSeconds);
    }
  }, [billingState.data?.session?.totalDurationSeconds]);

  useEffect(() => {
    if (!id || !userId) return;

    emitWithAck<{ ok: boolean; state?: any }>(SOCKET_EVENTS.CALL.SYNC_REQUEST, { callSessionId: id, role: "publisher" })
      .then((response) => {
        if (!response?.ok || !response.state?.session) return;
        const session = response.state.session;
        const peerUserId = session.callerUserId === userId ? session.modelUserId : session.callerUserId;
        syncCall({
          callId: session.id,
          callType: session.callType === "VIDEO" ? "video" : "audio",
          otherUserId: peerUserId,
          status: session.status,
          direction: session.callerUserId === userId ? "outgoing" : "incoming",
          channel: response.state.rtc?.agoraChannel,
          token: response.state.rtc?.agoraToken,
          agoraAppId: response.state.rtc?.agoraAppId,
          expiresAt: response.state.rtc?.expiresAt,
        });
      })
      .catch(() => undefined);

    const unsubLow = on(SOCKET_EVENTS.CALL.LOW_BALANCE, () => {
      setLowBalance(true);
    });
    const unsubInsufficient = on(SOCKET_EVENTS.CALL.INSUFFICIENT_BALANCE, () => {
      setLowBalance(true);
      useCallStore.getState().endCall();
      router.back();
    });
    const unsubEnded = on(SOCKET_EVENTS.CALL.SESSION_ENDED, () => {
      useCallStore.getState().endCall();
      router.back();
    });

    return () => {
      unsubLow?.();
      unsubInsufficient?.();
      unsubEnded?.();
    };
  }, [emitWithAck, id, on, setLowBalance, syncCall, userId]);

  useEffect(() => {
    if (!isInCall) return;
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isInCall]);

  useEffect(() => {
    if (!id || !isInCall || !tokenExpiresAt || !agoraChannel || !agoraAppId) {
      return;
    }

    const expiresAtMs = new Date(tokenExpiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
      return;
    }

    const refreshLeadMs = 90_000;
    const delayMs = Math.max(expiresAtMs - Date.now() - refreshLeadMs, 5_000);

    const timeout = setTimeout(() => {
      refreshRtcToken.mutate(
        { callSessionId: id, role: "publisher" },
        {
          onSuccess: (nextCredentials: any) => {
            setRtcSession(
              nextCredentials.agoraChannel,
              nextCredentials.agoraToken,
              nextCredentials.agoraAppId,
              nextCredentials.expiresAt,
            );
            rtc.renewToken(nextCredentials.agoraToken);
          },
        },
      );
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [agoraAppId, agoraChannel, id, isInCall, refreshRtcToken, rtc, setRtcSession, tokenExpiresAt]);

  useEffect(() => {
    if (!id || !isInCall || callDirection !== "outgoing") return;

    const coinsPerMinute = billingState.data?.session?.coinsPerMinuteSnapshot ?? 0;
    const initialTicks = billingState.data?.totalTicks ?? 0;
    let nextTickNumber = initialTicks + 1;

    const interval = setInterval(() => {
      const estimatedBalanceAfter = Math.max(coinBalance - (coinsPerMinute * nextTickNumber), 0);
      emitWithAck(SOCKET_EVENTS.CALL.BILLING_TICK, {
        callSessionId: id,
        tickNumber: nextTickNumber,
        userBalanceAfter: estimatedBalanceAfter,
        otherUserId,
      }).catch(() => undefined);
      nextTickNumber += 1;
    }, 60_000);

    return () => clearInterval(interval);
  }, [billingState.data?.session?.coinsPerMinuteSnapshot, billingState.data?.totalTicks, callDirection, coinBalance, emitWithAck, id, isInCall, otherUserId]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleEnd = () => {
    emit(SOCKET_EVENTS.CALL.END, { callSessionId: id, otherUserId });
    useCallStore.getState().endCall();
    router.back();
  };

  const handleAccept = async () => {
    if (!otherUserId) return;
    const response = await emitWithAck<AcceptCallAck>(
      SOCKET_EVENTS.CALL.ACCEPT,
      { callSessionId: id, callerId: otherUserId },
    ).catch(() => ({ ok: false }));

    if (!response?.ok || !("accepted" in response) || !response.accepted) return;

    useCallStore.getState().acceptCall(id!, response.accepted.agoraChannel, response.accepted.agoraToken, response.accepted.agoraAppId, response.accepted.expiresAt);
  };

  const handleReject = async () => {
    if (!otherUserId) return;
    await emitWithAck(SOCKET_EVENTS.CALL.REJECT, { callSessionId: id, callerId: otherUserId }).catch(() => undefined);
    useCallStore.getState().endCall();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1A1A2E", alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#09101E" }} />

      {callType === "video" ? (
        <View style={{ position: "absolute", inset: 0 as any, backgroundColor: "#02050C" }}>
          {primaryRemoteUid ? (
            <RtcSurfaceView
              key={`call-remote-${primaryRemoteUid}`}
              style={{ position: "absolute", inset: 0 as any }}
              canvas={remoteCanvas}
            />
          ) : null}
          {isInCall && agoraAppId ? (
            <RtcSurfaceView
              style={{ position: "absolute", right: 16, top: 56, width: width * 0.3, height: height * 0.22, borderRadius: 18, overflow: "hidden" }}
              canvas={localCanvas}
              zOrderMediaOverlay
            />
          ) : null}
          <View style={{ position: "absolute", inset: 0 as any, backgroundColor: primaryRemoteUid ? "rgba(0,0,0,0.18)" : "rgba(2,5,12,0.72)" }} />
        </View>
      ) : (
        <View style={{ position: "absolute", inset: 0 as any, backgroundColor: "#14203A", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: width * 0.72, height: width * 0.72, borderRadius: width * 0.36, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, letterSpacing: 2 }}>AUDIO CALL</Text>
            <Text style={{ color: COLORS.white, fontSize: 36, fontWeight: "800", marginTop: 10 }}>{rtc.joined ? "Connected" : "Connecting"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 10 }}>
              {rtc.error ?? "Voice channel is active through Agora RTC."}
            </Text>
          </View>
        </View>
      )}

      <View style={{ alignItems: "center", marginBottom: SPACING.xxl, paddingHorizontal: 20 }}>
        <Avatar uri={peer?.avatarUrl ?? undefined} size={120} online={peer?.presenceStatus === "ONLINE"} />
        <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "700", marginTop: SPACING.lg }}>
          {peer?.displayName ?? otherUserId ?? "Model"}
        </Text>
        {peer?.username ? (
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginTop: 4 }}>
            @{peer.username}
          </Text>
        ) : null}
        <Text style={{ color: COLORS.white, opacity: 0.7, fontSize: 16, marginTop: 8 }}>
          {isInCall ? formatDuration(duration) : "Connecting..."}
        </Text>
        {peer?.bio ? (
          <Text
            numberOfLines={2}
            style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 8, textAlign: "center", maxWidth: width * 0.76 }}
          >
            {peer.bio}
          </Text>
        ) : null}
        {lowBalance && (
          <Text style={{ color: COLORS.warning, fontSize: 13, marginTop: 8 }}>
            Low balance. Call may end soon.
          </Text>
        )}
        <View style={{
          backgroundColor: callType === "video" ? COLORS.primary : COLORS.success,
          paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, marginTop: 12,
        }}>
          <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: "600" }}>
            {callType === "video" ? "📹 Video Call" : "🎙️ Audio Call"}
          </Text>
        </View>
        <View style={{ marginTop: 14, alignItems: "center" }}>
          {peer?.presenceStatus ? (
            <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginBottom: 4 }}>
              Peer: {String(peer.presenceStatus).toLowerCase()}
            </Text>
          ) : null}
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginBottom: 4 }}>
            RTC: {rtc.joined ? "connected" : rtc.statusLabel}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
            {billingState.data?.session?.coinsPerMinuteSnapshot ?? 0} coins/min
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 4 }}>
            Total deducted: {billingState.data?.totalCoinsDeducted ?? 0} coins
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 4 }}>
            Balance left: {billingState.data?.currentBalance ?? coinBalance} coins
          </Text>
          {rtc.error ? (
            <Text style={{ color: COLORS.warning, fontSize: 12, marginTop: 8, textAlign: "center" }}>
              {rtc.error}
            </Text>
          ) : null}
        </View>
        {selectedGame ? (
          <View style={{ marginTop: 18, width: width * 0.82, borderRadius: 22, padding: 16, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 30, marginRight: 10 }}>{selectedGame.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: "800" }}>{selectedGame.title}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 12, marginTop: 4, lineHeight: 18 }}>{selectedGame.subtitle}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push("/games" as never)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)" }}>
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>Change</Text>
              </TouchableOpacity>
            </View>
            {sessionId ? (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
                <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>
                  Session: {sessionId}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 4 }}>
                  Players: {Number(gameState.data?.players?.length ?? 0)} • Moves: {Number(gameState.data?.moves?.length ?? 0)}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 4 }}>
                  Status: {String(gameState.data?.session?.status ?? "created").toLowerCase()}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Controls */}
      {callDirection === "incoming" && !isInCall && callStatus === "REQUESTED" ? (
        <View style={{ flexDirection: "row", gap: SPACING.lg }}>
          <Button title="Decline" variant="outline" onPress={handleReject} />
          <Button title="Accept" variant="primary" onPress={handleAccept} />
        </View>
      ) : (
      <View style={{ flexDirection: "row", gap: SPACING.xl }}>
        <TouchableOpacity
          onPress={rtc.toggleLocalAudio}
          style={{
            width: 60, height: 60, borderRadius: 30,
            backgroundColor: rtc.isLocalAudioMuted ? COLORS.danger : "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 26 }}>{rtc.isLocalAudioMuted ? "🔇" : "🎤"}</Text>
        </TouchableOpacity>

        {callType === "video" && (
          <TouchableOpacity
            onPress={rtc.toggleLocalVideo}
            style={{
              width: 60, height: 60, borderRadius: 30,
              backgroundColor: rtc.isLocalVideoMuted ? COLORS.danger : "rgba(255,255,255,0.2)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 26 }}>{rtc.isLocalVideoMuted ? "📷" : "📹"}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleEnd}
          style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: COLORS.danger, alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 30 }}>📞</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={rtc.toggleSpeaker}
          style={{
            width: 60, height: 60, borderRadius: 30,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 26 }}>{rtc.isSpeakerOn ? "🔊" : "🎧"}</Text>
        </TouchableOpacity>

        {callType === "video" && (
          <TouchableOpacity
            onPress={rtc.switchCamera}
            style={{
              width: 60, height: 60, borderRadius: 30,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 26 }}>🔁</Text>
          </TouchableOpacity>
        )}
      </View>
      )}

      {/* Gift Button */}
      <TouchableOpacity
        style={{
          position: "absolute", bottom: 80, right: 24,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center",
          shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
        }}
      >
        <Text style={{ fontSize: 26 }}>🎁</Text>
      </TouchableOpacity>
    </View>
  );
}
