import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useCallStore } from "@/store";
import { useSocket } from "@/hooks/useSocket";
import { Avatar, Button } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { SOCKET_EVENTS } from "@missu/types";

const { width, height } = Dimensions.get("window");

export default function CallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isInCall, callType, otherUserId, agoraChannel } = useCallStore();
  const { emit } = useSocket();
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!isInCall) return;
    const interval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isInCall]);

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
