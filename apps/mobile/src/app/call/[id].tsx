import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useAuthStore, useCallStore, useWalletStore } from "@/store";
import { useSocket } from "@/hooks/useSocket";
import { Avatar, Button } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { SOCKET_EVENTS } from "@missu/types";

const { width, height } = Dimensions.get("window");

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.userId);
  const coinBalance = useWalletStore((s) => s.coinBalance);
  const { isInCall, isCalling, callType, callStatus, callDirection, otherUserId, agoraChannel, lowBalance, syncCall, setLowBalance } = useCallStore();
  const { emit, emitWithAck, on } = useSocket();
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const billingState = trpc.call.getBillingState.useQuery(
    { callSessionId: id! },
    { retry: false, enabled: !!id },
  );

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
    const response = await emitWithAck<{ ok: boolean; accepted?: { agoraChannel: string; agoraToken: string; agoraAppId?: string; expiresAt?: string } }>(
      SOCKET_EVENTS.CALL.ACCEPT,
      { callSessionId: id, callerId: otherUserId },
    ).catch(() => ({ ok: false }));

    if (!response?.ok || !response.accepted) return;

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
      {/* Background gradient placeholder */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#1A1A2E" }} />

      {/* Call Info */}
      <View style={{ alignItems: "center", marginBottom: SPACING.xxl }}>
        <Avatar size={120} />
        <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: "700", marginTop: SPACING.lg }}>
          {otherUserId ?? "Model"}
        </Text>
        <Text style={{ color: COLORS.white, opacity: 0.7, fontSize: 16, marginTop: 8 }}>
          {isInCall ? formatDuration(duration) : "Connecting..."}
        </Text>
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
          onPress={() => setIsMuted(!isMuted)}
          style={{
            width: 60, height: 60, borderRadius: 30,
            backgroundColor: isMuted ? COLORS.danger : "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 26 }}>{isMuted ? "🔇" : "🎤"}</Text>
        </TouchableOpacity>

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
          style={{
            width: 60, height: 60, borderRadius: 30,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 26 }}>🔊</Text>
        </TouchableOpacity>
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
