import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/hooks/useSocket";
import { Screen, Avatar, Badge, Button } from "@/components/ui";
import { COLORS, SPACING, RADIUS } from "@/theme";
import { SOCKET_EVENTS } from "@missu/types";
import { useAuthStore } from "@/store";

export default function GroupAudioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.userId);
  const { emit, on } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  const room = trpc.groupAudio.roomState.useQuery({ roomId: id! }, { retry: false, enabled: !!id });
  const state = room.data as any;

  useEffect(() => {
    emit(SOCKET_EVENTS.GROUP_AUDIO.JOIN, { roomId: id });

    const unsub1 = on(SOCKET_EVENTS.GROUP_AUDIO.CHAT, (msg: any) => {
      setMessages((prev) => [...prev.slice(-200), msg]);
    });
    const unsub2 = on(SOCKET_EVENTS.GROUP_AUDIO.MEMBER_JOINED, () => { room.refetch(); });
    const unsub3 = on(SOCKET_EVENTS.GROUP_AUDIO.MEMBER_LEFT, () => { room.refetch(); });
    const unsub4 = on(SOCKET_EVENTS.GROUP_AUDIO.SPEAKER_UPDATE, () => { room.refetch(); });

    return () => {
      emit(SOCKET_EVENTS.GROUP_AUDIO.LEAVE, { roomId: id });
      unsub1?.(); unsub2?.(); unsub3?.(); unsub4?.();
    };
  }, [id]);

  const toggleMute = () => {
    setIsMuted((v) => !v);
    emit(SOCKET_EVENTS.GROUP_AUDIO.MUTE_TOGGLE, { roomId: id, muted: !isMuted });
  };

  const toggleHand = () => {
    setHandRaised((v) => !v);
    emit(SOCKET_EVENTS.GROUP_AUDIO.HAND_RAISE, { roomId: id, raised: !handRaised });
  };

  const sendChat = () => {
    if (!inputText.trim()) return;
    emit(SOCKET_EVENTS.GROUP_AUDIO.CHAT, { roomId: id, message: inputText.trim() });
    setInputText("");
  };

  const speakers = state?.speakers ?? [];
  const listeners = state?.listeners ?? [];

  return (
    <Screen>
      {/* Header */}
      <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.text }}>{state?.name ?? "Audio Room"}</Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{state?.topic ?? ""}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={{
            paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.error,
            borderRadius: RADIUS.full,
          }}>
            <Text style={{ color: COLORS.white, fontWeight: "600", fontSize: 13 }}>Leave</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", marginTop: 6, gap: 12 }}>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>🎙 {speakers.length} speakers</Text>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>👥 {listeners.length} listeners</Text>
        </View>
      </View>

      {/* Speakers Grid */}
      <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: SPACING.sm }}>Speakers</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.md }}>
          {speakers.map((s: any, i: number) => (
            <View key={i} style={{ alignItems: "center", width: 70 }}>
              <View style={{ position: "relative" }}>
                <Avatar size={52} />
                {s.isMuted && (
                  <View style={{
                    position: "absolute", bottom: -2, right: -2, width: 20, height: 20,
                    borderRadius: 10, backgroundColor: COLORS.error, alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 10, color: COLORS.white }}>🔇</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11, color: COLORS.text, marginTop: 4, fontWeight: "500" }} numberOfLines={1}>
                {s.displayName ?? `Speaker ${i + 1}`}
              </Text>
              {s.isHost && <Badge label="Host" variant="primary" />}
            </View>
          ))}
        </View>
      </View>

      {/* Listeners */}
      <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: SPACING.sm }}>Listeners</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
          {listeners.map((l: any, i: number) => (
            <View key={i} style={{ alignItems: "center", width: 52 }}>
              <Avatar size={36} />
              <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }} numberOfLines={1}>
                {l.displayName ?? `Listener`}
              </Text>
              {l.handRaised && <Text style={{ fontSize: 12 }}>✋</Text>}
            </View>
          ))}
        </View>
      </View>

      {/* Chat Messages */}
      <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: COLORS.border }}>
        <FlatList
          data={messages}
          inverted
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ padding: SPACING.sm }}
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: "600", marginRight: 6 }}>{item.userId ?? "User"}</Text>
              <Text style={{ color: COLORS.text, fontSize: 13 }}>{item.message}</Text>
            </View>
          )}
        />
      </View>

      {/* Controls */}
      <View style={{ flexDirection: "row", padding: SPACING.md, gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: "center" }}>
        <TouchableOpacity onPress={toggleMute} style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: isMuted ? COLORS.error : COLORS.surface,
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 22 }}>{isMuted ? "🔇" : "🎙"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleHand} style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: handRaised ? COLORS.warning : COLORS.surface,
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 22 }}>✋</Text>
        </TouchableOpacity>

        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message..."
          placeholderTextColor={COLORS.textSecondary}
          style={{
            flex: 1, backgroundColor: COLORS.inputBg, borderRadius: RADIUS.full,
            paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, color: COLORS.text,
          }}
          onSubmitEditing={sendChat}
          returnKeyType="send"
        />

        <TouchableOpacity onPress={sendChat} style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>↑</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
